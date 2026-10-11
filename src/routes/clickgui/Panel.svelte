<script lang="ts">
    import {onMount} from "svelte";
    import type {Module as TModule} from "../../integration/types";
    import {listen} from "../../integration/ws";
    import Module from "./Module.svelte";
    import type {KeyboardKeyEvent, ModuleToggleEvent} from "../../integration/events";
    import {
        gridSize,
        highlightModuleName,
        maxPanelZIndex,
        scaleFactor,
        searchQuery,
        showGrid,
        snappingEnabled
    } from "./clickgui_store";
    import {setItem} from "../../integration/persistent_storage";
    import {categoryIcon} from "./tenacity_icons";
    import {tenacitySettings} from "../../theme/tenacity";

    export let category: string;
    export let modules: TModule[];
    export let panelIndex: number;
    // LiquidBounce provides SVG icons, Tenacity uses its own icon font instead.
    export let icon: string | undefined = undefined;
    $: void icon;

    let panelElement: HTMLElement;
    let modulesElement: HTMLElement;

    let moving = false;
    let offsetX = 0;
    let offsetY = 0;

    let scrollPositionSaveTimeout: number | undefined;

    const panelConfig = loadPanelConfig();

    let ignoreGrid = false;

    // Module.allowedClickGuiHeight in "Screen Height" scroll mode: 2/3 of the scaled screen height
    let windowHeight = window.innerHeight;
    $: allowedHeight = windowHeight * (2 / $scaleFactor) * (2 / 3);

    // CategoryPanel.getModuleRects: while searching only matching modules are shown in each panel
    $: pureQuery = $searchQuery.toLowerCase().replaceAll(" ", "");
    $: shownModules = pureQuery.length === 0 ? modules : modules.filter(m =>
        m.name.toLowerCase().includes(pureQuery)
        || m.aliases.some(a => a.toLowerCase().includes(pureQuery))
        || category.toLowerCase().includes(pureQuery)
    );

    interface PanelConfig {
        top: number;
        left: number;
        expanded: boolean;
        scrollTop: number;
        zIndex: number;
    }

    function clamp(number: number, min: number, max: number) {
        return Math.max(min, Math.min(number, max));
    }

    function loadPanelConfig(): PanelConfig {
        const localStorageItem = localStorage.getItem(
            `clickgui.panel.${category}`,
        );

        if (!localStorageItem) {
            // Category.posX = 20 + (categoryCount * 120), posY = 20.
            // LiquidBounce has more categories than Tenacity, so panels that do not fit wrap into a second row.
            const screenWidth = document.documentElement.clientWidth * (2 / $scaleFactor);
            const perRow = Math.max(1, Math.floor((screenWidth - 40 - 213) / 240) + 1);
            const row = Math.floor(panelIndex / perRow);
            const column = panelIndex % perRow;

            return {
                top: 40 + row * (document.documentElement.clientHeight * (2 / $scaleFactor) / 2),
                left: 40 + column * 240,
                expanded: true,
                scrollTop: 0,
                zIndex: 0
            };
        } else {
            const config: PanelConfig = JSON.parse(localStorageItem);

            // Migration
            if (!config.zIndex) {
                config.zIndex = 0;
            }

            if (config.zIndex > $maxPanelZIndex) {
                $maxPanelZIndex = config.zIndex;
            }

            return config;
        }
    }

    async function savePanelConfig() {
        await setItem(
            `clickgui.panel.${category}`,
            JSON.stringify(panelConfig),
        );
    }

    function fixPosition() {
        panelConfig.left = clamp(panelConfig.left, 0, document.documentElement.clientWidth * (2 / $scaleFactor) - panelElement.offsetWidth);
        panelConfig.top = clamp(panelConfig.top, 0, document.documentElement.clientHeight * (2 / $scaleFactor) - panelElement.offsetHeight);
    }

    function onMouseDown(e: MouseEvent) {
        if (e.button !== 0 && e.button !== 1) return;

        moving = true;
        offsetX = e.clientX * (2 / $scaleFactor) - panelConfig.left;
        offsetY = e.clientY * (2 / $scaleFactor) - panelConfig.top;
        panelConfig.zIndex = ++$maxPanelZIndex;

        $showGrid = $snappingEnabled;
    }

    function onMouseMove(e: MouseEvent) {
        if (moving) {
            const newLeft = (e.clientX * (2 / $scaleFactor) - offsetX);
            const newTop = (e.clientY * (2 / $scaleFactor) - offsetY);

            panelConfig.left = snapToGrid(newLeft);
            panelConfig.top = snapToGrid(newTop);

            fixPosition();
        }
    }

    function onMouseUp() {
        if (moving) {
            savePanelConfig();
        }
        moving = false;
        $showGrid = false;
    }

    function toggleExpanded() {
        panelConfig.expanded = !panelConfig.expanded;

        savePanelConfig();
    }

    function handleModulesTransitionEnd(e: TransitionEvent) {
        if (e.target !== modulesElement || e.propertyName !== "max-height") {
            return;
        }

        const {left, top} = panelConfig;

        fixPosition();

        if (panelConfig.left !== left || panelConfig.top !== top) {
            savePanelConfig();
        }
    }

    function handleModulesScroll() {
        panelConfig.scrollTop = modulesElement.scrollTop;

        if (scrollPositionSaveTimeout !== undefined) {
            clearTimeout(scrollPositionSaveTimeout);
        }
        scrollPositionSaveTimeout = setTimeout(() => {
            savePanelConfig();
        }, 500)
    }

    highlightModuleName.subscribe((name) => {
        const highlightModule = modules.find(
            (m) => m.name === name,
        );
        if (highlightModule) {
            panelConfig.zIndex = ++$maxPanelZIndex;
            panelConfig.expanded = true;
            savePanelConfig();
        }
    });

    listen("moduleToggle", (e: ModuleToggleEvent) => {
        const moduleName = e.moduleName;
        const moduleEnabled = e.enabled;

        const mod = modules.find((m) => m.name === moduleName);
        if (!mod) return;

        mod.enabled = moduleEnabled;
        modules = modules;
    });

    onMount(() => {
        if (!modulesElement) {
            return;
        }

        modulesElement.scrollTo({
            top: panelConfig.scrollTop,
            behavior: "smooth"
        });
    });

    listen("keyboardKey", (e: KeyboardKeyEvent) => {
        if (e.key === "key.keyboard.left.shift") {
            ignoreGrid = e.action === 1;
        }
    });

    function snapToGrid(value: number): number {
        if (ignoreGrid || !$snappingEnabled) return value;

        return Math.round(value / $gridSize) * $gridSize;
    }
</script>

<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} bind:innerHeight={windowHeight}/>

<div
        class="panel"
        class:solid={!$tenacitySettings.gradient}
        class:transparent={$tenacitySettings.transparent}
        class:no-outline-accent={!$tenacitySettings.outlineAccent}
        style="left: {panelConfig.left}px; top: {panelConfig.top}px; z-index: {panelConfig.zIndex};"
        bind:this={panelElement}
>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
            class="title"
            on:mousedown={onMouseDown}
            on:contextmenu|preventDefault={toggleExpanded}
    >
        <span class="category">{category}</span>
        <span class="icon">{categoryIcon(category)}</span>
    </div>

    <div
            class="modules"
            class:expanded={panelConfig.expanded}
            style="--allowed-height: {allowedHeight}px;"
            on:scroll={handleModulesScroll}
            on:transitionend={handleModulesTransitionEnd}
            bind:this={modulesElement}
    >
        {#each shownModules as {name, enabled, description, aliases} (name)}
            <Module {name} {enabled} {description} {aliases}/>
        {/each}
    </div>
</div>

<style lang="scss">
  /*
   * CategoryPanel (Tenacity dropdown click GUI), all sizes are Tenacity GUI units * 2.
   *
   * With the default "Outline Accent" setting the whole panel is a rounded rectangle filled with
   * a vertical gradient of the two theme colours (radius 5). The module list is drawn on top of
   * it, clipped to the inside, so the gradient forms the header and a thin frame.
   */
  .panel {
    // Panel fill: a vertical gradient for gradient themes, otherwise the first theme colour.
    // ClickGUIMod "Transparent" multiplies its alpha by .75.
    --panel-alpha: 100%;
    --panel-fill: linear-gradient(to bottom,
            color-mix(in srgb, var(--accent-color) var(--panel-alpha), transparent),
            color-mix(in srgb, var(--secondary-color) var(--panel-alpha), transparent));

    position: absolute;
    width: 213px;
    border-radius: 10px;
    padding: 0 3.5px 4px;
    background: var(--panel-fill);
    will-change: transform;
    user-select: none;

    &.solid {
      --panel-fill: color-mix(in srgb, var(--accent-color) var(--panel-alpha), transparent);
    }

    &.transparent {
      --panel-alpha: 75%;
    }

    // ClickGUIMod "Outline Accent" disabled: a rgb(20, 20, 20) outline with the fill only behind the modules
    &.no-outline-accent {
      background: color-mix(in srgb, rgb(20, 20, 20) var(--panel-alpha), transparent);

      .modules {
        background: var(--panel-fill);
      }
    }
  }

  .title {
    height: 31px;
    padding-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 4px;
    cursor: grab;
    color: white;

    .category {
      font-family: var(--tenacity-font, "DuckSans"), sans-serif;
      font-weight: bold;
      font-size: 22px;
      line-height: 1;
    }

    .icon {
      font-family: "TenacityIcons", sans-serif;
      font-size: 20px;
      line-height: 1;
    }
  }

  .modules {
    max-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: 0 0 6px 6px;
    transition: max-height 250ms cubic-bezier(0.215, 0.61, 0.355, 1);

    &.expanded {
      max-height: var(--allowed-height);
    }
  }
</style>

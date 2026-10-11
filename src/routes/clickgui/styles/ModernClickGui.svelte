<script lang="ts">
    import {onMount} from "svelte";
    import type {ConfigurableSetting, Module} from "../../../integration/types";
    import {setModuleEnabled} from "../../../integration/rest";
    import {listen} from "../../../integration/ws";
    import type {ModuleToggleEvent} from "../../../integration/events";
    import ScaledClickGuiContent from "../ScaledClickGuiContent.svelte";
    import Search from "../Search.svelte";
    import ModernSettings from "./ModernSettings.svelte";
    import {scaleFactor, searchQuery} from "../clickgui_store";
    import {categoryIcon} from "../tenacity_icons";
    import {backAndForth, clientFirst, clientSecond, now, rgba, tenacitySettings} from "../../../theme/tenacity";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../theme/theme_config";
    import {bindSetting, captureBind, loadCategories, loadSettings, matchesSearch, saveSettings} from "./tenacity_settings";
    import {getPrintableKeyName} from "../../../integration/rest";
    import {UNKNOWN_KEY} from "../../../util/utils";
    import {TenacityIcon} from "../tenacity_icons";

    /*
     * Port of Tenacity's ModernClickGui. Every Tenacity unit is 2px here.
     */

    const POSITION_KEY = "clickgui.modern.position";
    const CATEGORY_KEY = "clickgui.modern.category";

    let categories: string[] = [];
    let modulesByCategory: Record<string, Module[]> = {};
    let currentCategory = localStorage.getItem(CATEGORY_KEY) ?? "Combat";

    // ModernClickGui.drag: centred on first open
    let position = (() => {
        try {
            return JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null") as { x: number, y: number } | null;
        } catch {
            return null;
        }
    })();
    let dragging = false;
    let dragOffset = {x: 0, y: 0};

    let hoveringSidebar = false;
    $: searching = $searchQuery.length > 0;
    // expandedAnimation: the sidebar is 100 units wide while hovered, 45 otherwise
    $: sidebarExpanded = hoveringSidebar && !searching;

    let selected: Module | null = null;
    let selectedSettings: ConfigurableSetting | null = null;
    let binding: string | null = null;
    let hovered: string | null = null;
    let bindNames: Record<string, string> = {};

    // rectWidth = 370 + 55 (expanded sidebar) + 125 (settings panel)
    $: width = 740 + (sidebarExpanded ? 110 : 0) + (selected ? 250 : 0);
    $: sidebarWidth = sidebarExpanded ? 200 : 90;

    $: modules = searching
        ? Object.values(modulesByCategory).flat().filter(m => matchesSearch(m, $searchQuery))
        : modulesByCategory[currentCategory] ?? [];

    $: version = $tenacitySettings.version === 6 ? "6.0" : "5.2";
    // ColorUtil.interpolateColorsBackAndForth(40, 1, ...) for the settings button of the open module
    $: settingsButtonColor = rgba(backAndForth($now, 40, 1, $clientFirst, $clientSecond));

    interface ClickCircle {
        id: number;
        x: number;
        y: number;
    }

    let circles: ClickCircle[] = [];

    function format(name: string) {
        return $spaceSeperatedNames ? convertToSpacedString(name) : name;
    }

    function toScaled(e: MouseEvent) {
        return {x: e.clientX * (2 / $scaleFactor), y: e.clientY * (2 / $scaleFactor)};
    }

    function center() {
        const w = window.innerWidth * (2 / $scaleFactor);
        const h = window.innerHeight * (2 / $scaleFactor);
        position = {x: w / 2 - 370, y: h / 2 - 255};
    }

    function onMouseDown(e: MouseEvent) {
        if (!position) return;
        const {x, y} = toScaled(e);
        circles = [...circles, {id: performance.now(), x, y}];
        setTimeout(() => circles = circles.slice(1), 600);

        // Only the top 20 units of the window drag it
        if (e.button === 0 && x >= position.x && x <= position.x + 800 && y >= position.y && y <= position.y + 40) {
            dragging = true;
            dragOffset = {x: x - position.x, y: y - position.y};
        }
    }

    function onMouseMove(e: MouseEvent) {
        if (dragging && position) {
            const {x, y} = toScaled(e);
            position = {x: x - dragOffset.x, y: y - dragOffset.y};
        }
    }

    function onMouseUp() {
        if (dragging) {
            dragging = false;
            localStorage.setItem(POSITION_KEY, JSON.stringify(position));
        }
    }

    function selectCategory(category: string) {
        currentCategory = category;
        localStorage.setItem(CATEGORY_KEY, category);
        scroll = 0;
    }

    async function onModuleMouseDown(module: Module, e: MouseEvent) {
        if (e.button === 0) {
            await setModuleEnabled(module.name, !module.enabled);
        } else if (e.button === 1) {
            e.preventDefault();
            binding = module.name;
            await captureBind(module.name);
            await refreshBindName(module.name);
            binding = null;
        } else if (e.button === 2) {
            if (selected?.name === module.name) {
                selected = null;
                selectedSettings = null;
            } else {
                selected = module;
                settingsScroll = 0;
                selectedSettings = await loadSettings(module.name);
            }
        }
    }

    async function refreshBindName(module: string) {
        const settings = await loadSettings(module);
        const key = bindSetting(settings)?.value.boundKey ?? UNKNOWN_KEY;
        bindNames[module] = key === UNKNOWN_KEY ? "None" : (await getPrintableKeyName(key)).localized;
    }

    async function onSettingsChange() {
        if (selected && selectedSettings) {
            selectedSettings = await saveSettings(selected.name, selectedSettings);
        }
    }

    // Scroll: modules move by 25 units per wheel step, limited to (modules - 4) * 50 units
    let scroll = 0;
    let settingsScroll = 0;
    let settingsContent: HTMLElement;

    function onModulesWheel(e: WheelEvent) {
        const max = Math.max(0, (modules.length - 4) * 100);
        scroll = Math.max(-max, Math.min(0, scroll - Math.sign(e.deltaY) * 50));
    }

    function onSettingsWheel(e: WheelEvent) {
        const max = Math.max(0, (settingsContent?.scrollHeight ?? 0) - 400);
        settingsScroll = Math.max(-max, Math.min(0, settingsScroll - Math.sign(e.deltaY) * 50));
    }

    listen("moduleToggle", (e: ModuleToggleEvent) => {
        for (const list of Object.values(modulesByCategory)) {
            const module = list.find(m => m.name === e.moduleName);
            if (module) module.enabled = e.enabled;
        }
        modulesByCategory = modulesByCategory;
    });

    // ModernClickGui opening animation: slides in from the left (DecelerateAnimation, 300ms)
    function slideIn(_node: HTMLElement) {
        const distance = window.innerWidth * (2 / $scaleFactor) + width / 2;
        return {
            duration: 300,
            css: (t: number) => {
                const eased = 1 - (1 - t) * (1 - t);
                return `transform: translateX(${-(1 - eased) * distance}px);`;
            }
        };
    }

    onMount(async () => {
        if (!position) center();
        const loaded = await loadCategories();
        categories = loaded.categories;
        modulesByCategory = loaded.modules;
        if (!categories.includes(currentCategory)) {
            currentCategory = categories[0];
        }
    });

    // Category spacing is 30 units, squeezed when LiquidBounce has more categories than fit
    $: categorySpacing = Math.min(60, categories.length > 0 ? (510 - 110) / categories.length : 60);
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}/>

<ScaledClickGuiContent>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="clickgui" on:mousedown={onMouseDown} on:contextmenu|preventDefault>
        <Search modules={[]}/>

        {#if position && categories.length > 0}
            <div class="modern" style="left: {position.x}px; top: {position.y}px; width: {width}px;" in:slideIn>
                <!-- Modules -->
                <div class="modules" style="left: {sidebarWidth + 20}px;" on:wheel={onModulesWheel}>
                    <div class="modules-inner" style="transform: translateY({scroll}px);">
                        <div class="hint">Click your scroll wheel while hovering a module to change a keybind</div>
                        {#each modules as module (module.name)}
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div class="module"
                                 class:enabled={module.enabled}
                                 on:mousedown|stopPropagation={(e) => onModuleMouseDown(module, e)}
                                 on:mouseenter={() => { hovered = module.name; refreshBindName(module.name); }}
                                 on:mouseleave={() => hovered = null}
                            >
                                <div class="check">
                                    <div class="circle"></div>
                                    <div class="gradient"></div>
                                    <div class="checkmark">{TenacityIcon.CHECKMARK}</div>
                                </div>
                                <div class="text">
                                    <div class="name">{format(module.name)}</div>
                                    {#if binding === module.name}
                                        <div class="description shown">Currently bound to {bindNames[module.name] ?? "None"}</div>
                                    {:else}
                                        <div class="description" class:shown={hovered === module.name}>{module.description}</div>
                                    {/if}
                                </div>
                                <div class="settings-button"
                                     style="background-color: {selected?.name === module.name ? settingsButtonColor : 'rgb(47, 49, 54)'};">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Settings panel of the right clicked module -->
                {#if selected && selectedSettings}
                    <div class="settings-panel" style="left: {sidebarWidth + 640}px;" on:wheel|stopPropagation={onSettingsWheel}>
                        <div class="settings-title">{format(selected.name)}</div>
                        <div class="settings-shadow"></div>
                        <div class="settings-scroll">
                            <div bind:this={settingsContent} style="transform: translateY({settingsScroll}px);">
                                {#key selected.name}
                                    <ModernSettings configurable={selectedSettings} path="clickgui.modern.{selected.name}"
                                                    onChange={onSettingsChange}/>
                                {/key}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Category sidebar -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="sidebar" class:expanded={sidebarExpanded} style="width: {sidebarWidth}px;"
                     on:mouseenter={() => hoveringSidebar = true} on:mouseleave={() => hoveringSidebar = false}>
                    <img class="logo" src="img/tenacity/modern-logo.png" alt=""/>
                    <div class="title">
                        <span class="client">Tenacity</span>
                        <span class="version">{version}</span>
                    </div>
                    <div class="divider"></div>

                    {#each categories as category, index (category)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div class="category"
                             class:active={!searching && category === currentCategory}
                             style="top: {100 + index * categorySpacing}px;"
                             on:mousedown|stopPropagation={(e) => e.button === 0 && selectCategory(category)}>
                            <span class="icon" class:combat={category === "Combat"}>{categoryIcon(category)}</span>
                            <span class="category-name">{category}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#each circles as circle (circle.id)}
            <div class="click-circle" style="left: {circle.x}px; top: {circle.y}px;"></div>
        {/each}
    </div>
</ScaledClickGuiContent>

<style lang="scss">
  $background: rgb(30, 31, 35);
  $category: rgb(47, 49, 54);
  $lighter-gray: rgb(68, 71, 78);
  $gray: rgb(128, 134, 141);
  $decelerate: cubic-bezier(0.215, 0.61, 0.355, 1);

  .clickgui {
    position: absolute;
    inset: 0;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    color: white;
  }

  // 370x255 unit window with a radius of 10
  .modern {
    position: absolute;
    height: 510px;
    border-radius: 20px;
    background-color: $background;
    overflow: hidden;
    transition: width 250ms $decelerate;
  }

  .sidebar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 20px;
    background-color: $category;
    overflow: hidden;
    transition: width 250ms $decelerate;
    --collapsed: 1;

    &.expanded {
      --collapsed: 0;
    }

    .logo {
      position: absolute;
      left: calc(18px + 6px * var(--collapsed));
      top: 12px;
      width: 41px;
      height: 41px;
      transition: left 250ms $decelerate;
    }

    .title {
      position: absolute;
      left: calc(70px + 20px * var(--collapsed));
      top: 26px;
      display: flex;
      align-items: flex-end;
      column-gap: 10px;
      white-space: nowrap;
      transition: left 250ms $decelerate;

      .client {
        font-size: 20px;
        line-height: 1;
      }

      .version {
        font-size: 14px;
        line-height: 1;
        color: rgb(98, 98, 98);
      }
    }

    .divider {
      position: absolute;
      left: 20px;
      top: 70px;
      width: calc(160px - 110px * var(--collapsed));
      height: 2px;
      background-color: $lighter-gray;
      transition: width 250ms $decelerate;
    }
  }

  // CategoryButton: iconFont35 and tenacityFont24, gray -> lighter when hovered -> white when selected
  .category {
    position: absolute;
    left: calc(16px + 8px * var(--collapsed));
    display: flex;
    align-items: center;
    height: 36px;
    width: 166px;
    color: $lighter-gray;
    cursor: pointer;
    transition: color 350ms, left 250ms $decelerate;
    white-space: nowrap;

    &:hover {
      color: rgb(115, 115, 115);
      transition: color 200ms, left 250ms $decelerate;
    }

    &.active {
      color: white;
    }

    .icon {
      width: 40px;
      text-align: center;
      font-family: "TenacityIcons", sans-serif;
      font-size: 35px;
      line-height: 1;

      &.combat {
        margin-left: 5px;
        width: 35px;
      }
    }

    .category-name {
      margin-left: calc(14px + 20px * var(--collapsed));
      font-size: 24px;
      transition: margin-left 250ms $decelerate;
    }
  }

  // ModulesPanel: 305 unit wide modules, 50 units apart
  .modules {
    position: absolute;
    top: 0;
    width: 610px;
    height: 100%;
    overflow: hidden;
    transition: left 250ms $decelerate;
  }

  .modules-inner {
    padding-top: 40px;
    transition: transform 150ms $decelerate;
  }

  .hint {
    position: absolute;
    top: 10px;
    width: 610px;
    text-align: center;
    font-size: 18px;
    color: rgba(128, 134, 141, .59);
    white-space: nowrap;
  }

  .module {
    position: relative;
    height: 70px;
    margin-bottom: 30px;
    border-radius: 10px;
    background-color: $category;
    cursor: pointer;

    .check {
      position: absolute;
      left: 1px;
      top: 1px;
      width: 68px;
      height: 68px;
      border-radius: 10px;
      background-color: $lighter-gray;
      overflow: hidden;

      .circle {
        position: absolute;
        left: 24px;
        top: 24px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: $category;
      }

      // drawGradientCornerLR(first, second), scaled in by a DecelerateAnimation(250ms)
      .gradient {
        position: absolute;
        inset: 0;
        border-radius: 10px;
        background: linear-gradient(to bottom right, var(--accent-color), var(--secondary-color));
        transform: scale(0);
        opacity: 0;
        transition: transform 250ms $decelerate, opacity 250ms $decelerate;
      }

      // ElasticAnimation(550ms) for the checkmark
      .checkmark {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "TenacityIcons", sans-serif;
        font-size: 35px;
        transform: scale(0);
        opacity: 0;
        transition: transform 250ms $decelerate, opacity 250ms;
      }
    }

    &.enabled .check {
      .gradient {
        transform: scale(1);
        opacity: 1;
      }

      .checkmark {
        transform: scale(1);
        opacity: 1;
        transition: transform 550ms cubic-bezier(0.34, 1.8, 0.64, 1), opacity 250ms;
      }
    }

    // Name at x + 42, the description starts 13 units after it
    .text {
      position: absolute;
      left: 84px;
      right: 60px;
      top: 0;
      height: 70px;
      display: flex;
      align-items: center;
      column-gap: 26px;
    }

    .name {
      flex-shrink: 0;
      font-size: 24px;
      white-space: nowrap;
    }

    .description {
      max-height: 66px;
      font-size: 18px;
      line-height: 1.2;
      color: $gray;
      opacity: 0;
      overflow: hidden;
      transition: opacity 400ms $decelerate;

      &.shown {
        opacity: 1;
        transition: opacity 300ms $decelerate;
      }
    }

    // The settings button: three dots in a 14 unit wide bar on the right
    .settings-button {
      position: absolute;
      right: 1px;
      top: 1px;
      width: 28px;
      height: 68px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-evenly;
      transition: background-color 400ms $decelerate;

      span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: white;
      }
    }
  }

  // SettingsPanel: 130x255 units next to the modules
  .settings-panel {
    position: absolute;
    top: 0;
    width: 260px;
    height: 510px;
    border-radius: 16px;
    background-color: $category;
    overflow: hidden;
    transition: left 250ms $decelerate;

    .settings-title {
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: bold;
    }

    .settings-shadow {
      position: absolute;
      left: 0;
      right: 0;
      top: 40px;
      height: 16px;
      background: linear-gradient(to bottom, rgba(0, 0, 0, .27), transparent);
      z-index: 1;
      pointer-events: none;
    }

    .settings-scroll {
      position: absolute;
      top: 41px;
      left: 0;
      right: 0;
      bottom: 0;
      padding-top: 19px;
      overflow: hidden;
    }
  }

  // ClickCircle: a ring growing from 1 to 7 units while it fades out
  @keyframes click-circle {
    0% {
      width: 4px;
      height: 4px;
      border-color: rgb(255, 255, 240);
    }
    33% {
      border-color: rgb(255, 255, 240);
    }
    100% {
      width: 28px;
      height: 28px;
      border-color: rgba(249, 249, 249, 0);
    }
  }

  .click-circle {
    position: absolute;
    border: solid 2px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: click-circle 450ms cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
    z-index: 99999999999;
  }
</style>

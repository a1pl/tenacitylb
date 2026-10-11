<script lang="ts">
    import {onMount} from "svelte";
    import type {ConfigurableSetting, Module} from "../../../integration/types";
    import {getPrintableKeyName, getSession, setModuleEnabled} from "../../../integration/rest";
    import {listen} from "../../../integration/ws";
    import type {ModuleToggleEvent} from "../../../integration/events";
    import ScaledClickGuiContent from "../ScaledClickGuiContent.svelte";
    import Search from "../Search.svelte";
    import Description from "../Description.svelte";
    import CompactSettings from "./CompactSettings.svelte";
    import {description as descriptionStore, scaleFactor, searchQuery} from "../clickgui_store";
    import {tenacitySettings} from "../../../theme/tenacity";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../theme/theme_config";
    import {bindSetting, captureBind, loadCategories, loadSettings, matchesSearch, saveSettings} from "./tenacity_settings";
    import {UNKNOWN_KEY} from "../../../util/utils";
    import {TenacityIcon} from "../tenacity_icons";

    /*
     * Port of Tenacity's CompactClickgui. Every Tenacity unit is 2px here.
     */

    const POSITION_KEY = "clickgui.compact.position";
    const CATEGORY_KEY = "clickgui.compact.category";

    const WIDTH = 950;
    const HEIGHT = 600;

    let categories: string[] = [];
    let modulesByCategory: Record<string, Module[]> = {};
    let currentCategory = localStorage.getItem(CATEGORY_KEY) ?? "Combat";
    let settings: Record<string, ConfigurableSetting> = {};
    let bindNames: Record<string, string> = {};
    let binding: string | null = null;

    let username = "";
    let avatar = "";

    let position = (() => {
        try {
            return JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null") as { x: number, y: number } | null;
        } catch {
            return null;
        }
    })() ?? {x: 80, y: 80};
    let dragging = false;
    let dragOffset = {x: 0, y: 0};

    $: searching = $searchQuery.length > 0;
    $: modules = searching
        ? Object.values(modulesByCategory).flat().filter(m => matchesSearch(m, $searchQuery))
        : modulesByCategory[currentCategory] ?? [];
    $: version = $tenacitySettings.version === 6 ? "6.0" : "5.2";

    // Modules alternate between the left and right column
    $: columns = [modules.filter((_, i) => i % 2 === 0), modules.filter((_, i) => i % 2 === 1)];

    function format(name: string) {
        return $spaceSeperatedNames ? convertToSpacedString(name) : name;
    }

    function toScaled(e: MouseEvent) {
        return {x: e.clientX * (2 / $scaleFactor), y: e.clientY * (2 / $scaleFactor)};
    }

    // Only the top 10 units of the window drag it
    function onWindowMouseDown(e: MouseEvent) {
        const {x, y} = toScaled(e);
        if (e.button === 0 && y - position.y <= 20) {
            dragging = true;
            dragOffset = {x: x - position.x, y: y - position.y};
        }
    }

    function onMouseMove(e: MouseEvent) {
        if (dragging) {
            const {x, y} = toScaled(e);
            position = {x: x - dragOffset.x, y: y - dragOffset.y};
        }
        if (draggingScrollbar) {
            dragScrollbar(e);
        }
    }

    function onMouseUp() {
        if (dragging) {
            dragging = false;
            localStorage.setItem(POSITION_KEY, JSON.stringify(position));
        }
        draggingScrollbar = false;
    }

    function selectCategory(category: string) {
        currentCategory = category;
        localStorage.setItem(CATEGORY_KEY, category);
        scroll = 0;
    }

    async function loadModuleSettings(module: Module) {
        if (settings[module.name]) return;
        settings[module.name] = await loadSettings(module.name);
        await updateBindName(module.name);
    }

    async function updateBindName(module: string) {
        const key = bindSetting(settings[module])?.value.boundKey ?? UNKNOWN_KEY;
        bindNames[module] = key === UNKNOWN_KEY ? "None" : (await getPrintableKeyName(key)).localized;
    }

    async function onSettingsChange(module: string) {
        settings[module] = await saveSettings(module, settings[module]);
    }

    async function bind(module: string) {
        binding = module;
        settings[module] = await captureBind(module);
        await updateBindName(module);
        binding = null;
    }

    // Tooltips appear after hovering a module for 900ms
    let tooltipTimeout: ReturnType<typeof setTimeout> | undefined;

    function hoverModule(module: Module) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => {
            descriptionStore.set({x: 0, y: 0, anchor: "right", description: module.description});
        }, 900);
    }

    function leaveModule() {
        clearTimeout(tooltipTimeout);
        descriptionStore.set(null);
    }

    // ModulePanel scroll: 35 units per wheel step, with a draggable scrollbar
    let scroll = 0;
    let content: HTMLElement;
    let contentHeight = 0;
    let draggingScrollbar = false;

    $: maxScroll = Math.max(0, contentHeight - 200);
    $: scrollbarHeight = Math.min(HEIGHT - 20, maxScroll > 0 ? (HEIGHT - 20) * (HEIGHT / maxScroll) : HEIGHT - 20);
    $: scrollbarY = maxScroll > 0 ? (-scroll / maxScroll) * (HEIGHT - 20 - scrollbarHeight) : 0;

    function onWheel(e: WheelEvent) {
        scroll = Math.max(-maxScroll, Math.min(0, scroll - Math.sign(e.deltaY) * 70));
    }

    function dragScrollbar(e: MouseEvent) {
        const {y} = toScaled(e);
        const percent = (y - (position.y + 10)) / (HEIGHT - 20);
        scroll = Math.max(-maxScroll, Math.min(0, -maxScroll * percent));
    }

    listen("moduleToggle", (e: ModuleToggleEvent) => {
        for (const list of Object.values(modulesByCategory)) {
            const module = list.find(m => m.name === e.moduleName);
            if (module) module.enabled = e.enabled;
        }
        modulesByCategory = modulesByCategory;
    });

    // CompactClickgui opening animation: slides in from the left (DecelerateAnimation, 250ms)
    function slideIn(_node: HTMLElement) {
        const distance = window.innerWidth * (2 / $scaleFactor) + WIDTH / 2;
        return {
            duration: 250,
            css: (t: number) => `transform: translateX(${-(1 - (1 - (1 - t) * (1 - t))) * distance}px);`
        };
    }

    onMount(async () => {
        const loaded = await loadCategories();
        categories = loaded.categories;
        modulesByCategory = loaded.modules;
        if (!categories.includes(currentCategory)) {
            currentCategory = categories[0];
        }

        try {
            const session = await getSession();
            username = session.username;
            avatar = session.avatar;
        } catch {
            // Not logged in
        }
    });

    $: modules.forEach(loadModuleSettings);

    // The category list fills the space between the two dividers
    $: categoryHeight = categories.length > 0 ? (HEIGHT - 147) / categories.length : 0;
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}/>

<ScaledClickGuiContent>
    <div class="clickgui" on:contextmenu|preventDefault>
        <Description/>
        <Search modules={[]}/>

        {#if categories.length > 0}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="compact" style="left: {position.x}px; top: {position.y}px;" on:mousedown={onWindowMouseDown} in:slideIn>
                <!-- Sidebar -->
                <div class="sidebar">
                    <img class="logo" src="img/tenacity/modern-logo.png" alt=""/>
                    <div class="title">
                        <div class="client">Tenacity</div>
                        <div class="version">{version}</div>
                    </div>
                    <div class="divider" style="top: 62px;"></div>

                    {#each categories as category, index (category)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div class="category"
                             class:active={!searching && category === currentCategory}
                             style="top: {66 + index * categoryHeight}px; height: {categoryHeight}px;"
                             on:click={() => selectCategory(category)}>
                            <span>{category}</span>
                        </div>
                    {/each}

                    <div class="divider" style="top: {HEIGHT - 81}px;"></div>

                    <!-- Tenacity shows the linked Discord account here, this shows the Minecraft account -->
                    {#if username}
                        <div class="account">
                            {#if avatar}
                                <object class="avatar" data={avatar} type="image/png" aria-label="avatar">
                                    <img class="avatar" src="img/steve.png" alt="avatar"/>
                                </object>
                            {:else}
                                <img class="avatar" src="img/steve.png" alt="avatar"/>
                            {/if}
                            <div class="username">{username}</div>
                        </div>
                    {/if}
                </div>

                <!-- Modules in two columns -->
                <div class="modules" on:wheel={onWheel}>
                    <div class="columns" bind:this={content} bind:clientHeight={contentHeight}
                         style="transform: translateY({scroll}px);">
                        {#each columns as column}
                            <div class="column">
                                {#each column as module (module.name)}
                                    <div class="module">
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                        <div class="header"
                                             on:click={() => setModuleEnabled(module.name, !module.enabled)}
                                             on:mouseenter={() => hoverModule(module)}
                                             on:mouseleave={leaveModule}>
                                            <span class="name">{format(module.name)}</span>
                                            <span class="bind" class:binding={binding === module.name}
                                                  on:click|stopPropagation={() => bind(module.name)}>
                                                {binding === module.name ? "..." : bindNames[module.name] ?? "None"}
                                            </span>
                                            <span class="toggle" class:enabled={module.enabled}>
                                                <span class="check">{TenacityIcon.CHECKMARK}</span>
                                            </span>
                                        </div>
                                        {#if settings[module.name]}
                                            <div class="body">
                                                <CompactSettings configurable={settings[module.name]}
                                                                 path="clickgui.compact.{module.name}"
                                                                 onChange={() => onSettingsChange(module.name)}/>
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Scrollbar -->
                <div class="scrollbar">
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="thumb" class:active={draggingScrollbar}
                         style="top: {scrollbarY}px; height: {scrollbarHeight}px;"
                         on:mousedown|stopPropagation={() => draggingScrollbar = true}>
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</ScaledClickGuiContent>

<style lang="scss">
  $gray: rgb(110, 110, 110);

  .clickgui {
    position: absolute;
    inset: 0;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    color: white;
  }

  // 475x300 unit window, square corners
  .compact {
    position: absolute;
    width: 950px;
    height: 600px;
    background-color: rgb(27, 27, 27);
    overflow: hidden;
  }

  .sidebar {
    position: absolute;
    left: 0;
    top: 0;
    width: 180px;
    height: 100%;
    background-color: rgb(39, 39, 39);

    .logo {
      position: absolute;
      left: 10px;
      top: 10px;
      width: 41px;
      height: 41px;
    }

    .title {
      position: absolute;
      left: 66px;
      top: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1;

      .client {
        font-size: 22px;
        font-weight: bold;
      }

      .version {
        margin-top: 2px;
        font-size: 16px;
      }
    }

    .divider {
      position: absolute;
      left: 10px;
      width: 160px;
      height: 1px;
      background-color: $gray;
    }
  }

  // Categories: tenacityBoldFont22, gray (lighter when hovered), white and highlighted when selected
  .category {
    position: absolute;
    left: 0;
    width: 180px;
    display: flex;
    align-items: center;
    padding-left: 16px;
    font-size: 22px;
    font-weight: bold;
    color: $gray;
    cursor: pointer;

    &:hover {
      color: rgb(157, 157, 157);
    }

    &.active {
      color: white;
      background-color: rgb(27, 27, 27);
    }
  }

  .account {
    position: absolute;
    left: 10px;
    bottom: 8px;
    display: flex;
    flex-direction: column;
    row-gap: 4px;

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }

    .username {
      font-size: 18px;
      font-weight: bold;
    }
  }

  .modules {
    position: absolute;
    left: 200px;
    top: 0;
    width: 710px;
    height: 100%;
    overflow: hidden;
  }

  .columns {
    display: flex;
    align-items: flex-start;
    column-gap: 20px;
    padding-top: 20px;
    transition: transform 150ms cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  .column {
    width: 345px;
    display: flex;
    flex-direction: column;
    row-gap: 20px;
  }

  // ModuleRect: a 20 unit header followed by the settings
  .module {
    .header {
      position: relative;
      height: 40px;
      display: flex;
      align-items: center;
      padding-left: 10px;
      background-color: rgb(39, 39, 39);
      cursor: pointer;
    }

    .name {
      font-size: 20px;
      font-weight: bold;
      white-space: nowrap;
    }

    .bind {
      margin-left: 16px;
      height: 16px;
      padding: 0 4px;
      background-color: rgb(64, 68, 75);
      font-size: 14px;
      line-height: 16px;
      font-weight: normal;

      &:hover,
      &.binding {
        background-color: rgb(91, 97, 107);
      }
    }

    // A 4 unit circle that turns into the accent colour with a checkmark when enabled
    .toggle {
      position: absolute;
      right: 12px;
      top: 12px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: rgb(64, 68, 75);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 150ms cubic-bezier(0.215, 0.61, 0.355, 1);

      .check {
        font-family: "TenacityIcons", sans-serif;
        font-size: 12px;
        line-height: 1;
        color: rgb(45, 45, 45);
        transform: scale(0);
        transition: transform 150ms cubic-bezier(0.215, 0.61, 0.355, 1), color 150ms;
      }

      &.enabled {
        background-color: var(--accent-color);

        .check {
          color: white;
          transform: scale(1);
        }
      }
    }

    .body {
      background-color: rgb(35, 35, 35);
    }
  }

  .scrollbar {
    position: absolute;
    right: 10px;
    top: 10px;
    width: 10px;
    height: 580px;
    border-radius: 4px;
    background-color: rgb(32, 32, 32);

    .thumb {
      position: absolute;
      left: 0;
      width: 10px;
      border-radius: 4px;
      background-color: rgb(41, 43, 47);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      row-gap: 2px;
      cursor: pointer;

      &:hover,
      &.active {
        background-color: rgb(51, 53, 58);
      }

      span {
        width: 6px;
        height: 1px;
        background-color: rgb(64, 68, 75);
      }
    }
  }
</style>

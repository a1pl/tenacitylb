<script lang="ts">
    import type {ConfigurableSetting, Module} from "../../integration/types";
    import {getModuleSettings} from "../../integration/rest";
    import {listen} from "../../integration/ws";
    import type {ClickGuiValueChangeEvent} from "../../integration/events";
    import {scaleFactor, searchQuery} from "./clickgui_store";
    import {onMount} from "svelte";

    export let modules: Module[];
    $: void modules;

    let autoFocus = true;
    let searchInputElement: HTMLInputElement;
    let focused = false;
    let hoveringBottom = false;

    $: active = focused || $searchQuery.length > 0;

    function handleWindowKeyDown(e: KeyboardEvent) {
        if (e.ctrlKey && e.key.toLowerCase() === "f") {
            e.preventDefault();
            searchInputElement.focus();
            return;
        }

        if (e.key === "Escape" && document.activeElement === searchInputElement) {
            $searchQuery = "";
            searchInputElement.blur();
            return;
        }

        if (document.activeElement !== document.body) {
            return;
        }

        if (autoFocus && e.key.length === 1 && !e.ctrlKey && !e.altKey) {
            searchInputElement.focus();
        }
    }

    // SearchBar.hoveringBottomOfScreen: a 240x100 unit area at the bottom centre of the screen
    function handleMouseMove(e: MouseEvent) {
        const x = e.clientX * (2 / $scaleFactor);
        const y = e.clientY * (2 / $scaleFactor);
        const width = window.innerWidth * (2 / $scaleFactor);
        const height = window.innerHeight * (2 / $scaleFactor);

        hoveringBottom = x >= width / 2 - 240 && x <= width / 2 + 240 && y >= height - 200;
    }

    function applyValues(configurable: ConfigurableSetting) {
        autoFocus = configurable.value.find(v => v.name === "SearchBarAutoFocus")?.value as boolean ?? true;
    }

    onMount(async () => {
        $searchQuery = "";

        const clickGuiSettings = await getModuleSettings("ClickGUI");
        applyValues(clickGuiSettings);
    });

    listen("clickGuiValueChange", (e: ClickGuiValueChangeEvent) => {
        applyValues(e.configurable);
    });
</script>

<svelte:window on:keydown={handleWindowKeyDown} on:mousemove={handleMouseMove}/>

<!--
    SearchBar (Tenacity): a hint at the bottom of the screen, and a 200x25 unit rgb(17, 17, 17) field
    that slides up when hovering the bottom of the screen (85% opacity) or while searching.
-->
<div class="hint" class:hidden={active || hoveringBottom}>
    Do <b>CTRL</b>+<b>F</b> to open the search bar
</div>

<input
        type="text"
        class="search-input"
        class:hover={hoveringBottom && !active}
        class:active
        placeholder="Search"
        spellcheck="false"
        bind:value={$searchQuery}
        bind:this={searchInputElement}
        on:focus={() => focused = true}
        on:blur={() => focused = false}
/>

<style lang="scss">
  $ease: cubic-bezier(0.215, 0.61, 0.355, 1);

  .hint {
    position: absolute;
    left: 50%;
    bottom: 150px;
    transform: translate(-50%, 50%);
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 26px;
    white-space: nowrap;
    color: rgba(255, 255, 255, .3);
    pointer-events: none;
    transition: opacity 175ms $ease;

    &.hidden {
      opacity: 0;
    }
  }

  .search-input {
    position: absolute;
    left: 50%;
    bottom: 90px;
    width: 400px;
    height: 50px;
    padding: 0 12px;
    transform: translateX(-50%);
    border: none;
    border-radius: 10px;
    background-color: rgb(17, 17, 17);
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 24px;
    color: white;
    opacity: 0;
    z-index: 9999999999;
    transition: bottom 175ms $ease, opacity 175ms $ease;

    &::placeholder {
      color: rgba(255, 255, 255, .4);
    }

    &.hover {
      bottom: 140px;
      opacity: .85;
    }

    &.active {
      bottom: 210px;
      opacity: 1;
    }
  }
</style>

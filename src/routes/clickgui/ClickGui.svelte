<script lang="ts">
    import type {GroupedModules, Module} from "../../integration/types";
    import Panel from "./Panel.svelte";
    import Search from "./Search.svelte";
    import Description from "./Description.svelte";
    import {fade} from "svelte/transition";
    import {onMount} from "svelte";

    // DropdownClickGUI opening animation: EaseBackIn(400ms, .4, 2) scaling the panels
    // from 0.6 to 1 around the centre of the screen while they fade in.
    function easeBack(t: number) {
        const easeAmount = 2;
        const shrink = easeAmount + 1;
        return Math.max(0, 1 + shrink * Math.pow(t - 1, 3) + easeAmount * Math.pow(t - 1, 2));
    }

    function openPanels(_node: HTMLElement) {
        return {
            duration: 400,
            css: (t: number) => `transform: scale(${0.6 + 0.4 * easeBack(t)}); opacity: ${Math.min(1, t * t * 2)};`
        };
    }
    import {getCategories, getModules} from "../../integration/rest";
    import {groupByCategory} from "../../integration/util";
    import {gridSize, showGrid} from "./clickgui_store";
    import ScaledClickGuiContent from "./ScaledClickGuiContent.svelte";

    let categories = $state<GroupedModules>({});
    let modules = $state<Module[]>([]);
    let icons = $state<Record<string, string>>({});

    onMount(async () => {
        modules = await getModules();
        categories = groupByCategory(modules);
        icons = Object.fromEntries(
            (await getCategories())
                .filter(category => category.icon)
                .map(category => [category.name, category.icon!])
        );
    });
</script>

<ScaledClickGuiContent>
    <div
            class="clickgui"
            class:grid={$showGrid}
            style="background-size: {$gridSize}px {$gridSize}px;"
            transition:fade|global={{duration: 200}}
    >
        <Description/>
        <Search modules={structuredClone($state.snapshot(modules))}/>

        {#if Object.keys(categories).length > 0}
            <div class="panels" in:openPanels|global>
                {#each Object.entries(categories) as [category, modules], panelIndex (category)}
                    <Panel {category} {modules} {panelIndex} icon={icons[category]}/>
                {/each}
            </div>
        {/if}
    </div>
</ScaledClickGuiContent>

<style lang="scss">
  .panels {
    position: absolute;
    inset: 0;
    transform-origin: center;
  }

  .clickgui {
    position: absolute;
    inset: 0;

    &.grid {
      background-image: linear-gradient(to right, var(--clickgui-grid-color) 1px, transparent 1px),
      linear-gradient(to bottom, var(--clickgui-grid-color) 1px, transparent 1px);
    }
  }
</style>

<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import {slide} from "svelte/transition";
    import {cubicOut} from "svelte/easing";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../../theme/theme_config";
    import {TenacityIcon} from "../../tenacity_icons";

    export let name: string | null;
    export let options: string[];
    export let value: string;

    const dispatch = createEventDispatcher();

    let expanded = false;
    let element: HTMLElement;

    function format(text: string) {
        return $spaceSeperatedNames ? convertToSpacedString(text) : text;
    }

    function windowClickHide(e: MouseEvent) {
        if (!element.contains(e.target as Node)) {
            expanded = false;
        }
    }

    function updateValue(v: string) {
        value = v;
        expanded = false;
        dispatch("change");
    }
</script>

<svelte:window on:click={windowClickHide}/>

<!--
    ModeComponent (Tenacity dropdown click GUI):
    14px name above an 18 unit box with a 1 unit outline. The outline fades towards the theme colour
    on hover and becomes the theme colour while open. Options (all except the current one) unfold below.
-->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="dropdown" class:expanded bind:this={element}>
    {#if name !== null}
        <div class="name">{format(name)}</div>
    {/if}

    <div class="head" on:click={() => expanded = !expanded}>
        <span class="text">{format(value)}</span>
        <span class="arrow">{TenacityIcon.DROPDOWN_ARROW}</span>
    </div>

    {#if expanded}
        <div class="options" transition:slide={{duration: 250, easing: cubicOut}}>
            {#each options.filter(o => o !== value) as o (o)}
                <div class="option" on:click={() => updateValue(o)}>{format(o)}</div>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
  .dropdown {
    padding: 4px 0 6px;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    color: white;
  }

  .name {
    font-size: 14px;
    padding-left: 2px;
    margin-bottom: 4px;
  }

  .head {
    height: 36px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    border-radius: 8px;
    border: solid 2px var(--tenacity-setting-control-color);
    background-color: rgb(45, 45, 45);
    transition: border-color 250ms cubic-bezier(0.215, 0.61, 0.355, 1),
    background-color 250ms cubic-bezier(0.215, 0.61, 0.355, 1);

    &:hover {
      border-color: color-mix(in srgb, var(--tenacity-setting-control-color) 70%, var(--secondary-color));
      background-color: rgb(55, 55, 55);
    }

    .text {
      font-size: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .arrow {
      font-family: "TenacityIcons", sans-serif;
      font-size: 20px;
      line-height: 1;
      transition: transform 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
    }
  }

  .expanded .head {
    border-color: var(--secondary-color);
    background-color: var(--tenacity-setting-control-color);

    .arrow {
      transform: rotate(180deg);
    }
  }

  .options {
    margin-top: 8px;
    padding: 3px;
    border-radius: 8px;
    background-color: rgb(45, 45, 45);

    .option {
      height: 24px;
      margin-bottom: 6px;
      padding-left: 7px;
      display: flex;
      align-items: center;
      font-size: 16px;
      cursor: pointer;
      border-radius: 5px;
      transition: background-color 150ms;

      &:last-child {
        margin-bottom: 0;
      }

      &:hover {
        background-color: var(--tenacity-setting-control-color);
      }
    }
  }
</style>

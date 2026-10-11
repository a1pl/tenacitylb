<script lang="ts">
    import type {Component} from "svelte";
    import {fly} from "svelte/transition";

    type Tab = {
        title: string;
        content: Component;
    };

    let {tabs, activeTab = $bindable(0)} = $props<{
        tabs: Tab[];
        activeTab?: number;
    }>();

    const Active = $derived(tabs[activeTab]?.content);
</script>

<div class="tabs" transition:fly={{duration: 200, y: -20}}>
    <div class="available-tabs">
        {#each tabs as tab, index (tab.title)}
            <button
                    class="tab-button"
                    class:active={index === activeTab}
                    onclick={() => (activeTab = index)}
                    type="button"
            >
                {tab.title}
            </button>
        {/each}
    </div>

    <div class="content">
        {#if Active}
            {@render Active()}
        {/if}
    </div>
</div>

<style lang="scss">

  // LiquidBounce-only tab switcher, kept out of the way of Tenacity's panels in the top right corner
  .available-tabs {
    position: fixed;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: 10px;
    background: linear-gradient(to bottom, var(--accent-color), var(--secondary-color));
    z-index: 9999999999;
  }

  .tab-button {
    background-color: var(--tenacity-module-color);
    color: rgba(255, 255, 255, .5);
    padding: 4px 12px;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 16px;
    border: none;
    cursor: pointer;
    transition: background-color 250ms, color 250ms;

    &:first-child {
      border-radius: 7px 0 0 7px;
    }

    &:last-child {
      border-radius: 0 7px 7px 0;
    }

    &:hover {
      background-color: var(--tenacity-module-hover-color);
    }

    &.active {
      color: rgba(255, 255, 255, .9);
      font-weight: bold;
      background-color: rgba(0, 0, 0, .15);
    }
  }
</style>

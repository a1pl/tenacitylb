<script lang="ts">
    import {onMount} from "svelte";
    import {
        getModuleSettings,
        setModuleSettings,
        setModuleEnabled,
    } from "../../integration/rest";
    import type {ConfigurableSetting} from "../../integration/types";
    import GenericSetting from "./setting/common/GenericSetting.svelte";
    import {slide} from "svelte/transition";
    import {cubicOut} from "svelte/easing";
    import {TenacityIcon} from "./tenacity_icons";
    import {tenacitySettings} from "../../theme/tenacity";
    import {description as descriptionStore, highlightModuleName} from "./clickgui_store";
    import {setItem} from "../../integration/persistent_storage";
    import {convertToSpacedString, spaceSeperatedNames} from "../../theme/theme_config";
    import {scaleFactor} from "./clickgui_store";

    export let name: string;
    export let enabled: boolean;
    export let description: string;
    export let aliases: string[];

    let moduleNameElement: HTMLElement;
    let configurable: ConfigurableSetting;
    const path = `clickgui.${name}`;
    let expanded = false;
    let hasSettings = false;

    onMount(async () => {
        await fetchModuleSettings();

        setTimeout(() => {
            expanded = localStorage.getItem(path) === "true"
        }, 500);
    });

    highlightModuleName.subscribe((m) => {
        if (name !== m) {
            return;
        }

        setTimeout(() => {
            if (!moduleNameElement) {
                return;
            }
            moduleNameElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 1000);
    });

    async function fetchModuleSettings() {
        configurable = await getModuleSettings(name);
        hasSettings = configurable.value.filter(v => v.name !== "Bind" && v.name !== "Hidden").length > 0;
    }

    async function updateModuleSettings() {
        await setModuleSettings(name, configurable);
        await fetchModuleSettings();
    }

    async function toggleModule() {
        await setModuleEnabled(name, !enabled);
    }

    function setDescription() {
        if (!moduleNameElement) return;

        const boundingRect = moduleNameElement.getBoundingClientRect();
        const y = (boundingRect.top + (moduleNameElement.clientHeight / 2)) * (2 / $scaleFactor);

        let moduleDescription = description;
        if (aliases.length > 0) {
            moduleDescription += ` (aka ${aliases.map(name => $spaceSeperatedNames ? convertToSpacedString(name) : name).join(", ")})`;
        }

        // If element is less than 300px from the right, display description on the left
        if (window.innerWidth - boundingRect.right > 300) {
            const x = boundingRect.right * (2 / $scaleFactor);
            descriptionStore.set({
                x,
                y,
                anchor: "right",
                description: moduleDescription
            });
        } else {
            const x = boundingRect.left * (2 / $scaleFactor);

            descriptionStore.set({
                x,
                y,
                anchor: "left",
                description: moduleDescription
            });
        }
    }

    async function toggleExpanded(e: MouseEvent) {
        e.stopPropagation();

        expanded = !expanded;
        await setItem(path, expanded.toString());
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
        class="module"
        class:expanded
        class:solid={!$tenacitySettings.gradient}
        class:v6={$tenacitySettings.version === 6}
        in:slide={{ duration: 250, easing: cubicOut }}
        out:slide={{ duration: 250, easing: cubicOut }}
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
            class="name"
            on:contextmenu|preventDefault={toggleExpanded}
            on:click={toggleModule}
            on:mouseenter={setDescription}
            on:mouseleave={() => descriptionStore.set(null)}
            bind:this={moduleNameElement}
            class:enabled
            class:highlight={name === $highlightModuleName}
    >
        <span class="label">{$spaceSeperatedNames ? convertToSpacedString(name) : name}</span>

        {#if hasSettings}
            <button
                    class="expand-arrow"
                    aria-label="Expand settings"
                    aria-expanded={expanded}
                    on:click={toggleExpanded}
            >{TenacityIcon.DROPDOWN_ARROW}</button>
        {/if}
    </div>

    {#if expanded && configurable}
        <div class="settings tenacity-settings" transition:slide={{ duration: 250, easing: cubicOut }}>
            {#each configurable.value as setting (setting.name)}
                <GenericSetting {path} bind:setting on:change={updateModuleSettings}/>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
  /*
   * ModuleRect (Tenacity dropdown click GUI). Rows are 14 units (28px) high.
   *
   * Disabled modules are drawn as an opaque rgb(35, 37, 43) rectangle. Enabled modules fade
   * (EaseInOutQuad, 300ms) towards 15% black, so the gradient of the panel behind shows through.
   * Hovering brightens the row (EaseOutSine, 250ms in / 400ms out).
   */
  .module {
    position: relative;

    .name {
      height: 28px;
      padding-left: 8px;
      display: flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      background-color: var(--tenacity-module-color);
      color: rgba(255, 255, 255, .5);
      font-family: var(--tenacity-font, "DuckSans"), sans-serif;
      font-size: 18px;
      transition: background-color 400ms cubic-bezier(0.61, 1, 0.88, 1),
      color 300ms cubic-bezier(0.45, 0, 0.55, 1);

      &:hover {
        background-color: var(--tenacity-module-hover-color);
        transition: background-color 250ms cubic-bezier(0.61, 1, 0.88, 1),
        color 300ms cubic-bezier(0.45, 0, 0.55, 1);
      }

      &.enabled {
        background-color: rgba(0, 0, 0, .15);
        color: rgba(255, 255, 255, .9);
        font-weight: bold;

        &:hover {
          background-color: rgba(255, 255, 255, .12);
        }
      }

      &.highlight .label {
        text-decoration: underline;
      }


      .label {
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: calc(100% - 34px);
      }
    }

    .settings {
      // Settings are drawn on rgb(32, 32, 32), inset by 5 units on either side
      background-color: var(--tenacity-setting-color);
      padding: 0 10px;
      overflow: hidden;
      font-family: var(--tenacity-font, "DuckSans"), sans-serif;
      color: white;
    }

    .expand-arrow {
      all: unset;
      position: absolute;
      top: 0;
      right: 0;
      width: 34px;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-family: "TenacityIcons", sans-serif;
      font-size: 20px;
      font-weight: normal;
      color: rgba(255, 255, 255, .5);
      transition: transform 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
    }

    &.expanded .expand-arrow {
      transform: rotate(180deg);
    }

    // Non-gradient themes fill enabled modules with the second theme colour instead
    &.solid .name.enabled {
      background-color: var(--secondary-color);

      &:hover {
        background-color: color-mix(in srgb, var(--secondary-color), white 20%);
      }
    }

    // Tenacity 6: 15 unit rows, tenacityFont20 centred at 90% opacity, never bold, no arrow
    &.v6 {
      .name {
        height: 30px;
        padding-left: 0;
        justify-content: center;
        font-size: 20px;
        font-weight: normal;
        color: rgba(255, 255, 255, .9);

        .label {
          max-width: 100%;
        }
      }

      .expand-arrow {
        display: none;
      }
    }
  }
</style>

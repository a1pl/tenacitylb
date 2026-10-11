<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import type {ModuleSetting, MultiChooseSetting,} from "../../../integration/types";
    import {slide} from "svelte/transition";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../theme/theme_config";
    import {setItem} from "../../../integration/persistent_storage";

    export let setting: ModuleSetting;
    export let path: string;

    const cSetting = setting as MultiChooseSetting;
    const thisPath = `${path}.${cSetting.name}`;

    let errorValue: string | null = null;
    let timeoutId: ReturnType<typeof setTimeout>;

    const dispatch = createEventDispatcher();

    function handleChange(v: string) {
        if (cSetting.value.includes(v)) {
            const filtered = cSetting.value.filter(item => item !== v);

            if (filtered.length === 0 && !cSetting.canBeNone) {
                // Doesn't remove the element because in this case the value will be empty
                // And indicate the value
                errorValue = v
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => errorValue = null, 300);

                return;
            }

            cSetting.value = filtered;
        } else {
            cSetting.value = [...cSetting.value, v]
        }

        setting = {...cSetting};
        dispatch("change");
    }

    let expanded = localStorage.getItem(thisPath) === "true";

    $: setItem(thisPath, expanded.toString());

    function toggleExpanded() {
        expanded = !expanded;
    }
</script>

<!--
    MultipleBoolComponent (Tenacity dropdown click GUI): 14px name above an outlined box holding
    every option as a chip. The outline fades towards the theme colour by the share of enabled options.
-->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="setting">
    <div class="title">{$spaceSeperatedNames ? convertToSpacedString(cSetting.name) : cSetting.name}</div>

    <div class="choices"
         style="border-color: color-mix(in srgb, var(--tenacity-setting-control-color), var(--secondary-color) {cSetting.value.length / Math.max(1, cSetting.choices.length) * 100}%);">
        {#each cSetting.choices as choice (choice)}
            <div
                    class="choice"
                    class:active={cSetting.value.includes(choice)}
                    class:error={errorValue === choice}
                    on:click={() => {
                        handleChange(choice)
                    }}
            >
                {$spaceSeperatedNames ? convertToSpacedString(choice) : choice}
            </div>
        {/each}
    </div>
</div>

<style lang="scss">
  .setting {
    padding: 4px 0 6px;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    color: white;
  }

  .title {
    font-size: 14px;
    padding-left: 2px;
    margin-bottom: 4px;
  }

  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px;
    border: solid 2px;
    border-radius: 8px;
    background-color: rgb(45, 45, 45);
    transition: border-color 250ms;
  }

  .choice {
    padding: 2px 4px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    color: rgba(255, 255, 255, .5);
    background-color: var(--tenacity-setting-control-color);
    overflow-wrap: anywhere;
    transition: background-color 250ms cubic-bezier(0.215, 0.61, 0.355, 1),
    color 250ms cubic-bezier(0.215, 0.61, 0.355, 1), filter 250ms;

    &:hover {
      filter: brightness(1.4);
    }

    &.active {
      color: white;
      background-color: var(--secondary-color);
    }

    &.error {
      background-color: var(--error-color) !important;
    }
  }
</style>

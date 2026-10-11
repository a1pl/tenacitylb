<script lang="ts">
    import "nouislider/dist/nouislider.css";
    import "./nouislider.scss";
    import {createEventDispatcher, onMount} from "svelte";
    import noUiSlider, {type API} from "nouislider";
    import type {IntRangeSetting, ModuleSetting} from "../../../integration/types";
    import ValueInput from "./common/ValueInput.svelte";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../theme/theme_config";

    export let setting: ModuleSetting;

    const dispatch = createEventDispatcher();

    const cSetting = setting as IntRangeSetting;

    let slider: HTMLElement;
    let apiSlider: API;

    onMount(() => {
        // The value can sit outside the declared range (e.g. set through the `.value` command),
        // so widen the slider instead of letting noUiSlider clamp it away.
        const min = Math.min(cSetting.range.from, cSetting.value.from, cSetting.value.to);
        const max = Math.max(cSetting.range.to, cSetting.value.from, cSetting.value.to);

        apiSlider = noUiSlider.create(slider, {
            start: [cSetting.value.from, cSetting.value.to],
            connect: true,
            range: {
                min,
                max,
            },
            step: 1,
        });

        apiSlider.on("update", values => {
            const newValue = values.map(v => v.toString()).map(v => parseInt(v));

            cSetting.value = {
                from: newValue[0],
                to: newValue[1]
            };
            setting = { ...cSetting };
        });


        apiSlider.on("set", () => {
            dispatch("change");
        });
    });
</script>

<div class="setting" class:has-suffix={cSetting.suffix !== ""}>
    <div class="name">{$spaceSeperatedNames ? convertToSpacedString(cSetting.name) : cSetting.name}</div>
    <div class="value">
        <ValueInput valueType="int" value={cSetting.value.from}
                    on:change={(e) => apiSlider.set([e.detail.value, cSetting.value.to])}/>
        -
        <ValueInput valueType="int" value={cSetting.value.to}
                    on:change={(e) => apiSlider.set([cSetting.value.from, e.detail.value])}/>
    </div>
    {#if cSetting.suffix !== ""}
        <div class="suffix">{cSetting.suffix}</div>
    {/if}
    <div bind:this={slider} class="slider"></div>
</div>

<style lang="scss">
  /* NumberComponent (Tenacity dropdown click GUI): "Name: value" in 16px with the value in bold, slider below. */
  .setting {
    padding: 4px 0 2px;
    display: grid;
    grid-template-areas:
            "a b c"
            "d d d";
    grid-template-columns: max-content max-content 1fr;
    align-items: baseline;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 16px;
    color: white;

    /* animation fix */
    min-height: 48px;
  }

  .name {
    grid-area: a;

    &::after {
      content: ":";
      margin-right: 4px;
    }
  }

  .value {
    grid-area: b;
    font-weight: bold;

    :global(.value) {
      font-family: var(--tenacity-font, "DuckSans"), sans-serif;
      font-size: 16px;
      font-weight: bold;
      color: white;
    }
  }

  .suffix {
    grid-area: c;
    margin-left: 3px;
    color: rgba(255, 255, 255, .5);
  }

  .slider {
    grid-area: d;
  }
</style>

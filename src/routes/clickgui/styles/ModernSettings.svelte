<script lang="ts">
    import type {ConfigurableSetting} from "../../../integration/types";
    import {flattenSettings, formatNumber, numberRange, type Row} from "./tenacity_settings";
    import GenericSetting from "../setting/common/GenericSetting.svelte";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../theme/theme_config";
    import {clientFirst, type Rgb} from "../../../theme/tenacity";
    import {slide} from "svelte/transition";
    import {cubicOut} from "svelte/easing";

    /*
     * Port of Tenacity's modern/SettingsPanel. Every Tenacity unit is 2px here, settings rows are 22 units high.
     */

    export let configurable: ConfigurableSetting;
    export let path: string;
    export let onChange: () => void;

    function fmt(name: string) {
        return $spaceSeperatedNames ? convertToSpacedString(name) : name;
    }

    $: rows = flattenSettings(configurable.value);

    // Mode and multi boolean settings are opened with a right click
    let opened: Record<string, boolean> = {};
    let dragging: Row | null = null;
    let dragElement: HTMLElement | null = null;

    function toggleOpen(key: string, e: MouseEvent) {
        e.preventDefault();
        opened[key] = !opened[key];
    }

    function setValue(row: Row & { kind: "boolean" | "mode" }, value: any) {
        (row.set as (value: any) => void)(value);
        onChange();
    }

    function updateNumber(row: Row & { kind: "number" }, element: HTMLElement, clientX: number) {
        const rect = element.getBoundingClientRect();
        const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const {min, max} = numberRange(row.setting);
        let value = min + percent * (max - min);
        value = row.integer ? Math.round(value) : Math.round(value * 100) / 100;
        if (value !== row.setting.value) {
            row.setting.value = value;
            rows = rows;
        }
    }

    function startDrag(row: Row & { kind: "number" }, e: MouseEvent) {
        if (e.button !== 0) return;
        dragging = row;
        dragElement = (e.currentTarget as HTMLElement).querySelector(".track");
        if (dragElement) updateNumber(row, dragElement, e.clientX);
    }

    function onMouseMove(e: MouseEvent) {
        if (dragging?.kind === "number" && dragElement) {
            updateNumber(dragging, dragElement, e.clientX);
        }
    }

    function onMouseUp() {
        if (dragging) {
            dragging = null;
            dragElement = null;
            onChange();
        }
    }

    function toggleMulti(row: Row & { kind: "multi" }, choice: string) {
        const values = row.setting.value;
        if (values.includes(choice)) {
            if (values.length <= 1 && !row.setting.canBeNone) return;
            row.setting.value = values.filter(v => v !== choice);
        } else {
            row.setting.value = [...values, choice];
        }
        onChange();
    }

    function percent(row: Row & { kind: "number" }) {
        const {min, max} = numberRange(row.setting);
        return max === min ? 0 : (row.setting.value - min) / (max - min);
    }

    // The slider colour is the first theme colour with its saturation scaled by the slider value
    function sliderColor(first: Rgb, amount: number) {
        const r = first.r / 255, g = first.g / 255, b = first.b / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const delta = max - min;
        let h = 0;
        if (delta !== 0) {
            if (max === r) h = ((g - b) / delta) % 6;
            else if (max === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
        }
        h = (h * 60 + 360) % 360;
        const s = max === 0 ? 0 : delta / max;
        return hsvToCss(h, s * amount, max);
    }

    function hsvToCss(h: number, s: number, v: number) {
        const f = (n: number) => {
            const k = (n + h / 60) % 6;
            return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
        };
        return `rgb(${f(5)}, ${f(3)}, ${f(1)})`;
    }
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}/>

<div class="settings">
    {#each rows as row (row.key)}
        <div class="row" style="--depth: {row.depth};">
            {#if row.kind === "boolean"}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="boolean-row" on:click={() => setValue(row, !row.get())}>
                    <span class="name">{fmt(row.name)}</span>
                    <span class="switch" class:on={row.get()}><span class="knob"></span></span>
                </div>
            {:else if row.kind === "mode"}
                <div class="mode-row">
                    <span class="name">{fmt(row.name)}</span>
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="mode-box" on:contextmenu={(e) => toggleOpen(row.key, e)}>
                        <div class="mode-inner">
                            <div class="mode current">{fmt(row.get())}</div>
                            {#if opened[row.key]}
                                <div transition:slide={{duration: 250, easing: cubicOut}}>
                                    {#each row.modes.filter(m => m !== row.get()) as mode (mode)}
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <div class="mode option" on:click={() => { opened[row.key] = false; setValue(row, mode); }}>{fmt(mode)}</div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            {:else if row.kind === "number"}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="number-row" on:mousedown={(e) => startDrag(row, e)}>
                    <div class="number-top">
                        <span class="name">{fmt(row.name)}</span>
                        <span class="value">{formatNumber(row.setting.value)}</span>
                    </div>
                    <div class="track">
                        <div class="fill"
                             style="width: max(8px, {percent(row) * 216}px); background-color: {sliderColor($clientFirst, percent(row))};"></div>
                    </div>
                </div>
            {:else if row.kind === "multi"}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="multi-box" on:contextmenu={(e) => toggleOpen(row.key, e)}>
                    <div class="multi-inner">
                        <div class="multi-name">{fmt(row.name)}</div>
                        {#if opened[row.key]}
                            <div transition:slide={{duration: 250, easing: cubicOut}}>
                                {#each row.setting.choices as choice (choice)}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <div class="multi-option" class:on={row.setting.value.includes(choice)}
                                         on:click={() => toggleMulti(row, choice)}>
                                        <span class="dot"></span>{fmt(choice)}
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            {:else if row.kind === "text"}
                <div class="text-row">
                    <span class="name">{fmt(row.name)}</span>
                    <input class="text-field" type="text" spellcheck="false" placeholder="Type here..."
                           bind:value={row.setting.value} on:change={onChange}/>
                </div>
            {:else if row.kind === "header"}
                <div class="header-row">{fmt(row.name)}</div>
            {:else}
                <div class="fallback tenacity-settings">
                    <GenericSetting {path} setting={row.setting} on:change={onChange}/>
                </div>
            {/if}
        </div>
    {/each}
</div>

<style lang="scss">
  $outline: rgb(68, 71, 78);
  $inner: rgb(30, 31, 35);
  $gray: rgb(128, 134, 141);

  .settings {
    padding: 0 10px 20px 16px;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 16px;
    color: white;
  }

  .row {
    padding-left: calc(var(--depth) * 10px);
    border-left: solid calc(min(var(--depth), 1) * 2px) $outline;
  }

  .name {
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // BooleanSetting: 18x8 unit switch, the knob moves 10 units
  .boolean-row {
    height: 35.2px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    cursor: pointer;

    .switch {
      position: relative;
      flex-shrink: 0;
      width: 36px;
      height: 16px;
      border-radius: 8px;
      background-color: $inner;
      transition: background-color 250ms cubic-bezier(0.215, 0.61, 0.355, 1);

      &.on {
        background-color: var(--accent-color);
      }
    }

    .knob {
      position: absolute;
      top: 0;
      left: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: white;
      transition: transform 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
    }

    .on .knob {
      transform: translateX(20px);
    }
  }

  // ModeSetting: the current mode in a box on the right, right click lists the other modes
  .mode-row {
    min-height: 44px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    column-gap: 6px;

    .name {
      padding-top: 4px;
    }
  }

  .mode-box {
    flex-shrink: 0;
    min-width: 60px;
    padding: 2px;
    border-radius: 8px;
    background-color: $outline;
    cursor: context-menu;
  }

  .mode-inner {
    border-radius: 6px;
    background-color: $inner;
    padding: 0 8px;
  }

  .mode {
    height: 20px;
    line-height: 20px;
    text-align: center;
    white-space: nowrap;

    &.option {
      height: 30px;
      line-height: 30px;
      color: $gray;
      cursor: pointer;
      transition: color 200ms;

      &:hover {
        color: var(--secondary-color);
      }
    }
  }

  // NumberSetting: name and value, a 110x5 unit track with a 3 unit fill
  .number-row {
    height: 66px;
    cursor: pointer;

    .number-top {
      display: flex;
      justify-content: space-between;
      padding: 4px 0 0;
      width: 220px;
    }

    .track {
      position: relative;
      width: 220px;
      height: 10px;
      margin-top: 8px;
      border-radius: 4px;
      background-color: $inner;
    }

    .fill {
      position: absolute;
      left: 2px;
      top: 2px;
      height: 6px;
      border-radius: 3px;
      transition: width 100ms linear;
    }
  }

  // MultipleBoolSetting: a full width box with the name, right click lists the options
  .multi-box {
    margin: -9px 0 0 -3px;
    width: 236px;
    padding: 3px;
    border-radius: 8px;
    background-color: $outline;
    cursor: context-menu;
    margin-bottom: 19px;
  }

  .multi-inner {
    border-radius: 6px;
    background-color: $inner;
    padding-bottom: 2px;
  }

  .multi-name {
    height: 32px;
    line-height: 32px;
    text-align: center;
  }

  .multi-option {
    height: 30px;
    display: flex;
    align-items: center;
    column-gap: 8px;
    padding-left: 10px;
    color: $gray;
    cursor: pointer;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: currentColor;
    }

    &.on {
      color: var(--secondary-color);
    }

    &:hover {
      filter: brightness(1.3);
    }
  }

  // StringSetting: a 100x15 unit text field
  .text-row {
    height: 66px;
    padding-left: 6px;

    .text-field {
      display: block;
      margin-top: 6px;
      width: 200px;
      height: 30px;
      padding: 0 6px;
      border: solid 2px $outline;
      border-radius: 4px;
      background-color: $inner;
      color: white;
      font-family: inherit;
      font-size: 16px;

      &::placeholder {
        color: $gray;
      }
    }
  }

  .header-row {
    height: 32px;
    color: $gray;
  }

  .fallback {
    margin: 0 0 10px;
    padding-right: 6px;
  }
</style>

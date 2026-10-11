<script lang="ts">
    import type {ConfigurableSetting} from "../../../integration/types";
    import {flattenSettings, formatNumber, numberRange, type Row} from "./tenacity_settings";
    import GenericSetting from "../setting/common/GenericSetting.svelte";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../theme/theme_config";
    import {TenacityIcon} from "../tenacity_icons";
    import {slide} from "svelte/transition";
    import {cubicOut} from "svelte/easing";
    import {getTextWidth} from "../../../integration/text_measurement";
    import {tenacitySettings} from "../../../theme/tenacity";

    /*
     * Port of Tenacity's compact/impl/SettingComponents. Every Tenacity unit is 2px here,
     * settings rows are 16 units high.
     */

    export let configurable: ConfigurableSetting;
    export let path: string;
    export let onChange: () => void;

    function fmt(name: string) {
        return $spaceSeperatedNames ? convertToSpacedString(name) : name;
    }

    $: rows = flattenSettings(configurable.value);
    $: font14 = `14px "${$tenacitySettings.font}"`;

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
        dragElement = e.currentTarget as HTMLElement;
        updateNumber(row, dragElement, e.clientX);
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

    // The value box is as wide as the maximum value
    function valueWidth(row: Row & { kind: "number" }, font: string) {
        return getTextWidth(formatNumber(numberRange(row.setting).max), font) + 8;
    }

    function modeWidth(row: Row & { kind: "mode" }, font: string) {
        return Math.max(...row.modes.map(m => getTextWidth(m, font))) + 20;
    }
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}/>

<div class="settings">
    {#each rows as row (row.key)}
        <div class="row" style="--depth: {row.depth};">
            {#if row.kind === "boolean"}
                <div class="line">
                    <span class="name">{fmt(row.name)}</span>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <span class="checkbox" class:on={row.get()} on:click={() => setValue(row, !row.get())}>
                        {#if row.get()}<span class="check">{TenacityIcon.CHECKMARK}</span>{/if}
                    </span>
                </div>
            {:else if row.kind === "number"}
                <div class="line">
                    <span class="name">{fmt(row.name)}</span>
                    <span class="number-controls">
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <span class="slider" on:mousedown|stopPropagation={(e) => startDrag(row, e)}>
                            <span class="fill" style="width: max(6px, {percent(row) * 100}px);"></span>
                            <span class="tick" style="left: max(6px, {percent(row) * 100}px);"></span>
                        </span>
                        <span class="value" style="width: {valueWidth(row, font14)}px;">{formatNumber(row.setting.value)}</span>
                    </span>
                </div>
            {:else if row.kind === "mode"}
                <div class="line top">
                    <span class="name">{fmt(row.name)}</span>
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <span class="dropdown" style="width: {modeWidth(row, font14)}px;" on:contextmenu={(e) => toggleOpen(row.key, e)}>
                        <span class="dropdown-head">
                            {fmt(row.get())}
                            <span class="arrow" class:open={opened[row.key]}>{TenacityIcon.DROPDOWN_ARROW}</span>
                        </span>
                        {#if opened[row.key]}
                            <span class="dropdown-list" transition:slide={{duration: 250, easing: cubicOut}}>
                                {#each row.modes.filter(m => m !== row.get()) as mode (mode)}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span class="dropdown-item" on:click={() => { opened[row.key] = false; setValue(row, mode); }}>{fmt(mode)}</span>
                                {/each}
                            </span>
                        {/if}
                    </span>
                </div>
            {:else if row.kind === "multi"}
                <div class="line top">
                    <span class="name">{fmt(row.name)}</span>
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <span class="dropdown multi" on:contextmenu={(e) => toggleOpen(row.key, e)}>
                        <span class="dropdown-head centered">
                            {row.setting.value.length}/{row.setting.choices.length} enabled
                            <span class="arrow" class:open={opened[row.key]}>{TenacityIcon.DROPDOWN_ARROW}</span>
                        </span>
                        {#if opened[row.key]}
                            <span class="dropdown-list" transition:slide={{duration: 250, easing: cubicOut}}>
                                {#each row.setting.choices as choice (choice)}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span class="dropdown-item" class:on={row.setting.value.includes(choice)}
                                          on:click={() => toggleMulti(row, choice)}>{fmt(choice)}</span>
                                {/each}
                            </span>
                        {/if}
                    </span>
                </div>
            {:else if row.kind === "text"}
                <div class="line">
                    <span class="name">{fmt(row.name)}</span>
                    <input class="text-field" type="text" spellcheck="false" placeholder="Type Here..."
                           bind:value={row.setting.value} on:change={onChange}/>
                </div>
            {:else if row.kind === "header"}
                <div class="line"><span class="name header">{fmt(row.name)}</span></div>
            {:else}
                <div class="fallback tenacity-settings">
                    <GenericSetting {path} setting={row.setting} on:change={onChange}/>
                </div>
            {/if}
        </div>
    {/each}
</div>

<style lang="scss">
  $disabled: rgb(64, 68, 75);

  .settings {
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    color: white;
  }

  .row {
    padding-left: calc(var(--depth) * 10px);
  }

  .line {
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    column-gap: 8px;
    padding: 0 10px 0 10px;

    &.top {
      align-items: flex-start;

      .name {
        line-height: 32px;
      }
    }
  }

  .name {
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &.header {
      color: rgb(150, 150, 150);
    }
  }

  // BooleanSetting: a 10 unit square checkbox outlined with the accent colour when enabled
  .checkbox {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-right: 2px;
    border: solid 1px rgb(91, 97, 107);
    background-color: $disabled;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &.on {
      border-color: var(--accent-color);
    }

    .check {
      font-family: "TenacityIcons", sans-serif;
      font-size: 16px;
      line-height: 1;
    }
  }

  // NumberSetting: a 50x2 unit slider with a white tick, the value in a box on the right
  .number-controls {
    display: flex;
    align-items: center;
    column-gap: 14px;
    margin-right: -4px;
  }

  .slider {
    position: relative;
    width: 100px;
    height: 4px;
    background-color: $disabled;
    cursor: pointer;

    &::before {
      content: "";
      position: absolute;
      inset: -6px 0;
    }

    .fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background-color: var(--accent-color);
      transition: width 100ms linear;
    }

    .tick {
      position: absolute;
      top: -4px;
      width: 3px;
      height: 12px;
      background-color: white;
      transition: left 100ms linear;
    }
  }

  .value {
    height: 16px;
    background-color: $disabled;
    font-size: 14px;
    line-height: 16px;
    text-align: center;
  }

  // ModeSetting / MultipleBoolSetting: a 10 unit high box, right click opens the dropdown below
  .dropdown {
    flex-shrink: 0;
    margin: 6px -4px 0 0;
    display: flex;
    flex-direction: column;
    font-size: 14px;
    cursor: context-menu;

    &.multi {
      width: 130px;
    }
  }

  .dropdown-head {
    position: relative;
    height: 20px;
    line-height: 20px;
    padding: 0 18px 0 4px;
    background-color: $disabled;
    white-space: nowrap;

    &.centered {
      text-align: center;
      padding: 0 14px;
    }

    .arrow {
      position: absolute;
      right: 3px;
      top: 0;
      font-family: "TenacityIcons", sans-serif;
      font-size: 12px;
      transition: transform 250ms cubic-bezier(0.215, 0.61, 0.355, 1);

      &.open {
        transform: rotate(180deg);
      }
    }
  }

  .dropdown-list {
    display: flex;
    flex-direction: column;
    padding-bottom: 2px;
    margin-bottom: 4px;
    background-color: rgb(51, 54, 60);
  }

  .dropdown-item {
    height: 20px;
    line-height: 20px;
    padding: 0 4px;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      background-color: var(--accent-color);
    }

    .multi & {
      background-color: rgb(57, 61, 67);

      &.on {
        background-color: var(--accent-color);
      }

      &:hover {
        filter: brightness(.8);
      }
    }
  }

  // StringSetting: a 60x10 unit text field without a background
  .text-field {
    width: 120px;
    height: 20px;
    border: none;
    border-bottom: solid 1px $disabled;
    background: transparent;
    color: white;
    font-family: inherit;
    font-size: 14px;

    &::placeholder {
      color: rgba(255, 255, 255, .4);
    }
  }

  .fallback {
    padding: 0 10px 6px;
  }
</style>

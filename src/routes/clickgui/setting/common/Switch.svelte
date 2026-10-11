<script lang="ts">
    import {createEventDispatcher} from "svelte";

    export let value: boolean;
    export let name: string;

    const dispatch = createEventDispatcher();
</script>

<!--
    BooleanComponent (Tenacity dropdown click GUI):
    name on the left (16px, 50% -> 100% opacity), a 17x7 unit switch on the right with a 5x5 unit knob.
-->
<label class="switch-container" class:checked={value}>
    <span class="name">{name}</span>

    <span class="switch">
        <input type="checkbox" bind:checked={value} on:change={() => dispatch("change")}/>
        <span class="slider"></span>
    </span>
</label>

<style lang="scss">
  .switch-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    column-gap: 6px;
    cursor: pointer;
    min-width: 0;
    flex: 1;

    &.checked .name {
      color: white;
    }
  }

  .name {
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 16px;
    color: rgba(255, 255, 255, .5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  .switch {
    position: relative;
    flex-shrink: 0;
    width: 34px;
    height: 14px;
    margin-right: 1px;

    input {
      display: none;
    }
  }

  .slider {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    background-color: var(--tenacity-setting-control-color);
    transition: background-color 250ms cubic-bezier(0.215, 0.61, 0.355, 1), filter 250ms;

    &::before {
      position: absolute;
      content: "";
      width: 10px;
      height: 10px;
      top: 2px;
      left: 3px;
      border-radius: 4px;
      background-color: white;
      transition: transform 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
    }
  }

  .switch:hover .slider {
    filter: brightness(1.25);
  }

  input:checked + .slider {
    background-color: var(--secondary-color);

    &::before {
      transform: translateX(18px);
    }
  }
</style>

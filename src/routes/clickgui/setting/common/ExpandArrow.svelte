<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import {TenacityIcon} from "../../tenacity_icons";

    export let expanded: boolean;

    const dispatch = createEventDispatcher();

    function handleClick() {
        expanded = !expanded;
        dispatch("click");
    }
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button class="arrow" class:expanded on:click={handleClick}>{TenacityIcon.DROPDOWN_ARROW}</button>

<style lang="scss">
  .arrow {
    margin-left: 8px;
    cursor: pointer;
    background-color: transparent;
    border: none;
    font-family: "TenacityIcons", sans-serif;
    font-size: 20px;
    line-height: 1;
    color: rgba(255, 255, 255, .5);
    transition: transform 250ms cubic-bezier(0.215, 0.61, 0.355, 1), color 250ms;

    &.expanded {
      transform: rotate(180deg);
      color: white;
    }
  }
</style>

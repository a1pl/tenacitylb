<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import type {ModuleSetting, TextSetting,} from "../../../integration/types";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../theme/theme_config";

    export let setting: ModuleSetting;

    const cSetting = setting as TextSetting;

    const dispatch = createEventDispatcher();

    function handleChange() {
        setting = {...cSetting};
        dispatch("change");
    }
</script>

<div class="setting">
    <div class="name">{$spaceSeperatedNames ? convertToSpacedString(cSetting.name) : cSetting.name}</div>
    <input type="text" class="value" spellcheck="false"
           placeholder="Type here..."
           bind:value={cSetting.value}
           on:input={handleChange}
    >
</div>

<style lang="scss">

  /* StringComponent (Tenacity dropdown click GUI) */
  .setting {
    padding: 4px 0 6px;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
  }

  .name {
    color: white;
    font-size: 14px;
    padding-left: 2px;
    margin-bottom: 4px;
  }

  .value {
    width: 100%;
    background-color: rgb(45, 45, 45);
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 16px;
    color: white;
    border: solid 2px rgb(91, 91, 91);
    padding: 3px 6px;
    border-radius: 4px;
    transition: ease border-color .2s;

    &:focus {
      border-color: var(--secondary-color);
    }

    &::placeholder {
      color: rgba(255, 255, 255, .4);
    }

    &::-webkit-scrollbar {
      background-color: transparent;
    }
  }
</style>

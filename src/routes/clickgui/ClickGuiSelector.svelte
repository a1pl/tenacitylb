<script lang="ts">
    import ClickGui from "./ClickGui.svelte";
    import ModernClickGui from "./styles/ModernClickGui.svelte";
    import CompactClickGui from "./styles/CompactClickGui.svelte";
    import {tenacitySettings} from "../../theme/tenacity";
</script>

<!-- ClickGUIMod "ClickGui" mode: Dropdown, Modern or Compact -->
{#if $tenacitySettings.clickGui === "Modern"}
    <ModernClickGui/>
{:else if $tenacitySettings.clickGui === "Compact"}
    <CompactClickGui/>
{:else}
    <ClickGui/>
{/if}

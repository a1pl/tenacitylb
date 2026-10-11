<script lang="ts">
    import {description, scaleFactor, type TDescription} from "./clickgui_store";

    let data: TDescription | null = null;

    description.subscribe((v) => {
        data = v;
    });

    let mouseX = 0;
    let mouseY = 0;

    function onMouseMove(e: MouseEvent) {
        mouseX = e.clientX * (2 / $scaleFactor);
        mouseY = e.clientY * (2 / $scaleFactor);
    }
</script>

<svelte:window on:mousemove={onMouseMove}/>

<!--
    TooltipObject (Tenacity): drawn at the cursor (x - 2, y + 13 units), a rgb(15, 15, 15) box with a
    rgb(45, 45, 45) border, revealed from left to right while it fades in.
-->
{#key data}
    {#if data !== null}
        <div class="description" style="left: {mouseX - 4}px; top: {mouseY + 26}px;">
            {data.description}
        </div>
    {/if}
{/key}

<style lang="scss">
  @keyframes reveal {
    from {
      opacity: 0;
      clip-path: inset(-2px 100% -2px -2px);
    }
    to {
      opacity: 1;
      clip-path: inset(-2px -2px -2px -2px);
    }
  }

  .description {
    position: fixed;
    z-index: 999999999999;
    max-width: 400px;
    padding: 2px 4px;
    border-radius: 5px;
    outline: solid 1.5px rgb(45, 45, 45);
    background-color: rgb(15, 15, 15);
    color: white;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 14px;
    pointer-events: none;
    animation: reveal 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
  }
</style>

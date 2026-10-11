<script lang="ts">
    import {onDestroy, onMount} from "svelte";
    import {getClientInfo, getSession} from "../../../integration/rest";
    import {listen} from "../../../integration/ws";
    import type {ClientPlayerDataEvent} from "../../../integration/events";
    import {clientFirst, clientSecond, darker, rgba, tenacitySettings} from "../../../theme/tenacity";

    /*
     * Port of the watermark modes of Tenacity's HUDMod. Every Tenacity unit is 2px here.
     */

    export let settings: { [name: string]: any } = {};

    $: mode = (settings.mode as string | undefined) ?? "Tenacity";
    $: rawName = (settings.clientName as string | undefined) || "Tenacity";
    $: name = settings.lowercase ? rawName.toLowerCase() : rawName;
    // Empty: the version of the selected Tenacity style
    $: version = (settings.version as string | undefined) || ($tenacitySettings.version === 6 ? "6.0" : "5.2");
    // Tenacity only shows the version next to its own name
    $: showVersion = version.length > 0 && rawName.toLowerCase() === "tenacity";

    $: gradient = `linear-gradient(to right, ${rgba($clientFirst)}, ${rgba($clientSecond)})`;
    $: shadowGradient = `linear-gradient(to right, ${rgba(darker($clientFirst, .6))}, ${rgba(darker($clientSecond, .6))})`;

    let fps = 0;
    let username = "";
    let interval: number | undefined;
    let time = new Date();

    // HUDMod.getCurrentTimeStamp: "h:mm a"
    $: timeStamp = time.toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"});

    // "Tenabition": the first letter in the theme colour, the rest gray (§7)
    $: tenabitionName = rawName.replace("tenacity", "Tenabition");

    // "Logo": the name slides out of the logo after standing still for 300 ticks (15 seconds)
    let lastMoved = Date.now();
    let showLogoText = false;

    listen("clientPlayerData", (event: ClientPlayerDataEvent) => {
        const {x, z} = event.playerData.velocity;
        if (Math.abs(x) > 0.003 || Math.abs(z) > 0.003) {
            lastMoved = Date.now();
        }
    });

    async function updateInfo() {
        try {
            fps = (await getClientInfo()).fps;
        } catch {
            // The client might not be ready yet
        }
    }

    onMount(async () => {
        if (mode === "Neverlose") {
            await updateInfo();
        }
        interval = setInterval(() => {
            if (mode === "Neverlose" || mode === "Tenasense" || mode === "Tenabition") {
                updateInfo();
            }
            time = new Date();
            showLogoText = Date.now() - lastMoved >= 15000;
        }, 250);

        try {
            username = (await getSession()).username;
        } catch {
            username = "";
        }
    });

    onDestroy(() => clearInterval(interval));
</script>

{#if mode === "Tenacity"}
    <!--
        "Tenacity": duckSansBold 40 name and duckSans 16 version, filled with a horizontal gradient of the
        theme colours, over a copy shifted by one unit using the colours darkened to 60%.
    -->
    <div class="tenacity">
        <div class="text shadow" style="background-image: {shadowGradient};" aria-hidden="true">
            <span class="name">{name}</span>{#if showVersion}<span class="version">{version}</span>{/if}
        </div>
        <div class="text" style="background-image: {gradient};">
            <span class="name">{name}</span>{#if showVersion}<span class="version">{version}</span>{/if}
        </div>
    </div>
{:else if mode === "Plain Text"}
    <!-- "Plain Text": duckSansBold 26 with a black copy half a unit behind, gradient filled -->
    <div class="plain">
        <span class="shadow" aria-hidden="true">{name}</span>
        <span class="text" style="background-image: {gradient};">{name}</span>
    </div>
{:else if mode === "Neverlose"}
    <div class="neverlose">
        <span class="name" data-text={rawName.toUpperCase()}>{rawName.toUpperCase()}</span>
        <span class="info"> <span class="separator">|</span> {fps} fps <span class="separator">|</span> {username}</span>
    </div>
{:else if mode === "Tenasense"}
    <!--
        "Tenasense": skeet style box, rgb(59, 57, 57) frame around a rgb(23, 23, 23) panel, a gradient bar
        at its bottom and duckSans 16 text in the second theme colour. LiquidBounce does not expose the server
        address or ping to themes, so the frame rate is shown instead.
    -->
    <div class="tenasense" style="--gradient: {gradient}; color: {rgba($clientSecond)};">
        <div class="inner">
            <span class="white">tena</span>sense<span class="white">{` - ${username} - ${fps} fps `}</span>
        </div>
    </div>
{:else if mode === "Tenabition"}
    <!-- "Tenabition": Minecraft font with shadow, the client name in the first theme colour -->
    <div class="tenabition" style="color: {rgba($clientFirst)};">
        {tenabitionName.charAt(0)}<span class="gray">{tenabitionName.slice(1)} [<span class="white">FPS: {fps}</span>] [<span class="white">Time: {timeStamp}</span>]</span>
    </div>
{:else if mode === "Logo"}
    <!-- "Logo": watermarkBack.png filled with a diagonal theme gradient, watermarkT.png on top -->
    <div class="logo">
        <div class="back" style="background-image: linear-gradient(to bottom right, {rgba($clientSecond)}, {rgba($clientFirst)});"></div>
        <img class="t" src="img/tenacity/watermark-t.png" alt=""/>
        <div class="logo-text-clip">
            <span class="logo-text" class:shown={showLogoText}>{name}</span>
        </div>
    </div>
{/if}

<style lang="scss">
  .tenasense {
    position: relative;
    width: max-content;
    padding: 5px;
    background-color: rgb(59, 57, 57);
    // The thin darker lines just inside the frame
    outline: solid 1px rgb(41, 39, 39);
    outline-offset: -2px;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 16px;
    line-height: 1;
    white-space: pre;

    .inner {
      position: relative;
      height: 26px;
      padding: 6px 2px 0 4px;
      background-color: rgb(23, 23, 23);
      box-shadow: 0 0 0 1px rgb(41, 39, 39);

      &::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: 2px;
        height: 2px;
        background: var(--gradient);
      }
    }

    .white {
      color: white;
    }
  }

  .tenabition {
    font-family: "Minecraft", var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 18px;
    line-height: 1;
    white-space: pre;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, .75);

    .gray {
      color: #aaaaaa;
    }

    .white {
      color: white;
    }
  }

  .logo {
    position: relative;
    width: 110px;
    height: 110px;
    margin: 4px 0 0 4px;

    .back {
      position: absolute;
      inset: 0;
      mask: url("/img/tenacity/watermark-back.png") center / contain no-repeat;
    }

    .t {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  }

  .logo-text-clip {
    position: absolute;
    left: 6px;
    top: 0;
    height: 110px;
    width: 400px;
    padding-left: 106px;
    display: flex;
    align-items: center;
    overflow: hidden;
    pointer-events: none;
  }

  .logo-text {
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-weight: bold;
    font-size: 32px;
    color: rgba(255, 255, 255, .7);
    white-space: nowrap;
    opacity: 0;
    transform: translateX(-100%);
    transition: transform 500ms cubic-bezier(0.215, 0.61, 0.355, 1), opacity 500ms cubic-bezier(0.215, 0.61, 0.355, 1);

    &.shown {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .tenacity {
    position: relative;
    // The gradient is applied across the full width of name + version
    padding: 0 2px 2px 0;

    .text {
      display: flex;
      align-items: flex-start;
      width: max-content;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      font-family: var(--tenacity-font, "DuckSans"), sans-serif;
      line-height: 1;

      &.shadow {
        position: absolute;
        left: 2px;
        top: 2px;
      }

      &:not(.shadow) {
        position: relative;
      }
    }

    .name {
      font-weight: bold;
      font-size: 40px;
    }

    .version {
      font-size: 16px;
    }
  }

  .plain {
    position: relative;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-weight: bold;
    font-size: 26px;
    line-height: 1;

    .shadow {
      position: absolute;
      left: 1px;
      top: 1px;
      color: black;
    }

    .text {
      position: relative;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
    }
  }

  // "Neverlose": a black rounded box, the name in the Neverlose font with a blue copy behind it
  .neverlose {
    display: flex;
    align-items: center;
    padding: 6px 6px 6px 6px;
    border-radius: 4px;
    background-color: black;
    color: white;
    line-height: 1;

    .name {
      position: relative;
      font-family: "Neverlose", sans-serif;
      font-size: 22px;
      isolation: isolate;

      &::before {
        content: attr(data-text);
        position: absolute;
        left: 1px;
        top: 1px;
        z-index: -1;
        color: rgb(0, 149, 200);
      }
    }

    .info {
      font-family: var(--tenacity-font, "DuckSans"), sans-serif;
      font-size: 18px;
      white-space: pre;
    }

    .separator {
      color: #555555;
    }
  }
</style>

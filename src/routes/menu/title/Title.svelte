<script lang="ts">
    import {onMount} from "svelte";
    import {exitClient, getClientInfo, openScreen} from "../../../integration/rest";
    import {tenacitySettings} from "../../../theme/tenacity";
    import Particles from "./Particles.svelte";

    $: v6 = $tenacitySettings.version === 6;

    // Tenacity 6 TextButton row below the menu: "Scripting | Discord"
    const textButtons = [
        {title: "Scripting", url: "https://scripting.tenacity.dev"},
        {title: "Discord", url: "https://tenacity.dev/discord"},
    ];

    /*
     * Port of Tenacity's CustomMainMenu. Tenacity forces a GUI scale of 2, so every unit is 2px here.
     */

    const buttons = [
        {title: "Singleplayer", action: () => openScreen("singleplayer")},
        {title: "Multiplayer", action: () => openScreen("multiplayer")},
        {title: "Alt Manager", action: () => openScreen("altmanager")},
        {title: "Settings", action: () => openScreen("options")},
        {title: "Exit", action: () => exitClient()},
    ];

    let buttonElements: HTMLElement[] = [];
    let mouseX = -1000;
    let mouseY = -1000;

    let gameVersion = "";
    let clientVersion = "";

    function onMouseMove(e: MouseEvent) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    // The glow (circle-funny.png, 87x70 units) follows the cursor but is only drawn on the button outlines
    function glowPosition(element: HTMLElement | undefined, x: number, y: number) {
        if (!element) {
            return "";
        }
        const rect = element.getBoundingClientRect();
        return `--glow-x: ${x - rect.left}px; --glow-y: ${y - rect.top}px;`;
    }

    onMount(async () => {
        try {
            const info = await getClientInfo();
            gameVersion = info.gameVersion;
            clientVersion = info.clientVersion;
        } catch {
            // Static preview
        }
    });
</script>

<svelte:window on:mousemove={onMouseMove}/>

<div class="title-screen" class:v6>
    <div class="background"></div>
    {#if v6}
        <Particles/>
    {/if}

    <div class="center">
        <!-- 277x275.5 unit rectangle, blurred background (PostProcessing.runBloom with blur) -->
        <div class="card"></div>

        <div class="logo">
            <span class="name">Tenacity</span>
            <span class="version">{v6 ? "6.0" : "5.2"}</span>
        </div>
        <div class="credits">{v6 ? "by RealPacket" : "by d3Ck, bzdhyp"}</div>

        <div class="buttons">
            {#each buttons as button, index (button.title)}
                <button
                        class="menu-button"
                        bind:this={buttonElements[index]}
                        style={glowPosition(buttonElements[index], mouseX, mouseY)}
                        on:click={button.action}
                >
                    {button.title}
                </button>
            {/each}
        </div>

        {#if v6}
            <div class="text-buttons">
                {#each textButtons as button, index (button.title)}
                    <button class="text-button" on:click={() => window.open(button.url)}>{button.title}</button>
                    {#if index < textButtons.length - 1}<span class="separator">&nbsp;|&nbsp;</span>{/if}
                {/each}
            </div>
        {/if}
    </div>

    {#if !v6}
        <div class="footer">
            <div>Copyright Mojang AB. Do not distribute!</div>
            <div>Minecraft {gameVersion}{clientVersion ? ` (LiquidBounce ${clientVersion})` : ""}</div>
        </div>
    {/if}
</div>

<style lang="scss">
  .title-screen {
    position: fixed;
    inset: 0;
    overflow: hidden;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    color: white;
    user-select: none;
  }

  // Drawn here as well (and not only by the client) so the card can blur it
  .background {
    position: absolute;
    inset: 0;
    background: url("/img/tenacity/background.png") center / cover no-repeat;

    // Tenacity 6 draws funny.png, a diagonal gradient, with particles on top
    .v6 & {
      background-image: url("/img/tenacity/background6.png");
    }
  }

  // Tenacity 6 blurs the card with GaussianBlur(radius 40) instead of the kawase blur
  .v6 .card {
    backdrop-filter: blur(40px);
  }

  // TextButton: tenacityFont16 at height / 2 + 120, lifting by half its height when hovered
  .text-buttons {
    position: absolute;
    top: 240px;
    left: 0;
    transform: translateX(-50%);
    display: flex;
    align-items: flex-start;
    font-size: 16px;
    line-height: 1;
    white-space: nowrap;
  }

  .text-button {
    border: none;
    background: transparent;
    color: white;
    font: inherit;
    cursor: pointer;
    transition: transform 150ms cubic-bezier(0.215, 0.61, 0.355, 1);

    &:hover {
      transform: translateY(-8px);
    }
  }

  .center {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0;
    height: 0;
  }

  .card {
    position: absolute;
    left: -277px;
    top: -275.5px;
    width: 554px;
    height: 551px;
    border-radius: 20px;
    backdrop-filter: blur(20px);
    // rect-test.png: a thin dark edge and a very soft shadow around the rectangle
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .37), 0 0 60px rgba(0, 0, 0, .05);
  }

  // duckSansBold80 "Tenacity" at y = height / 2 - 110, version in duckSans32 at its end
  .logo {
    position: absolute;
    top: -226px;
    left: 0;
    transform: translateX(-50%);
    line-height: 1;
    white-space: nowrap;

    .name {
      display: inline-block;
      margin-top: 6px;
      font-weight: bold;
      font-size: 80px;
    }

    .version {
      position: absolute;
      right: 0;
      top: 0;
      transform: translateX(50%);
      font-size: 32px;
    }
  }

  .credits {
    position: absolute;
    top: -136px;
    left: 0;
    transform: translateX(-50%);
    font-size: 18px;
    line-height: 1;
    white-space: nowrap;
  }

  // MenuButton: 140x25 units, 30 units apart, starting at height / 2 - 37.5
  .buttons {
    position: absolute;
    top: -75px;
    left: -140px;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
  }

  .menu-button {
    position: relative;
    width: 280px;
    height: 50px;
    border: none;
    background: transparent;
    color: white;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 22px;
    cursor: pointer;

    // menu-rect.png: a 1px rounded outline in 20% white, lit up by the cursor glow
    &::before {
      content: "";
      position: absolute;
      inset: 0;
      padding: 1px;
      border-radius: 14px;
      background: radial-gradient(87px 65px at var(--glow-x, -1000px) var(--glow-y, -1000px),
              rgba(255, 255, 255, .9), rgba(255, 255, 255, .1) 100%, transparent 100%),
      rgba(255, 255, 255, .2);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }
  }

  .footer {
    position: absolute;
    left: 20px;
    bottom: 10px;
    font-size: 16px;
    line-height: 20px;
    color: rgba(255, 255, 255, .6);
    text-shadow: 1px 1px 0 rgba(0, 0, 0, .6);
  }
</style>

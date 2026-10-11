<script lang="ts">
    import {listen} from "../../../../integration/ws.js";
    import type {PlayerData} from "../../../../integration/types";
    import {REST_BASE} from "../../../../integration/host";
    import {scale} from "svelte/transition";
    import {cubicOut} from "svelte/easing";
    import type {ClientPlayerDataEvent, TargetChangeEvent} from "../../../../integration/events";
    import {getTextWidth} from "../../../../integration/text_measurement";
    import {colorWheel, interpolate, rgba, type Rgb, tenacitySettings} from "../../../../theme/tenacity";
    import ItemStackView from "../inventory/ItemStackView.svelte";

    /*
     * Port of Tenacity's default "Tenacity" TargetHUD. Every Tenacity unit is 2px here.
     */

    export let settings: { [name: string]: any } = {};
    $: mode = (settings.mode as string | undefined) ?? "Tenacity";

    let target: PlayerData | null = null;
    let player: PlayerData | null = null;
    let visible = true;

    let hideTimeout: number;

    function startHideTimeout() {
        hideTimeout = setTimeout(() => {
            visible = false;
        }, 1000);
    }

    listen("targetChange", (data: TargetChangeEvent) => {
        target = data.target;
        visible = true;
        clearTimeout(hideTimeout);
        startHideTimeout();
    });

    listen("clientPlayerData", (event: ClientPlayerDataEvent) => {
        player = event.playerData;
    });

    startHideTimeout();

    const AVATAR_SIZE = 76;

    $: width = target ? Math.max(310, getTextWidth(target.username, `bold 22px "${$tenacitySettings.font}"`) + 150) : 310;
    $: healthPercentage = target
        ? Math.min(1, (target.actualHealth + target.absorption) / Math.max(1, target.maxHealth + target.absorption))
        : 0;
    $: distance = target && player
        ? Math.round(Math.hypot(
            target.position.x - player.position.x,
            target.position.y - player.position.y,
            target.position.z - player.position.z
        ))
        : 0;

    // RoundedUtil.drawGradientRound(bottomLeft = color1, topLeft = color4, bottomRight = color2, topRight = color3), 80% opacity
    // VapeTargetHUD (Tenacity 6): ColorUtil.blendColors(red, orange, green) by health
    function vapeHealthColor(health: number): Rgb {
        const red = {r: 250, g: 50, b: 56}, orange = {r: 236, g: 129, b: 44}, green = {r: 5, g: 134, b: 105};
        return health < .5 ? interpolate(red, orange, health / .5) : interpolate(orange, green, (health - .5) / .5);
    }

    $: vapeHealth = target ? Math.min(1, target.actualHealth / Math.max(target.maxHealth, 1)) : 0;
    $: vapeAbsorption = target ? Math.min(target.absorption / Math.max(target.maxHealth, 1), 1) : 0;
    $: vapeItems = target
        ? [target.mainHandStack, ...[...target.armorItems].reverse()].filter(stack => stack && stack.count > 0)
        : [];

    $: topGradient = `linear-gradient(to right, ${rgba($colorWheel.color4, .8)}, ${rgba($colorWheel.color3, .8)})`;
    $: bottomGradient = `linear-gradient(to right, ${rgba($colorWheel.color1, .8)}, ${rgba($colorWheel.color2, .8)})`;
</script>

{#if visible && target != null && mode === "Vape"}
    <!-- VapeTargetHUD: 110x40 units, no background (only the post processing shadow behind the head and bar) -->
    <div class="vape" transition:scale={{ start: .5, duration: 175, easing: cubicOut }}>
        <div class="vape-avatar"
             style="--skin: url('{REST_BASE}/api/v1/client/resource/skin?uuid={target.uuid}');">
            <div class="face"></div>
            <div class="hat"></div>
        </div>
        <div class="vape-name">{target.username}</div>
        <div class="vape-hp">{Math.ceil(target.actualHealth + target.absorption)} hp</div>
        <div class="vape-bar">
            <div class="vape-health" style="width: {vapeHealth * 100}%; background-color: {rgba(vapeHealthColor(vapeHealth))};"></div>
            {#if target.absorption > 0}
                <div class="vape-absorption"
                     style="left: {Math.max(vapeHealth - vapeAbsorption, 0) * 100}%; width: {vapeAbsorption * 100}%;"></div>
            {/if}
        </div>
        <div class="vape-items">
            <div class="row">
                {#each vapeItems as stack}
                    <ItemStackView {stack}/>
                {/each}
            </div>
        </div>
    </div>
{:else if visible && target != null}
    <!-- TargetHUDMod open animation: DecelerateAnimation(175ms) scaling from 0.5 to 1 while fading in -->
    <div class="targethud" style="width: {width}px;" transition:scale={{ start: .5, duration: 175, easing: cubicOut }}>
        <div class="background" style="background-image: {topGradient};"></div>
        <div class="background bottom" style="background-image: {bottomGradient};"></div>

        <div class="avatar"
             style="--skin: url('{REST_BASE}/api/v1/client/resource/skin?uuid={target.uuid}'); --size: {AVATAR_SIZE}px;">
            <div class="face"></div>
            <div class="hat"></div>
        </div>

        <div class="info">
            <div class="name">{target.username}</div>

            <div class="health-bar">
                <div class="health" style="width: {healthPercentage * 100}%;"></div>
            </div>

            <div class="stats">{Math.round(healthPercentage * 100)}% - {distance}m</div>
        </div>
    </div>
{/if}

<style lang="scss">
  .vape {
    position: relative;
    width: 220px;
    height: 80px;
    color: white;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
  }

  .vape-avatar {
    position: absolute;
    left: 8px;
    top: 11px;
    width: 58px;
    height: 58px;
    border-radius: 2px;
    overflow: hidden;
    image-rendering: pixelated;
    background: url("/img/steve.png") center / cover;
    box-shadow: 0 0 8px rgba(0, 0, 0, .6);

    .face,
    .hat {
      position: absolute;
      inset: -2px;
      background-image: var(--skin);
      background-repeat: no-repeat;
      background-size: 496px auto;
    }

    .face {
      background-position: -62px -62px;
    }

    .hat {
      background-position: -310px -62px;
    }
  }

  .vape-name {
    position: absolute;
    left: 73px;
    top: 11px;
    font-size: 14px;
    font-weight: bold;
    line-height: 1;
    white-space: nowrap;
  }

  .vape-hp {
    position: absolute;
    right: 10px;
    top: 11px;
    font-size: 14px;
    line-height: 1;
  }

  .vape-bar {
    position: absolute;
    left: 74px;
    top: 27.6px;
    width: 136px;
    height: 4px;
    border-radius: 2px;
    background-color: rgb(43, 42, 43);
    box-shadow: 0 0 8px rgba(0, 0, 0, .6);

    .vape-health,
    .vape-absorption {
      position: absolute;
      top: 0;
      height: 100%;
      border-radius: 2px;
      transition: width 300ms cubic-bezier(0.215, 0.61, 0.355, 1), left 300ms;
    }

    .vape-absorption {
      background-color: #ffaa00;
    }
  }

  .vape-items {
    position: absolute;
    left: 73px;
    top: 39.4px;

    // Items are drawn at 80% scale, 17 units apart
    .row {
      display: flex;
      gap: 2px;
      zoom: .8;
    }
  }

  .targethud {
    position: relative;
    height: 100px;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    color: white;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
  }

  .background {
    position: absolute;
    inset: 0;

    &.bottom {
      mask-image: linear-gradient(to bottom, transparent, black);
    }
  }

  // The player's face (and hat layer) cut out of the skin texture, inside a 38 unit circle
  .avatar {
    position: relative;
    flex-shrink: 0;
    width: var(--size);
    height: var(--size);
    margin-left: 20px;
    border-radius: 50%;
    overflow: hidden;
    background: url("/img/steve.png") center / cover;
    image-rendering: pixelated;

    .face,
    .hat {
      position: absolute;
      inset: 0;
      background-image: var(--skin);
      background-repeat: no-repeat;
      background-size: calc(var(--size) * 8) auto;
    }

    .face {
      background-position: calc(var(--size) * -1) calc(var(--size) * -1);
    }

    .hat {
      background-position: calc(var(--size) * -5) calc(var(--size) * -1);
    }
  }

  .info {
    position: relative;
    flex: 1;
    height: 100%;
  }

  .name {
    position: absolute;
    top: 20px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 22px;
    font-weight: bold;
    line-height: 1;
    white-space: nowrap;
  }

  .health-bar {
    position: absolute;
    top: 50px;
    left: 20px;
    right: 20px;
    height: 8px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, .3);
    overflow: hidden;

    .health {
      height: 100%;
      border-radius: 4px;
      background-color: white;
      transition: width 300ms cubic-bezier(0.215, 0.61, 0.355, 1);
    }
  }

  .stats {
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 18px;
    line-height: 1;
  }
</style>

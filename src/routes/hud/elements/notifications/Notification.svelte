<script lang="ts">
    import {TenacityIcon} from "../../../clickgui/tenacity_icons";

    export let title: string;
    export let message: string;
    export let severity: string;
    export let onlyTitle = false;
    export let mode = "Default";
    // Time on screen in milliseconds, used by the Exhibition progress bar
    export let time = 2000;

    /*
     * Port of Tenacity's notification styles (Notification.drawDefault / drawSuicideX / drawExhi /
     * drawExhiModern). Every Tenacity unit is 2px here.
     */

    // NotificationType colours and icons
    const types: Record<string, { color: [number, number, number], icon: string }> = {
        SUCCESS: {color: [20, 250, 90], icon: TenacityIcon.CHECKMARK},
        ENABLED: {color: [20, 250, 90], icon: TenacityIcon.CHECKMARK},
        DISABLED: {color: [255, 30, 30], icon: TenacityIcon.XMARK},
        ERROR: {color: [255, 30, 30], icon: TenacityIcon.XMARK},
        INFO: {color: [255, 255, 255], icon: TenacityIcon.INFO},
    };

    $: type = types[severity] ?? types.INFO;
    $: [r, g, b] = type.color;
    // ColorUtil.interpolateColorC(Color.BLACK, type.getColor(), .65f) at 70% opacity
    $: background = `rgba(${Math.round(r * .65)}, ${Math.round(g * .65)}, ${Math.round(b * .65)}, .7)`;

    $: isToggle = severity === "ENABLED" || severity === "DISABLED";
    $: enabled = severity === "ENABLED";

    // Module.toggle: "SuicideX" puts everything into the title
    $: suicideXText = isToggle
        ? (enabled ? `Enabled Module ${message}. PogO` : `Disabled Module ${message}. :/`)
        : title + (title.endsWith(".") || title.endsWith("/") ? " " : ". ") + message;
</script>

{#if mode === "SuicideX"}
    <div class="suicidex">{suicideXText}</div>
{:else if mode === "Exhibition" || mode === "Modern Exhibition"}
    <div class="exhibition" class:modern={mode === "Modern Exhibition"}>
        <div class="icon" style="color: rgb({r}, {g}, {b});">{type.icon}</div>
        <div class="text">
            <div class="title">{isToggle ? "Module toggled" : title}</div>
            <div class="message">
                {#if isToggle}
                    {message} was <span class:enabled class:disabled={!enabled}>{enabled ? "enabled" : "disabled"}</span>
                {:else}
                    {message}
                {/if}
            </div>
        </div>
        <div class="progress" style="background-color: rgb({r}, {g}, {b}); animation-duration: {time}ms;"></div>
    </div>
{:else}
    <div class="notification" class:only-title={onlyTitle} style="background-color: {background};">
        <div class="icon" style="color: rgb({r}, {g}, {b});">{type.icon}</div>

        <div class="text">
            {#if isToggle}
                {#if onlyTitle}
                    <div class="title">{message} toggled</div>
                {:else}
                    <!-- Tenacity: "Module toggled" / "<module> was §aenabled" -->
                    <div class="title">Module toggled</div>
                    <div class="message">
                        {message} was
                        {#if enabled}
                            <span class="enabled">enabled</span>
                        {:else}
                            <span class="disabled">disabled</span>
                        {/if}
                    </div>
                {/if}
            {:else}
                <div class="title">{title}</div>
                {#if !onlyTitle}
                    <div class="message">{message}</div>
                {/if}
            {/if}
        </div>
    </div>
{/if}

<style lang="scss">
  .notification {
    display: flex;
    align-items: center;
    height: 56px;
    width: max-content;
    min-width: 0;
    padding: 0 24px 0 10px;
    border-radius: 8px;
    color: white;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;

    &.only-title {
      height: 38px;
    }

    .icon {
      font-family: "TenacityIcons", sans-serif;
      font-size: 35px;
      line-height: 1;
      margin: 2px 10px 0 0;
    }

    .text {
      display: flex;
      flex-direction: column;
      row-gap: 4px;
    }

    .title {
      font-size: 22px;
      font-weight: bold;
      line-height: 1;
    }

    .message {
      font-size: 18px;
      line-height: 1;
      white-space: nowrap;
    }
  }

  // "SuicideX": a single bold line, only the post processing blur/shadow behind it
  .suicidex {
    height: 32px;
    width: max-content;
    padding: 0 5px;
    display: flex;
    align-items: center;
    border-radius: 8px;
    backdrop-filter: blur(8px);
    background-color: rgba(0, 0, 0, .2);
    color: white;
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: 22px;
    font-weight: bold;
    white-space: nowrap;
  }

  // "Exhibition": a rgba(25, 25, 25, .75) rectangle with Tahoma text and a shrinking progress bar
  @keyframes progress {
    from {
      width: 100%;
    }
    to {
      width: 0;
    }
  }

  .exhibition {
    position: relative;
    height: 50px;
    width: max-content;
    padding: 0 30px 0 6px;
    display: flex;
    align-items: center;
    background-color: rgba(25, 25, 25, .75);
    color: white;
    font-family: "Tahoma", sans-serif;
    overflow: hidden;

    &.modern {
      border-radius: 4px;

      .progress {
        border-radius: 4px;
      }
    }

    .icon {
      font-family: "TenacityIcons", sans-serif;
      font-size: 40px;
      line-height: 1;
      margin: 2px 8px 0 0;
    }

    .text {
      display: flex;
      flex-direction: column;
      row-gap: 5px;
    }

    .title {
      font-size: 18px;
      line-height: 1;
    }

    .message {
      font-size: 14px;
      line-height: 1;
      white-space: nowrap;
    }

    .progress {
      position: absolute;
      right: 0;
      bottom: 0;
      height: 2px;
      animation: progress linear forwards;
    }
  }

  // Minecraft formatting codes §a and §c
  .enabled {
    color: #55ff55;
  }

  .disabled {
    color: #ff5555;
  }
</style>

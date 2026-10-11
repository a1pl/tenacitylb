<script lang="ts">
    import {flip} from "svelte/animate";
    import {listen} from "../../../../integration/ws";
    import Notification from "./Notification.svelte";
    import type {NotificationEvent, NotificationSeverity} from "../../../../integration/events";
    import {tenacitySettings} from "../../../../theme/tenacity";

    interface TNotification {
        animationKey: number;
        id: number;
        title: string;
        severity: NotificationSeverity;
        message: string;
    }

    export let settings: { [name: string]: any };

    let cSettings: HudNotificationsSettings;

    $: cSettings = settings as HudNotificationsSettings;
    // NotificationsMod "Time on Screen" (seconds)
    $: timeOnScreen = ((settings.time as number | undefined) ?? 2) * 1000;
    $: onlyTitle = (settings.onlyTitle as boolean | undefined) ?? false;
    $: mode = (settings.mode as string | undefined) ?? "Default";
    // NotificationsMod: animation duration and spacing ("actualOffset") per mode
    $: duration = ({"Default": 250, "SuicideX": 200, "Exhibition": 125, "Modern Exhibition": 177} as Record<string, number>)[mode] ?? 250;
    $: spacing = mode === "Default" ? 16 : 6;

    let notifications: TNotification[] = [];

    function addNotification(title: string, message: string, severity: NotificationSeverity) {
        if (!cSettings.severities.includes(severity)) return;

        let animationKey = Date.now();
        const id = animationKey;

        if (severity === "ENABLED" || severity === "DISABLED") {
            // Check if there still exists an enable/disable notification for the same module
            const index = notifications.findIndex((n) => n.message === message)
            if (index !== -1) {
                // Reuse the key so svelte animates it correctly
                animationKey = notifications[index].animationKey;
                notifications.splice(index, 1);
            }
        }

        notifications = [
            {animationKey, id, title, message, severity},
            ...notifications,
        ];

        setTimeout(() => {
            notifications = notifications.filter((n) => n.id !== id);
        }, timeOnScreen);
    }

    // Tenacity 5 uses a SmoothStepAnimation, Tenacity 6 a DecelerateAnimation:
    // slides in from the right edge of the screen and grows the stack
    function slideIn(node: HTMLElement) {
        const height = node.offsetHeight;
        const decelerate = $tenacitySettings.version === 6;
        return {
            duration,
            css: (t: number) => {
                const eased = decelerate ? 1 - (1 - t) * (1 - t) : t * t * (3 - 2 * t);
                return `transform: translateX(calc(${(1 - eased) * 100}% + ${(1 - eased) * 10}px)); height: ${height * eased}px;`;
            }
        };
    }

    listen("notification", (e: NotificationEvent) => {
        addNotification(e.title, e.message, e.severity);
    });
</script>

<div class="notifications">
    {#each notifications as {title, message, severity, animationKey} (animationKey)}
        <div
                class="entry"
                style="padding-top: {spacing}px;"
                animate:flip={{ duration: 250 }}
                transition:slideIn
        >
            <Notification {title} {message} {severity} {onlyTitle} {mode} time={timeOnScreen}/>
        </div>
    {/each}
</div>

<style lang="scss">
  .notifications {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .entry {
    padding-top: 16px;
  }
</style>

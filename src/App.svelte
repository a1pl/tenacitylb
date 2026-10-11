<script lang="ts">
    import Router, {location} from "svelte-spa-router";
    import Hud from "./routes/hud/Hud.svelte";
    import {getMetadata, getTheme, getVirtualScreen} from "./integration/rest";
    import {cleanupListeners, listenAlways} from "./integration/ws";
    import {onMount} from "svelte";
    import {insertPersistentData} from "./integration/persistent_storage";
    import {isStatic} from "./integration/host";
    import Inventory from "./routes/inventory/Inventory.svelte";
    import Title from "./routes/menu/title/Title.svelte";
    import Multiplayer from "./routes/menu/multiplayer/Multiplayer.svelte";
    import AltManager from "./routes/menu/altmanager/AltManager.svelte";
    import Singleplayer from "./routes/menu/singleplayer/Singleplayer.svelte";
    import ProxyManager from "./routes/menu/proxymanager/ProxyManager.svelte";
    import None from "./routes/none/None.svelte";
    import Disconnected from "./routes/menu/disconnected/Disconnected.svelte";
    import BasicMenu from "./routes/menu/basicmenu/BasicMenu.svelte";
    import Browser from "./routes/browser/Browser.svelte";
    import TabbedClickGui from "./routes/clickgui/TabbedClickGui.svelte";
    import {intToRgba, rgbaToHex} from "./integration/util";
    import type {ThemeColorChangeEvent, ValueChangedEvent} from "./integration/events";
    import Menu from "./routes/menu/common/Menu.svelte";
    import MenuContent from "./routes/menu/common/MenuContent.svelte";
    import {push} from "./integration/router";
    import {clientFirst, clientSecond, isGradientPreset, presets, type Rgb, tenacitySettings} from "./theme/tenacity";

    const menuRoutes = {
        "/title": Title,
        "/multiplayer": Multiplayer,
        "/altmanager": AltManager,
        "/singleplayer": Singleplayer,
        "/proxymanager": ProxyManager,
    };

    const routes = {
        "/clickgui": TabbedClickGui,
        "/hud": Hud,
        "/inventory": Inventory,
        "/none": None,
        "/disconnected": Disconnected,
        "/basicmenu": BasicMenu,
        "/browser": Browser
    };

    const SURFACE_TINT_MIX = 18;

    function isMenuRoute(route: string): boolean {
        return route in menuRoutes;
    }

    async function changeRoute(name: string) {
        const nextRoute = `/${name}`;
        if (!isMenuRoute($location) || !isMenuRoute(nextRoute)) {
            cleanupListeners();
        }

        console.log(`[Router] Redirecting to ${name}`);
        await push(nextRoute);
    }

    function setThemeColor(name: string, value: string) {
        document.documentElement.style.setProperty(`--${name}`, value);
    }

    function themeColorToHex(value: number) {
        return rgbaToHex(intToRgba(value));
    }

    function mixColors(leftColor: string, rightColor: string, strength: number) {
        return `color-mix(in srgb, ${leftColor} ${100 - strength}%, ${rightColor})`;
    }

    // Colours picked in the theme settings, used by the "Custom" preset
    let customFirst: Rgb = {r: 86, g: 171, b: 47};
    let customSecond: Rgb = {r: 168, g: 224, b: 99};

    // Theme wide options from metadata.json "values", keyed by their names
    const options: Record<string, any> = {
        TenacityVersion: "Tenacity 5",
        ClickGuiStyle: "Dropdown",
        TenacityFont: "Auto",
        ThemePreset: "Custom",
        PanelGradient: false,
        OutlineAccent: true,
        TransparentPanels: false,
    };

    function toRgb(color: number): Rgb {
        const [r, g, b] = intToRgba(color);
        return {r, g, b};
    }

    function toHex({r, g, b}: Rgb) {
        return rgbaToHex([r, g, b, 255]);
    }

    function applyOptions() {
        const version = options.TenacityVersion === "Tenacity 6" ? 6 : 5;
        const preset = options.ThemePreset in presets ? options.ThemePreset as string : "Custom";
        const [first, second] = preset === "Custom" ? [customFirst, customSecond] : presets[preset];
        const font = options.TenacityFont === "Auto" ? (version === 6 ? "Greycliff CF" : "DuckSans") : options.TenacityFont;

        clientFirst.set(first);
        clientSecond.set(second);
        setThemeColor("accent-color", toHex(first));
        setThemeColor("secondary-color", toHex(second));
        setThemeColor("tenacity-font", `"${font}"`);

        // Tenacity 6's custom theme is not a gradient theme, Tenacity 5's is
        const gradient = (preset === "Custom" ? version === 5 : isGradientPreset(preset, version))
            || options.PanelGradient === true;

        tenacitySettings.set({
            version,
            clickGui: ["Modern", "Compact"].includes(options.ClickGuiStyle) ? options.ClickGuiStyle : "Dropdown",
            font,
            preset,
            gradient,
            outlineAccent: options.OutlineAccent !== false,
            transparent: options.TransparentPanels === true,
        });

        document.documentElement.dataset.tenacity = version.toString();
    }

    function applyAccentColor(color: number) {
        customFirst = toRgb(color);
        applyOptions();
    }

    function applySecondaryColor(color: number) {
        customSecond = toRgb(color);
        applyOptions();
    }

    function loadOptions(settings: Record<string, any> | undefined) {
        if (!settings) {
            return;
        }
        for (const name of Object.keys(options)) {
            const key = name.charAt(0).toLowerCase() + name.slice(1);
            if (settings[key] !== undefined) {
                options[name] = settings[key];
            }
        }
    }

    function applyTintColor(defaultSurfaceColor: string, color: number) {
        setThemeColor("surface-color", mixColors(defaultSurfaceColor, themeColorToHex(color), SURFACE_TINT_MIX));
    }

    onMount(async () => {
        let metadata = await getMetadata();
        let defaultSurfaceColor = metadata.colors.Tint;

        let theme = await getTheme(metadata.id);

        loadOptions(theme.settings);
        customFirst = toRgb(theme.colors.accent);
        if (theme.colors.secondary !== undefined) {
            customSecond = toRgb(theme.colors.secondary);
        }
        applyOptions();
        applyTintColor(defaultSurfaceColor, theme.colors.tint);

        listenAlways("valueChanged", (event: ValueChangedEvent) => {
            const name = event.value?.name;
            if (name in options) {
                options[name] = event.value.value;
                applyOptions();
            }
        });

        await insertPersistentData();

        listenAlways("themeColorChange", async (event: ThemeColorChangeEvent) => {
            if (event.themeId !== metadata?.id) {
                return;
            }

            switch (event.name) {
                case "Accent":
                    applyAccentColor(event.value);
                    break;
                case "Secondary":
                    applySecondaryColor(event.value);
                    break;
                case "Tint":
                    applyTintColor(defaultSurfaceColor, event.value);
                    break;
            }
        });

        if (isStatic) {
            return;
        }

        listenAlways("socketReady", async () => {
            const virtualScreen = await getVirtualScreen();
            await changeRoute(virtualScreen.name || "none");
        });

        listenAlways("virtualScreen", async (event: any) => {
            console.log(`[Router] Virtual screen change to ${event.screenName}`);
            const action = event.action;

            switch (action) {
                case "close":
                    await changeRoute("none");
                    break;
                case "open":
                    await changeRoute(event.screenName || "none");
                    break;
            }
        });

        const virtualScreen = await getVirtualScreen();
        await changeRoute(virtualScreen.name || "none");
    });
</script>

<main>
    {#if $location === "/title"}
        <!-- Tenacity's main menu is a standalone screen without the menu header -->
        <Title/>
    {:else if isMenuRoute($location)}
        <Menu>
            {#key $location}
                <MenuContent>
                    <Router routes={menuRoutes}/>
                </MenuContent>
            {/key}
        </Menu>
    {:else}
        <Router {routes}/>
    {/if}
</main>

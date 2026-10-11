import {derived, readable, writable} from "svelte/store";

/**
 * Port of the colour helpers Tenacity uses for its HUD and click GUI
 * (dev.tenacity.utils.render.ColorUtil / GradientColorWheel).
 *
 * Tenacity themes are always a pair of colours. LiquidBounce only exposes a
 * single accent colour by default, so this theme declares an additional
 * "Secondary" colour in its metadata.
 */

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

// Default "Lush" theme - the default "Theme Selection" of Tenacity's HUD module.
export const clientFirst = writable<Rgb>({r: 86, g: 171, b: 47});
export const clientSecond = writable<Rgb>({r: 168, g: 224, b: 99});

/**
 * Theme wide options (declared as "values" in metadata.json).
 */
export interface TenacitySettings {
    version: 5 | 6;
    // ClickGUIMod "ClickGui" mode
    clickGui: "Dropdown" | "Modern" | "Compact";
    font: "DuckSans" | "Greycliff CF";
    preset: string;
    // DropdownClickGUI.gradient: the theme is a gradient theme or ClickGUIMod "Gradient" is enabled
    gradient: boolean;
    outlineAccent: boolean;
    transparent: boolean;
}

export const tenacitySettings = writable<TenacitySettings>({
    version: 5,
    clickGui: "Dropdown",
    font: "DuckSans",
    preset: "Custom",
    gradient: true,
    outlineAccent: true,
    transparent: false,
});

type Preset = [Rgb, Rgb];
const rgb = (r: number, g: number, b: number): Rgb => ({r, g, b});

/**
 * dev.tenacity.utils.render.Theme of Tenacity 5, plus the "Tenacity" theme added in Tenacity 6.
 */
export const presets: Record<string, Preset> = {
    "Little Leaf": [rgb(118, 184, 82), rgb(141, 194, 111)],
    "Lush": [rgb(86, 171, 47), rgb(168, 224, 99)],
    "Spearmint": [rgb(97, 194, 162), rgb(65, 130, 108)],
    "Jade Green": [rgb(0, 168, 107), rgb(0, 105, 66)],
    "Green Spirit": [rgb(0, 135, 62), rgb(159, 226, 191)],
    "Mint Blue": [rgb(66, 158, 157), rgb(40, 94, 93)],
    "Pacific Blue": [rgb(5, 169, 199), rgb(4, 115, 135)],
    "Tropical Ice": [rgb(102, 255, 209), rgb(6, 149, 255)],
    "Oh Happiness": [rgb(0, 176, 155), rgb(150, 201, 61)],
    "Rosy Pink": [rgb(255, 102, 204), rgb(191, 77, 153)],
    "Magenta": [rgb(213, 63, 119), rgb(157, 68, 110)],
    "Hot Pink": [rgb(231, 84, 128), rgb(172, 79, 198)],
    "Blush": [rgb(178, 69, 146), rgb(241, 95, 121)],
    "Piglet": [rgb(238, 156, 167), rgb(255, 221, 225)],
    "Lavender": [rgb(219, 166, 247), rgb(152, 115, 172)],
    "Amethyst": [rgb(144, 99, 205), rgb(98, 67, 140)],
    "Purple Fire": [rgb(104, 71, 141), rgb(177, 162, 202)],
    "Mauve": [rgb(66, 39, 90), rgb(115, 75, 109)],
    "Slight Ocean View": [rgb(168, 192, 255), rgb(63, 43, 150)],
    "Moon Purple": [rgb(78, 84, 200), rgb(143, 148, 251)],
    "Purplin": [rgb(106, 48, 147), rgb(160, 68, 255)],
    "Deep Purple": [rgb(103, 58, 183), rgb(81, 45, 168)],
    "Twitch": [rgb(100, 65, 165), rgb(42, 8, 69)],
    "Grapefruit Sunset": [rgb(233, 100, 67), rgb(144, 78, 149)],
    "Sunset Pink": [rgb(255, 145, 20), rgb(245, 105, 231)],
    "Blaze Orange": [rgb(255, 169, 77), rgb(255, 130, 0)],
    "Pastel": [rgb(255, 109, 106), rgb(191, 82, 80)],
    "Roseanna": [rgb(255, 175, 189), rgb(255, 195, 160)],
    "Haikus": [rgb(253, 116, 108), rgb(255, 144, 104)],
    "Light Orange": [rgb(255, 183, 94), rgb(237, 143, 3)],
    "Master Card": [rgb(244, 107, 69), rgb(238, 168, 73)],
    "Back to the Future": [rgb(192, 36, 37), rgb(240, 203, 53)],
    "Pink Blood": [rgb(228, 0, 70), rgb(255, 166, 201)],
    "Neon Red": [rgb(210, 39, 48), rgb(184, 25, 42)],
    "Red Coffee": [rgb(0, 0, 0), rgb(225, 34, 59)],
    "Bighead": [rgb(201, 75, 75), rgb(75, 19, 79)],
    "Red With White": [rgb(255, 0, 0), rgb(255, 255, 255)],
    "Netflix": [rgb(142, 14, 0), rgb(31, 28, 24)],
    "Frost": [rgb(0, 4, 40), rgb(0, 78, 146)],
    "Chambray Blue": [rgb(33, 46, 182), rgb(60, 82, 145)],
    "Solid Vault": [rgb(58, 123, 213), rgb(58, 96, 115)],
    "Deep Sea Space": [rgb(44, 62, 80), rgb(76, 161, 175)],
    "Dark Skies": [rgb(75, 121, 161), rgb(40, 62, 81)],
    "Joomla": [rgb(30, 60, 114), rgb(42, 82, 152)],
    "Nighthawk": [rgb(41, 128, 185), rgb(44, 62, 80)],
    "Clear Sky": [rgb(0, 92, 151), rgb(54, 55, 149)],
    "Between Night and Day": [rgb(44, 62, 80), rgb(52, 152, 219)],
    "Sage Persuasion": [rgb(204, 204, 178), rgb(117, 117, 25)],
    "Selenium": [rgb(60, 59, 63), rgb(96, 92, 60)],
    "Koko Caramel": [rgb(209, 145, 60), rgb(255, 209, 148)],
    "Color Of Sky": [rgb(224, 234, 252), rgb(207, 222, 243)],
    "Margo": [rgb(255, 239, 186), rgb(255, 255, 255)],
    "Lithium": [rgb(109, 96, 39), rgb(211, 203, 184)],
    "Pale Wood": [rgb(234, 205, 163), rgb(214, 174, 123)],
    "Portral": [rgb(142, 158, 171), rgb(238, 242, 243)],
    "Deep Space": [rgb(0, 0, 0), rgb(67, 67, 67)],
    "Lawrencium": [rgb(15, 12, 41), rgb(36, 36, 62)],
    "Deep Ocean": [rgb(60, 82, 145), rgb(0, 20, 64)],
    "eXpresso": [rgb(173, 83, 137), rgb(60, 16, 83)],
    "Tranquil": [rgb(238, 205, 163), rgb(239, 98, 159)],
    "Christmas": [rgb(47, 115, 54), rgb(170, 58, 56)],
    "Superman": [rgb(0, 153, 247), rgb(241, 23, 18)],
    "Minnesota Vikings": [rgb(86, 20, 176), rgb(219, 214, 92)],
    "Miami Dolphins": [rgb(77, 160, 176), rgb(211, 157, 56)],
    "Pizelex": [rgb(17, 67, 87), rgb(242, 148, 146)],
    "Green to dark": [rgb(106, 145, 19), rgb(20, 21, 23)],
    "Lizard": [rgb(48, 67, 82), rgb(215, 210, 204)],
    "Atlas A": [rgb(254, 172, 94), rgb(75, 192, 200)],
    "Atlas B": [rgb(254, 172, 94), rgb(199, 121, 208)],
    "Atlas C": [rgb(199, 121, 208), rgb(75, 192, 200)],
    // Tenacity 6
    "Tenacity": [rgb(236, 133, 209), rgb(28, 167, 222)],
};

// Tenacity 6 only marks some of its themes as gradient themes (Tenacity 5 treats every theme as one)
const tenacity6GradientPresets = new Set([
    "Green Spirit", "Hot Pink", "Purple Fire", "Sunset Pink", "Pink Blood", "Deep Ocean", "Tropical Ice", "Tenacity"
]);

export function isGradientPreset(preset: string, version: 5 | 6): boolean {
    if (version === 5) {
        return true;
    }
    return tenacity6GradientPresets.has(preset);
}

export function hexToRgb(hex: string): Rgb {
    const value = hex.replace("#", "");
    return {
        r: parseInt(value.substring(0, 2), 16),
        g: parseInt(value.substring(2, 4), 16),
        b: parseInt(value.substring(4, 6), 16),
    };
}

export function rgba({r, g, b}: Rgb, alpha = 1): string {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * ColorUtil.interpolateColorC
 */
export function interpolate(a: Rgb, b: Rgb, amount: number): Rgb {
    const t = Math.min(1, Math.max(0, amount));
    return {
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t),
    };
}

/**
 * ColorUtil.darker
 */
export function darker(c: Rgb, factor: number): Rgb {
    return {
        r: Math.max(Math.floor(c.r * factor), 0),
        g: Math.max(Math.floor(c.g * factor), 0),
        b: Math.max(Math.floor(c.b * factor), 0),
    };
}

/**
 * ColorUtil.interpolateColorsBackAndForth(speed, index, start, end, false)
 */
export function backAndForth(time: number, speed: number, index: number, start: Rgb, end: Rgb): Rgb {
    let angle = Math.floor((Math.floor(time / speed) + index) % 360);
    angle = (angle >= 180 ? 360 - angle : angle) * 2;
    return interpolate(start, end, angle / 360);
}

/**
 * Current time in milliseconds, updated every frame.
 */
export const now = readable(Date.now(), (set) => {
    let frame = 0;
    const update = () => {
        set(Date.now());
        frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
});

/**
 * GradientColorWheel in "Sync" mode with radial gradients enabled (Tenacity defaults).
 * Returns colours for the four corners of a rounded rectangle.
 */
export const colorWheel = derived([now, clientFirst, clientSecond], ([$now, first, second]) => ({
    color1: backAndForth($now, 15, 0, first, second),
    color2: backAndForth($now, 15, 90, first, second),
    color3: backAndForth($now, 15, 180, first, second),
    color4: backAndForth($now, 15, 270, first, second),
}));

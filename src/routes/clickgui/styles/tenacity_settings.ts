import type {
    BindSetting,
    BooleanSetting,
    ChoiceSetting,
    ChooseSetting,
    ConfigurableSetting,
    FloatSetting,
    IntSetting,
    Module,
    ModuleSetting,
    MultiChooseSetting,
    TextSetting,
    TogglableSetting
} from "../../../integration/types";
import {getCategories, getModules, getModuleSettings, setModuleSettings} from "../../../integration/rest";
import {waitMatches} from "../../../integration/ws";
import type {KeyboardKeyEvent} from "../../../integration/events";
import {isClickGuiScreen, UNKNOWN_KEY} from "../../../util/utils";

/**
 * Shared logic of the Modern and Compact click GUIs.
 *
 * Tenacity only has flat settings (boolean, mode, number, multi boolean, string, colour). LiquidBounce
 * settings can be nested, so they are flattened into rows; nested rows are indented by their depth.
 */

export type Row =
    | { kind: "boolean"; key: string; depth: number; name: string; get: () => boolean; set: (v: boolean) => void }
    | { kind: "mode"; key: string; depth: number; name: string; modes: string[]; get: () => string; set: (v: string) => void }
    | { kind: "number"; key: string; depth: number; name: string; setting: FloatSetting | IntSetting; integer: boolean }
    | { kind: "multi"; key: string; depth: number; name: string; setting: MultiChooseSetting }
    | { kind: "text"; key: string; depth: number; name: string; setting: TextSetting }
    | { kind: "header"; key: string; depth: number; name: string }
    | { kind: "fallback"; key: string; depth: number; name: string; setting: ModuleSetting };

export function flattenSettings(settings: ModuleSetting[], depth = 0, prefix = ""): Row[] {
    const rows: Row[] = [];

    for (const setting of settings) {
        const key = `${prefix}${setting.name}`;

        switch (setting.valueType) {
            case "BIND":
                // Tenacity binds modules from the module itself, not from a setting
                break;
            case "BOOLEAN": {
                const s = setting as BooleanSetting;
                rows.push({kind: "boolean", key, depth, name: s.name, get: () => s.value, set: v => s.value = v});
                break;
            }
            case "CHOOSE": {
                const s = setting as ChooseSetting;
                rows.push({kind: "mode", key, depth, name: s.name, modes: s.choices, get: () => s.value, set: v => s.value = v});
                break;
            }
            case "CHOICE": {
                const s = setting as ChoiceSetting;
                rows.push({
                    kind: "mode", key, depth, name: s.name, modes: Object.keys(s.choices),
                    get: () => s.active, set: v => s.active = v
                });
                const active = s.choices[s.active];
                if (active) {
                    rows.push(...flattenSettings(active.value as ModuleSetting[], depth + 1, `${key}.${s.active}.`));
                }
                break;
            }
            case "INT":
            case "FLOAT":
                rows.push({
                    kind: "number", key, depth, name: setting.name,
                    setting: setting as FloatSetting | IntSetting, integer: setting.valueType === "INT"
                });
                break;
            case "MULTI_CHOOSE":
                rows.push({kind: "multi", key, depth, name: setting.name, setting: setting as MultiChooseSetting});
                break;
            case "TEXT":
                rows.push({kind: "text", key, depth, name: setting.name, setting: setting as TextSetting});
                break;
            case "TOGGLEABLE": {
                const s = setting as TogglableSetting;
                const enabled = s.value[0] as BooleanSetting;
                rows.push({kind: "boolean", key, depth, name: s.name, get: () => enabled.value, set: v => enabled.value = v});
                rows.push(...flattenSettings(s.value.slice(1), depth + 1, `${key}.`));
                break;
            }
            case "CONFIGURABLE": {
                const s = setting as ConfigurableSetting;
                rows.push({kind: "header", key, depth, name: s.name});
                rows.push(...flattenSettings(s.value, depth + 1, `${key}.`));
                break;
            }
            default:
                rows.push({kind: "fallback", key, depth, name: setting.name, setting});
        }
    }

    return rows;
}

export function numberRange(setting: FloatSetting | IntSetting) {
    const min = Math.min(setting.range.from, setting.value);
    const max = Math.max(setting.range.to, setting.value);
    return {min, max};
}

/**
 * MathUtils.round(value, 2) with trailing zeros removed, as Tenacity displays numbers.
 */
export function formatNumber(value: number) {
    return (Math.round(value * 100) / 100).toString();
}

export async function loadSettings(module: string) {
    return await getModuleSettings(module);
}

export async function saveSettings(module: string, configurable: ConfigurableSetting) {
    await setModuleSettings(module, configurable);
    return await getModuleSettings(module);
}

export function bindSetting(configurable: ConfigurableSetting | undefined): BindSetting | undefined {
    return configurable?.value.find(v => v.valueType === "BIND") as BindSetting | undefined;
}

/**
 * Waits for the next key press and binds it, Tenacity unbinds with space, escape or delete.
 */
export async function captureBind(module: string): Promise<ConfigurableSetting> {
    const event = await waitMatches("keyboardKey", (e: KeyboardKeyEvent) => isClickGuiScreen(e.screen) && e.action === 1);
    const configurable = await getModuleSettings(module);
    const bind = bindSetting(configurable);
    if (bind) {
        const unbind = ["key.keyboard.space", "key.keyboard.escape", "key.keyboard.delete"].includes(event.key);
        bind.value.boundKey = unbind ? UNKNOWN_KEY : event.key;
        bind.value.modifiers = [];
        await setModuleSettings(module, configurable);
    }
    return await getModuleSettings(module);
}

/**
 * Modules grouped by category, in LiquidBounce's category order.
 */
export async function loadCategories(): Promise<{ categories: string[], modules: Record<string, Module[]> }> {
    const [modules, categoryList] = await Promise.all([getModules(), getCategories()]);
    const grouped: Record<string, Module[]> = {};
    for (const module of modules) {
        (grouped[module.category] ??= []).push(module);
    }
    const categories = categoryList.map(c => c.name).filter(c => grouped[c]);
    for (const category of Object.keys(grouped)) {
        if (!categories.includes(category)) {
            categories.push(category);
        }
    }
    return {categories, modules: grouped};
}

export function matchesSearch(module: Module, query: string) {
    const pure = query.toLowerCase().replaceAll(" ", "");
    return module.name.toLowerCase().includes(pure)
        || module.aliases.some(a => a.toLowerCase().includes(pure))
        || module.category.toLowerCase().includes(pure);
}

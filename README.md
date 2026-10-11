# Tenacity theme for LiquidBounce

A LiquidBounce theme that recreates the look of the Tenacity client. It is built on the
LiquidBounce default theme (Svelte). The visuals are ported from the Tenacity 5 client source:
sizes, colours, fonts, animation timings and assets.

Tenacity draws its GUI at a GUI scale of 2, so one Tenacity unit is 2px in this theme.

## What is ported

| Tenacity (source)                                  | Theme file                                                    |
|----------------------------------------------------|---------------------------------------------------------------|
| Dropdown click GUI (`CategoryPanel`, `ModuleRect`) | `src/routes/clickgui/Panel.svelte`, `Module.svelte`           |
| Setting components (boolean, mode, number, multi-bool, string, keybind) | `src/routes/clickgui/setting/**`     |
| Search bar (CTRL+F, filters the panels)            | `src/routes/clickgui/Search.svelte`                           |
| Tooltips (`TooltipObject`)                         | `src/routes/clickgui/Description.svelte`                      |
| Watermark (Tenacity, Plain Text, Neverlose modes)  | `src/routes/hud/elements/Watermark.svelte`                    |
| ArrayList (`ArrayListMod`)                         | `src/routes/hud/elements/ArrayList.svelte`                    |
| "Tenacity" TargetHUD                               | `src/routes/hud/elements/targethud/TargetHud.svelte`          |
| Default notifications                              | `src/routes/hud/elements/notifications/*`                     |
| Main menu (`CustomMainMenu`, `MenuButton`)         | `src/routes/menu/title/Title.svelte`                          |
| Fonts (DuckSans, icon font, Neverlose, Tahoma), background | `public/fonts`, `public/backgrounds`, `public/img/tenacity` |

The colour helpers from `ColorUtil` / `GradientColorWheel` are in `src/theme/tenacity.ts`.

## Theme options

These are in the LiquidBounce theme settings:

| Option              | What it does                                                                                     |
|---------------------|--------------------------------------------------------------------------------------------------|
| `TenacityVersion`   | **Tenacity 5** or **Tenacity 6** style (see below).                                               |
| `ClickGuiStyle`     | Tenacity's ClickGUI modes: **Dropdown**, **Modern** or **Compact** (see below).                   |
| `TenacityFont`      | `Auto` follows the version: DuckSans for 5, Greycliff CF for 6. You can also pick either font.    |
| `ThemePreset`       | Tenacity's theme list, including Tenacity 6's pink → blue "Tenacity" theme. `Custom` uses the Accent and Secondary colours. |
| `PanelGradient`     | ClickGUI "Gradient": forces gradient panels for non-gradient themes.                              |
| `OutlineAccent`     | ClickGUI "Outline Accent": when off, panels get a dark frame and header.                          |
| `TransparentPanels` | ClickGUI "Transparent": panel colours at 75% opacity.                                             |
| `SyncModuleColors`  | Lets the TenacityLB add-on copy the theme colours into modules such as ESP and Chams.             |

Tenacity themes are a pair of colours. With the `Custom` preset, the **Accent** and **Secondary**
colours are used. Their defaults are Tenacity 5's "Lush" theme (`#56AB2F` → `#A8E063`).

### Tenacity 6 style

Ported from the Tenacity 6 client source:

- Greycliff CF font.
- ClickGUI rows are 15 units high, with centred names at 90% opacity and no expand arrow (right-click a module for its settings).
- Only some themes are gradients. Others fill the panels with the first colour and enabled modules with the second.
- Main menu with a gradient background, drifting blob particles, a stronger blur, version 6.0, "by RealPacket" and "Scripting | Discord" links.
- Notifications slide in with a decelerate animation.

### ClickGUI styles

Ported from Tenacity 6's modern and compact click GUIs (`src/routes/clickgui/styles`):

- **Modern:** a 370×255 unit window with a category sidebar that expands while hovered, and module cards with a gradient checkbox.
  - Left click toggles a module, middle click binds it (space, escape or delete unbinds), right click opens its settings panel.
  - In the settings panel, right-click mode and multi-choose settings to open them, as in Tenacity.
  - Clicks leave a ring effect, and the window slides in from the left.
- **Compact:** a 475×300 unit window with categories on the left and modules in two columns, each with its settings below it.
  - Click the key box next to a module name to bind it, and right-click mode and multi-choose settings to open them.
  - Module descriptions show as tooltips after 900ms.
  - The bottom of the sidebar shows your Minecraft account where Tenacity showed the linked Discord account.

LiquidBounce settings can be nested, so both styles show nested settings as indented rows. LiquidBounce
setting types that Tenacity has no widget for (colours, lists, ranges, vectors and so on) use the Dropdown style's widgets.

Tenacity 6 also has a `SkeetMenu` class, but it is empty (`public class SkeetMenu {}`) and is not one of
Tenacity's ClickGUI modes, so there is nothing to port.

## HUD options

These are in the HUD editor:

- **Watermark:** Tenacity, Plain Text, Neverlose, Tenasense, Tenabition and Logo modes. An empty `Version` follows the selected style (5.2 or 6.0).
- **ArrayList:** rectangle style, text shadow, animation, colour speed and separation, background, and Tenacity 6's "Important" (hides render modules).
- **TargetHud:** Tenacity, or Vape (new in Tenacity 6).
- **Notifications:** Default, SuicideX, Exhibition and Modern Exhibition modes, plus time and "Only Title".

## Not ported

- Tenacity's own alt manager, side GUI (configs and scripts) and the "Modern" and "Compact" click GUIs.
- Other menu screens (multiplayer, singleplayer, alt manager, proxy manager) keep LiquidBounce's
  layout, but use Tenacity's font and colours.
- LiquidBounce does not give themes the server address or ping. The Neverlose and Tenasense watermarks
  show the frame rate instead.
- Exhibition notifications appear where the Notifications component is placed, not in the middle of the screen.
- LiquidBounce has more categories than Tenacity. Categories without a Tenacity icon get the
  closest glyph: World uses the folder/pin glyph, Fun uses the star.

## Building

```bash
npm install
npm run build
```

Copy the contents of `dist/` to `<game directory>/LiquidBounce/themes/tenacity/` and select the
theme in LiquidBounce.

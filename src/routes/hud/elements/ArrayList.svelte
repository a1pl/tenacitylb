<script lang="ts">
    import {onMount, tick} from "svelte";
    import type {Module} from "../../../integration/types";
    import {getModules} from "../../../integration/rest";
    import {listen} from "../../../integration/ws";
    import {getTextWidth} from "../../../integration/text_measurement";
    import {flip} from "svelte/animate";
    import {cubicOut} from "svelte/easing";
    import {convertToSpacedString, spaceSeperatedNames} from "../../../theme/theme_config";
    import {backAndForth, clientFirst, clientSecond, darker, now, rgba, tenacitySettings} from "../../../theme/tenacity";

    /*
     * Port of Tenacity's ArrayListMod. Every Tenacity unit is 2px here.
     */

    export let settings: { [name: string]: any };

    let cSettings = settings as HudArrayListSettings;

    interface ArrayListEntry extends Module {
        displayName: string;
        width: number;
    }

    let enabledModules: ArrayListEntry[] = [];

    $: rectangle = cSettings.rectangle ?? "Top";
    $: textShadow = cSettings.textShadow ?? "Black";
    $: animation = cSettings.animation ?? "Scale in";
    $: bold = cSettings.bold ?? false;
    $: fontSize = cSettings.smallFont ? 18 : 20;
    $: rowHeight = ((cSettings.height ?? 11) + 1) * 2;
    $: colorSeparation = cSettings.colorSeparation ?? 20;
    $: colorSpeed = cSettings.colorSpeed ?? 15;
    $: background = cSettings.background ?? true;
    $: backgroundColor = cSettings.backgroundColor ?? false;
    $: backgroundAlpha = cSettings.backgroundAlpha ?? .35;
    $: rightAligned = cSettings.itemAlignment !== "Left";
    $: font = `${bold ? "bold " : ""}${fontSize}px "${$tenacitySettings.font}"`;
    $: font, updateEnabledModules();

    function formatName(name: string) {
        return $spaceSeperatedNames ? convertToSpacedString(name) : name;
    }

    async function updateEnabledModules() {
        const modules = await getModules();
        // Tenacity 6 "Important": hides render modules
        const visibleModules = modules.filter(m => m.enabled && !m.hidden
            && !(cSettings.important && m.category === "Render"));

        const modulesWithWidths = visibleModules.map(module => {
            const displayName = formatName(module.name);
            const fullName = module.tag == null || !cSettings.showTags
                ? displayName
                : displayName + " " + module.tag;

            return {
                ...module,
                displayName,
                width: getTextWidth(fullName, font)
            };
        });

        modulesWithWidths.sort((a, b) => cSettings.order === "Ascending" ? a.width - b.width : b.width - a.width);

        enabledModules = modulesWithWidths;
        await tick();
    }

    // ColorUtil.interpolateColorsBackAndForth(colorSpeed, count * colorSeparation, color1, color2)
    function colorAt(time: number, index: number) {
        return backAndForth(time, colorSpeed, index * colorSeparation, $clientFirst, $clientSecond);
    }

    // DecelerateAnimation(250ms): the row grows in height while the text scales up (or slides in)
    function moduleAnimation(node: HTMLElement) {
        const height = node.offsetHeight;
        return {
            duration: animation === "None" ? 0 : 250,
            easing: cubicOut,
            css: (t: number) => {
                let transform = "";
                if (animation === "Scale in") {
                    transform = `transform: scale(${t}); opacity: ${t};`;
                } else if (animation === "Move in") {
                    transform = `transform: translateX(${(1 - t) * (rightAligned ? 1 : -1) * 110}%);`;
                }
                return `height: ${height * t}px; ${transform}`;
            }
        };
    }

    $: if (cSettings !== settings) {
        cSettings = settings as HudArrayListSettings;
        updateEnabledModules();
    }

    spaceSeperatedNames.subscribe(async () => {
        await updateEnabledModules();
    });

    onMount(async () => {
        await updateEnabledModules();
    });

    listen("moduleToggle", async () => {
        await updateEnabledModules();
    });

    listen("refreshArrayList", async () => {
        await updateEnabledModules();
    });
</script>

<div class="arraylist"
     class:left={!rightAligned}
     class:bold
     style="--row-height: {rowHeight}px; --font-size: {fontSize}px;">
    {#each enabledModules as {name, displayName, tag, width}, index (name)}
        {@const color = colorAt($now, index)}
        {@const previousWidth = index > 0 ? enabledModules[index - 1].width : width}
        <div
                class="module"
                class:first={index === 0}
                class:last={index === enabledModules.length - 1}
                style="
                    --color: {rgba(color)};
                    --shadow-color: {textShadow === 'Colored' ? rgba(darker(color, .5)) : 'black'};
                    --background: {background ? rgba(backgroundColor ? color : {r: 10, g: 10, b: 10}, backgroundAlpha) : 'transparent'};
                    --width-difference: {Math.max(0, previousWidth - width)}px;
                "
                animate:flip={{ duration: 250, easing: cubicOut }}
                transition:moduleAnimation
        >
            <div class="content rectangle-{rectangle.toLowerCase()} shadow-{textShadow.toLowerCase()}">
                <span class="name" data-text={displayName}>{displayName}</span>
                {#if tag && cSettings.showTags}
                    <span class="tag" data-text={" " + tag}>&nbsp;{tag}</span>
                {/if}
                {#if rectangle === "Outline" && index > 0}
                    <span class="connector"></span>
                {/if}
            </div>
        </div>
    {/each}
</div>

<style lang="scss">
  .arraylist {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    // Space for the "Top" rectangle that is drawn one unit above the first module
    padding-top: 2px;

    &.left {
      align-items: flex-start;
    }
  }

  .module {
    height: var(--row-height);
    transform-origin: center;
  }

  .content {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
    // Background rectangle: 2 units left of the text, 3 units right of it
    padding: 0 6px 0 4px;
    background-color: var(--background);
    font-family: var(--tenacity-font, "DuckSans"), sans-serif;
    font-size: var(--font-size);
    white-space: pre;
    color: var(--color);

    .bold & {
      font-weight: bold;
    }

    .left & {
      padding: 0 6px 0 4px;
    }
  }

  .name,
  .tag {
    position: relative;
  }

  .tag {
    color: #aaaaaa;
  }

  // Text shadows are drawn as a copy of the text behind it (Tenacity draws the stripped text again)
  .shadow-black .name::before,
  .shadow-black .tag::before,
  .shadow-colored .name::before,
  .shadow-colored .tag::before {
    content: attr(data-text);
    position: absolute;
    left: 0;
    top: 0;
    z-index: -1;
    color: var(--shadow-color);
    white-space: pre;
  }

  .shadow-black .name::before,
  .shadow-black .tag::before {
    transform: translate(1px, 1px);
  }

  .shadow-colored .name::before,
  .shadow-colored .tag::before {
    transform: translate(2px, 2px);
  }

  .shadow-black .name,
  .shadow-black .tag,
  .shadow-colored .name,
  .shadow-colored .tag {
    isolation: isolate;
  }

  // "Top": a one unit bar above the first module
  .first .rectangle-top::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: -2px;
    height: 2px;
    background-color: var(--color);
  }

  // "Side": a one unit bar on the outer side of every module
  .rectangle-side::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 2px;
    background-color: var(--color);

    .left & {
      right: auto;
      left: -2px;
    }
  }

  // "Outline": borders around the whole list, stepping inwards with the module widths
  .rectangle-outline {
    &::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: -2px;
      width: 2px;
      background-color: var(--color);

      .left & {
        left: auto;
        right: -2px;
      }
    }

    &::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      width: 2px;
      background-color: var(--color);

      .left & {
        right: auto;
        left: 0;
      }
    }

    // Connector between this module and the wider module above it
    .connector {
      position: absolute;
      top: 0;
      right: 100%;
      width: calc(var(--width-difference) + 2px);
      height: 2px;
      background-color: var(--color);

      .left & {
        right: auto;
        left: 100%;
      }
    }
  }

  .first .rectangle-outline {
    box-shadow: 0 -2px 0 0 var(--color), -2px -2px 0 0 var(--color);
  }

  .last .rectangle-outline {
    box-shadow: 0 2px 0 0 var(--color), -2px 2px 0 0 var(--color);
  }

  .first.last .rectangle-outline {
    box-shadow: 0 -2px 0 0 var(--color), -2px -2px 0 0 var(--color),
    0 2px 0 0 var(--color), -2px 2px 0 0 var(--color);
  }
</style>

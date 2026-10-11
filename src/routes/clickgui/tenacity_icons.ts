/**
 * Glyphs of Tenacity's icon font (dev.tenacity.utils.font.FontUtil).
 */
export const TenacityIcon = {
    BUG: "a",
    LIST: "b",
    BOMB: "c",
    EYE: "d",
    PERSON: "e",
    WHEELCHAIR: "f",
    DISPLAY: "g",
    INFO: "m",
    SETTINGS: "n",
    CHECKMARK: "o",
    XMARK: "p",
    TRASH: "q",
    WARNING: "r",
    FOLDER: "s",
    DROPDOWN_ARROW: "z",
    SEARCH: "B",
    STAR: "G",
} as const;

// Tenacity's dev.tenacity.module.Category icons, LiquidBounce-only categories get the closest glyph.
const categoryIcons: Record<string, string> = {
    combat: TenacityIcon.BOMB,
    movement: TenacityIcon.WHEELCHAIR,
    render: TenacityIcon.EYE,
    player: TenacityIcon.PERSON,
    exploit: TenacityIcon.BUG,
    misc: TenacityIcon.LIST,
    client: TenacityIcon.DISPLAY,
    world: TenacityIcon.FOLDER,
    fun: TenacityIcon.STAR,
};

export function categoryIcon(category: string): string {
    return categoryIcons[category.toLowerCase()] ?? TenacityIcon.LIST;
}

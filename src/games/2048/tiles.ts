/**
 * The classic 2048 tile palette. Each tile carries its own strong background, so
 * the same colours read well in both light and dark themes — only the board
 * frame and empty slots are themed (by the screen, from ThemeColors). Values
 * above 2048 all share the dark "super tile" look.
 */
const PALETTE: Record<number, { bg: string; fg: string }> = {
  2: { bg: "#eee4da", fg: "#776e65" },
  4: { bg: "#ede0c8", fg: "#776e65" },
  8: { bg: "#f2b179", fg: "#ffffff" },
  16: { bg: "#f59563", fg: "#ffffff" },
  32: { bg: "#f67c5f", fg: "#ffffff" },
  64: { bg: "#f65e3b", fg: "#ffffff" },
  128: { bg: "#edcf72", fg: "#ffffff" },
  256: { bg: "#edcc61", fg: "#ffffff" },
  512: { bg: "#edc850", fg: "#ffffff" },
  1024: { bg: "#edc53f", fg: "#ffffff" },
  2048: { bg: "#edc22e", fg: "#ffffff" },
};

const SUPER = { bg: "#3c3a32", fg: "#ffffff" };

export const tileColors = (value: number): { bg: string; fg: string } =>
  PALETTE[value] ?? SUPER;

/** Numbers get smaller as they get longer, so 1024/2048 still fit their tile. */
export const tileFontSize = (value: number): number => {
  if (value >= 1024) return 20;
  if (value >= 128) return 24;
  return 30;
};

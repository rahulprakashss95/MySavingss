import { vars } from "nativewind";
import { ThemeColors } from "./Color";

/**
 * Bridges the app's ThemeColors onto the CSS variables that Tailwind's semantic
 * tokens (see tailwind.config.js) read from. Applied once near the root, it lets
 * NativeWind classes like `bg-background text-text` follow the exact same
 * light/dark/system toggle as the StyleSheet styles — Color.ts stays the single
 * source of truth, and the two styling systems never disagree.
 */
export const themeVars = (colors: ThemeColors) =>
  vars({
    "--color-background": colors.background,
    "--color-card": colors.card,
    "--color-border": colors.border,
    "--color-text": colors.text,
    "--color-muted": colors.textMuted,
    "--color-primary": colors.primary,
    "--color-on-primary": colors.onPrimary,
    "--color-input": colors.inputBackground,
    "--color-placeholder": colors.placeholder,
    "--color-positive": colors.positive,
    "--color-negative": colors.negative,
    "--color-accent-blue": colors.accentBlue,
    "--color-accent-amber": colors.accentAmber,
    "--color-accent-violet": colors.accentViolet,
  });

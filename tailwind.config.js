/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Drive dark mode by class, not `media`. The app owns its light/dark toggle
  // (see ThemeContext + themeVars), and on web react-native-css-interop throws
  // "Cannot manually set color scheme, as dark mode is type 'media'" the moment
  // anything sets the scheme (e.g. a <head> mutation from installWebStyles).
  // Class mode silences that; we don't use `dark:` variants, so nothing else
  // changes. https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually
  darkMode: "class",
  theme: {
    extend: {
      // Semantic tokens resolve to CSS variables set at runtime from the app's
      // ThemeColors (see src/utils/themeVars.ts), so `bg-background` follows the
      // same light/dark toggle as the StyleSheet styles — one source of truth in
      // src/utils/Color.ts, no palette duplicated here.
      colors: {
        background: "var(--color-background)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        primary: "var(--color-primary)",
        "on-primary": "var(--color-on-primary)",
        input: "var(--color-input)",
        placeholder: "var(--color-placeholder)",
        positive: "var(--color-positive)",
        negative: "var(--color-negative)",
        "accent-blue": "var(--color-accent-blue)",
        "accent-amber": "var(--color-accent-amber)",
        "accent-violet": "var(--color-accent-violet)",
      },
    },
  },
  plugins: [],
};

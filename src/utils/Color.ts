export const Colors = {
  primary: "#26619c",
  F7F7F7: "#F7F7F7",
};

export type ThemeColors = {
  primary: string;
  onPrimary: string;
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  inputBackground: string;
  placeholder: string;
  positive: string;
  negative: string;
  shadow: string;
  overlay: string;
  /** Accents for tiles/icons. Each is legible on `card` in its own theme. */
  accentBlue: string;
  accentAmber: string;
  accentViolet: string;
  /**
   * Bar fills. One hue per chart (magnitude, not identity) — never cycled.
   * Both pass the six-check palette validator against their own surface.
   */
  chartAmount: string;
  chartInterest: string;
  chartTrack: string;
  /**
   * Categorical series hues, assigned in fixed order and never cycled. Six is
   * the cap — a stacked chart folds anything past five slots into "Other"
   * (chartOther). Validated as a set against `card` in each mode: light worst
   * adjacent CVD ΔE 24.2; dark 10.3 (the floor band, so segments carry a 2px
   * surface gap and every value is direct-labelled in the readout).
   */
  chartSeries: string[];
  chartOther: string;
};

/**
 * Icon-chip background: the accent at ~13% alpha. RN and react-native-web both
 * accept 8-digit #RRGGBBAA.
 */
export const tint = (accent: string) => `${accent}22`;

export const LightColors: ThemeColors = {
  primary: "#26619c",
  onPrimary: "#ffffff",
  background: "#ffffff",
  card: "#ffffff",
  text: "#1a1a1a",
  textMuted: "#777777",
  border: "#dddddd",
  inputBackground: "#f7f7f7",
  placeholder: "#9a9a9a",
  positive: "#1b8a3f",
  negative: "#d32f2f",
  shadow: "grey",
  overlay: "rgba(255, 255, 255, 0.8)",
  accentBlue: "#26619c",
  accentAmber: "#b26a00",
  accentViolet: "#6a3fb5",
  chartAmount: "#26619c",
  chartInterest: "#b26a00",
  chartTrack: "#eceff2",
  chartSeries: ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948"],
  chartOther: "#898781",
};

export const DarkColors: ThemeColors = {
  primary: "#5b9bd5",
  onPrimary: "#0b1622",
  background: "#121212",
  card: "#1e1e1e",
  text: "#ececec",
  textMuted: "#9ba1a6",
  border: "#2f2f31",
  inputBackground: "#262628",
  placeholder: "#6f757a",
  positive: "#4caf50",
  negative: "#ef5350",
  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.7)",
  accentBlue: "#5b9bd5",
  accentAmber: "#f0b357",
  accentViolet: "#a98eda",
  chartAmount: "#5090cc",
  chartInterest: "#c08420",
  chartTrack: "#2b2b2e",
  chartSeries: ["#3987e5", "#199e70", "#c98500", "#008300", "#9085e9", "#e66767"],
  chartOther: "#9ba1a6",
};

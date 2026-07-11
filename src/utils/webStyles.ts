import { Platform } from "react-native";

/**
 * react-native-web renders every TextInput/Picker as a DOM <input>/<textarea>/
 * <select>, each of which draws the browser's default focus outline. That ring
 * clashes with the app's own styling, so remove it globally on web. Injected
 * once, at import time, before anything renders.
 *
 * Screens that want a focus affordance (e.g. Login) provide their own — a
 * highlighted container border — so nothing here removes needed feedback.
 */
export const installWebStyles = () => {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }

  // Opt the standalone PWA into drawing under the notch/status bar so that
  // `env(safe-area-inset-*)` reports real values. Without viewport-fit=cover,
  // iOS returns 0 insets and safe-area padding has no effect.
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    const content = viewport.getAttribute("content") || "";
    if (!/viewport-fit\s*=\s*cover/.test(content)) {
      viewport.setAttribute(
        "content",
        `${content}${content ? ", " : ""}viewport-fit=cover`
      );
    }
  }

  if (document.getElementById("homevault-web-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "homevault-web-styles";
  style.textContent = `
    input:focus,
    textarea:focus,
    select:focus,
    [contenteditable]:focus {
      outline: none;
    }

    /*
     * iOS Safari centers the value inside <input type="date"> via an internal
     * pseudo-element that inline \`text-align\` can't reach, so the date reads
     * centered while every other field is left-aligned. Pin the pseudo-elements
     * left (Safari/iOS use -webkit-date-and-time-value; Chrome uses
     * -webkit-datetime-edit).
     */
    input[type="date"]::-webkit-date-and-time-value {
      text-align: left;
    }
    input[type="date"]::-webkit-datetime-edit {
      text-align: left;
    }

    /*
     * In a standalone iOS PWA the side drawer draws under the status bar/notch,
     * so its profile header overlaps the clock/battery. Pad the panel by the
     * safe-area inset (falling back to the base top padding). An id selector
     * with !important beats react-native-web's atomic class for paddingTop.
     */
    #homevault-drawer-panel {
      padding-top: max(24px, env(safe-area-inset-top, 0px)) !important;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
  `;
  document.head.appendChild(style);
};

/* eslint-env node */
/**
 * Post-processes the Metro web export (`expo export --platform web`, output in
 * `dist/`) into an installable PWA that works from the GitHub Pages subpath.
 *
 * Metro's web export — unlike the old webpack one — emits no manifest and no PWA
 * markup, and serves its JS from an `_expo/` folder. So this script:
 *   1. Generates 192/512 Chrome icons from assets/icon.png.
 *   2. Writes a manifest.json from scratch, scoped to the deploy subpath.
 *   3. Injects the manifest link, theme-color, and apple-touch-icon into
 *      index.html (Metro adds only a favicon).
 *   4. Drops a `.nojekyll` file — GitHub Pages runs Jekyll, which otherwise
 *      strips the underscore-prefixed `_expo/` directory and 404s the bundle.
 *
 * Runs as part of `build-web`, so every deploy is patched. The subpath comes
 * from `homepage` in package.json; keep it in sync with `experiments.baseUrl`
 * in app.json (the value Metro bakes into the asset URLs).
 */
const path = require("path");
const fs = require("fs");
const { generateImageAsync } = require("@expo/image-utils");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DIST = path.join(PROJECT_ROOT, "dist");
const SOURCE_ICON = path.join(PROJECT_ROOT, "assets", "icon.png");
const ICON_OUT_DIR = path.join(DIST, "pwa", "chrome-icon");

const { homepage } = require(path.join(PROJECT_ROOT, "package.json"));
const { expo: appConfig } = require(path.join(PROJECT_ROOT, "app.json"));

// Leading+trailing-slashed base so both manifest and icon URLs resolve under
// the subpath, e.g. "/HomeVault/".
const BASE = (homepage || "/").replace(/\/?$/, "/");
const APP_NAME = appConfig?.name || "HomeVault";
const THEME_COLOR = "#26619c";

// Page background behind the React root, per color scheme. Keep in sync with
// `background` in src/utils/Color.ts (LightColors / DarkColors). Metro's export
// leaves html/body with no background, so they default to white and bleed
// through wherever the root doesn't cover the viewport in iOS standalone mode —
// the white strip at the top/bottom of the installed PWA.
const BG_LIGHT = "#ffffff";
const BG_DARK = "#121212";

const ICON_SIZES = [192, 512];

async function generateIcons() {
  fs.mkdirSync(ICON_OUT_DIR, { recursive: true });
  const icons = [];

  for (const size of ICON_SIZES) {
    const { source } = await generateImageAsync(
      { projectRoot: PROJECT_ROOT, cacheType: "pwa-patch" },
      {
        src: SOURCE_ICON,
        width: size,
        height: size,
        resizeMode: "contain",
        // A white pad keeps the icon from going transparent on Android where a
        // maskable icon is cropped to a circle.
        backgroundColor: "#ffffff",
      }
    );
    const fileName = `chrome-icon-${size}.png`;
    fs.writeFileSync(path.join(ICON_OUT_DIR, fileName), source);
    icons.push({
      src: `${BASE}pwa/chrome-icon/${fileName}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any maskable",
    });
  }

  return icons;
}

function writeManifest(icons) {
  const manifest = {
    name: APP_NAME,
    short_name: APP_NAME,
    start_url: `${BASE}?utm_source=web_app_manifest`,
    scope: BASE,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: THEME_COLOR,
    icons,
  };
  fs.writeFileSync(
    path.join(DIST, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
}

/** Metro emits only a favicon link; add the PWA markup browsers need to install. */
function patchIndexHtml() {
  const indexPath = path.join(DIST, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");

  // Match html/body to the app background so no white bleeds past the root in
  // standalone mode, and stop the overscroll rubber-band that shifts the whole
  // page (leaving a gap at the top or bottom).
  //
  // Expo's reset sizes html/body/#root with `height: 100%`, which in an
  // installed iOS PWA resolves short of the screen — it excludes the
  // home-indicator band — so #root ends above the true bottom and the body
  // background shows through as a dead strip under the tab bar. Sizing the
  // chain by the dynamic viewport (100dvh) makes the root fill the real visual
  // viewport; the 100vh line is the fallback for iOS < 15.4 (no dvh support).
  const bleedFix = `<style id="pwa-bleed-fix">
      html, body { background-color: ${BG_LIGHT}; overscroll-behavior: none; }
      @media (prefers-color-scheme: dark) {
        html, body { background-color: ${BG_DARK}; }
      }
      html, body, #root { height: 100vh; height: 100dvh; }
    </style>`;

  const tags = [
    `<link rel="manifest" href="${BASE}manifest.json" />`,
    `<meta name="theme-color" content="${THEME_COLOR}" />`,
    `<link rel="apple-touch-icon" href="${BASE}pwa/chrome-icon/chrome-icon-192.png" />`,
    bleedFix,
  ].join("\n    ");

  // Idempotent: don't double-inject if the build is patched twice.
  if (!html.includes('rel="manifest"')) {
    html = html.replace("</head>", `  ${tags}\n  </head>`);
  }

  // viewport-fit=cover lets the page paint under the notch/home-indicator so
  // the app background (not white) fills the safe areas; also required for
  // env(safe-area-inset-*) to resolve. Idempotent via the viewport-fit guard.
  html = html.replace(
    /(<meta name="viewport" content="[^"]*?)"/,
    (match, head) =>
      head.includes("viewport-fit") ? match : `${head}, viewport-fit=cover"`
  );

  // On Windows, Metro emits the CSS href with backslash separators
  // (href="...\static\css\..."). Browsers normalise `\`→`/` for http URLs, but
  // rewrite them so the markup is correct rather than merely tolerated. Only
  // href/src attribute values are touched.
  html = html.replace(/(href|src)="([^"]*\\[^"]*)"/g, (_match, attr, value) => {
    return `${attr}="${value.replace(/\\/g, "/")}"`;
  });

  fs.writeFileSync(indexPath, html);
}

async function main() {
  if (!fs.existsSync(DIST)) {
    throw new Error(
      `dist/ not found at ${DIST} — run "expo export --platform web" first.`
    );
  }

  const icons = await generateIcons();
  writeManifest(icons);
  patchIndexHtml();

  // GitHub Pages / Jekyll strips folders that start with "_"; without this the
  // _expo/ JS bundle 404s and the site is blank.
  fs.writeFileSync(path.join(DIST, ".nojekyll"), "");

  console.log(
    `patch-pwa: wrote ${icons.length} icons + manifest.json, injected PWA markup, added .nojekyll under ${BASE}`
  );
}

main().catch((error) => {
  console.error("patch-pwa failed:", error);
  process.exit(1);
});

/* eslint-env node */
/**
 * Post-processes the `expo export:web` output so "Add to Home Screen" shows the
 * app logo on Android/Chrome.
 *
 * Expo generates the iOS apple-touch-icon but leaves `manifest.json` without an
 * `icons` array and never emits Chrome PWA icons, so Chrome has nothing to show.
 * This regenerates 192/512 icons from assets/icon.png (same tool Expo's own icon
 * plugin uses) and rewrites the manifest to reference them under the deploy
 * subpath.
 *
 * Runs as part of `build-web`, so every deploy is patched.
 */
const path = require("path");
const fs = require("fs");
const { generateImageAsync } = require("@expo/image-utils");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const WEB_BUILD = path.join(PROJECT_ROOT, "web-build");
const SOURCE_ICON = path.join(PROJECT_ROOT, "assets", "icon.png");
const ICON_OUT_DIR = path.join(WEB_BUILD, "pwa", "chrome-icon");

// Must match `homepage` in package.json (the deploy subpath). Kept as a
// leading+trailing-slashed base so both manifest and icon URLs resolve.
const { homepage } = require(path.join(PROJECT_ROOT, "package.json"));
const BASE = (homepage || "/").replace(/\/?$/, "/");

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

async function main() {
  if (!fs.existsSync(WEB_BUILD)) {
    throw new Error(`web-build not found at ${WEB_BUILD} — run expo export:web first.`);
  }

  const icons = await generateIcons();

  const manifestPath = path.join(WEB_BUILD, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  manifest.icons = icons;
  // Serve the installed app from the subpath, not the domain root.
  manifest.start_url = `${BASE}?utm_source=web_app_manifest`;
  manifest.scope = BASE;
  manifest.theme_color = manifest.theme_color || "#26619c";
  // Was steering installs to a Play Store listing that may not exist, which
  // suppresses the browser's own install/icon behaviour.
  delete manifest.prefer_related_applications;
  delete manifest.related_applications;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Expo builds the injected link hrefs with Windows path separators, e.g.
  // href="\HomeVault\pwa\...". Browsers normalise `\`→`/` for http URLs, but
  // rewrite them so the markup is correct rather than merely tolerated. Only
  // href/src attribute values are touched, never inline scripts.
  const indexPath = path.join(WEB_BUILD, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  html = html.replace(/(href|src)="([^"]*\\[^"]*)"/g, (_match, attr, value) => {
    return `${attr}="${value.replace(/\\/g, "/")}"`;
  });
  fs.writeFileSync(indexPath, html);

  console.log(
    `patch-pwa: wrote ${icons.length} icons + manifest.icons under ${BASE}, normalised index.html paths`
  );
}

main().catch((error) => {
  console.error("patch-pwa failed:", error);
  process.exit(1);
});

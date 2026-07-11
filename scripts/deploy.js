/* eslint-env node */
/**
 * Interactive deploy. Shows the current version, asks for the next one, writes
 * it to package.json and app.json, then builds the web bundle and publishes it
 * to GitHub Pages. `build-web` regenerates src/appVersion.ts from package.json,
 * so what's deployed and what the app's drawer shows always match.
 */
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON = path.join(PROJECT_ROOT, "package.json");
const APP_JSON = path.join(PROJECT_ROOT, "app.json");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");

const isValid = (version) => /^\d+\.\d+\.\d+$/.test(version);

/** Suggest the next patch version, e.g. 1.2.3 -> 1.2.4. */
const suggestNext = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || "");
  if (!match) return "";
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
};

const ask = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
};

async function main() {
  const pkg = readJson(PACKAGE_JSON);
  const current = pkg.version;
  const suggestion = suggestNext(current);

  console.log(`\nCurrent version: ${current}`);
  let next = await ask(
    `Enter the next version${suggestion ? ` [${suggestion}]` : ""}: `
  );

  // Empty input accepts the suggested patch bump.
  if (!next && suggestion) {
    next = suggestion;
  }
  if (!isValid(next)) {
    console.error(`\n"${next}" is not a valid x.y.z version. Aborting.`);
    process.exit(1);
  }
  if (next === current) {
    console.error(`\nVersion ${next} matches the current one. Aborting.`);
    process.exit(1);
  }

  // Write the new version to both manifests before building; build-web
  // regenerates src/appVersion.ts from package.json.
  pkg.version = next;
  writeJson(PACKAGE_JSON, pkg);

  try {
    const app = readJson(APP_JSON);
    if (app.expo) {
      app.expo.version = next;
      writeJson(APP_JSON, app);
    }
  } catch (error) {
    console.warn("Could not update app.json version:", error.message);
  }

  console.log(`\nDeploying version ${next}...\n`);
  execSync("npm run build-web", { cwd: PROJECT_ROOT, stdio: "inherit" });
  execSync("npx gh-pages -d web-build", { cwd: PROJECT_ROOT, stdio: "inherit" });
  console.log(`\nDeployed version ${next}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

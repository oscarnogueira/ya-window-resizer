// Rasterizes the SVG icon glyphs to the PNG files the manifest references.
// Requires `rsvg-convert` (brew install librsvg). The on-tile key images are
// generated dynamically at runtime via setImage; these are the static list /
// category / plugin icons plus a sensible key fallback.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const imgs = `${root}/fyi.oz.yet-another-window-resizer.sdPlugin/imgs/`;
const tmpMod = `${root}/.icons-tmp.mjs`;
const tmpSvg = `${root}/.icon-tmp.svg`;

// Bundle the TS icon module so we can call the generators from Node.
await build({
  entryPoints: [`${root}/src/icons/position-icon.ts`],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: tmpMod,
  logLevel: "silent",
});
const I = await import(pathToFileURL(tmpMod).href);

const OFF = "#dcdcdc"; // sidebar / list glyphs
const ACCENT = "#3B99FC"; // key fallback (matches the live default)

// [relative path without extension, svg string]
const targets = [
  ["pluginIcon", I.appBadge()],
  ["categoryIcon", I.appIcon(OFF)],

  ["actions/position/icon", I.positionListIcon(OFF)],
  ["actions/position/key", I.positionIcon("left-half", ACCENT)],

  ["actions/custom/icon", I.customIcon(OFF)],
  ["actions/custom/key", I.customIcon(ACCENT)],

  ["actions/cycle/icon", I.cycleCornersIcon(OFF)],
  ["actions/cycle/key", I.cycleCornersIcon(ACCENT)],

  ["actions/cycle-sides/icon", I.cycleSidesIcon(OFF)],
  ["actions/cycle-sides/key", I.cycleSidesIcon(ACCENT)],

  ["actions/cycle-top-bottom/icon", I.cycleTopBottomIcon(OFF)],
  ["actions/cycle-top-bottom/key", I.cycleTopBottomIcon(ACCENT)],
];

function raster(svg, outPng, size) {
  writeFileSync(tmpSvg, svg);
  execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), tmpSvg, "-o", outPng]);
}

for (const [rel, svg] of targets) {
  const base = imgs + rel;
  mkdirSync(dirname(base), { recursive: true });
  raster(svg, base + ".png", 72);
  raster(svg, base + "@2x.png", 144);
  console.log("wrote", rel + ".png (+@2x)");
}

rmSync(tmpMod, { force: true });
rmSync(tmpSvg, { force: true });

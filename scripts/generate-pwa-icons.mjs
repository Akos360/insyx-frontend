// One-off generator for the PWA manifest icons (vite.config.ts) — reuses the
// existing globe.svg favicon as the app's icon instead of introducing new
// branding. Run with: node scripts/generate-pwa-icons.mjs
// Not part of the build; rerun by hand only if globe.svg itself changes.
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const svgPath = path.join(root, "public/globe.svg");
const outDir = path.join(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath, "utf-8");
const openTagEnd = svg.indexOf(">", svg.indexOf("<svg")) + 1;
const closeTagStart = svg.lastIndexOf("</svg>");
const inner = svg.slice(openTagEnd, closeTagStart);

// Plain icons — transparent background, matches the existing favicon.
for (const size of [192, 512]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(outDir, `icon-${size}.png`));
}

// Maskable icon: the OS applies its own crop shape, so content must sit
// inside the ~80% "safe zone" with the square itself fully opaque (no
// transparency) — wrap the globe in a dark rect matching the app's own --bg.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0B0F14"/>
  <g transform="translate(16,16) scale(0.72) translate(-16,-16)">${inner}</g>
</svg>`;

await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(outDir, "icon-maskable-512.png"));

// Apple touch icon: iOS renders transparency as black, so it gets the same
// opaque background as the maskable icon, at the standard 180x180 size.
await sharp(Buffer.from(maskableSvg)).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

console.log("Generated PWA icons in public/icons/");

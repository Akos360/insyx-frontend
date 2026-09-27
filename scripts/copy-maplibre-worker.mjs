// maplibre-gl v6 ships its tile-processing worker as two ES modules
// (maplibre-gl-worker.mjs importing maplibre-gl-shared.mjs via a relative
// specifier). Vite's `?url` asset import copies only the file it's pointed
// at, so the worker's own `import "./maplibre-gl-shared.mjs"` 404s once
// served from a hashed /assets/ path — the map silently never loads any
// tiles. Copying both files, verbatim and side by side, into public/ keeps
// that relative import intact and gives them a stable, unhashed URL.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "../node_modules/maplibre-gl/dist");
const destDir = join(here, "../public/vendor/maplibre");

mkdirSync(destDir, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(srcDir, file), join(destDir, file));
}

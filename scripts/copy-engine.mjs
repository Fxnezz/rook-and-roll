/**
 * Copies the browser Stockfish build out of node_modules into /public/engine
 * so it can be served statically and loaded in a Web Worker.
 *
 * We use the single-threaded "lite" build: it needs no SharedArrayBuffer and
 * therefore no COOP/COEP cross-origin-isolation headers, which keeps hosting
 * (Vercel) simple. Runs on postinstall and prebuild.
 */
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "node_modules", "stockfish", "bin");
const outDir = join(root, "public", "engine");

const files = ["stockfish-18-lite-single.js", "stockfish-18-lite-single.wasm"];

if (!existsSync(join(srcDir, files[0]))) {
  console.warn("[copy-engine] Stockfish build not found in node_modules; skipping.");
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
for (const f of files) {
  copyFileSync(join(srcDir, f), join(outDir, f));
}
console.log(`[copy-engine] Copied ${files.length} Stockfish file(s) to public/engine/`);

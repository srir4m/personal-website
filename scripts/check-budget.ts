/**
 * The first-load JavaScript budget (PRD §10.3, tightened by the pixel move, issue #8): what
 * the page needs before it can show the scene must stay within 200 KB gzipped. Runs after
 * `vite build` and walks the build manifest from the entry through everything it imports
 * statically. Chunks that only load later, such as the vault, don't count.
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 200;
type Chunk = { file: string; isEntry?: boolean; imports?: string[] };

const dist = new URL("../dist/", import.meta.url);
const manifest: Record<string, Chunk> = JSON.parse(readFileSync(new URL(".vite/manifest.json", dist), "utf8"));

const entry = Object.keys(manifest).find((key) => key === "index.html");
if (!entry) {
  console.error("Could not find the entry in the build manifest.");
  process.exit(1);
}

const seen = new Set<string>();
const visit = (key: string) => {
  if (seen.has(key)) return;
  seen.add(key);
  for (const next of manifest[key]?.imports ?? []) visit(next);
};
visit(entry);

const sizes = [...seen].map((key) => {
  const file = manifest[key]!.file;
  return { file, kb: gzipSync(readFileSync(new URL(file, dist))).length / 1024 };
});
const total = sizes.reduce((sum, s) => sum + s.kb, 0);

for (const s of sizes.sort((a, b) => b.kb - a.kb)) console.log(`  ${s.kb.toFixed(1).padStart(7)} KB  ${s.file}`);
console.log(`First-load JS: ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) {
  console.error("Over the JS budget (PRD §10.3).");
  process.exit(1);
}

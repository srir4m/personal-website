/**
 * PRD §10.3: the JavaScript needed for Acts 0–1 must stay within 450 KB gzipped.
 * Runs after `vite build`, walks the build manifest from the entry plus the Act 0 and
 * Act 1 chunks (with everything they import statically), and fails over budget.
 * Chunks that only load later, such as the other acts and the vault, don't count.
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 450;
type Chunk = { file: string; isEntry?: boolean; imports?: string[] };

const dist = new URL("../dist/", import.meta.url);
const manifest: Record<string, Chunk> = JSON.parse(readFileSync(new URL(".vite/manifest.json", dist), "utf8"));

const roots = Object.entries(manifest)
  .filter(([key, chunk]) => chunk.isEntry || /src\/acts\/Act[01][A-Za-z]+\/index\.tsx$/.test(key))
  .map(([key]) => key);

const seen = new Set<string>();
const visit = (key: string) => {
  if (seen.has(key)) return;
  seen.add(key);
  for (const next of manifest[key]?.imports ?? []) visit(next);
};
roots.forEach(visit);

const sizes = [...seen].map((key) => {
  const file = manifest[key]!.file;
  return { file, kb: gzipSync(readFileSync(new URL(file, dist))).length / 1024 };
});
const total = sizes.reduce((sum, s) => sum + s.kb, 0);

for (const s of sizes.sort((a, b) => b.kb - a.kb)) console.log(`  ${s.kb.toFixed(1).padStart(7)} KB  ${s.file}`);
console.log(`Acts 0–1 JS: ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`);
if (roots.length < 3) {
  console.error("Could not find the entry and both Act 0 and Act 1 chunks in the manifest.");
  process.exit(1);
}
if (total > BUDGET_KB) {
  console.error("Over the JS budget (PRD §10.3).");
  process.exit(1);
}

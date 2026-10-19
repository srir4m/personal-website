/**
 * PRD §10.3: the JavaScript needed for Acts 0–1 must stay within 450 KB gzipped.
 * Runs after `vite build` and fails the build when the budget is exceeded.
 */
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 450;
const LATER_ACTS = /^(Act[2-6]|ActPlaceholder|ContentStatus)/;
const dir = new URL("../dist/assets/", import.meta.url);

const files = readdirSync(dir).filter((name) => name.endsWith(".js") && !LATER_ACTS.test(name));
const sizes = files.map((name) => ({ name, kb: gzipSync(readFileSync(new URL(name, dir))).length / 1024 }));
const total = sizes.reduce((sum, file) => sum + file.kb, 0);

for (const file of sizes.sort((a, b) => b.kb - a.kb)) console.log(`  ${file.kb.toFixed(1).padStart(7)} KB  ${file.name}`);
console.log(`Acts 0–1 JS: ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) {
  console.error("Over the JS budget (PRD §10.3).");
  process.exit(1);
}

/**
 * Renders the social preview image (public/og.png, 1200×630) and the home-screen icon
 * (public/apple-touch-icon.png, 180×180) with the site's own type, colours and figure.
 * Name and tagline come from site-content.json. Run `npm run og` after changing them.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { figLeafMarkup } from "../src/vitruvian/figLeaf.ts";

const root = new URL("../", import.meta.url);
const path = (p: string) => fileURLToPath(new URL(p, root));
const { owner } = JSON.parse(readFileSync(path("src/content/site-content.json"), "utf8"));
const filled = (v: unknown) => (typeof v === "string" && v.trim() && !/^TODO\b/.test(v) ? v.trim() : "");

// The figure as the site draws it: the ink image, with its fig leaf.
const geometry = JSON.parse(readFileSync(path("src/content/vitruvian.json"), "utf8"));
const [, , vw, vh] = geometry.viewBox as number[];
const ink = readFileSync(path("public/assets/vitruvian/figure.webp")).toString("base64");
const figure = `<svg viewBox="0 0 ${vw} ${vh}" style="color:#2b2118"><image href="data:image/webp;base64,${ink}" width="${vw}" height="${vh}"/>${figLeafMarkup("#efe4cc")}</svg>`;
// Inlined as data URLs: a page set from a string may not load file:// fonts.
const font = (family: string, file: string, weight: number) =>
  `@font-face{font-family:"${family}";font-weight:${weight};src:url("data:font/woff2;base64,${readFileSync(
    path(`node_modules/@fontsource/${file}`),
  ).toString("base64")}") format("woff2")}`;
const head = `<meta charset="utf-8"><style>
${font("Cormorant Garamond", "cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2", 400)}
${font("IBM Plex Mono", "ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", 400)}
html,body{margin:0;background:#efe4cc;color:#2b2118}
</style>`;

const og = `<!doctype html><html><head>${head}<style>
.card{position:relative;width:1200px;height:630px;overflow:hidden;
  background:radial-gradient(ellipse at 70% 45%,#f3ead6 0%,#efe4cc 55%,#e2d3b0 100%)}
.frame{position:absolute;inset:28px;border:1px solid rgba(138,107,71,.45)}
/* The figure from the head to the chest, arms outstretched, rising out of the engraved globe. */
.globe{position:absolute;left:600px;top:55px;width:520px;height:520px;color:#8a6b47;opacity:.5}
.figure{position:absolute;left:500px;top:-14px;width:720px;height:709px;opacity:.92;
  -webkit-mask-image:linear-gradient(to bottom,#000 0,#000 32%,transparent 50%);mask-image:linear-gradient(to bottom,#000 0,#000 32%,transparent 50%)}
.figure svg{width:100%;height:100%}
.text{position:absolute;left:84px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center;gap:22px}
.label{font:400 18px "IBM Plex Mono";letter-spacing:.22em;text-transform:uppercase;color:#8a6b47}
.name{font:400 132px/0.95 "Cormorant Garamond";margin:0}
.rule{width:96px;height:1px;background:#a8432f}
.tagline{font:400 24px "IBM Plex Mono";letter-spacing:.16em;text-transform:uppercase;color:#a8432f}
</style></head><body><div class="card">
<div class="frame"></div>
<svg class="globe" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".25">
  <circle cx="50" cy="50" r="49"/><ellipse cx="50" cy="50" rx="20" ry="49"/><ellipse cx="50" cy="50" rx="37" ry="49"/>
  <path d="M1 50h98M6 28h88M6 72h88M21 12h58M21 88h58"/></g></svg>
<div class="figure">${figure}</div>
<div class="text">
  <div class="label">srir4m.github.io</div>
  <h1 class="name">${filled(owner.name)}</h1>
  <div class="rule"></div>
  <div class="tagline">${filled(owner.tagline)}</div>
</div></div></body></html>`;

const icon = `<!doctype html><html><head>${head}</head><body>
<svg width="180" height="180" viewBox="0 0 32 32" style="display:block;background:#efe4cc">
<g fill="none" stroke="#2b2118" stroke-width="1"><circle cx="16" cy="16" r="10.5"/><ellipse cx="16" cy="16" rx="4.4" ry="10.5"/><path d="M5.5 16h21M7.2 10.8h17.6M7.2 21.2h17.6"/></g>
<circle cx="19.5" cy="12.4" r="1.6" fill="#a8432f"/></svg></body></html>`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const shoot = async (html: string, width: number, height: number, out: string) => {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path(out) });
  await page.close();
};
await shoot(og, 1200, 630, "public/og.png");
await shoot(icon, 180, 180, "public/apple-touch-icon.png");
await browser.close();
console.log("Wrote public/og.png and public/apple-touch-icon.png");

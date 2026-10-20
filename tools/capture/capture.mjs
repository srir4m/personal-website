// Captures reference sites for design study: scroll screenshots, load animation frames, and a style/library report.
import { chromium } from "playwright";
import fs from "node:fs";

const SITES = { zidankazi: "https://www.zidankazi.com/", jyrinx: "https://jyrinx.xyz/", swerdlow: "https://www.swerdlow.dev/" };
const SIZES = { desktop: [1440, 900], phone: [390, 844] };
const browser = await chromium.launch();

async function report(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll("*")];
    const fonts = {}, colors = {}, bgs = {}, anims = new Set(), trans = new Set();
    for (const e of all.slice(0, 4000)) {
      const s = getComputedStyle(e);
      fonts[s.fontFamily] = (fonts[s.fontFamily] || 0) + 1;
      colors[s.color] = (colors[s.color] || 0) + 1;
      if (s.backgroundColor !== "rgba(0, 0, 0, 0)") bgs[s.backgroundColor] = (bgs[s.backgroundColor] || 0) + 1;
      if (s.animationName !== "none") anims.add(`${s.animationName} ${s.animationDuration} ${s.animationTimingFunction}`);
      if (s.transitionProperty !== "all" || s.transitionDuration !== "0s") if (s.transitionDuration !== "0s") trans.add(`${s.transitionProperty} ${s.transitionDuration} ${s.transitionTimingFunction}`);
    }
    const top = (o, n = 12) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
    const rootVars = {};
    for (const sheet of [...document.styleSheets]) {
      try { for (const r of sheet.cssRules) if (r.selectorText === ":root" || r.selectorText === "html") for (const p of r.style) if (p.startsWith("--")) rootVars[p] = r.style.getPropertyValue(p).trim(); } catch {}
    }
    const fontFaces = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`);
    const libs = {
      gsap: !!window.gsap, ScrollTrigger: !!window.ScrollTrigger, lenis: !!window.lenis || !!document.querySelector("html.lenis,[data-lenis-prevent]"),
      three: !!window.THREE || !!document.querySelector("canvas"), framer: !!document.querySelector("[data-framer-name],[data-projection-id]") || [...document.scripts].some((s) => /framer/.test(s.src)),
      next: !!window.__NEXT_DATA__ || !!document.querySelector("#__next,script[src*='_next']"), canvases: document.querySelectorAll("canvas").length,
      videos: document.querySelectorAll("video").length, svgs: document.querySelectorAll("svg").length,
    };
    return {
      title: document.title, url: location.href, scrollHeight: document.documentElement.scrollHeight,
      htmlClass: document.documentElement.className, bodyClass: document.body.className,
      fonts: top(fonts), fontFaces, colors: top(colors), backgrounds: top(bgs), rootVars, animations: [...anims].slice(0, 40), transitions: [...trans].slice(0, 40),
      libs, scripts: [...document.scripts].map((s) => s.src).filter(Boolean), styles: [...document.querySelectorAll("link[rel=stylesheet]")].map((l) => l.href),
      text: document.body.innerText.slice(0, 6000),
      outline: [...document.querySelectorAll("section,header,footer,nav,main,h1,h2,h3")].slice(0, 80).map((e) => `${e.tagName.toLowerCase()}.${(e.className?.baseVal ?? e.className ?? "").toString().slice(0, 80)} ${(e.innerText || "").slice(0, 60).replace(/\s+/g, " ")}`),
    };
  });
}

for (const [name, url] of Object.entries(SITES)) {
  for (const [size, [w, h]] of Object.entries(SIZES)) {
    const dir = `captures/${name}/${size}`;
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: size === "phone", hasTouch: size === "phone" });
    const page = await ctx.newPage();
    try {
      // Load animation: frames over the first 3 s.
      const start = Date.now();
      await page.goto(url, { waitUntil: "commit", timeout: 60000 });
      for (let i = 0; i < 12; i++) {
        await page.screenshot({ path: `${dir}/load-${String(i).padStart(2, "0")}.jpg`, type: "jpeg", quality: 60 }).catch(() => {});
        await page.waitForTimeout(250);
      }
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
      fs.writeFileSync(`${dir}/report.json`, JSON.stringify(await report(page), null, 1));
      if (size === "desktop") fs.writeFileSync(`captures/${name}/page.html`, await page.content());
      // Scroll with the wheel, as a person would, so smooth-scroll and scroll-linked effects run.
      const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const steps = Math.min(40, Math.max(8, Math.ceil(total / (h * 0.5))));
      await page.mouse.move(w / 2, h / 2);
      for (let i = 0; i <= steps; i++) {
        await page.screenshot({ path: `${dir}/scroll-${String(i).padStart(2, "0")}.jpg`, type: "jpeg", quality: 60 });
        for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, (h * 0.5) / 6); await page.waitForTimeout(60); }
        await page.waitForTimeout(700);
      }
      // A few mid-scroll frames 100 ms apart, to see motion in progress.
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(1200);
      for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, h * 0.15); await page.waitForTimeout(100); await page.screenshot({ path: `${dir}/motion-${i}.jpg`, type: "jpeg", quality: 55 }); }
      // Hover states of the first few links and buttons.
      if (size === "desktop") {
        await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
        const targets = await page.locator("a:visible, button:visible").all();
        for (const [i, t] of targets.slice(0, 6).entries()) {
          try { await t.scrollIntoViewIfNeeded({ timeout: 2000 }); await t.hover({ timeout: 2000 }); await page.waitForTimeout(500); const box = await t.boundingBox(); if (box) await page.screenshot({ path: `${dir}/hover-${i}.jpg`, type: "jpeg", quality: 70, clip: { x: Math.max(0, box.x - 60), y: Math.max(0, box.y - 40), width: Math.min(w, box.width + 120), height: Math.min(h, box.height + 80) } }); } catch {}
        }
      }
      await page.screenshot({ path: `${dir}/fullpage.jpg`, type: "jpeg", quality: 50, fullPage: true }).catch(() => {});
    } catch (e) {
      fs.writeFileSync(`${dir}/error.txt`, String(e));
    }
    await ctx.close();
  }
}
await browser.close();

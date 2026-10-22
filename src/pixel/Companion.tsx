import { useEffect, useRef } from "react";
import { CHAPTERS } from "../stage/chapters";
import { useStage } from "../stage/store";
import { CLEAR, POSES, poseFor, SPRITE_H, SPRITE_W, targetFor, type Pose } from "./sprite";
import { readPalette, watchPalette } from "./palette";

/** It perches once the reader is past the second-to-last chapter's midpoint towards Contact. */
const PERCH_FROM = CHAPTERS.length - 1.45;

/**
 * The companion (pixel move, issue #8, PR 5): Leonardo's ornithopter beside the column.
 * Still at rest, it flaps only while the page scrolls and lands on the Contact title.
 * Decorative, so hidden from screen readers; Calm mode and reduced motion keep it still.
 */
export function Companion() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const image = ctx.createImageData(SPRITE_W, SPRITE_H);
    let palette = readPalette();
    let pose: Pose | "" = "";
    let x: number | null = null, y: number | null = null;
    let travelled = 0, lastY = window.scrollY, lastMove = -Infinity, raf = 0;

    const draw = (next: Pose) => {
      const grid = POSES[next], d = image.data;
      for (let i = 0; i < grid.length; i++) {
        const v = grid[i]!;
        if (v === CLEAR) {
          d[i * 4 + 3] = 0;
          continue;
        }
        const [r, g, b] = palette[v]!;
        d[i * 4] = r;
        d[i * 4 + 1] = g;
        d[i * 4 + 2] = b;
        d[i * 4 + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      pose = next;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const { chapterP, motion } = useStage.getState();
      const still = motion === "calm";
      const phone = window.innerWidth <= 860, scale = phone ? 3 : 5;
      const size = { w: SPRITE_W * scale, h: SPRITE_H * scale };
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (Math.abs(dy) > 0.5) {
        travelled += Math.abs(dy);
        lastMove = now;
      }
      const column = document.querySelector(".chapter-col")?.getBoundingClientRect();
      // The title's text, not its block box: it lands just after the last letter.
      const heading = document.getElementById("chapter-contact-title");
      let title: DOMRect | null = null;
      if (heading) {
        const range = document.createRange();
        range.selectNodeContents(heading);
        title = range.getBoundingClientRect();
      }
      if (!column) return;
      const perched = chapterP > PERCH_FROM;
      const target = targetFor({ perched, phone, scrollY: window.scrollY, viewport: { w: window.innerWidth, h: window.innerHeight }, column, perch: title, size });
      // It follows its target with a little lag, so it reads as flying; still, it jumps.
      x = x === null || still ? target.x : x + (target.x - x) * 0.12;
      y = y === null || still ? target.y : y + (target.y - y) * 0.12;
      const arrived = Math.hypot(target.x - x, target.y - y) < 2;
      const next = poseFor({ perched, arrived, still, sinceScroll: now - lastMove, travelled });
      if (next !== pose) draw(next);
      c.style.width = `${size.w}px`;
      // Whole art pixels only, so the sprite never smears between screen pixels.
      c.style.transform = `translate(${Math.round(x / scale) * scale}px, ${Math.round(y / scale) * scale}px)`;
      c.dataset.pose = pose;
      c.dataset.perched = String(perched && arrived);
    };
    raf = requestAnimationFrame(tick);
    const unwatch = watchPalette(() => {
      palette = readPalette();
      pose = "";
    });
    return () => {
      cancelAnimationFrame(raf);
      unwatch();
    };
  }, []);

  return <canvas ref={canvas} className="companion" width={SPRITE_W} height={SPRITE_H} aria-hidden="true" />;
}

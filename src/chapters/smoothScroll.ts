import { useEffect } from "react";
import Lenis from "lenis";
import { useStage } from "../stage/store";

/**
 * Smooth wheel scrolling for the pixel layout (after jyrinx.xyz, which uses Lenis). The page
 * still scrolls natively underneath, so chapterScroll's measuring and scrollToChapter keep
 * working unchanged. Full motion only: Calm mode keeps native scrolling and its CSS snap.
 */
export function useSmoothScroll() {
  const calm = useStage((s) => s.motion === "calm");
  useEffect(() => {
    if (calm) return;
    const lenis = new Lenis({ lerp: 0.12 });
    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [calm]);
}

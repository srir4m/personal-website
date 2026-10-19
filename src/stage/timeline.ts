import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ACTS, ACT_RANGES, SCROLL_VIEWPORTS, actAt, settleProgress, type ActIndex } from "./acts";
import { useStage, writeProgress } from "./store";

gsap.registerPlugin(ScrollTrigger);

/**
 * The one master timeline (PRD §7.3). Its duration is exactly 1, so a position on it is
 * the normalised scroll progress. Acts never create their own ScrollTrigger: they hand
 * a sub-timeline to `registerActTimeline` and it is stretched over the act's range.
 */
let master: gsap.core.Timeline | null = null;
let trigger: ScrollTrigger | null = null;
let lenis: Lenis | null = null;
const actTimelines = new Map<ActIndex, Set<gsap.core.Timeline>>();

/** Cross-fade length between act layers, in master-timeline units. */
const ACT_FADE = 0.008;
/** Calm mode: act-to-act cross-fade, in seconds (PRD §10.1). */
const CALM_FADE = 0.3;

function attach(index: ActIndex, tl: gsap.core.Timeline) {
  if (!master) return;
  const { start, end } = ACT_RANGES[index]!;
  const natural = tl.duration() || 1;
  tl.timeScale(natural / (end - start));
  master.add(tl, start);
}

/** Adds an act's scrubbed animation to the master timeline. Returns an unregister function. */
export function registerActTimeline(index: ActIndex, tl: gsap.core.Timeline): () => void {
  tl.paused(false);
  const set = actTimelines.get(index) ?? new Set();
  set.add(tl);
  actTimelines.set(index, set);
  attach(index, tl);
  master?.progress(master.progress());
  return () => {
    set.delete(tl);
    master?.remove(tl);
    tl.kill();
  };
}

function buildMaster(layers: HTMLElement[]) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  tl.set({}, {}, 1);
  ACTS.forEach((act, i) => tl.addLabel(act.id, ACT_RANGES[i]!.start));

  gsap.set(layers, { autoAlpha: 0 });
  gsap.set(layers[0]!, { autoAlpha: 1 });
  for (let i = 1; i < layers.length; i++) {
    const at = ACT_RANGES[i]!.start - ACT_FADE / 2;
    tl.fromTo(layers[i - 1]!, { autoAlpha: 1 }, { autoAlpha: 0, duration: ACT_FADE, immediateRender: false }, at);
    tl.fromTo(layers[i]!, { autoAlpha: 0 }, { autoAlpha: 1, duration: ACT_FADE, immediateRender: false }, at);
  }
  return tl;
}

export type TimelineOptions = { stage: HTMLElement; layers: HTMLElement[]; calm: boolean };

/** Builds the master timeline, its single ScrollTrigger, and Lenis. Returns a teardown. */
export function startTimeline({ stage, layers, calm }: TimelineOptions): () => void {
  master = buildMaster(layers);
  actTimelines.forEach((set, index) => set.forEach((tl) => attach(index, tl)));

  if (!calm) {
    lenis = new Lenis({ autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
  }
  const raf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Full mode scrubs the timeline with scroll. Calm mode never scrubs: it snaps to each
  // act's settled frame and cross-fades there.
  const settlePoints = ACTS.map((_, i) => settleProgress(i));
  let calmTween: gsap.core.Tween | null = null;
  trigger = ScrollTrigger.create({
    trigger: stage,
    start: "top top",
    end: () => `+=${window.innerHeight * SCROLL_VIEWPORTS}`,
    pin: true,
    scrub: calm ? false : true,
    animation: calm ? undefined : master,
    snap: calm ? { snapTo: settlePoints, duration: CALM_FADE, ease: "power2.out" } : undefined,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const act = actAt(self.progress);
      if (calm && act !== useStage.getState().activeAct) {
        calmTween?.kill();
        calmTween = master!.tweenTo(settleProgress(act), { duration: CALM_FADE, ease: "power2.out" });
      }
      writeProgress(self.progress, act);
    },
  });
  if (calm) master.progress(settleProgress(actAt(trigger.progress)));

  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  };
  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
    window.clearTimeout(resizeTimer);
    gsap.ticker.remove(raf);
    calmTween?.kill();
    trigger?.kill(true);
    lenis?.destroy();
    actTimelines.forEach((set) => set.forEach((tl) => master?.remove(tl)));
    master?.kill();
    gsap.set(layers, { clearProps: "opacity,visibility" });
    trigger = null;
    lenis = null;
    master = null;
  };
}

/** Scrolls to an act's settled state. Calm mode always jumps without smoothing. */
export function scrollToAct(index: ActIndex, { immediate = false } = {}) {
  if (!trigger) return;
  const y = trigger.start + (trigger.end - trigger.start) * settleProgress(index);
  const instant = immediate || useStage.getState().motion === "calm";
  if (lenis) {
    // Lenis caches the scroll limit, which can predate the pin spacer ScrollTrigger adds.
    lenis.resize();
    lenis.scrollTo(y, { immediate: instant, force: true, duration: 1.4 });
  }
  else window.scrollTo({ top: y, behavior: instant ? "instant" : "smooth" });
}

/**
 * Runs `callback` once, just after the next ScrollTrigger refresh finishes, and requests
 * that refresh once the document has loaded. Returns a cancel function.
 */
export function afterNextRefresh(callback: () => void): () => void {
  let frame = 0;
  const onRefresh = () => {
    ScrollTrigger.removeEventListener("refresh", onRefresh);
    frame = requestAnimationFrame(callback);
  };
  const request = () => ScrollTrigger.refresh();
  ScrollTrigger.addEventListener("refresh", onRefresh);
  if (document.readyState === "complete") frame = requestAnimationFrame(request);
  else window.addEventListener("load", request, { once: true });
  return () => {
    ScrollTrigger.removeEventListener("refresh", onRefresh);
    window.removeEventListener("load", request);
    cancelAnimationFrame(frame);
  };
}

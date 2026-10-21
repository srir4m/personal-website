import { create } from "zustand";
import type { ActIndex } from "./acts";
import type { PoseMode } from "../content/text";

export type MotionMode = "full" | "calm";

type StageState = {
  /** Master timeline progress, 0–1. Written every scroll frame: read it with getState(), never subscribe. */
  progress: number;
  activeAct: ActIndex;
  /**
   * The pixel layout's reading position in chapter units (src/stage/chapters.ts): 2.5 is
   * halfway from the third chapter to the fourth. Written every scroll frame: read it with
   * getState() or subscribe, never select it in a component.
   */
  chapterP: number;
  /** The chapter being read: chapterP rounded. */
  activeChapter: number;
  motion: MotionMode;
  poseMode: PoseMode;
  /** Region id of the open codex panel, if any. */
  openPanel: string | null;
  /** Act 0 has finished its loading role, so scrolling is allowed (PRD Act 0). */
  bootReady: boolean;
  /** The globe has its data and has drawn a frame. */
  globeReady: boolean;
  setMotion: (motion: MotionMode) => void;
  setPoseMode: (mode: PoseMode) => void;
  setOpenPanel: (region: string | null) => void;
};

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useStage = create<StageState>()((set) => ({
  progress: 0,
  activeAct: 0,
  chapterP: 0,
  activeChapter: 0,
  motion: prefersReducedMotion ? "calm" : "full",
  poseMode: "now",
  openPanel: null,
  bootReady: false,
  globeReady: false,
  setMotion: (motion) => set({ motion }),
  setPoseMode: (poseMode) => set({ poseMode }),
  setOpenPanel: (openPanel) => set({ openPanel }),
}));

/** Master-timeline progress within one act, clamped to 0–1. */
export function actProgress(range: { start: number; end: number }, progress: number) {
  return Math.min(1, Math.max(0, (progress - range.start) / (range.end - range.start)));
}

/**
 * Setter for the scroll loop. Zustand only re-renders components whose selected slice
 * changed, so writing progress every frame re-renders nothing unless the act changes.
 */
export function writeProgress(progress: number, activeAct: ActIndex) {
  useStage.setState({ progress, activeAct });
}

/** Setter for the chapter scroll loop: like writeProgress, it re-renders only when the chapter changes. */
export function writeChapterP(chapterP: number, activeChapter: number) {
  useStage.setState({ chapterP, activeChapter });
}

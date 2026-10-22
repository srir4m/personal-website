import { create } from "zustand";
import type { PoseMode } from "../content/text";

export type MotionMode = "full" | "calm";

type StageState = {
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
  setMotion: (motion: MotionMode) => void;
  setPoseMode: (mode: PoseMode) => void;
  setOpenPanel: (region: string | null) => void;
};

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useStage = create<StageState>()((set) => ({
  chapterP: 0,
  activeChapter: 0,
  motion: prefersReducedMotion ? "calm" : "full",
  poseMode: "now",
  openPanel: null,
  setMotion: (motion) => set({ motion }),
  setPoseMode: (poseMode) => set({ poseMode }),
  setOpenPanel: (openPanel) => set({ openPanel }),
}));

/** Setter for the chapter scroll loop: Zustand re-renders only components whose slice changed, so this re-renders only when the chapter changes. */
export function writeChapterP(chapterP: number, activeChapter: number) {
  useStage.setState({ chapterP, activeChapter });
}

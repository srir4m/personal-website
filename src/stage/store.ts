import { create } from "zustand";
import type { ActIndex } from "./acts";
import type { PoseMode } from "../content/text";

export type MotionMode = "full" | "calm";

type StageState = {
  /** Master timeline progress, 0–1. Written every scroll frame: read it with getState(), never subscribe. */
  progress: number;
  activeAct: ActIndex;
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
  progress: 0,
  activeAct: 0,
  motion: prefersReducedMotion ? "calm" : "full",
  poseMode: "now",
  openPanel: null,
  setMotion: (motion) => set({ motion }),
  setPoseMode: (poseMode) => set({ poseMode }),
  setOpenPanel: (openPanel) => set({ openPanel }),
}));

/**
 * Setter for the scroll loop. Zustand only re-renders components whose selected slice
 * changed, so writing progress every frame re-renders nothing unless the act changes.
 */
export function writeProgress(progress: number, activeAct: ActIndex) {
  useStage.setState({ progress, activeAct });
}

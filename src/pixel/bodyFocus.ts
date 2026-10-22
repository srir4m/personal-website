import { create } from "zustand";

/**
 * The body region the reader is pointing at or focusing (the body map, PR 4): the scene and
 * the plate hatch it in red. Kept apart from the stage store, which belongs to the chapter model.
 */
export const useBodyFocus = create<{ region: string | null; setRegion: (region: string | null) => void }>()((set) => ({
  region: null,
  setRegion: (region) => set({ region }),
}));

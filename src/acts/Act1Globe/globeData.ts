/** Loads the prebuilt globe data (scripts/build-globe-data.ts). Started early by Act 0. */
export type GlobeData = { coastlines: Float32Array; landMask: HTMLImageElement };

const base = `${import.meta.env.BASE_URL}assets/globe/`;
let pending: Promise<GlobeData> | null = null;

export function loadGlobeData(): Promise<GlobeData> {
  pending ??= Promise.all([
    fetch(`${base}coastlines.bin`)
      .then((response) => {
        if (!response.ok) throw new Error(`coastlines.bin: HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => new Float32Array(buffer)),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("land-mask.png failed to load"));
      image.src = `${base}land-mask.png`;
    }),
  ]).then(([coastlines, landMask]) => ({ coastlines, landMask }));
  return pending;
}

let webgl: boolean | null = null;

export function hasWebGL(): boolean {
  if (webgl === null) {
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

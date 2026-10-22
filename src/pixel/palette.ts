/** The theme's ramp (ink, sepia, deep paper, paper) and accent as RGB, read from the colour tokens, which change with dark mode. */
export function readPalette(): [number, number, number][] {
  const probe = document.createElement("canvas").getContext("2d")!;
  const style = getComputedStyle(document.documentElement);
  return ["--ink", "--sepia", "--parchment-deep", "--parchment", "--sanguine"].map((token) => {
    probe.fillStyle = "#000";
    probe.fillStyle = style.getPropertyValue(token).trim() || "#000";
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return [r!, g!, b!];
  });
}

/** Calls `onChange` when the colour tokens may have changed: the system theme flips, or the page switches layout. Returns a teardown. */
export function watchPalette(onChange: () => void): () => void {
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", onChange);
  const layout = new MutationObserver(onChange);
  layout.observe(document.documentElement, { attributes: true, attributeFilter: ["data-layout"] });
  return () => {
    scheme.removeEventListener("change", onChange);
    layout.disconnect();
  };
}

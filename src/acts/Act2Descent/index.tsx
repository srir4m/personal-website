import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ACT_RANGES } from "../../stage/acts";
import { actProgress, useStage } from "../../stage/store";
import { globeScaleAtDolly } from "../Act1Globe/layout";
import type { ActProps } from "../registry";
import { PLATES } from "./plates";
import {
  buildSegments,
  currentScale,
  formatScale,
  interpolate,
  locate,
  scaleBar,
  type Placement,
  type Segment,
  type Viewport,
} from "./zoom";

/**
 * Act 2: a layered infinite zoom through DOM/SVG plates (PRD Act 2). Only the current
 * plate and the next are mounted; when the next fills the viewport the outer one is
 * dropped and the new plate starts again at its resting size (rebasing).
 */
export default function Act2Descent({ index }: ActProps) {
  const range = ACT_RANGES[index]!;
  const [segment, setSegment] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLImageElement>(null);
  const inner = useRef<HTMLImageElement>(null);
  const place = useRef<HTMLParagraphElement>(null);
  const scaleText = useRef<HTMLParagraphElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const barLabel = useRef<HTMLSpanElement>(null);
  const current = useRef(0);

  useLayoutEffect(() => {
    const element = root.current!;
    let view: Viewport = { width: element.clientWidth, height: element.clientHeight };
    let segments: Segment[] = buildSegments(PLATES, view, globeScaleAtDolly(view.height));

    const position = (img: HTMLImageElement | null, p: Placement, aspect: number) => {
      if (!img) return;
      img.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      img.style.width = `${p.width}px`;
      img.style.height = `${p.width / aspect}px`;
    };

    const draw = (progress: number) => {
      const { index: i, local } = locate(segments, actProgress(range, progress));
      if (i !== current.current) {
        current.current = i;
        // Swap the mounted pair synchronously so the new plates are in the DOM before
        // this frame's placement is written: no frame shows a stale pair.
        flushSync(() => setSegment(i));
      }
      const plate = PLATES[i]!;
      const child = PLATES[i + 1]!;
      const p = interpolate(segments[i]!.from, segments[i]!.to, local);
      position(outer.current, p, plate.aspect);
      const rect = plate.childRect!;
      const height = p.width / plate.aspect;
      position(inner.current, { x: p.x + rect.x * p.width, y: p.y + rect.y * height, width: rect.w * p.width }, child.aspect);

      // HUD: the plate whose scale we're nearest names the place; the scale counts down.
      const denominator = currentScale(plate, p, view);
      const named = denominator > Math.sqrt(plate.scale * child.scale) ? plate : child;
      if (place.current && place.current.textContent !== named.label) place.current.textContent = named.label;
      if (scaleText.current) scaleText.current.textContent = formatScale(denominator);
      const { label, px } = scaleBar(denominator);
      if (bar.current) bar.current.style.width = `${px.toFixed(1)}px`;
      if (barLabel.current) barLabel.current.textContent = label;
    };

    draw(useStage.getState().progress);
    const unsubscribe = useStage.subscribe((s, prev) => s.progress !== prev.progress && draw(s.progress));

    // Recompute plate alignment and the handoff anchor on resize (PRD §7.4).
    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        view = { width: element.clientWidth, height: element.clientHeight };
        segments = buildSegments(PLATES, view, globeScaleAtDolly(view.height));
        draw(useStage.getState().progress);
      }, 150);
    });
    observer.observe(element);
    return () => {
      unsubscribe();
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [range]);

  const plate = PLATES[segment]!;
  const child = PLATES[segment + 1]!;
  return (
    <div ref={root} className="relative h-full w-full overflow-hidden" data-segment={segment}>
      <img
        ref={outer}
        key={plate.id}
        src={plate.src}
        alt=""
        data-plate={plate.id}
        className={`descent-plate ${segment === 0 ? "descent-plate--feathered" : ""}`}
        draggable={false}
      />
      <img ref={inner} key={child.id} src={child.src} alt="" data-plate={child.id} className="descent-plate" draggable={false} />
      <div className="descent-hud hud-panel" aria-live="off">
        <p ref={place} className="hud-label text-parchment">
          {plate.label}
        </p>
        <p ref={scaleText} className="hud-readout">
          1 : {plate.scale.toLocaleString("en-US")}
        </p>
        <div className="scale-bar" aria-hidden="true">
          <div ref={bar} className="scale-bar__rule" />
          <span ref={barLabel} className="hud-label" />
        </div>
      </div>
      <p className="sr-only">
        Zooming from New York Harbor to Hoboken, the Stevens campus at Castle Point, a lit window, and the room inside.
      </p>
    </div>
  );
}

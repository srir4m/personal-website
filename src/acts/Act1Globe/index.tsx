import { Suspense, use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { content } from "../../content";
import { useStage } from "../../stage/store";
import { registerActTimeline } from "../../stage/timeline";
import type { ActProps } from "../registry";
import { EducationCard } from "./EducationCard";
import { GlobeScene, type HudFrame } from "./GlobeScene";
import { MarkerHud } from "./MarkerHud";
import { graticulePaths } from "./ortho";
import { hasWebGL, loadGlobeData, type GlobeData } from "./globeData";
import { GLOBE_FOV } from "./layout";

const { lat, lng } = content.education.location;
const PHONE = "(max-width: 767px)";

const safeData: Promise<GlobeData | null> = loadGlobeData().catch(() => null);

/** The scrubbed parts of Act 1 that live in the DOM: the HUD card and its leader line. */
function useCardReveal(index: number, targets: React.RefObject<Element | null>[], markerLayer: React.RefObject<Element | null>) {
  useLayoutEffect(() => {
    const elements = targets.map((t) => t.current).filter(Boolean);
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    tl.set({}, {}, 1);
    // A HUD "scan": two frames of flicker, then settle (PRD §5.4).
    tl.fromTo(elements, { autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.012, immediateRender: false }, 0.36)
      .to(elements, { autoAlpha: 0.15, duration: 0.012 }, 0.372)
      .to(elements, { autoAlpha: 1, duration: 0.03 }, 0.384);
    gsap.set(elements, { autoAlpha: 0 });
    // Clear the HUD before P1 arrives over the marker (the last 10% of the act).
    tl.to([...elements, markerLayer.current], { autoAlpha: 0, duration: 0.04 }, 0.86);
    return registerActTimeline(index, tl);
  }, [index, targets, markerLayer]);
}

function Hud({ children, index }: { children: (setFrame: React.RefObject<(f: HudFrame) => void>) => React.ReactNode; index: number }) {
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const leader = useRef<SVGGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const endA = useRef<SVGRectElement>(null);
  const endB = useRef<SVGRectElement>(null);
  const markerLayer = useRef<HTMLDivElement>(null);
  const targets = useRef([card, leader]).current;
  useCardReveal(index, targets, markerLayer);

  const setFrame = useRef((f: HudFrame) => {
    if (!marker.current || !card.current || !path.current) return;
    marker.current.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`;
    marker.current.style.opacity = String(f.visible);
    // Leader line: marker → short diagonal → the card's nearest edge.
    const c = card.current;
    const phone = f.width < 768;
    const ax = phone ? c.offsetLeft + 24 : c.offsetLeft;
    const ay = phone ? c.offsetTop : c.offsetTop + 28;
    const elbowX = phone ? f.x + (ax - f.x) * 0.25 : f.x + 36;
    const elbowY = phone ? ay - 24 : f.y - 36;
    path.current.setAttribute("d", `M${f.x},${f.y}L${elbowX},${elbowY}L${ax},${phone ? elbowY : ay}${phone ? `L${ax},${ay}` : ""}`);
    endA.current?.setAttribute("x", String(f.x - 2));
    endA.current?.setAttribute("y", String(f.y - 2));
    endB.current?.setAttribute("x", String(ax - 2));
    endB.current?.setAttribute("y", String(ay - 2));
    if (leader.current) leader.current.style.setProperty("--marker-visible", String(f.visible));
  });

  return (
    <div ref={container} className="absolute inset-0">
      {children(setFrame)}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <g ref={leader} className="hud-leader">
          <path ref={path} />
          <rect ref={endA} width="4" height="4" />
          <rect ref={endB} width="4" height="4" />
        </g>
      </svg>
      <div ref={markerLayer} className="pointer-events-none absolute inset-0">
        <MarkerHud ref={marker} />
      </div>
      <EducationCard ref={card} />
    </div>
  );
}

function WebGLGlobe({ index }: { index: number }) {
  const data = use(safeData);
  const [phone] = useState(() => window.matchMedia(PHONE).matches);
  const frameloop = useStage((s) => (s.activeAct <= 1 && s.motion === "full" ? "always" : "demand"));

  if (!data) return <FallbackGlobe index={index} />;
  return (
    <Hud index={index}>
      {(setFrame) => (
        <Canvas
          className="!absolute inset-0"
          dpr={[1, 1.75]}
          frameloop={frameloop}
          camera={{ fov: GLOBE_FOV, near: 0.05, far: 20, position: [0, 0, 4] }}
          gl={{ antialias: true, alpha: true }}
          aria-hidden="true"
          onCreated={() => requestAnimationFrame(() => useStage.setState({ globeReady: true }))}
        >
          <GlobeScene data={data} phone={phone} hud={setFrame} />
        </Canvas>
      )}
    </Hud>
  );
}

/** Static SVG globe for browsers without WebGL (PRD §10.1). */
function FallbackGlobe({ index }: { index: number }) {
  useEffect(() => useStage.setState({ globeReady: true }), []);
  const paths = useRef(graticulePaths(lat, lng)).current;
  return (
    <Hud index={index}>
      {(setFrame) => (
        <FallbackDrawing paths={paths} onLayout={(x, y, width, height) => setFrame.current({ x, y, visible: 1, width, height })} />
      )}
    </Hud>
  );
}

function FallbackDrawing({ paths, onLayout }: { paths: string[]; onLayout: (x: number, y: number, w: number, h: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const place = () => {
      const parent = ref.current?.parentElement;
      if (parent) onLayout(parent.clientWidth / 2, parent.clientHeight / 2, parent.clientWidth, parent.clientHeight);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [onLayout]);
  return (
    <svg ref={ref} viewBox="-1.02 -1.02 2.04 2.04" className="globe-circle absolute" aria-hidden="true">
      <circle r="1" className="fill-parchment stroke-ink" strokeWidth="0.006" />
      {paths.map((d, i) => (
        <path key={i} d={d} className="fill-none stroke-sepia" strokeWidth="0.003" />
      ))}
    </svg>
  );
}

export default function Act1Globe({ index }: ActProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-parchment">
      <Suspense fallback={null}>{hasWebGL() ? <WebGLGlobe index={index} /> : <FallbackGlobe index={index} />}</Suspense>
    </div>
  );
}

import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import emblemFiles from "virtual:game-emblems";
import { CodexPanel } from "../../components/CodexPanel";
import { content } from "../../content";
import type { Item } from "../../content/schema";
import { text } from "../../content/text";
import { ACT_RANGES } from "../../stage/acts";
import { actProgress, useStage } from "../../stage/store";
import { CLOSING_START, STOP_PHASES, STOP_RANGES, TOUR_STOPS, type TourStop } from "../../stage/tour";
import { FIGURE_MARKUP, FRAME, VIEWBOX, VITRUVIAN } from "../../vitruvian/figure";
import { EmblemGlyph } from "../Activities/Glyph";
import { BODY_REGIONS, pointsAttr } from "../Act5Body/regions";
import type { ActProps } from "../registry";

// The vault ships in its own chunk, loaded only when opened (as on the body map).
const Vault = lazy(async () => {
  const [{ VaultPanel }, { default: vault }] = await Promise.all([import("../../vault/VaultPanel"), import("virtual:vault")]);
  return { default: () => <VaultPanel vault={vault} /> };
});

const [, , VB_W, VB_H] = VITRUVIAN.viewBox;
const { circle } = VITRUVIAN;
// The tour opens on the intro's first paragraph: the rest (pursuits) is what the stops show.
const lede = (text(content.owner.intro) ?? "").split(/\n\s*\n/).map((p) => p.trim()).find(Boolean) ?? null;

/** A camera framing inside the figure: the point it centres on, and its zoom. */
type Frame = { cx: number; cy: number; s: number };
const WHOLE: Frame = { cx: VB_W / 2, cy: VB_H / 2, s: 1 };

/** Frames a region: its polygons' bounds with a margin, never closer than 3×. */
function frameFor(stop: TourStop): Frame {
  const region = stop.region && BODY_REGIONS.find((r) => r.id === stop.region);
  if (!region) return WHOLE;
  const points = region.polygons.flat();
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min(3, Math.max(1, Math.min(VB_W / ((x1 - x0) * 1.5), VB_H / ((y1 - y0) * 1.5))));
  // Keep the zoomed view inside the drawing, so the frame never shows empty paper past its edge.
  const clamp = (c: number, size: number) => Math.min(size - size / (2 * s), Math.max(size / (2 * s), c));
  return { cx: clamp((x0 + x1) / 2, VB_W), cy: clamp((y0 + y1) / 2, VB_H), s };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** The site's one curve (power2.inOut, src/stage/motion.ts). */
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const between = (a: number, b: number, x: number) => ease(clamp01((x - a) / (b - a)));

function mix(a: Frame, b: Frame, k: number): Frame {
  // Zoom moves geometrically, so a 1× → 3× push feels even all the way in.
  return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, s: a.s * (b.s / a.s) ** k };
}

/** The frame, the figure's move aside, and each stop's text opacity, at tour progress `t`. */
function tourState(t: number, frames: Frame[]) {
  const opacity = TOUR_STOPS.map(() => 0);
  if (t >= CLOSING_START) {
    const k = between(CLOSING_START, CLOSING_START + (1 - CLOSING_START) * 0.7, t);
    return { frame: mix(frames.at(-1)!, WHOLE, k), aside: 1 - k, opacity };
  }
  const i = Math.max(0, STOP_RANGES.findIndex((r) => t < r.end));
  const { start, end } = STOP_RANGES[i]!;
  const u = (t - start) / (end - start);
  const { arrive, textIn, textInEnd, textOut } = STOP_PHASES;
  opacity[i] = between(textIn, textInEnd, u) * (1 - between(textOut, 1, u));
  const k = between(0, arrive, u);
  const frame = mix(i === 0 ? WHOLE : frames[i - 1]!, frames[i]!, k);
  // The figure steps aside for the text as the first stop arrives.
  const aside = i === 0 ? k : 1;
  return { frame, aside, opacity };
}

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="tour-items">
      {items.map((item) => {
        const subtitle = text(item.subtitle);
        const body = text(item.body);
        const badge = text(item.badge);
        const link = text(item.link);
        return (
          <li key={item.title} className="tour-item">
            <p className="tour-item__title">
              {link ? (
                <a href={link} target="_blank" rel="noopener">
                  {item.title}
                  <span aria-hidden="true"> ↗</span>
                </a>
              ) : (
                item.title
              )}
              {badge && <span className="codex-badge">{badge}</span>}
            </p>
            {subtitle && <p className="tour-item__sub">{subtitle}</p>}
            {body && <p className="tour-item__body">{body}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function Games() {
  return (
    <ul className="game-emblems tour-games">
      {content.squad.games.map((g) => {
        const file = g.emblem.split("/").pop()!;
        const present = emblemFiles.includes(file);
        const detail = [text(g.rank), text(g.main)].filter(Boolean).join(" · ") || null;
        return (
          <li key={g.id} className="game-emblem">
            <div className="game-emblem__mark">
              {present ? <img src={`${import.meta.env.BASE_URL}${g.emblem.replace(/^\//, "")}`} alt={g.name} /> : <EmblemGlyph id={g.id} />}
            </div>
            {!present && <span className="game-emblem__name">{g.name}</span>}
            {detail && <span className="game-emblem__detail">{detail}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The tour (redesign, issue #8): the scroll walks through the figure one region at a
 * time. The drawing zooms to each part and its content reads in beside it, so the
 * owner's work, experience and pursuits are on screen rather than behind clicks.
 * Everything is driven from scroll progress, like the map: nothing re-renders.
 */
export default function Tour({ index }: ActProps) {
  const figure = useRef<HTMLDivElement>(null);
  const camera = useRef<SVGGElement>(null);
  const stopEls = useRef<(HTMLElement | null)[]>([]);
  const highlights = useRef<(SVGGElement | null)[]>([]);
  const vaultButton = useRef<HTMLButtonElement>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const hatch = useId();
  const frames = useMemo(() => TOUR_STOPS.map(frameFor), []);
  const squarePath = `M${FRAME.left},${FRAME.top}H${FRAME.right}V${FRAME.bottom}H${FRAME.left}Z`;

  useEffect(() => {
    const range = ACT_RANGES[index]!;
    const draw = (progress: number) => {
      const { frame, aside, opacity } = tourState(actProgress(range, progress), frames);
      camera.current?.setAttribute(
        "transform",
        `translate(${(VB_W / 2 - frame.cx * frame.s).toFixed(2)} ${(VB_H / 2 - frame.cy * frame.s).toFixed(2)}) scale(${frame.s.toFixed(4)})`,
      );
      figure.current?.style.setProperty("--aside", aside.toFixed(4));
      figure.current?.style.setProperty("--zoomed", clamp01(frame.s - 1).toFixed(3));
      opacity.forEach((o, i) => {
        const el = stopEls.current[i];
        if (el) {
          el.style.opacity = o.toFixed(3);
          const hidden = o < 0.5;
          if (el.inert !== hidden) el.inert = hidden;
        }
        highlights.current[i]?.style.setProperty("opacity", (o * 0.9).toFixed(3));
      });
    };
    draw(useStage.getState().progress);
    return useStage.subscribe((s, prev) => s.progress !== prev.progress && draw(s.progress));
  }, [index, frames]);

  let number = 0;
  let lastRegion: string | null = null;
  return (
    <div className="tour bg-parchment text-ink">
      <div ref={figure} className="tour-figure">
        <svg viewBox={VIEWBOX} className="tour-svg" aria-hidden="true">
          <defs>
            <pattern id={hatch} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
              <line x1="0" y1="0" x2="0" y2="14" className="tour-hatch" />
            </pattern>
          </defs>
          <g ref={camera}>
            <g dangerouslySetInnerHTML={{ __html: FIGURE_MARKUP }} />
            <path d={squarePath} className="vitruvian-line" />
            <circle cx={circle.cx} cy={circle.cy} r={circle.r} className="vitruvian-line" />
            {TOUR_STOPS.map((stop, i) => {
              const region = stop.region && BODY_REGIONS.find((r) => r.id === stop.region);
              return (
                <g
                  key={stop.id}
                  ref={(el) => {
                    highlights.current[i] = el;
                  }}
                  className="tour-region"
                  style={{ opacity: 0 }}
                >
                  {region?.polygons.map((poly, j) => <polygon key={j} points={pointsAttr(poly)} fill={`url(#${CSS.escape(hatch)})`} />)}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="tour-column">
        {TOUR_STOPS.map((stop, i) => {
          // Pages of one list share their number; the eyebrow counts them instead.
          const group = stop.id.replace(/-\d+$/, "");
          if (stop.kind !== "intro" && group !== lastRegion) number += 1;
          lastRegion = group;
          const page = stop.page ? ` · ${stop.page[0]} of ${stop.page[1]}` : "";
          const eyebrow = stop.kind === "intro" ? "Profile" : `${String(number).padStart(2, "0")} · ${stop.label}${page}`;
          return (
            <article
              key={stop.id}
              ref={(el) => {
                stopEls.current[i] = el;
              }}
              className="tour-stop"
              data-stop={stop.id}
              aria-label={stop.kind === "intro" ? "About" : `${stop.label}: ${stop.title}`}
              style={{ opacity: 0 }}
            >
              <p className="tour-eyebrow">{eyebrow}</p>
              <h3 className="tour-title">{stop.kind === "intro" ? "About" : stop.title}</h3>
              {stop.kind === "intro" && (
                <div className="tour-intro">{lede && <p>{lede}</p>}</div>
              )}
              {stop.kind === "items" && <ItemList items={stop.items} />}
              {stop.kind === "play" && (
                <>
                  {stop.items.length > 0 && <ItemList items={stop.items} />}
                  {content.squad.games.length > 0 && (
                    <>
                      <Games />
                      <p className="tour-note">Game names and logos are trademarks of their respective owners.</p>
                    </>
                  )}
                </>
              )}
              {stop.kind === "vault" && (
                <>
                  <p className="tour-intro">Some pages of this notebook are sealed.</p>
                  <button ref={vaultButton} type="button" className="hud-chip tour-vault" aria-haspopup="dialog" onClick={() => setVaultOpen(true)}>
                    Open the vault
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>

      <CodexPanel open={vaultOpen} onClose={() => setVaultOpen(false)} label="Heart" theme="The vault" returnFocus={vaultButton}>
        {vaultOpen && (
          <Suspense fallback={<p className="hud-label">Unsealing…</p>}>
            <Vault />
          </Suspense>
        )}
      </CodexPanel>
    </div>
  );
}

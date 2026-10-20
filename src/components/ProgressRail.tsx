import { useEffect, useRef } from "react";
import { ACTS, ACT_RANGES, actAt, type ActId } from "../stage/acts";
import { actProgress, useStage } from "../stage/store";
import { scrollToAct } from "../stage/timeline";

/**
 * What the rail calls each act. Acts that are passages between two places (the map
 * descent, Becoming) keep a tick but no label, so the rail reads as a short contents list.
 */
const RAIL_LABELS: Partial<Record<ActId, string>> = {
  boot: "Home",
  about: "About",
  globe: "Location",
  activities: "Activities",
  body: "Profile",
  outro: "Contact",
};

/**
 * The codex margin (PRD §3.1): a vertical rail on the left on desktop, a thin top bar on
 * phones. One tick per act; clicking a tick scrolls to that act.
 */
export function ProgressRail() {
  const activeAct = useStage((s) => s.activeAct);
  const fillRef = useRef<HTMLDivElement>(null);

  // Progress changes every frame, so write it straight to the DOM instead of re-rendering.
  // `--step` is the same progress with every act given an equal share: the phone bar spaces
  // its ticks evenly, so each one is a full-size tap target.
  useEffect(
    () =>
      useStage.subscribe((s) => {
        const act = actAt(s.progress);
        const step = (act + actProgress(ACT_RANGES[act]!, s.progress)) / ACTS.length;
        fillRef.current?.style.setProperty("--progress", String(s.progress));
        fillRef.current?.style.setProperty("--step", String(step));
      }),
    [],
  );

  return (
    <nav aria-label="Acts" className="progress-rail fixed z-30">
      <div className="rail-track" aria-hidden="true">
        <div ref={fillRef} className="rail-fill" />
      </div>
      <ol className="rail-ticks">
        {ACTS.map((act, i) => {
          const label = RAIL_LABELS[act.id];
          return (
            <li
              key={act.id}
              className="rail-tick"
              style={{ "--at": ACT_RANGES[i]!.start, "--i": i, "--n": ACTS.length } as React.CSSProperties}
            >
              <a
                href={act.hash ? `#${act.hash}` : "#"}
                aria-current={i === activeAct ? "step" : undefined}
                aria-label={label ? undefined : act.name}
                data-minor={label ? undefined : ""}
                onClick={(event) => {
                  event.preventDefault();
                  useStage.setState({ bootReady: true });
                  scrollToAct(i);
                }}
              >
                <span className="rail-mark" aria-hidden="true" />
                {label && <span className="rail-label">{label}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

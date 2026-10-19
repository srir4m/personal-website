import { useEffect, useRef } from "react";
import { ACTS, ACT_RANGES } from "../stage/acts";
import { useStage } from "../stage/store";
import { scrollToAct } from "../stage/timeline";
import { MirrorText } from "./MirrorText";

/**
 * The codex margin (PRD §3.1): a vertical rail on the left on desktop, a thin top bar on
 * phones. One tick per act; clicking a tick scrolls to that act.
 */
export function ProgressRail() {
  const activeAct = useStage((s) => s.activeAct);
  const fillRef = useRef<HTMLDivElement>(null);

  // Progress changes every frame, so write it straight to the DOM instead of re-rendering.
  useEffect(
    () =>
      useStage.subscribe((s) => {
        fillRef.current?.style.setProperty("--progress", String(s.progress));
      }),
    [],
  );

  return (
    <nav aria-label="Acts" className="progress-rail fixed z-30">
      <div className="rail-track" aria-hidden="true">
        <div ref={fillRef} className="rail-fill" />
      </div>
      <ol className="rail-ticks">
        {ACTS.map((act, i) => (
          <li key={act.id} className="rail-tick" style={{ "--at": ACT_RANGES[i]!.start } as React.CSSProperties}>
            <a
              href={act.hash ? `#${act.hash}` : "#"}
              aria-current={i === activeAct ? "step" : undefined}
              className="mirror-host group"
              onClick={(event) => {
                event.preventDefault();
                useStage.setState({ bootReady: true });
                scrollToAct(i);
              }}
            >
              <span className="rail-mark" aria-hidden="true" />
              <MirrorText className="rail-label">{act.name}</MirrorText>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { ACTS, parseHash } from "./acts";
import { useStage } from "./store";
import { afterNextRefresh, scrollToAct, startTimeline } from "./timeline";
import { ACT_COMPONENTS } from "../acts/registry";

/** An act mounts within one act of the active one and unmounts two or more away (PRD §7.3). */
function ActSlot({ index }: { index: number }) {
  const near = useStage((s) => Math.abs(s.activeAct - index) <= 1);
  const Act = ACT_COMPONENTS[index]!;
  return near ? (
    <Suspense fallback={null}>
      <Act index={index} />
    </Suspense>
  ) : null;
}

function jumpToHash(immediate: boolean) {
  const link = parseHash(window.location.hash);
  if (!link) return;
  if (link.region) useStage.getState().setOpenPanel(link.region);
  useStage.setState({ bootReady: true });
  scrollToAct(link.act, { immediate });
}

/** The pinned full-viewport stage. Every act is a stacked layer driven by the master timeline. */
export function Stage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<HTMLElement[]>([]);
  const motion = useStage((s) => s.motion);
  const activeAct = useStage((s) => s.activeAct);
  const openPanel = useStage((s) => s.openPanel);
  const bootReady = useStage((s) => s.bootReady);
  const synced = useRef({ activeAct, openPanel });

  useLayoutEffect(() => {
    const teardown = startTimeline({ stage: stageRef.current!, layers: layerRefs.current, calm: motion === "calm" });
    // A deep-link jump must land after ScrollTrigger has sized the pin spacer, or the page is
    // too short and the target gets clamped. So jump from the first refresh after setup.
    const stop = afterNextRefresh(() => jumpToHash(true));
    return () => {
      stop();
      teardown();
    };
  }, [motion]);

  useEffect(() => {
    const onHashChange = () => jumpToHash(false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Keep the URL hash in step with the act on screen, so it can be copied as a deep link.
  useEffect(() => {
    // Only react to real changes: on mount the URL may hold a deep link not yet applied.
    if (synced.current.activeAct === activeAct && synced.current.openPanel === openPanel) return;
    synced.current = { activeAct, openPanel };
    const act = ACTS[activeAct]!;
    const hash = act.hash === "body" && openPanel ? `body/${openPanel}` : act.hash;
    const url = hash ? `#${hash}` : window.location.pathname + window.location.search;
    if (window.location.hash !== (hash ? `#${hash}` : "")) history.replaceState(null, "", url);
  }, [activeAct, openPanel]);

  return (
    <div
      ref={stageRef}
      className="relative h-dvh w-full overflow-hidden"
      data-active-act={ACTS[activeAct]!.id}
      data-boot-ready={bootReady}
    >
      {ACTS.map((act, i) => (
        <section
          key={act.id}
          ref={(el) => {
            if (el) layerRefs.current[i] = el;
          }}
          id={`act-${act.id}`}
          tabIndex={-1}
          aria-labelledby={`act-${act.id}-title`}
          inert={i !== activeAct}
          className="absolute inset-0"
        >
          <h2 id={`act-${act.id}-title`} className="sr-only">
            {act.name}
          </h2>
          <ActSlot index={i} />
        </section>
      ))}
    </div>
  );
}

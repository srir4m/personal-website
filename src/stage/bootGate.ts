import { useEffect } from "react";
import { loadGlobeData } from "../acts/Act1Globe/globeData";
import { parseHash } from "./acts";
import { DURATION } from "./motion";
import { useStage } from "./store";

/** The title ink-in (Act 0) takes this long; scrolling never opens before it ends. */
const INK_MS = DURATION.slow * 1000;
const MAX_WAIT_MS = 4000;

/**
 * Act 0 doubles as the loading screen: scrolling is held until the globe is ready or
 * 4 s pass, whichever is first, and never before the title has inked in. A deep link
 * skips the wait and goes straight to its act.
 */
export function useBootGate() {
  useEffect(() => {
    if (parseHash(window.location.hash)) {
      useStage.setState({ bootReady: true });
      return;
    }
    void loadGlobeData().catch(() => undefined);
    const calm = useStage.getState().motion === "calm";
    const started = performance.now();
    let release = 0;
    const open = () => {
      const wait = Math.max(0, (calm ? 0 : INK_MS) - (performance.now() - started));
      window.clearTimeout(release);
      release = window.setTimeout(() => useStage.setState({ bootReady: true }), wait);
    };
    const timeout = window.setTimeout(open, MAX_WAIT_MS);
    const unsubscribe = useStage.subscribe((s) => s.globeReady && open());
    if (useStage.getState().globeReady) open();
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(release);
      unsubscribe();
    };
  }, []);
}

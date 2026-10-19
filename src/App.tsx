import { lazy, Suspense, useEffect } from "react";
import { Stage } from "./stage/Stage";
import { ProgressRail } from "./components/ProgressRail";
import { MotionToggle } from "./components/MotionToggle";
import { Footer } from "./components/Footer";
import { scrollToAct } from "./stage/timeline";
import { ACTS } from "./stage/acts";
import { useBootGate } from "./stage/bootGate";
import { useStage } from "./stage/store";

// `import.meta.env.DEV` is false in production builds, so these chunks are tree-shaken away.
const ContentStatus = import.meta.env.DEV ? lazy(() => import("./dev/ContentStatus")) : null;
const showStatus = new URLSearchParams(window.location.search).get("status") === "1";
const BODY_ACT = ACTS.findIndex((act) => act.id === "body");

export function App() {
  useBootGate();
  const motion = useStage((s) => s.motion);
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  return (
    <>
      <a
        href="#body"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          useStage.setState({ bootReady: true });
          scrollToAct(BODY_ACT, { immediate: true });
        }}
      >
        Skip to body map
      </a>
      <ProgressRail />
      <MotionToggle />
      <main>
        <h1 className="sr-only">Microcosm</h1>
        <Stage />
      </main>
      <Footer />
      <div className="paper-grain" aria-hidden="true" />
      {ContentStatus && showStatus && (
        <Suspense fallback={null}>
          <ContentStatus />
        </Suspense>
      )}
    </>
  );
}

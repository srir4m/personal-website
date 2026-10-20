import { lazy, Suspense, useEffect } from "react";
import { Stage } from "./stage/Stage";
import { ProgressRail } from "./components/ProgressRail";
import { MotionToggle } from "./components/MotionToggle";
import { Footer } from "./components/Footer";
import { scrollToAct } from "./stage/timeline";
import { ACTS } from "./stage/acts";
import { useBootGate } from "./stage/bootGate";
import { content } from "./content";
import { text } from "./content/text";
import { useStage } from "./stage/store";

// `import.meta.env.DEV` is false in production builds, so these chunks are tree-shaken away.
const ContentStatus = import.meta.env.DEV ? lazy(() => import("./dev/ContentStatus")) : null;
const RegionEditor = import.meta.env.DEV ? lazy(() => import("./dev/RegionEditor")) : null;
const params = new URLSearchParams(window.location.search);
const showStatus = params.get("status") === "1";
const editRegions = params.get("edit") === "regions";
const BODY_ACT = ACTS.findIndex((act) => act.id === "body");
/** The page's one h1 names the owner; the codename is only a fallback. */
const OWNER_NAME = text(content.owner.name) ?? "Microcosm";

export function App() {
  if (RegionEditor && editRegions) {
    return (
      <Suspense fallback={null}>
        <RegionEditor />
      </Suspense>
    );
  }
  return <Site />;
}

function Site() {
  useBootGate();
  const motion = useStage((s) => s.motion);
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  useEffect(() => {
    if (import.meta.env.DEV) document.documentElement.dataset.dev = "";
  }, []);
  return (
    <>
      <a
        href="#act-body"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          useStage.setState({ bootReady: true });
          scrollToAct(BODY_ACT, { immediate: true });
          // Land keyboard focus on the first region once the body map is the live act.
          window.setTimeout(() => document.querySelector<HTMLElement>("#act-body .region[tabindex='0']")?.focus(), 150);
        }}
      >
        Skip to body map
      </a>
      <header>
        <ProgressRail />
        <MotionToggle />
      </header>
      <main>
        <h1 className="sr-only">{OWNER_NAME}</h1>
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

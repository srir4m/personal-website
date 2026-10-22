import { lazy, Suspense, useEffect } from "react";
import { ChapterSite } from "./chapters/ChapterSite";
import { useStage } from "./stage/store";

// `import.meta.env.DEV` is false in production builds, so these chunks are tree-shaken away.
const ContentStatus = import.meta.env.DEV ? lazy(() => import("./dev/ContentStatus")) : null;
const RegionEditor = import.meta.env.DEV ? lazy(() => import("./dev/RegionEditor")) : null;
const params = new URLSearchParams(window.location.search);
const showStatus = params.get("status") === "1";
const editRegions = params.get("edit") === "regions";

/**
 * The site (issue #8): one column of chapters over a fixed pixel scene, a zoom from the
 * world into the person. `?pixel`, the preview flag while the move was in progress, still
 * loads it; nothing reads it any more.
 */
export function App() {
  const motion = useStage((s) => s.motion);
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
    document.documentElement.dataset.layout = "pixel";
  }, [motion]);
  useEffect(() => {
    if (import.meta.env.DEV) document.documentElement.dataset.dev = "";
  }, []);
  if (RegionEditor && editRegions) {
    return (
      <Suspense fallback={null}>
        <RegionEditor />
      </Suspense>
    );
  }
  return (
    <>
      <ChapterSite />
      {ContentStatus && showStatus && (
        <Suspense fallback={null}>
          <ContentStatus />
        </Suspense>
      )}
    </>
  );
}

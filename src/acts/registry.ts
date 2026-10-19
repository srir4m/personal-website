import { lazy, type ComponentType } from "react";

export type ActProps = { index: number };

/** One lazily loaded chunk per act (PRD §7.3). Order matches ACTS. */
export const ACT_COMPONENTS: ComponentType<ActProps>[] = [
  lazy(() => import("./Act0Boot")),
  lazy(() => import("./Act1Globe")),
  lazy(() => import("./Act2Descent")),
  lazy(() => import("./Act3Squad")),
  lazy(() => import("./Act4Becoming")),
  lazy(() => import("./Act5Body")),
  lazy(() => import("./Act6Outro")),
];

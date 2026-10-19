import type { ActProps } from "../registry";
import { BodyMap } from "./BodyMap";

/** Act 5: the body map. A hold: the stage stays pinned while the visitor explores (PRD §3). */
export default function Act5Body(_: ActProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-parchment text-ink">
      <BodyMap />
    </div>
  );
}

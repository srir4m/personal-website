import type { ActProps } from "../registry";
import { ActPlaceholder } from "../ActPlaceholder";

export default function Act1Globe({ index }: ActProps) {
  return (
    <ActPlaceholder
      index={index}
      tone="bg-parchment-deep text-ink"
      summary="An engraved globe turns until a marker at Stevens faces you, and the education card opens."
    />
  );
}

import type { ActProps } from "../registry";
import { ActPlaceholder } from "../ActPlaceholder";

export default function Act5Body({ index }: ActProps) {
  return (
    <ActPlaceholder
      index={index}
      tone="bg-parchment text-ink"
      summary="The interactive body map: clickable regions, the Now / Reaching toggle, and the heart vault."
    />
  );
}

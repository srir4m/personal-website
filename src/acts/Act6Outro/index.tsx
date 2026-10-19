import type { ActProps } from "../registry";
import { ActPlaceholder } from "../ActPlaceholder";

export default function Act6Outro({ index }: ActProps) {
  return (
    <ActPlaceholder
      index={index}
      tone="bg-parchment-deep text-ink"
      summary="A fast pull-back to the globe, then contact links."
    />
  );
}

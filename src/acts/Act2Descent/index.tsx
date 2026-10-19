import type { ActProps } from "../registry";
import { ActPlaceholder } from "../ActPlaceholder";

export default function Act2Descent({ index }: ActProps) {
  return (
    <ActPlaceholder
      index={index}
      tone="bg-sepia text-parchment"
      summary="An infinite zoom through four plates: harbor, Hoboken, campus, window."
    />
  );
}

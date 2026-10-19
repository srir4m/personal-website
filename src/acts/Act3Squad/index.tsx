import type { ActProps } from "../registry";
import { ActPlaceholder } from "../ActPlaceholder";

export default function Act3Squad({ index }: ActProps) {
  return (
    <ActPlaceholder
      index={index}
      tone="bg-ink text-parchment"
      summary="A room of engraved silhouettes around glowing monitors, with five game emblems overhead."
    />
  );
}

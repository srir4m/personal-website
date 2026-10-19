import type { ActProps } from "../registry";
import { ActPlaceholder } from "../ActPlaceholder";

export default function Act4Becoming({ index }: ActProps) {
  return (
    <ActPlaceholder
      index={index}
      tone="bg-sanguine text-parchment"
      summary="One silhouette becomes the Vitruvian figure, and the globe's circle closes around it."
    />
  );
}

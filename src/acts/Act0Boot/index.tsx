import { content } from "../../content";
import { text } from "../../content/text";
import type { ActProps } from "../registry";
import { ActPlaceholder } from "../ActPlaceholder";

export default function Act0Boot({ index }: ActProps) {
  const name = text(content.owner.name);
  const tagline = text(content.owner.tagline);
  return (
    <ActPlaceholder index={index} tone="bg-parchment text-ink" summary="A codex page inks in the title. Scroll to begin.">
      {name && <p className="font-display text-3xl">{name}</p>}
      {tagline && <p className="font-display text-xl italic">{tagline}</p>}
      <p className="mt-8 font-mono text-xs tracking-[0.3em] uppercase">↓ scroll</p>
    </ActPlaceholder>
  );
}

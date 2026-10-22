import { useEffect, useState } from "react";
import { useStage } from "../stage/store";

/** The name steps in letter by letter (after jyrinx.xyz's word reveal); this is each letter's delay. */
export const LETTER_MS = 70;
/** The tagline then types itself in (after swerdlow.dev's "Creator."), one character per tick. */
export const TYPE_MS = 55;

/**
 * The hero's name: one span per letter, each stepping in from a blur. Screen readers get
 * the whole name; Calm mode and reduced motion show it at once (the CSS drops the animation).
 */
export function HeroName({ name }: { name: string }) {
  return (
    <h1 id="chapter-home-title" className="hero-name" aria-label={name}>
      {[...name].map((letter, i) => (
        <span key={i} className="hero-letter" aria-hidden="true" style={{ animationDelay: `${i * LETTER_MS}ms` }}>
          {letter}
        </span>
      ))}
    </h1>
  );
}

/**
 * The tagline, typed in after the name with a block cursor. The full text is always in
 * the page for screen readers and search; the typed copy is decoration over it.
 */
export function HeroTagline({ text, after }: { text: string; after: number }) {
  const calm = useStage((s) => s.motion === "calm");
  const [shown, setShown] = useState(calm ? text.length : 0);

  useEffect(() => {
    if (calm) {
      setShown(text.length);
      return;
    }
    let timer = 0;
    const step = (n: number) => {
      setShown(n);
      if (n < text.length) timer = window.setTimeout(() => step(n + 1), TYPE_MS);
    };
    timer = window.setTimeout(() => step(1), after);
    return () => window.clearTimeout(timer);
  }, [calm, text, after]);

  return (
    <p className="hero-tagline" data-typing={shown < text.length ? "true" : "false"}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        <span className="hero-cursor" />
        {/* The rest holds the line's width, so the card doesn't grow as it types. */}
        <span className="hero-rest">{text.slice(shown)}</span>
      </span>
    </p>
  );
}

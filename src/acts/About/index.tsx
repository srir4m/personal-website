import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { content } from "../../content";
import { text } from "../../content/text";
import { registerActTimeline } from "../../stage/timeline";
import type { ActProps } from "../registry";

const intro = text(content.owner.intro);
const paragraphs = intro ? intro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];
const area = content.owner.area ? text(content.owner.area.label) : null;

/**
 * The About section (PRD v1.1, decision Q2): the owner's own words, right after the
 * name, set as a notebook page. Paragraphs ink in as the act scrolls.
 */
export default function About({ index }: ActProps) {
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      tl.set({}, {}, 1);
      tl.fromTo(".about-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.2 }, 0);
      tl.fromTo(
        ".about-reveal",
        { autoAlpha: 0, y: 18, filter: "blur(3px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.16, stagger: 0.1 },
        0.05,
      );
      registerActTimeline(index, tl);
    }, scope);
    return () => ctx.revert();
  }, [index]);

  return (
    <div ref={scope} className="about bg-parchment text-ink">
      <div className="about__page">
        <div className="about__head">
          <p className="hud-label text-sepia about-reveal">About</p>
          <div className="about-rule" aria-hidden="true" />
        </div>
        <div className="about__body">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className={`about-reveal ${i === 0 ? "about__lead" : ""}`}>
              {paragraph}
            </p>
          ))}
        </div>
        {area && (
          <aside className="about__margin about-reveal" aria-label="Location">
            <p className="hud-label text-sepia">Based in</p>
            <p className="font-display text-xl italic">{area}</p>
          </aside>
        )}
      </div>
    </div>
  );
}

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import emblemFiles from "virtual:game-emblems";
import { CodexPanel } from "../../components/CodexPanel";
import { content } from "../../content";
import { text } from "../../content/text";
import { actIndex } from "../../stage/acts";
import { useStage } from "../../stage/store";
import { registerActTimeline, scrollToAct } from "../../stage/timeline";
import type { ActProps } from "../registry";
import { buildActivities, type ActivityCard } from "./activities";
import { EmblemGlyph, Glyph } from "./Glyph";

const intro = text(content.squad.intro);
const games = content.squad.games;

/** Each game as one row: its logo (or a neutral glyph), then rank, main and story when filled in (PRD Act 3). */
function GameRow({ id, name, src, detail, story }: { id: string; name: string; src: string; detail: string | null; story: string | null }) {
  const file = src.split("/").pop()!;
  const present = emblemFiles.includes(file);
  return (
    <li className="game-emblem">
      <div className="game-emblem__mark">
        {present ? <img src={`${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`} alt={name} /> : <EmblemGlyph id={id} />}
      </div>
      {!present && <span className="game-emblem__name">{name}</span>}
      {detail && <span className="game-emblem__detail">{detail}</span>}
      {story && <p className="game-emblem__story">{story}</p>}
    </li>
  );
}

/**
 * Activities (PRD v1.1): what the owner does, as an index of cards. Each hobby card
 * opens its body-map region; Gaming opens its own panel with the games.
 */
export default function Activities({ index }: ActProps) {
  const scope = useRef<HTMLDivElement>(null);
  const gamingButton = useRef<HTMLButtonElement>(null);
  const [gamingOpen, setGamingOpen] = useState(false);
  const cards = useMemo(() => buildActivities(), []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      tl.set({}, {}, 1);
      tl.fromTo(".activities-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.2 }, 0);
      tl.fromTo(".activity-card", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.035 }, 0.05);
      registerActTimeline(index, tl);
    }, scope);
    return () => ctx.revert();
  }, [index]);

  const open = (card: ActivityCard) => {
    if (!card.region) {
      setGamingOpen(true);
      return;
    }
    // Jump straight to the body map with that region's panel open.
    useStage.setState({ openPanel: card.region, bootReady: true });
    scrollToAct(actIndex("body"), { immediate: true });
  };

  return (
    <div ref={scope} className="activities bg-parchment text-ink">
      <div className="activities__page">
        <div className="activities__head">
          <p className="hud-label text-sepia">Activities</p>
          <div className="activities-rule" aria-hidden="true" />
        </div>
        {intro && <p className="activities__intro">{intro}</p>}
        <ul className="activities__grid">
          {cards.map((card) => (
            <li key={card.id} className="activity-card">
              <button
                ref={card.region ? undefined : gamingButton}
                type="button"
                className="activity-card__button"
                aria-haspopup="dialog"
                onClick={() => open(card)}
              >
                <Glyph name={card.glyph} />
                <span className="hud-label text-sepia">{card.category}</span>
                <span className="activity-card__title">{card.title}</span>
                {card.subtitle && <span className="activity-card__subtitle">{card.subtitle}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <CodexPanel open={gamingOpen} onClose={() => setGamingOpen(false)} label="Gaming" theme="Play" returnFocus={gamingButton}>
        <ul className="game-emblems">
          {games.map((g) => (
            <GameRow
              key={g.id}
              id={g.id}
              name={g.name}
              src={g.emblem}
              detail={[text(g.rank), text(g.main)].filter(Boolean).join(" · ") || null}
              story={text(g.story)}
            />
          ))}
        </ul>
        <p className="hud-label text-sepia">Game names and logos are trademarks of their respective owners.</p>
      </CodexPanel>
    </div>
  );
}

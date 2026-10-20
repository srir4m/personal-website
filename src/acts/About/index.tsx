import { content } from "../../content";
import { text } from "../../content/text";
import type { ActProps } from "../registry";

const intro = text(content.owner.intro);
const paragraphs = intro ? intro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];
const area = content.owner.area ? text(content.owner.area.label) : null;
/** Gaming sits in the margin, not the intro (owner's call): only games with a rank filled in. */
const ranked = content.squad.games.flatMap((game) => {
  const rank = text(game.rank);
  return rank ? [{ name: game.name, rank }] : [];
});

/**
 * The About section (PRD v1.1, decision Q2): the owner's own words, right after the
 * name, set as a notebook page. The page arrives whole with the act's cross-fade: reading
 * text doesn't animate (issue #8, "one meaningful animation per moment").
 */
export default function About(_: ActProps) {
  return (
    <div className="about bg-parchment text-ink">
      <div className="about__page">
        <div className="about__head">
          <p className="hud-label text-sepia">About</p>
          <div className="about__rule" aria-hidden="true" />
        </div>
        <div className="about__body">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className={`${i === 0 ? "about__lead" : ""}`}>
              {paragraph}
            </p>
          ))}
        </div>
        {(area || ranked.length > 0) && (
          <div className="about__margin">
            {area && (
              <aside className="about__note" aria-label="Location">
                <p className="hud-label text-sepia">Based in</p>
                <p className="font-display text-xl italic">{area}</p>
              </aside>
            )}
            {ranked.length > 0 && (
              <aside className="about__note" aria-label="On the side">
                <p className="hud-label text-sepia">On the side</p>
                <ul>
                  {ranked.map((game) => (
                    <li key={game.name}>
                      <span className="font-display text-xl italic">{game.name}</span>
                      <span className="hud-readout about__rank">{game.rank}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

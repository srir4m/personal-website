import emblemFiles from "virtual:game-emblems";
import { content } from "../content";
import { text } from "../content/text";
import { EmblemGlyph } from "../acts/Activities/Glyph";

/** The owner's games: each official logo (or a neutral glyph) beside its rank and main. */
export function GameList() {
  return (
    <ul className="game-emblems tour-games">
      {content.squad.games.map((g) => {
        const file = g.emblem.split("/").pop()!;
        const present = emblemFiles.includes(file);
        const detail = [text(g.rank), text(g.main)].filter(Boolean).join(" · ") || null;
        return (
          <li key={g.id} className="game-emblem">
            <div className="game-emblem__mark">
              {present ? <img src={`${import.meta.env.BASE_URL}${g.emblem.replace(/^\//, "")}`} alt={g.name} /> : <EmblemGlyph id={g.id} />}
            </div>
            {!present && <span className="game-emblem__name">{g.name}</span>}
            {detail && <span className="game-emblem__detail">{detail}</span>}
          </li>
        );
      })}
    </ul>
  );
}

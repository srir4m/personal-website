import type { Item } from "../../content/schema";
import { text } from "../../content/text";

/** A region's items in the codex panel: title, then subtitle, body, badge and link when present. */
export function RegionItems({ items }: { items: Item[] }) {
  return (
    <ul className="codex-items">
      {items.map((item) => {
        const subtitle = text(item.subtitle);
        const body = text(item.body);
        const badge = text(item.badge);
        const link = text(item.link);
        return (
          <li key={item.title} className="codex-item">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-2xl leading-tight">{item.title}</h3>
              {badge && <span className="codex-badge">{badge}</span>}
            </div>
            {subtitle && <p className="hud-label mt-1 text-sepia">{subtitle}</p>}
            {body && <p className="mt-2 font-display text-lg leading-snug">{body}</p>}
            {link && (
              <a href={link} target="_blank" rel="noopener" className="codex-link">
                {new URL(link).hostname.replace(/^www\./, "")} ↗
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

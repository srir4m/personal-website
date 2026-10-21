import type { Item } from "../content/schema";
import { text } from "../content/text";

/** A region's items, one per line: title (linked when it has a link), badge, subtitle, body. */
export function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="tour-items">
      {items.map((item) => {
        const subtitle = text(item.subtitle);
        const body = text(item.body);
        const badge = text(item.badge);
        const link = text(item.link);
        return (
          <li key={item.title} className="tour-item">
            <p className="tour-item__title">
              {link ? (
                <a href={link} target="_blank" rel="noopener">
                  {item.title}
                  <span aria-hidden="true"> ↗</span>
                </a>
              ) : (
                item.title
              )}
              {badge && <span className="codex-badge">{badge}</span>}
            </p>
            {subtitle && <p className="tour-item__sub">{subtitle}</p>}
            {body && <p className="tour-item__body">{body}</p>}
          </li>
        );
      })}
    </ul>
  );
}

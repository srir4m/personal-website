import { useState } from "react";
import raw from "../content/site-content.json";
import { collectStatus } from "./contentStatus";

const KIND_STYLE = { null: "text-sepia", TODO: "text-hud-amber", draft: "text-hud-cyan" } as const;

/** Dev-only overlay, opened with `?status=1`, listing what the owner still has to fill in. */
export default function ContentStatus() {
  const [open, setOpen] = useState(true);
  const entries = collectStatus(raw);
  if (!open) return null;
  return (
    <aside
      aria-label="Content status"
      className="fixed right-3 bottom-3 z-50 max-h-[70vh] w-[min(28rem,calc(100vw-1.5rem))] overflow-auto bg-ink p-4 font-mono text-xs text-parchment shadow-2xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="tracking-widest uppercase">Content status · {entries.length} open</h2>
        <button type="button" onClick={() => setOpen(false)} className="underline">
          close
        </button>
      </div>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={entry.path + entry.kind} className="flex gap-3">
            <span className={`w-12 shrink-0 ${KIND_STYLE[entry.kind]}`}>{entry.kind}</span>
            <span className="break-all">{entry.path}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

import { lazy, Suspense, useRef } from "react";
import { CodexPanel } from "../../components/CodexPanel";
import { useStage } from "../../stage/store";
import type { ActProps } from "../registry";
import { ActPlaceholder } from "../ActPlaceholder";

// The vault ships in its own chunk, with marked and DOMPurify, loaded only when opened.
const Vault = lazy(async () => {
  const [{ VaultPanel }, { default: vault }] = await Promise.all([import("../../vault/VaultPanel"), import("virtual:vault")]);
  return { default: () => <VaultPanel vault={vault} /> };
});

/**
 * M5 builds the full body map. Until then the heart is a single button, so the vault
 * (M6) can be reached, including through the `#body/heart` deep link.
 */
export default function Act5Body({ index }: ActProps) {
  const openPanel = useStage((s) => s.openPanel);
  const setOpenPanel = useStage((s) => s.setOpenPanel);
  const heart = useRef<HTMLButtonElement>(null);

  return (
    <ActPlaceholder
      index={index}
      tone="bg-parchment text-ink"
      summary="The interactive body map: clickable regions, the Now / Reaching toggle, and the heart vault."
    >
      <button ref={heart} type="button" className="heart-button" onClick={() => setOpenPanel("heart")} aria-label="Heart: the vault">
        <svg viewBox="-12 -12 24 24" aria-hidden="true">
          <path d="M0,8 C-11,0 -10,-9 -4.5,-9 C-2,-9 0,-7 0,-5 C0,-7 2,-9 4.5,-9 C10,-9 11,0 0,8 Z" />
        </svg>
        <span className="hud-label">Heart · the vault</span>
      </button>
      <CodexPanel
        open={openPanel === "heart"}
        onClose={() => setOpenPanel(null)}
        label="Heart"
        theme="The vault"
        returnFocus={heart}
      >
        <Suspense fallback={<p className="hud-label">Unsealing…</p>}>
          <Vault />
        </Suspense>
      </CodexPanel>
    </ActPlaceholder>
  );
}

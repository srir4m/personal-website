import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  theme: string;
  /** Focus returns here when the panel closes (PRD Act 5). */
  returnFocus?: React.RefObject<HTMLElement | null>;
  children: ReactNode;
};

/**
 * The codex panel: slides in from the right at 420 px on desktop, a bottom sheet under
 * 768 px. A modal <dialog>, so focus is trapped and Esc closes it; a click on the
 * backdrop closes it too, and focus goes back to whatever opened it. It portals to
 * <body>, so an inactive (inert) act layer can never swallow its focus.
 */
export function CodexPanel({ open, onClose, label, theme, returnFocus, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return createPortal(
    <dialog
      ref={ref}
      className="codex-panel"
      aria-labelledby="codex-panel-title"
      onClose={() => {
        onClose();
        returnFocus?.current?.focus();
      }}
      onClick={(event) => event.target === ref.current && ref.current?.close()}
    >
      {open && (
        <div className="codex-panel__body">
          <header className="codex-panel__header">
            <div>
              <h2 id="codex-panel-title" className="font-display text-4xl leading-none">
                {label}
              </h2>
              <p className="hud-label mt-2 text-sepia">{theme}</p>
            </div>
            <button type="button" className="codex-panel__close" onClick={() => ref.current?.close()} aria-label="Close">
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>,
    document.body,
  );
}

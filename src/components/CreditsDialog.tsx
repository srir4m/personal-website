import { useEffect, useRef } from "react";

type Props = { open: boolean; onClose: () => void };

/** Credits modal (PRD §8.6). Native <dialog> gives focus trapping and Esc for free. */
export function CreditsDialog({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      aria-labelledby="credits-title"
      className="m-auto max-w-lg bg-parchment p-8 font-display text-lg text-ink backdrop:bg-ink/50"
    >
      <h2 id="credits-title" className="mb-4 font-display text-3xl">
        Credits
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Leonardo da Vinci, <em>Vitruvian Man</em>, c. 1490 (public domain). Traced from a photograph by Luc
          Viatour, via Wikimedia Commons.
        </li>
        <li>Map data: Natural Earth (public domain).</li>
        <li>Game names and logos are trademarks of their respective owners.</li>
        <li>Cormorant Garamond and IBM Plex Mono, SIL Open Font License 1.1.</li>
      </ul>
      <button type="button" onClick={onClose} className="mt-6 font-mono text-sm underline underline-offset-4">
        Close
      </button>
    </dialog>
  );
}

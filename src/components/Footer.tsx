import { useState } from "react";
import { contactLinks } from "../content/contacts";
import { SITE_VERSION } from "../version";
import { CreditsDialog } from "./CreditsDialog";

export function Footer() {
  const [creditsOpen, setCreditsOpen] = useState(false);
  return (
    <footer className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-sepia/40 bg-parchment-deep px-6 py-6 font-mono text-sm text-ink">
      <span>v{SITE_VERSION}</span>
      <ul className="flex gap-4">
        {contactLinks().map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noopener" className="underline underline-offset-4">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <button type="button" className="underline underline-offset-4" onClick={() => setCreditsOpen(true)}>
        Credits
      </button>
      <CreditsDialog open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </footer>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { decryptVault, type VaultFile } from "./crypto";

const MAX_FAILURES = 5;
const COOLDOWN_MS = 30_000;
const CRACK_MS = 400;

type State = "locked" | "checking" | "failed" | "cracking" | "open" | "cooldown";

async function render(markdown: string): Promise<string> {
  const [{ marked }, { default: DOMPurify }] = await Promise.all([import("marked"), import("dompurify")]);
  return DOMPurify.sanitize(await marked.parse(markdown, { async: true }));
}

/**
 * The heart vault (PRD §9). Decrypts in the browser with Web Crypto. The plaintext and
 * key live only in this component's state: never stored, never logged, and gone when
 * the panel closes (the panel unmounts its children on close).
 */
export function VaultPanel({ vault }: { vault: VaultFile | null }) {
  const [state, setState] = useState<State>("locked");
  const [html, setHtml] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [blots, setBlots] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const statusId = useId();

  useEffect(() => () => setHtml(null), []);

  // The dialog focuses its first control when it opens, which may land before this
  // lazily loaded form exists; move focus to the passphrase once it does.
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (state !== "cooldown") return;
    const timer = window.setTimeout(() => {
      setFailures(0);
      setState("locked");
    }, COOLDOWN_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  if (!vault) {
    return <p className="font-display text-xl italic">The vault is empty.</p>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const passphrase = input.current?.value ?? "";
    if (!passphrase || state === "checking" || state === "cooldown") return;
    setState("checking");
    try {
      const plaintext = await decryptVault(vault, passphrase);
      if (input.current) input.current.value = "";
      setState("cracking");
      const rendered = await render(plaintext);
      window.setTimeout(() => {
        setHtml(rendered);
        setState("open");
      }, CRACK_MS);
    } catch {
      const count = failures + 1;
      setFailures(count);
      setBlots((b) => b + 1);
      // The lockout is cosmetic (PRD §9): the ciphertext is in the page either way.
      setState(count >= MAX_FAILURES ? "cooldown" : "failed");
      window.setTimeout(() => input.current?.select(), 0);
    }
  };

  if (state === "open" && html !== null) {
    return <div className="vault-content prose-codex" data-testid="vault-content" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  const disabled = state === "checking" || state === "cracking" || state === "cooldown";
  return (
    <form className={`vault-lock ${state === "failed" ? "vault-lock--shake" : ""}`} onSubmit={submit} key={blots}>
      <WaxSeal cracking={state === "cracking"} />
      {blots > 0 && <InkBlot seed={blots} />}
      <label htmlFor={inputId} className="hud-label">
        Passphrase
      </label>
      <input
        ref={input}
        id={inputId}
        type="password"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        aria-describedby={statusId}
        aria-invalid={state === "failed"}
        className="vault-input"
      />
      <button type="submit" className="vault-button" disabled={disabled}>
        {state === "checking" ? "Breaking the seal…" : "Break the seal"}
      </button>
      <p id={statusId} role="status" className="min-h-6 font-display text-lg italic">
        {state === "failed" && "The seal holds. Try again."}
        {state === "cooldown" && "The seal has hardened. Wait thirty seconds."}
      </p>
    </form>
  );
}

function WaxSeal({ cracking }: { cracking: boolean }) {
  return (
    <svg viewBox="-50 -50 100 100" className={`wax-seal ${cracking ? "wax-seal--crack" : ""}`} aria-hidden="true">
      <g className="wax-seal__left">
        <path d="M0,-44 A44,44 0 0 0 0,44 L4,22 L-3,6 L5,-12 L-2,-28 Z" />
      </g>
      <g className="wax-seal__right">
        <path d="M0,-44 A44,44 0 0 1 0,44 L4,22 L-3,6 L5,-12 L-2,-28 Z" />
      </g>
      <g className="wax-seal__emboss">
        <circle r="30" />
        <path d="M0,14 C-22,0 -20,-18 -9,-18 C-4,-18 0,-14 0,-10 C0,-14 4,-18 9,-18 C20,-18 22,0 0,14 Z" />
      </g>
    </svg>
  );
}

function InkBlot({ seed }: { seed: number }) {
  const points = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const r = 14 + ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) * 6;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  });
  return (
    <svg viewBox="-30 -30 60 60" className="ink-blot" aria-hidden="true" data-testid="ink-blot">
      <polygon points={points.join(" ")} />
      <circle cx="20" cy="14" r="3" />
      <circle cx="-22" cy="-10" r="2" />
    </svg>
  );
}

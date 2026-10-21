import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import "../styles/chapters.css";
import { CodexPanel } from "../components/CodexPanel";
import { CourseLog } from "../components/CourseLog";
import { Footer } from "../components/Footer";
import { GameList } from "../components/GameList";
import { ItemList } from "../components/ItemList";
import { MotionToggle } from "../components/MotionToggle";
import { ChapterRail } from "../components/ProgressRail";
import { content } from "../content";
import { contactLinks } from "../content/contacts";
import { text } from "../content/text";
import { CHAPTERS, chapterHash, chapterIndex, parseChapterHash, type Chapter } from "../stage/chapters";
import { scrollToChapter, startChapterScroll } from "../stage/chapterScroll";
import { useStage } from "../stage/store";
import { Vault } from "../vault/LazyVault";
import { RegionItems } from "../acts/Act5Body/RegionItems";
import { BODY_REGIONS, regionItems } from "../acts/Act5Body/regions";

const { owner, education } = content;
const NAME = text(owner.name);
const TAGLINE = text(owner.tagline);
/** What the owner does, in one line of existing facts: degree · school · area. */
const ROLE = [text(education.degree), text(education.school), owner.area && text(owner.area.label)].filter((f): f is string => Boolean(f));
/** The intro's first paragraph: the rest (pursuits) is what the tour's chapters show. */
const LEDE = (text(owner.intro) ?? "").split(/\n\s*\n/).map((p) => p.trim()).find(Boolean) ?? null;
const BODY = chapterIndex("body");
const CONTACT = chapterIndex("contact");

const coordinate = (value: number, positive: string, negative: string) => `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;

function jumpToHash(immediate: boolean) {
  const link = parseChapterHash(window.location.hash);
  if (!link) return;
  if (link.region) useStage.getState().setOpenPanel(link.region);
  scrollToChapter(link.chapter, { immediate });
}

/**
 * The pixel layout (pixel move, issue #8, PR 2): one column of chapters over a fixed pixel
 * scene, which the PixelScene (PR 3) draws into `#pixel-scene` from the store's chapterP.
 * The page scrolls natively; chapterScroll measures the reading position.
 */
export function ChapterSite() {
  const sections = useRef<HTMLElement[]>([]);
  const activeChapter = useStage((s) => s.activeChapter);
  const openPanel = useStage((s) => s.openPanel);
  const synced = useRef({ activeChapter, openPanel });

  useLayoutEffect(() => {
    // The HTML paints the act layout's title before any JavaScript; the hero replaces it here.
    document.getElementById("boot-title")?.remove();
    const stop = startChapterScroll(sections.current);
    // Deep links land once fonts have set the column's height.
    void document.fonts.ready.then(() => jumpToHash(true));
    useStage.setState({ bootReady: true });
    return stop;
  }, []);

  useEffect(() => {
    const onHashChange = () => jumpToHash(false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Keep the URL hash in step with the chapter being read, so it can be copied as a deep link.
  useEffect(() => {
    if (synced.current.activeChapter === activeChapter && synced.current.openPanel === openPanel) return;
    synced.current = { activeChapter, openPanel };
    const hash = chapterHash(activeChapter, openPanel);
    if (window.location.hash !== (hash ? `#${hash}` : "")) history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname + window.location.search);
  }, [activeChapter, openPanel]);

  const section = (chapter: Chapter, i: number, body: React.ReactNode) => (
    <section
      key={chapter.id}
      id={`chapter-${chapter.id}`}
      ref={(el) => {
        if (el) sections.current[i] = el;
      }}
      className={chapter.kind === "hero" ? "chapter-hero" : "chapter"}
      tabIndex={-1}
      data-chapter={chapter.id}
      data-scene={chapter.scene}
      aria-labelledby={`chapter-${chapter.id}-title`}
    >
      {body}
    </section>
  );

  return (
    <div className="chapter-site" data-active-chapter={CHAPTERS[activeChapter]?.id}>
      <a
        href="#chapter-body"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          scrollToChapter(BODY, { immediate: true });
          window.setTimeout(() => document.querySelector<HTMLElement>("#chapter-body button")?.focus(), 50);
        }}
      >
        Skip to the figure
      </a>
      <header>
        <ChapterRail />
        <MotionToggle />
      </header>
      {/* The PixelScene draws here (PR 3); its text equivalent is the column itself. */}
      <div id="pixel-scene" className="pixel-scene" aria-hidden="true" />
      <main className="chapter-col">
        {section(CHAPTERS[0]!, 0, <Hero />)}
        <div className="paper">{CHAPTERS.slice(1).map((chapter, i) => section(chapter, i + 1, <ChapterBody chapter={chapter} />))}</div>
      </main>
      <Footer />
      <div className="paper-grain" aria-hidden="true" />
    </div>
  );
}

function Hero() {
  return (
    <div className="hero-card">
      <h1 id="chapter-home-title" className="hero-name">
        {NAME ?? "Microcosm"}
      </h1>
      {TAGLINE && <p className="hero-tagline">{TAGLINE}</p>}
      {ROLE.length > 0 && (
        // Each fact wraps as a whole, its separator kept with it, so no line starts with one.
        <p className="hero-role">
          {ROLE.map((fact, i) => (
            <span key={fact}>
              <span className="whitespace-nowrap">{i < ROLE.length - 1 ? `${fact} ·` : fact}</span>
              {i < ROLE.length - 1 && " "}
            </span>
          ))}
        </p>
      )}
      {CONTACT !== -1 && contactLinks().length > 0 && (
        <a
          href="#contact"
          className="hud-chip"
          onClick={(event) => {
            event.preventDefault();
            scrollToChapter(CONTACT);
          }}
        >
          Get in touch ↓
        </a>
      )}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="chapter-eyebrow">{children}</p>;
}

function ChapterBody({ chapter }: { chapter: Chapter }) {
  const title = (children: React.ReactNode) => (
    <h2 id={`chapter-${chapter.id}-title`} className="chapter-title">
      {children}
    </h2>
  );
  switch (chapter.kind) {
    case "location": {
      const area = owner.area!;
      return (
        <>
          <Eyebrow>Location</Eyebrow>
          {title(area.label)}
          <dl className="chapter-coords">
            <dt>Lat</dt>
            <dd>{coordinate(area.lat, "N", "S")}</dd>
            <dt>Lng</dt>
            <dd>{coordinate(area.lng, "E", "W")}</dd>
          </dl>
        </>
      );
    }
    case "campus": {
      const facts: [string, string | null][] = [
        ["Place", text(education.location.label)],
        ["Degree", text(education.degree)],
        ["Class", text(education.classOf)],
      ];
      return (
        <>
          <Eyebrow>Campus</Eyebrow>
          {title(education.school)}
          <dl className="chapter-coords">
            {facts.map(([label, value]) =>
              value ? (
                <div key={label} className="contents">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </>
      );
    }
    case "about":
      return (
        <>
          <Eyebrow>About</Eyebrow>
          {title("About")}
          {LEDE && <p className="chapter-lede">{LEDE}</p>}
        </>
      );
    case "stop":
      return <StopBody chapter={chapter} title={title} />;
    case "body":
      return <BodyIndex title={title} />;
    case "contact":
      return <ContactBody title={title} />;
    default:
      return null;
  }
}

function StopBody({ chapter, title }: { chapter: Chapter; title: (children: React.ReactNode) => React.ReactNode }) {
  const stop = chapter.stop!;
  const vaultButton = useRef<HTMLButtonElement>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  return (
    <>
      <Eyebrow>{stop.label}</Eyebrow>
      {title(stop.title)}
      {stop.kind === "items" && <ItemList items={stop.items} />}
      {stop.kind === "play" && (
        <>
          {stop.items.length > 0 && <ItemList items={stop.items} />}
          {content.squad.games.length > 0 && (
            <>
              <GameList />
              <p className="chapter-note">Game names and logos are trademarks of their respective owners.</p>
            </>
          )}
        </>
      )}
      {stop.kind === "vault" && (
        <>
          <p>Some pages of this notebook are sealed.</p>
          <div>
            <button ref={vaultButton} type="button" className="hud-chip" aria-haspopup="dialog" onClick={() => setVaultOpen(true)}>
              Open the vault
            </button>
          </div>
          <CodexPanel open={vaultOpen} onClose={() => setVaultOpen(false)} label="Heart" theme="The vault" returnFocus={vaultButton}>
            {vaultOpen && (
              <Suspense fallback={<p className="hud-label">Unsealing…</p>}>
                <Vault />
              </Suspense>
            )}
          </CodexPanel>
        </>
      )}
    </>
  );
}

/**
 * The figure to explore (the body map). Until the pixel figure's regions can be clicked
 * (PR 4), and for screen readers after, every region with content is a button here that
 * opens its codex panel, as `#body/<region>` deep links do.
 */
function BodyIndex({ title }: { title: (children: React.ReactNode) => React.ReactNode }) {
  const openPanel = useStage((s) => s.openPanel);
  const setOpenPanel = useStage((s) => s.setOpenPanel);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const regions = BODY_REGIONS.filter((r) => r.id === "heart" || regionItems(r, "now").length > 0);
  const open = regions.find((r) => r.id === openPanel) ?? null;
  returnFocus.current = open ? (buttons.current[open.id] ?? null) : null;
  return (
    <>
      <Eyebrow>Explore</Eyebrow>
      {title("The figure")}
      <p>Each part of the figure holds part of the story. Choose one to read it.</p>
      <ul className="chapter-regions">
        {regions.map((region) => (
          <li key={region.id}>
            <button
              ref={(el) => {
                buttons.current[region.id] = el;
              }}
              type="button"
              className="hud-chip"
              aria-haspopup="dialog"
              onClick={() => setOpenPanel(region.id)}
            >
              {region.label}
              <span className="chapter-regions__theme"> · {region.theme}</span>
            </button>
          </li>
        ))}
      </ul>
      <CodexPanel open={open !== null} onClose={() => setOpenPanel(null)} label={open?.label ?? ""} theme={open?.theme ?? ""} returnFocus={returnFocus}>
        {open?.id === "heart" ? (
          <Suspense fallback={<p className="hud-label">Unsealing…</p>}>
            <Vault />
          </Suspense>
        ) : (
          open && (
            <>
              <RegionItems items={regionItems(open, "now")} />
              {open.id === "spine" && <CourseLog />}
            </>
          )
        )}
      </CodexPanel>
    </>
  );
}

function ContactBody({ title }: { title: (children: React.ReactNode) => React.ReactNode }) {
  const links = contactLinks();
  const email = text(owner.contact.email);
  const [copied, setCopied] = useState<"idle" | "copied" | "selected">("idle");
  const emailRef = useRef<HTMLParagraphElement>(null);
  const copy = () => {
    const select = () => {
      const range = document.createRange();
      range.selectNodeContents(emailRef.current!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setCopied("selected");
    };
    navigator.clipboard?.writeText(email!).then(() => setCopied("copied"), select) ?? select();
    window.setTimeout(() => setCopied("idle"), 1800);
  };
  return (
    <>
      <Eyebrow>Contact</Eyebrow>
      {title("Contact")}
      {email && (
        <p ref={emailRef} className="chapter-email">
          {email}
        </p>
      )}
      <div className="chapter-actions">
        {email && (
          <button type="button" className="hud-chip" onClick={copy} aria-live="polite">
            {copied === "copied" ? "Copied" : copied === "selected" ? "Selected: press copy" : "Copy email"}
          </button>
        )}
        {links
          .filter((link) => !link.href.startsWith("mailto:"))
          .map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener" className="hud-chip">
              {link.label} ↗
            </a>
          ))}
      </div>
      <div>
        <button
          type="button"
          className="chapter-top"
          onClick={() => {
            useStage.setState({ openPanel: null });
            scrollToChapter(0);
          }}
        >
          Back to top ↑
        </button>
      </div>
    </>
  );
}

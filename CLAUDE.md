# Microcosm — notes for Claude

- The spec is `docs/PRD.md`. Build milestone by milestone (PRD §11) and stop for owner review after each.
- Never invent personal content. Everything personal comes from `src/content/site-content.json`;
  `null`/`"TODO"` render nothing (use `text()` from `src/content/text.ts`), drafts never render in production.
- Never hard-code the vault passphrase or commit `vault/` or `.env*`.
- Do not redraw game logos; use files in `public/assets/games/` or neutral placeholder glyphs.
- Track owner-input items, open questions, and later ideas as GitHub issues on srir4m/srir4m.github.io
  (`gh api repos/srir4m/srir4m.github.io/issues`). Reference them in milestone notes instead of re-listing.
- The narrative follows PRD v1.1 (`docs/PRD-v1.1-draft.md`, owner decisions recorded there): name, About,
  globe to the owner's area, the live-map descent, Activities, Becoming, body map, outro. The v1.0 campus zoom and
  Squad room are gone.
- The repo is the owner's GitHub Pages user site, `srir4m/srir4m.github.io` (it was renamed from `personal-website`),
  served at the root of https://srir4m.github.io/. Reference public assets through `import.meta.env.BASE_URL`,
  never a bare leading `/`, so preview builds with another base keep working. There is no server, so any
  runtime data has to be a static file.
- Bump `SITE_VERSION` in `src/version.ts` (and `package.json` version) at every milestone.

## Scroll architecture

- One master GSAP timeline (`src/stage/timeline.ts`) with a single ScrollTrigger. Acts never create
  their own ScrollTrigger; they build a paused sub-timeline and pass it to `registerActTimeline(index, tl)`,
  which stretches it over the act's range.
- Scroll progress lives in the Zustand store (`src/stage/store.ts`). Read it with `useStage.getState()`
  (e.g. inside R3F `useFrame`) or `useStage.subscribe`; never select `progress` in a React component.
- Act ranges, settle points and deep-link parsing are in `src/stage/acts.ts`.

## Checks before finishing a milestone

```bash
npm run build && npm test && npm run test:e2e
```
In cloud containers Playwright uses the pre-installed Chromium at `/opt/pw-browsers/chromium` automatically.

## Working with other agents

Two Claude sessions may work on this repo at once:

- **Feature agent:** builds new sections and content-model changes, committing straight to `main`. It owns
  `src/stage/acts.ts` (act order and shares), `src/content/schema.ts`, `src/content/site-content.json`,
  and whichever act it is building (announced in the polish backlog issue, #8).
- **Polish agent:** improves the look and feel of everything else. It works on `polish/<topic>` branches
  and opens one small PR per change, with before and after screenshots at 1440×900 and 390×844. Its backlog is
  issue #8. Before starting, it checks #8 for the act the feature agent is currently building, and stays out of it.

Both agents: rebase on `origin/main` before pushing, keep every check green, never invent personal
content, and never force-push `main`.

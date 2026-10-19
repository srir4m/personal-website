# Microcosm — notes for Claude

- The spec is `docs/PRD.md`. Build milestone by milestone (PRD §11) and stop for owner review after each.
- Never invent personal content. Everything personal comes from `src/content/site-content.json`;
  `null`/`"TODO"` render nothing (use `text()` from `src/content/text.ts`), drafts never render in production.
- Never hard-code the vault passphrase or commit `vault/` or `.env*`.
- Do not redraw game logos; use files in `public/assets/games/` or neutral placeholder glyphs.
- Track owner-input items, open questions, and later ideas as GitHub issues on srir4m/personal-website
  (`gh api repos/srir4m/personal-website/issues`). Reference them in milestone notes instead of re-listing.
- The narrative is being reworked (issues #1, #4, #5): don't build Act 2/3 further as PRD v1.0 specs them
  (campus zoom, Squad room) without checking those issues for the current direction.
- Hosting is GitHub Pages under `/personal-website/`: reference public assets through
  `import.meta.env.BASE_URL`, never a bare leading `/`. There is no server, so any runtime data has to be a static file.
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

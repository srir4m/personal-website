# Microcosm — notes for Claude

- The spec is `docs/PRD.md`. Build milestone by milestone (PRD §11) and stop for owner review after each.
- Never invent personal content. Everything personal comes from `src/content/site-content.json`;
  `null`/`"TODO"` render nothing (use `text()` from `src/content/text.ts`), drafts never render in production.
- Never hard-code the vault passphrase or commit `vault/` or `.env*`.
- Do not redraw game logos; use files in `public/assets/games/` or neutral placeholder glyphs.
- Track owner-input items, open questions, and later ideas as GitHub issues on srir4m/srir4m.github.io
  (`gh api repos/srir4m/srir4m.github.io/issues`). Reference them in milestone notes instead of re-listing.
- The narrative is the owner-approved pixel layout (issue #8), which supersedes PRD v1.1's act list: one zoom
  from the world into the person, as one column of chapters over a fixed pixel scene. The hero (name, tagline,
  role), the owner's area, the campus, About, one chapter per tour stop (stops in `src/stage/tour.ts`; the figure
  frames each stop's body region), the body map to explore, contact. Old act hashes (`#globe`, `#descent`,
  `#becoming`, `#profile`, `#activities`, `#outro`) are chapter aliases.
- The repo is the owner's GitHub Pages user site, `srir4m/srir4m.github.io` (it was renamed from `personal-website`),
  served at the root of https://srir4m.github.io/. Reference public assets through `import.meta.env.BASE_URL`,
  never a bare leading `/`, so preview builds with another base keep working. There is no server, so any
  runtime data has to be a static file.
- Bump `SITE_VERSION` in `src/version.ts` (and `package.json` version) at every milestone.

## Page architecture

- Chapters are built from content in `src/stage/chapters.ts` and rendered by `src/chapters/ChapterSite.tsx`.
  The page scrolls natively (Lenis smooths the wheel in full motion; `src/chapters/smoothScroll.ts`); there is
  no pin and no scroll timeline.
- The reading position in chapter units is the store's `chapterP` (written by `src/stage/chapterScroll.ts`);
  `activeChapter` is its rounded index. Read `chapterP` with `useStage.getState()` or `useStage.subscribe`,
  never select it in a React component.
- Each chapter names its `scene` (`globe`, `city`, `street`, `figure`) and, on the figure, its `region`. The
  scene (`src/pixel/`) takes its timing only from adjacent chapters' scenes: a change of scene coarsens to
  48 px and wipes. `scene.ts` is pure and unit-tested; `PixelScene.tsx` paints it; `sources.ts` loads the frames.
- The map and figure frames are baked by `npm run pixel:bake` into `public/assets/pixel/` (geometry in
  `pixel.json`). The map tiles under `public/assets/map/` feed the bake only and are left out of the build.
- Calm mode (and reduced motion) snaps to chapters with CSS and turns off the globe's spin, the companion's
  flapping, the typed hero and Lenis. Dark mode follows the system through the colour tokens.
- The first-load JS budget is 200 KB gzip (`scripts/check-budget.ts`).

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

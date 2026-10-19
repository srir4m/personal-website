# Microcosm

A personal website as one scrolling journey, from an engraved globe down to the Vitruvian
Man, in a "Codex HUD" style. The full spec is in [`docs/PRD.md`](docs/PRD.md).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + content validation + production build
npm test             # unit tests (Vitest)
npm run test:e2e     # smoke tests (Playwright, builds and serves the site itself)
npm run globe:data   # regenerate public/assets/globe/* from Natural Earth (outputs are committed)
npm run plates:placeholder  # regenerate the placeholder plates in public/assets/plates/
```

## Editing content

All personal content lives in [`src/content/site-content.json`](src/content/site-content.json).
You never need to touch component code to change it.

- `null` or any string starting with `"TODO"` renders as nothing.
- Items with `"draft": true` show in dev but never in production.
- Items with `"mode": "reaching"` only show when the body map is in Reaching mode.
- The file is validated against [`src/content/schema.ts`](src/content/schema.ts). A bad edit fails
  `npm run dev` and `npm run build` with an error that names the field.
- Open `http://localhost:5173/?status=1` in dev to see every field still `null`, `TODO`, or draft.

## Replacing the descent plates

The zoom plates live in `public/assets/plates/p1.svg` … `p5.svg` (16:9, SVG preferred, under 400 KB each).
Each plate's `childRect` (where the next plate sits) and P1's `anchor` (Castle Point, for the
globe handoff) are set in `src/acts/Act2Descent/plates.ts`; keep them in step with the art.

## Open items

Owner input and later ideas are tracked as [GitHub issues](https://github.com/srir4m/personal-website/issues).

## Deep links

`#globe`, `#descent`, `#squad`, `#becoming`, `#body`, `#body/<regionId>`, `#outro`.

## Layout

```
src/
  version.ts        SITE_VERSION, shown in the footer, bumped every milestone
  content/          site-content.json, Zod schema, text helpers
  stage/            acts.ts (act table), store.ts (Zustand), timeline.ts (master GSAP timeline), Stage.tsx
  acts/             Act0Boot … Act6Outro, one lazily loaded chunk each
  components/       ProgressRail, MirrorText, MotionToggle, Footer, CreditsDialog
  dev/              ContentStatus overlay (dev only, stripped from production)
  styles/           tokens.css (colour tokens), globals.css (Tailwind + base styles)
tests/unit          Vitest
tests/e2e           Playwright
```

## Milestones

| M | Status |
|---|---|
| M0 Scaffold, Stage, master timeline, progress rail, placeholder acts, schema, Content Status | ✅ v0.1.0 |
| M1 Boot + globe + education card | ✅ v0.2.0 |
| M2 Infinite zoom with placeholder plates, globe handoff, rebasing | ✅ v0.3.0 |
| M3 Squad: silhouettes, emblems, cards | next |
| M2 – M8 | see PRD §11 |

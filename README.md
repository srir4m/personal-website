# Microcosm

A personal website as one scrolling journey, from an engraved globe down to the Vitruvian
Man, in a "Codex HUD" style. The full spec is in [`docs/PRD.md`](docs/PRD.md).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + content validation + production build
npm test             # unit tests (Vitest)
npm run test:e2e     # smoke tests (Playwright; builds with the fixture vault and serves it)
npm run vault:encrypt  # encrypt vault/vault.md into src/content/vault.enc.json
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

## Deploying

The site is hosted on **GitHub Pages**. Every push to `main` builds and publishes it to
https://srir4m.github.io/personal-website/ (`.github/workflows/pages.yml`). The build sets
`BASE_PATH=/personal-website/`, so all asset URLs go through `import.meta.env.BASE_URL`.

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
- **CI** (`.github/workflows/ci.yml`) runs the build, the unit tests and the e2e tests on every push and pull request.

The site is unlisted rather than secret: every page carries `<meta name="robots" content="noindex, nofollow">`.
(On a project site, GitHub serves `robots.txt` from the user domain's root rather than from `/personal-website/`, so the meta tag is what keeps it out of search results.) No analytics, cookies, or third-party requests.

## Open items

Owner input and later ideas are tracked as [GitHub issues](https://github.com/srir4m/personal-website/issues).

## The Vitruvian figure

- `npm run vitruvian:trace` traces `assets-src/vitruvian-source.jpg`, Luc Viatour's photograph of Leonardo's
  drawing (Wikimedia Commons, public domain). It crops to the drawing, flattens the paper tone, and thresholds
  the ink. It then follows and erases Leonardo's hand-drawn circle and square, clears his notes and stray
  specks, and vectorises the figure with potrace. The site redraws the circle and square as clean lines from
  `src/content/vitruvian.json`. The default crop matches that photograph; for another scan, pass `--crop x,y,w,h`.
- `npm run vitruvian:placeholder` writes the placeholder mannequin used until a scan is traced (#6).
- Body regions and pose masks live in `src/content/regions.json`, normalised to the figure. To edit them,
  run `npm run dev`, open `/?edit=regions`, and Save. The editor is dev-only.

## The heart vault

Private notes behind a passphrase (PRD §9). Casual visitors can't read them; a determined
offline attacker with the page could still try passphrases, so use a long one.

1. Write your notes in `vault/vault.md` (gitignored; never commit it).
2. Put `VAULT_PASSPHRASE=…` in `.env.local` (gitignored), or let the script prompt you.
3. Run `npm run vault:encrypt`. This writes `src/content/vault.enc.json`; commit that file only.
4. Re-run step 3 after every edit to `vault.md`.

Without `vault.enc.json` the heart still opens and says "The vault is empty." Tests use
`tests/fixtures/vault.enc.json` (passphrase `test-passphrase-not-real`), never the real vault.

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
| M3 Squad: silhouettes, emblems, cards | on hold, see #5 |
| M4 Vitruvian pipeline, region editor, Becoming transition | ✅ v0.5.0 (placeholder figure, see #6) |
| M6 Heart vault (script, UI, tests) | ✅ v0.4.0 |
| M8 Credits, noindex, GitHub Pages deploy | ✅ v0.6.0 |
| M2 – M8 | see PRD §11 |

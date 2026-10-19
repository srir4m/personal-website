# PRD — "Microcosm" Personal Website

**Document version:** 1.0 (2026-10-19)
**Working title:** Microcosm (rename freely)
**Companion file:** `site-content.json` (content seed, version 1.0). All personal content lives there, not in code.

---

## 0. Instructions for Claude Code

1. Read this whole document before scaffolding. Build milestone by milestone (§11), and stop for owner review at the end of each milestone.
2. **Never invent personal content.** Every fact shown on the site comes from `site-content.json`. Fields set to `null` or `"TODO"` render as nothing, and items with `"draft": true` never render in production. If a region or card would be empty, follow the empty-state rules in §6.3.
3. **Never hard-code the vault passphrase** or commit plaintext vault content (see §9).
4. **Do not redraw trademarked game logos.** Use the owner-supplied files in `public/assets/games/`, or the neutral placeholder glyphs described in §8.4.
5. Use the latest stable versions of the libraries in §7.1 at scaffold time, and lock them with the lockfile. Do not downgrade to match older examples.
6. Put a version string in `src/version.ts` (`export const SITE_VERSION = "0.1.0"`). Show it in the footer and bump it on every milestone.

---

## 1. Vision

A single scrolling journey that zooms from the whole world down to one person, in the spirit of the Eameses' *Powers of Ten*.

The theme comes from Leonardo da Vinci's idea that **the human body is a microcosm of the world.** The site opens on an engraved globe and ends on the Vitruvian Man. **The circle that holds the Vitruvian figure is the same circle as the opening globe.** The last frame echoes the first.

Visual style: **"Codex HUD."** Leonardo's notebook (parchment, iron-gall ink, red chalk, hatching) overlaid with a retro-futurist heads-up display (cyan and amber readouts, monospace labels, leader lines, scan ticks).

## 2. Audience and goals

- **Audience:** anyone the owner shares the link with, including friends and recruiters. The site is unlisted, not indexed (see §10.4), and not secret.
- **Goals:**
  - G1: Be memorable within 10 seconds.
  - G2: Communicate who the owner is (studies, builds, plays, trains, eats).
  - G3: Work smoothly on a modern laptop and acceptably on a phone.
  - G4: Let the owner add or edit content without touching component code.
- **Non-goals:** see §13.

## 3. Experience overview

The page is one long scroll. A pinned full-viewport "stage" is driven by one master scroll timeline, split into acts.

| Act | Name | Scroll share | What happens |
|---|---|---|---|
| 0 | Boot | — (on load) | A codex page inks itself in, showing the title and a scroll cue |
| 1 | Globe | 15% | An engraved 3D globe rotates. A marker pulses at Stevens, and the education card opens |
| 2 | Descent | 20% | Infinite zoom through 4 illustrated plates: harbor, Hoboken, campus, window |
| 3 | Squad | 15% | Room scene: engraved friend silhouettes around monitors, with five game emblems |
| 4 | Becoming | 15% | One silhouette is isolated. The Vitruvian figure inks in, the square draws, and the globe's circle closes around the figure |
| 5 | Body map | 30% (free-hold) | An interactive Vitruvian figure with clickable regions, a Now/Reaching pose toggle, and the heart vault |
| 6 | Outro | 5% | A fast pull-back montage to the globe, then contact links |

Act 5 is a **hold**: the stage stays pinned and the scroll distance gives room to explore. The user leaves Act 5 by scrolling past its end or by using the progress rail.

### 3.1 Global UI

- **Progress rail:** a vertical "codex margin" on the left edge (desktop) or a thin top bar (mobile), with 7 tick marks, one per act. Tick labels render in mirror script and flip readable on hover or focus. Clicking a tick jumps to that act with a smooth scroll.
- **Deep links:** `#globe`, `#descent`, `#squad`, `#becoming`, `#body`, `#body/<regionId>`, `#outro`. Loading a deep link jumps straight to that act's settled state.
- **Motion toggle:** a small switch in the top right labelled "Motion: Full / Calm". It defaults to the OS `prefers-reduced-motion` setting. See §10.1.
- **Footer:** the version string from `src/version.ts`, a credits link (§8.6), and contact icons.

---

## 4. Act specifications

### Act 0 — Boot
- The background is parchment. The title text (`owner.name`, `owner.tagline`) draws on as ink strokes (GSAP DrawSVG on an SVG text outline, or a mask reveal). A faint graticule (latitude and longitude lines) fades in behind it.
- Act 0 doubles as the loading screen: it stays up until the Act 1 assets (globe geometry and textures) are ready, or 4 seconds have passed, whichever comes first.
- A scroll cue appears after the title finishes: a small engraved arrow plus the text "scroll" in mono.
- **Acceptance criteria:** no blank white flash on load; the title is legible within 1.5 s on cable bandwidth.

### Act 1 — Globe
- **Rendering:** React Three Fiber.
  - The sphere uses a custom shader in parchment tone with paper-grain noise.
  - A graticule every 15° in thin sepia lines.
  - Coastlines drawn as ink lines from Natural Earth 110m data (via `world-atlas` TopoJSON), converted to `LineSegments` on the sphere.
  - Land is filled with a cross-hatch pattern: a screen-space hatching shader masked by a land texture baked from the same data.
  - A subtle Fresnel rim in HUD cyan.
- **Motion:** slow idle rotation (about 1 revolution per 90 s). Scroll progress rotates the globe so the marker faces the camera by 40% of the act, then the camera dollies in toward it.
- **Marker:** at `education.location` (≈ 40.745° N, 74.024° W, Castle Point, Hoboken). It is a sanguine (red-chalk) dot with two expanding HUD rings and a crosshair.
- **Education card:** connected to the marker by a HUD leader line.
  - **Collapsed state:** school name, degree, class year, and a mono coordinate readout ("40.745°N 74.024°W").
  - **Expanded state** (opened by a click or the "Course log" button): courses grouped by term, newest first. Each row shows the course code, then the title (only if it is not `null`). In-progress courses carry an amber "IN PROGRESS" tag.
  - The card fades out when Act 2 begins.
- **Day/night (nice to have):** the terminator line follows the real current time in Hoboken, rendered as a soft hatch shadow.
- **Acceptance criteria:**
  - The marker is within 0.1° of the configured coordinates.
  - The card is keyboard reachable.
  - The globe holds ≥ 55 fps on a 2020-or-newer laptop with integrated graphics.

### Act 2 — Descent (infinite zoom)
- **Technique:** a layered infinite zoom, using DOM/SVG plates rather than WebGL.
  - Each plate declares a `childRect`: the normalized rectangle inside itself where the next plate lives.
  - Plates are nested, so plate *i+1* is absolutely positioned at plate *i*'s `childRect`.
  - The stack is scaled about the active `childRect`.
- **Scale interpolation must be exponential:** `scale = exp(lerp(ln(s0), ln(s1), t))`. This keeps the perceived zoom speed constant, which is what makes it feel like *Powers of Ten*.
- **Precision management (rebasing):** only the current plate and the next one are mounted. When a plate's `childRect` fills the viewport, unmount the outer plate and reset the transform so the new plate is at scale 1. This avoids float-precision drift and blurry rasters.
- **Globe handoff:** at the end of Act 1, the WebGL camera has dollied in until the marker sits at screen center at a known pixel radius. Plate 1 fades in over the last 10% of Act 1, with its marker anchor aligned to that same screen point and radius. Then the canvas fades out. The visitor must not notice a seam.
- **Plates:**

  | # | Content |
  |---|---|
  | P1 | New York Harbor region: the Hudson, Manhattan, and the Hoboken shoreline as engraved contour lines |
  | P2 | Hoboken street grid and the Stevens campus outline |
  | P3 | Castle Point and the campus building facade |
  | P4 | A single lit window |
  | P5 | The room interior, which becomes Act 3 |

  The plate art contract is in §8.3.
- Each plate fades in tiny HUD labels: a mono place name and a scale bar ("1 : 10,000"). The scale bar animates down each decade of zoom.
- **Acceptance criteria:**
  - No visible seam at any handoff at 1440×900 or 390×844.
  - No plate ever displays upscaled beyond its native resolution (SVG preferred).

### Act 3 — Squad
- **Scene:** plate P5 settles into an interactive room.
  - 4–6 engraved silhouettes around a desk with glowing monitors. The count comes from `squad.silhouetteCount`, default 5.
  - Silhouettes are anonymous: no names, no gamertags, no faces.
- **Emblems:** the five games in `squad.games` float in an arc above the desk, like the planets of an orrery. Each emblem sits in a brass-ring HUD frame and bobs slowly (±4 px, offset phases).
- **Interaction:**
  - Hover or focus: the emblem tilts toward the cursor (max 12°), glows in HUD cyan, and opens a HUD card.
  - The card shows the game name plus `main`, `rank`, and `story`, each only if it is not `null`.
  - If all three fields are `null`, the card shows just the game name.
- `squad.intro`, if present, renders as a codex caption in the bottom-left.
- **Acceptance criteria:**
  - All emblems are reachable with Tab, and Enter or Space pins the card open.
  - Emblem images come only from `public/assets/games/`, with the placeholder fallback described in §8.4.

### Act 4 — Becoming
- The camera pushes toward the center silhouette while the others dissolve with an ink-wash mask (noise-thresholded alpha).
- The silhouette cross-fades into the Vitruvian figure through an ink-bleed mask. Do **not** attempt a direct path morph between the two outlines; their shapes differ too much.
- The square draws itself (DrawSVG), corner to corner.
- **The circle:** a ghost of the Act 1 globe outline and graticule reappears, larger than the viewport. It shrinks and flattens until it lands exactly on the Vitruvian circle, then the graticule fades, leaving only the circle stroke.
- **Acceptance criteria:** the final circle uses the same stroke color and weight as the globe coastline style, and the morph reads as a single continuous object.

### Act 5 — Body map
- **Layout:** the figure is centered, filling up to 85% of viewport height.
- **Regions:** defined as polygons in `src/content/regions.json`, in coordinates normalized to the figure's SVG viewBox. Use the region editor described in §8.2 to author them.

  | regionId | Label | Theme | Content key |
  |---|---|---|---|
  | `head` | Mind | What I build and play | `body.regions.head` |
  | `ears` | Ears | What I hear and compose | `body.regions.ears` |
  | `heart` | Heart | The vault | special (§9) |
  | `chest` | Chest | Strength | `body.regions.chest` |
  | `spine` | Backbone | Highlights and credentials | `body.regions.spine` |
  | `arms` | Arms | Grapple and climb | `body.regions.arms` |
  | `stomach` | Stomach | Fuel | `body.regions.stomach` |
  | `legs` | Legs | Endurance | `body.regions.legs` |
  | `feet` | Feet | Roots and places | `body.regions.feet` |

- **Hover or focus:** the region fills with an animated sanguine cross-hatch (an SVG pattern with a slowly moving dash offset). A HUD leader line runs to a label showing the region's label and theme. Every other region dims slightly.
- **Click, Enter, or Space:** opens a **codex panel**. On desktop it slides in from the right at 420 px wide; under 768 px wide it is a bottom sheet.
  - The panel header shows the region label and theme.
  - The body is the list of items. Each item has a title, an optional subtitle, body, and badge, and an optional link that opens in a new tab with `rel="noopener"`.
  - Esc, the close button, or a click outside closes the panel and returns focus to the region.
- **Pose toggle "Now / Reaching":**
  - The source drawing contains both poses: arms level with legs together, and arms raised with legs apart.
  - Two masks, `poseNow` and `poseReaching` (authored in the region editor), cover each pose's limbs.
  - In **Now** mode, the reaching-pose limbs dim to 15% opacity, and panels show items whose `mode` is `"now"` or missing.
  - In **Reaching** mode, the now-pose limbs dim, and panels show only `mode: "reaching"` items.
  - The toggle is a codex-styled two-position switch below the figure. Switching cross-fades the limb masks over 600 ms.
- **Empty states:** see §6.3.
- **Acceptance criteria:**
  - Tab order runs head, ears, heart, chest, spine, arms, stomach, legs, feet.
  - Every region has an accessible name.
  - The panel traps focus while open.
  - `#body/<regionId>` opens that region's panel on load.

### Act 6 — Outro
- A fast reverse montage (about 2.5 s, time-based rather than scrubbed, triggered when Act 6 enters) plays: the figure becomes the circle, the circle becomes the globe, and the globe rests small and centered.
- Contact links from `owner.contact` appear below the globe, showing only the non-`null` ones, plus a "Back to top" button.

---

## 5. Visual design system — Codex HUD

### 5.1 Color tokens
Define these as CSS custom properties in `src/styles/tokens.css` and mirror them in `tailwind` theme config.

| Token | Hex | Use |
|---|---|---|
| `--parchment` | `#EFE4CC` | page background |
| `--parchment-deep` | `#E2D3B0` | panels, vignette |
| `--ink` | `#2B2118` | primary linework and body text |
| `--sepia` | `#8A6B47` | secondary lines, graticule |
| `--sanguine` | `#A8432F` | highlights, marker, active regions (red chalk) |
| `--hud-cyan` | `#3FD6E0` | HUD readouts, glows, focus rings |
| `--hud-amber` | `#F2A33A` | status tags, warnings |

- **Dark mode:** none. The parchment look *is* the identity.
- **Contrast:** body text must meet WCAG AA against `--parchment`. Cyan is never used for body text, only for decoration and large HUD numerals on dark HUD chips (`--ink` background).

### 5.2 Type
- **Display:** Cormorant Garamond (self-hosted via `@fontsource`).
- **HUD and mono:** IBM Plex Mono (self-hosted).
- **Body:** Cormorant Garamond at a minimum 18 px, or Plex Sans if legibility suffers.
- No third-party font CDNs.

### 5.3 Texture and line
- **Paper grain:** a full-screen fixed overlay, either an SVG `feTurbulence` or a 256 px tiled noise image at 6% opacity.
- **Stroke weights:** engraved lines are 1–1.5 px at 1× DPR. HUD lines are 1 px, cyan, with small square terminals.
- **Mirror script:** a utility component `<MirrorText>` that renders text with `transform: scaleX(-1)` and flips it back on hover or focus. It is decorative only, so the real text is also provided for screen readers.

### 5.4 Motion principles
- Linework appears by **drawing on**, not fading.
- The HUD appears with a quick scan (opacity flicker of 2 frames, then settle).
- Easing: `power2.out` for UI and `none` (linear) for scroll scrubs.
- Nothing bounces.

---

## 6. Content model

### 6.1 Location
- `site-content.json` lives at `src/content/site-content.json`.
- It is validated at build time and in dev with a Zod schema (`src/content/schema.ts`). Validation failure fails the build with a readable error.

### 6.2 Schema (TypeScript shape)
```ts
type Item = {
  title: string;
  subtitle?: string | null;
  body?: string | null;
  badge?: string | null;
  link?: string | null;
  mode?: "now" | "reaching";   // default "now"
  draft?: boolean;             // true → never rendered in production
};
type Region = { label: string; theme: string; items: Item[] };
type Course = {
  code: string;
  title: string | null;
  term: string;                // e.g. "2024 Fall"
  termOrder: number;           // sortable, e.g. 20243 (year*10 + 1 Spring, 2 Summer, 3 Fall)
  status: "completed" | "in-progress";
};
type Game = {
  id: string;
  name: string;
  emblem: string;              // path under /assets/games/
  main: string | null;
  rank: string | null;
  story: string | null;
};
```
The full root object is in `site-content.json`.

### 6.3 Empty-state rules
- Any `null` or `"TODO"` string renders nothing. No "TODO" text may ever reach the DOM in a production build.
- A body region with zero renderable items for the current pose mode becomes **dormant**:
  - It stays visible in the drawing but is not hoverable, clickable, or focusable.
  - In dev builds only, dormant regions show a dashed amber outline so the owner can see what needs content.
- A dev-only "Content status" overlay (toggled with `?status=1`) lists every `null`, `TODO`, and `draft` field.

---

## 7. Technical architecture

### 7.1 Stack
| Layer | Choice |
|---|---|
| Build / dev | Vite + TypeScript (strict) |
| UI | React |
| 3D | three, @react-three/fiber, @react-three/drei |
| Scroll orchestration | GSAP + ScrollTrigger (single master timeline) |
| SVG animation | GSAP DrawSVGPlugin, MorphSVGPlugin (both are free in current GSAP) |
| Smooth scroll | Lenis, synced to the GSAP ticker |
| UI micro-interactions | Motion (`motion/react`) for panels, cards, and toggles |
| Styling | Tailwind CSS (Vite plugin) + CSS custom properties |
| State | Zustand: scroll progress, active act, pose mode, open panel |
| Validation | Zod |
| Markdown (vault only) | `marked` + `DOMPurify` |
| Testing | Vitest (unit), Playwright (e2e) |
| Hosting | Vercel (static output) |

**Explicitly excluded:** Next.js, Electron, SSR, and third-party prefab animation-component libraries.

### 7.2 Folder structure
```
/public/assets/
  games/                 owner-supplied emblems (cs2, valorant, r6, minecraft, roblox)
  plates/                P1–P5 (SVG preferred)
  vitruvian/             traced figure SVG + mask SVGs
/scripts/
  trace-vitruvian.ts     raster → SVG pipeline (§8.2)
  build-globe-data.ts    TopoJSON → line buffers + land mask texture
  encrypt-vault.ts       §9
/src/
  version.ts
  content/               site-content.json, regions.json, schema.ts, vault.enc.json
  styles/                tokens.css, globals.css
  stage/                 Stage.tsx (pinned container), timeline.ts (master timeline)
  acts/                  Act0Boot … Act6Outro (one folder each, lazy-loaded)
  components/            ProgressRail, HudCard, CodexPanel, MirrorText, MotionToggle
  dev/                   RegionEditor, ContentStatus (dev-only, tree-shaken from prod)
/vault/                  vault.md (GITIGNORED plaintext)
```

### 7.3 Scroll orchestration rules
- **One master GSAP timeline** owns all scroll-scrubbed animation. Acts register labelled sub-timelines. No component creates its own ScrollTrigger.
- Scroll progress is written to a Zustand store via a ref-based setter.
- R3F reads progress inside `useFrame` from the store's `getState()`. **Never re-render React per scroll frame.**
- Acts are code-split with `React.lazy`. Each act mounts when it is within one act of the current one and unmounts when it is two or more acts away.
- The R3F canvas uses `frameloop="demand"` when the globe is off-screen or idle, and `dpr={[1, 1.75]}`.

### 7.4 Resize and orientation
- Recompute plate alignment and the globe-to-plate handoff anchor on resize (debounced at 150 ms).
- Call `ScrollTrigger.refresh()` after layout settles.

---

## 8. Asset pipeline

### 8.1 Globe data
- Use Natural Earth 110m (public domain) through the `world-atlas` package.
- `scripts/build-globe-data.ts` outputs:
  - `coastlines.bin`: a Float32 line buffer on a unit sphere.
  - `land-mask.png`: 2048×1024 equirectangular.

### 8.2 Vitruvian figure
- **Source:** the owner's attached scan, placed at `assets-src/vitruvian-source.jpg`. Leonardo's drawing (c. 1490) is public domain.
- **Tracing:** `scripts/trace-vitruvian.ts`:
  1. Grayscale.
  2. Contrast stretch.
  3. Threshold.
  4. Vectorize with `potrace` (npm `potrace`) or `vtracer` (CLI).
  5. Output `public/assets/vitruvian/figure.svg`.
- **Cleanup:** the circle and square are re-drawn as clean geometric SVG primitives (`<circle>`, `<rect>`) fitted to the traced ones, so they can be animated with DrawSVG. Strip them from the traced paths.
- **Restyle:** set all traced paths to `stroke` or `fill` of `var(--ink)`, with an optional subtle displacement filter for an ink-bleed feel.
- **Region editor:** a dev-only route at `?edit=regions`. It overlays the figure; clicking places polygon points; you can name a region, edit its points, and export `regions.json`. The same tool authors the `poseNow` and `poseReaching` limb masks.

### 8.3 Plates P1–P5 (art contract)
Each plate is described in `src/acts/descent/plates.ts`:
```ts
{ id: "P1", src: "/assets/plates/p1.svg", aspect: 16/9,
  childRect: { x, y, w, h },      // normalized 0–1, where the next plate sits
  anchor: { x, y },               // P1 only: marker point for the globe handoff
  label: "NEW YORK HARBOR", scale: "1 : 250,000" }
```
- **Style:** engraved linework in `--ink` and `--sepia` only, with hatch fills and no photographic texture. They must match the globe.
- **Format:** SVG preferred, under 400 KB each. If raster, AVIF or WebP at least 2× the max display size of their nested position.
- **Placeholder plates:** at the start, Claude Code generates simple procedural SVG placeholders, labelled boxes in the plate style with a visible `childRect`, so the zoom mechanics can be built and tuned before final art exists.
- **Map data option for P1–P2:** if derived from OpenStreetMap, the footer and credits must include "© OpenStreetMap contributors" (ODbL).

### 8.4 Game emblems
- The owner places official logo files from each publisher's press or brand kit at `public/assets/games/{cs2,valorant,r6,minecraft,roblox}.{svg,png}`.
- **Placeholder fallback when a file is missing:** a neutral engraved glyph (crosshair, diamond, shield, cube, square) with the game name in mono beneath it. Do not create imitations of the real logos.
- Credits note: "Game names and logos are trademarks of their respective owners."

### 8.5 Silhouettes and room
- Procedural or hand-drawn SVG: anonymous engraved figures, monitors with soft cyan glow (CSS `filter: drop-shadow`), desk, and window.

### 8.6 Credits page
- A modal opened from the footer, listing:
  - Leonardo da Vinci, *Vitruvian Man*, c. 1490 (public domain)
  - Natural Earth
  - OSM, if used
  - The game trademark note
  - Fonts and their licenses

---

## 9. Heart vault

- **Purpose:** private notes for the owner. Security target: casual visitors cannot read them. This is not a guarantee against a determined offline attacker, so the owner must use a long passphrase.
- **Authoring:** the owner writes `vault/vault.md` (gitignored).
- **Encryption (local, before commit):** `npm run vault:encrypt` runs `scripts/encrypt-vault.ts`.
  1. Read the passphrase from the `VAULT_PASSPHRASE` env var (`.env.local`, gitignored), or prompt for it interactively if unset.
  2. Generate a random 16-byte salt and a random 12-byte IV.
  3. Derive the key with PBKDF2-HMAC-SHA256, 600,000 iterations, producing an AES-256 key.
  4. Encrypt the markdown with AES-256-GCM.
  5. Write `src/content/vault.enc.json`: `{ "v": 1, "salt", "iv", "iter", "ct" }` (base64).
- **Rules:**
  - Plaintext and passphrase **never** enter the repo or CI. Only `vault.enc.json` is committed.
  - Re-encrypt after every edit to `vault.md`.
- **UI:**
  - Clicking the heart opens a codex panel showing a wax-seal lock and a passphrase field.
  - Decryption uses the Web Crypto API.
  - **Success:** the seal cracks (about 400 ms) and the markdown renders through `marked`, then `DOMPurify`.
  - **Failure:** the panel shakes and an ink blot appears. After 5 failures, input is disabled for 30 s; this is cosmetic only.
  - The decrypted text and key live only in component memory. They are never stored in localStorage or sessionStorage and never logged. Closing the panel clears them.
- **If `vault.enc.json` is absent:** the heart is still clickable and shows "The vault is empty."
- **Tests:** Playwright uses a fixture vault encrypted with the test passphrase `test-passphrase-not-real`. Never use the real vault in tests.

---

## 10. Quality requirements

### 10.1 Accessibility
- **Calm mode** (reduced motion): no scrubbing. Each act is a settled static frame, scrolling snaps act to act with 300 ms cross-fades, the globe does not idle-rotate, and Act 2 shows one composite plate per step.
- **Keyboard:** everything interactive is reachable, with a visible focus ring in `--hud-cyan` at 2 px.
- **Screen readers:**
  - Each act is a `<section>` with a heading.
  - The globe card and body panels are real DOM text, never baked into the canvas.
  - A visually hidden "Skip to body map" link comes first in tab order.
- **No-WebGL fallback:** a static SVG globe with the marker.

### 10.2 Responsive behavior
- **Breakpoints:** 390 px (phone), 768 px, 1280 px, 1920 px.
- **Phone:**
  - The globe uses fewer segments and no hatching shader (a flat land fill instead).
  - Emblems sit in a 3+2 grid instead of an arc.
  - Panels are bottom sheets.
  - The figure fills 70% of the viewport height, and the region tap targets expand to at least 44 px.

### 10.3 Performance budgets
| Metric | Budget |
|---|---|
| Initial JS (gzip), Acts 0–1 | ≤ 450 KB |
| LCP (cable, mid laptop) | ≤ 2.5 s |
| Frame rate, laptop (2020+, integrated GPU) | ≥ 55 fps in all acts |
| Frame rate, mid phone | ≥ 30 fps |
| Each plate asset | ≤ 400 KB |
| CLS | < 0.05 |

### 10.4 Privacy and indexing
- `<meta name="robots" content="noindex, nofollow">` and a `robots.txt` that disallows all crawlers. The site is shared by link.
- No analytics, cookies, or third-party requests at runtime: fonts are self-hosted and there are no CDNs.

---

## 11. Milestones

Each milestone ends with: a version bump, `npm run build` passing, Playwright smoke tests passing, and a short owner-review note listing anything needing their input.

| M | Deliverable | Done when |
|---|---|---|
| M0 | Scaffold, tokens, Stage, master timeline, progress rail, 7 placeholder acts as labelled color blocks, content schema and validation, Content Status overlay | Scrolling moves through all 7 acts; deep links work |
| M1 | Act 0 + Act 1 globe with marker and education card | Acceptance criteria for Acts 0 and 1 pass |
| M2 | Act 2 infinite zoom with placeholder plates, globe handoff, rebasing | No seams; exponential scale verified |
| M3 | Act 3 squad with silhouettes, emblems, and cards | Acceptance criteria for Act 3 pass |
| M4 | Vitruvian tracing pipeline, region editor, Act 4 transition | Circle lands exactly; figure is restyled |
| M5 | Act 5 body map, panels, pose toggle, dormant states | Acceptance criteria for Act 5 pass |
| M6 | Heart vault (script + UI + tests) | Fixture decrypts; wrong passphrase is handled |
| M7 | Act 6 outro, Calm mode, no-WebGL fallback, responsive passes, performance tuning | Budgets in §10.3 met |
| M8 | Credits, noindex, Vercel deploy | Live URL works on desktop and phone |

---

## 12. Open items (owner supplies; Claude Code must not fill them in)

All of these are marked `null`, `"TODO"`, or `draft` in `site-content.json`.

- Display name, tagline, contact links.
- Degree wording and class year.
- Course titles not yet confirmed (see `null` titles), and whether CS 392 belongs in the list.
- Young Composers details: piece title, year, optional audio file.
- Climbing details; any additional swimming or wrestling detail.
- Additional foods.
- Credentials for the Backbone region.
- Feet region content (places, roots), or leave it dormant.
- Game details (main, rank, story) and the emblem files.
- Number of silhouettes in the squad scene.
- Reaching-mode items.
- Final plate art (P1–P5), if replacing the placeholders.
- Vault content and passphrase (local only).

## 13. Out of scope (v1)

- Desktop app packaging (Electron or Tauri)
- CMS or admin UI
- Server-side authentication
- Analytics
- Sound and music playback, except an optional `<audio>` element for a Young Composers piece if the owner adds a file
- Comments or guestbook
- Internationalization
- Dark mode

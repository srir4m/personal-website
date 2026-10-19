# PRD v1.1 — "Microcosm" Personal Website (DRAFT OUTLINE)

**Status:** Draft for owner review. Not yet approved; v1.0 (`docs/PRD.md`) remains the spec until this is accepted.
**Date:** 2026-10-19
**Tracks:** [#1 Name and one-liner first, plus About me](https://github.com/srir4m/personal-website/issues/1) · [#4 Live-map zoom to a generic area](https://github.com/srir4m/personal-website/issues/4) · [#5 Narrative rework](https://github.com/srir4m/personal-website/issues/5)

Items marked **OPEN QUESTION** need an owner decision. Where a recommendation is given, it is a suggestion only.
Nothing personal is written into this draft: anything marked *owner supplies* comes from `site-content.json`.

---

## 1. What changes and why

| # | Change | Why (owner feedback) |
|---|---|---|
| 1 | **Personal first.** The site opens on the owner's name and a one-line "logo", then an expanded intro or About me. | Leading with a location felt odd for a personal site (#1). |
| 2 | **Location becomes generic and owner-controlled.** The globe zooms to a highlighted *area*, coarse and optional, instead of a pin on Stevens. | The old zoom implied the owner lives on campus (#4). |
| 3 | **Realistic live-map zoom.** The hand-drawn DOM/SVG plates are replaced by a MapLibre vector map: camera pitch and 3D building extrusions near the ground, styled in the Codex HUD palette, with self-hosted PMTiles. | The plates looked too unrealistic; target feel is Apple Maps zooming to street level (#4). |
| 4 | **Activities replace the Squad.** The gaming-only room becomes an Activities scene, with gaming as one activity among several. | Gaming-only framing gave the wrong impression (#4, #5). |
| 5 | **About me / expanded intro.** A real paragraph about the owner gets a home. | No such section existed in v1.0 (#1). |

What stays: the "Codex HUD" visual identity (§5), the Powers-of-Ten zoom idea, the globe ↔ Vitruvian circle echo, the body map and heart vault, and all quality bars (§10).

---

## 2. Proposed experience (new act order)

| Act | Name | Scroll share | What happens | Status vs v1.0 |
|---|---|---|---|---|
| 0 | **Title** | on load + ~5% | Owner name and one-line logo ink in on parchment. A short intro line can follow. Doubles as the loading screen. | Modified (Boot) |
| 1 | **About** | 10% | Expanded intro paragraph (*owner supplies*). **OPEN QUESTION Q2** covers the alternative placements. | New |
| 2 | **Globe** | 12% | Engraved globe turns toward the owner's *area* (not a pin). Education card: see **Q1**. | Modified |
| 3 | **Descent (map)** | 18% | Globe hands off to MapLibre at matching centre and zoom. Camera zooms and pitches, 3D buildings rise, and the area is highlighted as a soft hatched region. | Replaced |
| 4 | **Activities** | 15% | Scene of the owner's activities (*owner supplies the list*); gaming is one entry. Game emblems rules (§8.4) still apply inside it. | Replaced (Squad) |
| 5 | **Becoming** | 12% | Transition into the Vitruvian figure; globe circle lands on the Vitruvian circle. Starts from the Activities scene instead of a squad silhouette. | Modified |
| 6 | **Body map** | 23% (hold) | Unchanged in mechanics: regions, Now/Reaching, heart vault. **Q3** asks whether it stays the centrepiece. | Unchanged* |
| 7 | **Outro** | 5% | Pull-back montage to the globe, then contact links. | Unchanged |

\* Region content may shift if Activities absorbs some of it (see Q3).

### OPEN QUESTIONS (experience)

- **Q1: Where does education live?**
  - A. Card on the globe, as in v1.0, but anchored to the owner's area, not Stevens.
  - B. **Recommended:** an item in the body map's Mind or Backbone region. It stops the globe reading as "where I study".
  - C. A small panel off the About act.
- **Q2: About me placement.**
  - A. A paragraph under the name on the Title screen.
  - B. **Recommended:** a dedicated About act (as in the table). It reads as a personal site before any map.
  - C. A panel opened from a persistent wordmark.
  - D. A body-map region.
- **Q3: Body map as centrepiece?**
  - A. **Recommended:** keep it, and trim regions that duplicate Activities.
  - B. Keep it, and make Activities a lighter montage.
  - C. Drop Activities and fold it into the body map.
- **Q4: Persistent wordmark** (name and one-liner pinned top-left through all acts): yes or no? It would be a new §3.1 global UI element.
- **Q5: The "one-liner logo"**: typed line in the display font, or an actual mark (monogram or glyph)? If a mark: owner file, or an engraved monogram from initials.
- **Q6: Tone balance**: how much HUD and sci-fi versus warm personal (#5)?

---

## 3. Section-by-section delta vs v1.0

| v1.0 § | Verdict | Notes |
|---|---|---|
| §0 Instructions | Unchanged | Adds: never commit or ship exact location coordinates (see §10 below). |
| §1 Vision | Modified | Same Powers-of-Ten idea, framed as "who, then where, then what I do". |
| §2 Audience and goals | Modified | G2 reworded: "communicate who the owner is *before* where they are". |
| §3 Experience overview | Modified | New act table (§2 above). Deep links: `#about`, `#map`, `#activities` replace `#descent`, `#squad`. Progress rail goes from 7 to 8 ticks. |
| §3.1 Global UI | Modified | Optional persistent wordmark (Q4); location toggle state is *not* shown publicly beyond the highlight. |
| §4 Act 0 Boot | Modified | Becomes Title; name and one-liner required for launch. |
| §4 Act 1 Globe | Modified | Marker becomes a highlighted area from `location`; education card moves per Q1. |
| §4 Act 2 Descent | **Replaced** | MapLibre zoom (§7, §8 below). The `childRect` and rebasing system is retired. |
| §4 Act 3 Squad | **Replaced** | Activities scene. Silhouettes optional; anonymity rule kept if used. |
| §4 Act 4 Becoming | Modified | Entry frame comes from Activities. The circle morph is unchanged. |
| §4 Act 5 Body map | Unchanged* | Regions and content may be trimmed (Q3). |
| §4 Act 6 Outro | Unchanged | |
| §5 Visual design | Unchanged | Adds a MapLibre style spec in the same tokens (ink and sepia lines, hatched land via fill-pattern, cyan HUD labels). |
| §6 Content model | Modified | Additions in §4 below. |
| §7 Stack | Modified | Adds `maplibre-gl` and `pmtiles`. Still no Next.js or SSR. Optional tiny location store (§5 below). |
| §8 Asset pipeline | Modified | §8.3 plates dropped (likely). New: map style JSON and a regional tiles extract script. §8.1, §8.2, §8.4–8.6 unchanged. |
| §9 Heart vault | Unchanged | |
| §10 Quality | Modified | New live-location privacy rules (§5 below). Budget note: MapLibre lazy-loads with the map act, so the Acts 0–1 budget is unaffected. |
| §11 Milestones | Modified | See §6 below. |
| §12 Open items | Modified | Adds intro, logo, activities and location items. |
| §13 Out of scope | Modified | "Server-side authentication" is still out. A write-only location endpoint (if chosen) needs a shared-secret token, which is not user auth. |

---

## 4. Content model additions (§6)

All values are *owner supplies*; `null` or `"TODO"` renders nothing, same as v1.0.

```ts
owner: {
  name: string; tagline: string;            // existing (now required for launch)
  intro: string | null;                      // NEW: expanded About paragraph (markdown-lite)
  logo: { kind: "text" | "image"; src?: string | null } | null;  // NEW (Q5)
  contact: { ... }                           // existing
}
location: {                                  // NEW: replaces education.location as the map target
  enabled: boolean;                          // live mode on/off; default false
  precision: "city" | "neighbourhood";       // snapping level (§5 below)
  default: { label: string; lat: number; lng: number; radiusKm: number };  // coarse fallback area
}
activities: Array<{                          // NEW: replaces squad as the Act 4 content source
  id: string; name: string; summary?: string | null;
  icon?: string | null;                      // path under /assets/activities/
  draft?: boolean;
  games?: Game[];                            // the gaming activity can carry the v1.0 Game list
}>
education: { ... }                           // existing; `location` kept only if Q1 = A
squad: { ... }                               // DEPRECATED → migrate into activities[gaming].games
```

---

## 5. Live location and privacy (§10 addition)

**Rules (proposed; owner to confirm values marked ●):**

1. **Off by default.** `location.enabled = false` ships; the map then highlights `location.default` only.
2. **Coarse only. Exact coordinates never reach the repo or the client.**
   - Snap to a grid before storage: ● city ≈ 0.1° (~10 km), neighbourhood ≈ 0.02° (~2 km).
   - Store only the snapped cell centre plus a radius; the highlight is a soft hatched circle, never a pin.
3. **Delay.** Published location lags reality by ● 24 h, or updates at most once per ● day.
4. **No third-party requests at runtime** (v1.0 §10.4 holds). Tiles are self-hosted PMTiles; the location is read from the site's own origin.
5. **Where data lives:**

| Data | Where | Who can write |
|---|---|---|
| Default area (coarse) | `site-content.json` (repo) | Owner, by commit |
| Live area (snapped, delayed) | **OPEN QUESTION Q7** | Owner only |
| Exact GPS | Never stored. Snapping happens on the owner's device before sending. | n/a |

- **Q7: Live location source.**
  - A. Manual: the owner edits the coarse area in content and redeploys. Simplest; no backend.
  - B. **Recommended if live is wanted:** a phone shortcut snaps on-device, then commits a small `location.json` to the repo through the GitHub API, using a fine-grained token limited to this repo's contents. Pages redeploys in about a minute and the page reads the file at load. There is no server, since the site is hosted on GitHub Pages; the trade-off is that each update is a commit in the public history.
  - C. Drop "live"; the default area only.
- **Q8: Precision when on**: city or neighbourhood? Default-off area label: *owner supplies*.

---

## 6. Revised milestones (§11)

| M | Deliverable | Status |
|---|---|---|
| M0 | Scaffold, stage, master timeline, rail, schema | ✅ Built (v0.1.0) |
| M1 | Boot + globe + education card | ✅ Built (v0.2.0). Boot becomes Title; card placement per Q1 |
| M2 | Plate descent + globe handoff + rebasing | ✅ Built (v0.3.0). **Superseded** by M2b; code kept until M2b lands |
| M4 | Vitruvian pipeline, region editor, Becoming | 🔨 In progress. Circle morph unaffected; entry frame changes to come from Activities |
| M6 | Heart vault | 🔨 In progress. Unaffected |
| M8 | Credits, noindex, deploy | 🔨 In progress. Credits gain "© OpenStreetMap contributors" when M2b lands |
| M1b | Title (name + one-liner) and About act | New; blocked on owner content (#1) |
| M2b | MapLibre descent: Codex style, PMTiles extract, globe→map handoff, area highlight | New; blocked on Q7/Q8 for the live part, default area can ship first |
| M3b | Activities scene (replaces Squad) | New; blocked on activities list |
| M5 | Body map, panels, pose toggle | Unchanged (scope per Q3) |
| M7 | Outro, Calm mode, no-WebGL fallback, responsive, perf | Unchanged; Calm mode covers the map act (static snapshot per step) |
| M9 | Live location (if Q7 = B) | New, optional |

---

## 7. Open items for the owner (§12 additions)

- Name, one-liner, and logo kind (Q5) — #1
- Intro / About paragraph — #1
- Activities list, with any icons or images — #4
- Default area (coarse) and its label; live-location choice (Q7, Q8) — #4
- Decisions Q1–Q6 — #5

## 8. Next step

Once the owner answers Q1–Q8 (comments on #5 are fine), this draft becomes `docs/PRD.md` v1.1 and the milestone table above replaces v1.0 §11.

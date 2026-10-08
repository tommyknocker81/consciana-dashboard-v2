# Conscia Landing Zone — Bernhoven dashboard prototype (v2)

Static, dependency-free, clickable prototype of the **Conscia Landing Zone** customer dashboard, built from Figma.
Vanilla HTML + CSS + JS. No build step, no framework, no external requests.

v2 is a fork of the finished v1 (`../consciana-dashboard-prototype/`, repo `tommyknocker81/consciana-dashboard-prototype` — **never edit or push v1**).
Same routing/overlay/table logic, but a new design language, a rebuilt Overview and a rewritten fictional dataset.

> Read before changing anything:
> 1. `docs/V2_PLAN.md` — Figma node map, v1→v2 token map, the decisions the user made, animation brief
> 2. `docs/DATA_NARRATIVE.md` — the **v2** fictional dataset (Bernhoven). **Keep cross-page consistency.**
> 3. `docs/HANDOFF.md` — v1 history: how the app is built, lessons learned (still valid for the shared JS/tables)

## Design source
Figma file `VwNSXI42IxOdHwDoreNltr` ("Consciana – Landing zone"), frame **`203:4464`** (Overview only — other pages are restyled in the same language).
Font **Saans** (Displaay, commercial): loaded with `local()` only, system-UI fallback. **Never commit the font files.**
Figma assets (logo, nav icons, team photos) are in `assets/`; most icons are also inlined into the SVG sprite as `currentColor` symbols.

## Files
| File | Role |
|---|---|
| `index.html` (~700 lines) | SVG sprite → topbar (client switcher) → sidebar → 8 `<section id="page-…">` **containers** → chat, toasts, tooltip, upgrade modal, summary drawer |
| `clients.js` (~410 lines) | **All fictional data**: `window.CLIENTS` (noordkade = alarming, bernhoven = mixed, rivierland = all good), `window.ADVISORIES`, `window.CLIENT_ORDER` |
| `script.js` (~1250 lines) | One IIFE: renders every client-dependent block from `clients.js`, event delegation for all behaviour, sparklines, donut, uptime chart (JS port of the generator), routing |
| `styles.css` (~1650 lines) | Figma tokens + `--sev-*` severity scale in `:root`, components, responsive, reduced-motion |
| `assets/` | Figma exports (logo.svg, nav-*.svg, ic-*.svg, team-*.png) |
| `docs/` | V2_PLAN (decisions), DATA_NARRATIVE (the 3 clients), HANDOFF + NEW_CHAT_KICKOFF (v1 history), `tools/gen_uptime_chart.py` (v1, now ported to JS) |

## Run locally
`.claude/launch.json` (parent folder) has `consciana-dashboard-v2` → `python3 -m http.server 4176 --directory consciana-dashboard-v2`.

## Architecture
- **Multi-client, data-driven.** `setClient(id)` renders shell (client menu, account, notifications, summary drawer, chat), Overview, Lifecycle, Devices,
  Alarms, Advisories, Cases and Uptime from `CLIENTS[id]`. Choice persists in `localStorage` (`lz-client`) and can be forced with `?client=noordkade|bernhoven|rivierland`.
  Lifecycle numbers are **computed** from `lifecycle.groups` (buckets act/plan/budget, unsupported = End-of-Support < 26 May 2026, date colours, investment totals).
  Zero-valued alert/bucket tiles render neutral. Alarms unlock is per client (`unlockedAlarms`), tier "Standard" = unlocked by default.
- **SPA without a router.** `navigate(page)`. Sidebar (Figma IA): Overview · Lifecycle · Advisories (`cves`) · Cases · Recommendations · Admin · Help.
  Devices, Alarms, Uptime are reached from in-page links. Recommendations/Admin = generic placeholder.
- **Event delegation** on `document` for `data-page`, `data-toast`, `data-scroll`, `data-open-modal`, `data-tip` (+`data-tip-follow` = tooltip follows the cursor, used by the
  donut), tab groups (`data-tabs`/`data-tab`/`data-tab-panel`), table expand/sort/checkboxes. `enhance(root)` adds `tabindex`/`role` + tab indicators after each render.
  Rule: **add behaviour via delegation or inside the render function** — never `querySelectorAll(...).forEach(addEventListener)` on rendered content at load.
- **Charts:** SOC sparklines = Figma curves (`SPARK_SHAPES`, optional `tilt`) scaled per tile spec in `clients.js`; donut segments are hoverable; uptime trend is generated
  per client (seeded PRNG) for 7/30/90 days.

## Gotchas (v1 lessons still apply)
1. **Cache busting is manual:** `styles.css?v=41`, `clients.js?v=3`, `script.js?v=33` — bump on every edit. The HTML itself can also be cached: open `/?r=N` to force it.
2. Grids: always `repeat(N, minmax(0, 1fr))`. Never `overflow-x:hidden` on `body` (only `html`).
3. Anything with an author `display` needs `[hidden]` handling — v2 has a global `[hidden]{display:none!important}`.
4. Listeners attach at load → dynamically created elements don't get `data-tip`/`data-toast` behaviour.
5. **The Claude preview pane is often `visibilityState: hidden`** → `requestAnimationFrame` pauses, so count-ups/sparks look stuck at 0 and screenshots catch
   mid-entrance frames. Not a bug. For visual checks inject a style that zeroes animation/transition durations and set counts to their final values.
6. Verify `innerWidth` after every resize/reload. Overflow recipe: click any `[data-page="X"]` (Devices/Alarms/Uptime aren't in the sidebar), compare `scrollWidth`.
7. Kpi tile headers: the ↗ link is absolutely positioned so long titles ("Budget & Schedule") wrap instead of colliding; values bottom-align.

## Conventions
Match existing code density; no dependencies; keep it a static site (GitHub Pages / `file://`). Everything clickable gets a hover state and a toast/tooltip
(user requirement), and motion stays **subtle** (user brief) and honours `prefers-reduced-motion`. Verify at 1440 / 768 / 375 (also checked 1280, 1000, 881).

## Git / publishing
Repo `tommyknocker81/consciana-dashboard-v2` (public), GitHub Pages from `main` root → https://tommyknocker81.github.io/consciana-dashboard-v2/.
Repo-scoped identity `tommyknocker81` / `tommyknocker81@users.noreply.github.com`. Font files are git-ignored (`.gitignore`).
**Commit and push only when the user asks**; after pushing, poll the live URL for a string unique to the new build (Pages takes ~1 min).

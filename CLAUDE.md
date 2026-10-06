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
| `index.html` (~2100 lines) | SVG sprite → topbar → sidebar → 8 `<section id="page-…">` → chat widget, toasts, tooltip, upgrade modal, summary drawer |
| `styles.css` (~1540 lines) | Figma tokens in `:root` (names follow the Figma variables), then components, then responsive + reduced-motion |
| `script.js` (~860 lines) | One IIFE: toasts, tooltips, dropdowns, drawer, modal + Alarms unlock, chat, tab groups, sparklines, donut, routing, tables |
| `assets/` | Figma exports (logo.svg, nav-*.svg, ic-*.svg, team-*.png) |
| `docs/` | V2_PLAN, DATA_NARRATIVE (v2), HANDOFF + NEW_CHAT_KICKOFF (v1 history), `tools/gen_uptime_chart.py` |

## Run locally
`.claude/launch.json` (parent folder) has `consciana-dashboard-v2` → `python3 -m http.server 4176 --directory consciana-dashboard-v2`.

## Architecture
- **SPA without a router.** `navigate(page)` shows one section. Sidebar (Figma IA): Overview · Lifecycle · Advisories (`cves`) · Cases · Recommendations · Admin · Help (bottom).
  **Devices, Alarms, Uptime** have no nav item — reached from in-page links (Lifecycle "See all" → Devices, Alarms card → Alarms, SOC "SLA adherence" → Uptime).
  Recommendations and Admin use the generic placeholder (`pageMeta`).
- **Behaviour via data attributes**, attached once at load: `data-page`, `data-toast`, `data-tip`, `data-open-modal`, `data-count` (+`data-decimals`),
  `data-tabs` / `data-tab` / `data-tab-panel` (pill tab groups with a sliding indicator), `data-spark` + `data-tone` + `data-unit` (sparklines).
  `data-scroll="id"` scrolls to + flashes a section (after navigating if `data-page` is set); `data-collapse="5"` on a table card shows 5 rows + "Show all N".
  Non-button elements with `data-page`/`data-toast`/`data-scroll` get `tabindex=0` + `role=button` + Enter/Space automatically.
- **Gating:** the upgrade modal unlocks **Alarms** (Overview card `#alarmsCardBody` + page `#alarmsBody`) via `unlockAlarms()`. Advisories is open in v2.
- **Charts:** SOC sparklines use `SPARK_SHAPES` — curves sampled from the Figma exports (`assets/spark-1/2.svg`, visible window x 16–301) — with `SPARK_SCALE`
  mapping them to hover values; reveal with `clip-path`, hover crosshair + tooltip.
  Lifecycle donut animates `stroke-dasharray` from `data-dash`/`data-offset`. Uptime trend = 3 pre-rendered SVGs (line draw-in via CSS).

## Gotchas (v1 lessons still apply)
1. **Cache busting is manual:** `styles.css?v=29`, `script.js?v=22` — bump on every edit. The HTML itself can also be cached: open `/?r=N` to force it.
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

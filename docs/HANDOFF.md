> **v1 history.** This document describes the v1 build it was copied from. For v2 read `../CLAUDE.md`, `V2_PLAN.md` and `DATA_NARRATIVE.md` (v2 data) first.

# HANDOFF — Consciana dashboard prototype (v1)

Written 2026-10-05 at the end of the v1 build session, to let a new Claude Code chat continue with full context.
v1 commit state: `93b6f86 Make the app fully responsive` on `main` (2 commits total). Working tree was clean at handoff.

---------------------------------------------------------------------------------------------------

## 1. The original brief (user's words, condensed)

1. *"Create a clickable prototype of the dashboard prepared in Figma… Use animations for different chart. Everything should be hoverable."*
2. Iterated screen-by-screen from Figma frames and pasted mockups (details in §3).
3. Later asks: tab pages for Devices / Alarms / Cases / CVEs(Advisories) / Lifecycle / Uptime, a report drawer, a breakdown drawer with "how to improve" summaries, a locked-then-upgradable Security Advisories widget, a consultant chat widget, then **make the whole app responsive**, then **publish to GitHub Pages**.
4. Cases were explicitly designed to look like **ServiceNow tickets** because *"we will integrate with ServiceNow via the API"*.

User working style: short iterative requests, often with a pasted screenshot/mockup; expects visual fidelity to the mockup but adapted to the app's own style; expects things to be verified in the browser preview; asks to "publish" to GitHub when satisfied.

## 2. Figma references

File: **`Device-Insight--OpenLine-Vitaly-`**, file key `1qIVjYVAS0BjNoLwQ9ZzsW`, page id `662:16473`.
Figma MCP tools used: `get_screenshot`, `get_metadata`, `get_design_context`, `get_variable_defs`. Large frames return only sparse metadata — fetch **per-card nodes** instead. The file uses semantic class names (`div.card`, `div.kpi`, `div.uptime-row`, `button.row`…) which the HTML mirrors.

| Node | What |
|---|---|
| `5578:1461` | Original Overview frame (1687×1238) — first version built |
| `5578:2860` | **Updated** Overview frame (1687×1597): adds Cases + Support cards, locked Security Advisories, reordered bottom row (Actions → Budget → Uptime). This is the shipped layout |
| `5578:1580` | IT health score card · `5578:1463` topbar · `5578:1505` sidebar |
| `5578:3153` Hardware lifecycle · `5578:3225` Alarms · `5578:3596` Security advisories (locked variant, overlay frame `5578:3665`) · `5579:1698` Cases · `5579:2042` Support · `5578:3745` Actions required · `5578:3372` renders **Budget** · `5578:3446` renders **Uptime** | (trust the screenshots over metadata x-positions — they looked swapped) |
| `5300:19726` | Report **side panel** (drawer) — text + layout copied; indigo `#5856D6` input border |
| `5211:641` | A *different* "Health" dashboard page from a prototype link — **does not contain the chat widget**; not used |

Figma variables seen: Red `#FF3B30`, Orange `#FF9500`, Green `#34C759`, Indigo `#5856D6`, Black 700 `#272A31`, Gray 600 `#6C757D`, Gray 300 `#C9D0DB`, Blue 400 (Conscia) `#248DD8`; fonts Inter (body) / Roboto (headline) / Source Sans Pro (inputs).
Brand colours were sampled from screenshots with PIL: topbar `#1E0721`, brand purple `#4A318E`, link/active `#8D7EB8`, card border `#E6EAF0`, neutral `#F4F6F9`.

**Mockups that exist only as images pasted in chat (not saved anywhere; not in Figma links):**
Alarms (Zabbix-style severity cards + filters + Active/All tabs), Advisories (Cisco advisories table, filters, two checkboxes, sync line), Lifecycle "EOX" (donut + Act now/Plan this year/Est. investment + two tables + pagination), IT-health ring reference ("59" bigger than "/100"), chat widget **collapsed** state (real photo avatar), Security Advisories modal + unlocked-card images. The chat widget's **expanded** state had no reference — it was designed from scratch.

**Deliberate deviations from mockups (revisit if v2 wants them back):**
blue accents → brand purple · "Customers" column/filter → "Site" (Alarms) and removed (Advisories; single-tenant app) · Zabbix "Z" origin badge → plain "Source" text column · mockup data (e.g. 7,798 items, 890 alarms) rescaled to the app's 184-device story · floating "Need help" card overlapping the Uptime card → fixed bottom-right chat widget · real photo avatar → SVG person avatar (no image generation was used).

## 3. Build timeline (what was done, in order)

1. **Overview dashboard** from `5578:1461`: topbar, icon sidebar, IT Health Score card (animated SVG ring + 6 domain bars), Hardware lifecycle / Alarms / Security advisories cards, Uptime ×2, Actions required, Budget, Need-help card.
2. Interactions pass: tooltips, toasts, count-up numbers, bar-grow animations, dropdowns (notifications, user menu), search focus + ⌘K, "Generate report" modal, Actions toggle-done with live counts, uptime legend filter, budget legend↔segment hover link.
3. Switched to the updated frame `5578:2860`: added Cases/Support cards, reordered bottom row to 3 cards, removed duplicate Uptime card, floating help widget.
4. **Locked Security Advisories** card (blur + overlay) → **Upgrade-your-SLA lightbox** (Essential/Standard/Enterprise) → "Request upgrade" unlocks the card with count-up (and later the Advisories page).
5. IT-health ring polish ("59" larger than "/100" — fixed a CSS rule that shrank both spans).
6. **Report drawer** (right slide-in, skeleton shimmer → narrative from `5300:19726`, prompt box appends canned Q&A).
7. **Breakdown drawer** from "View breakdown": 6 accordions (CVEs + Budget open by default), summaries + clickable recommended actions that navigate/close.
8. **Consultant chat widget**: collapsed pill → expandable chat panel (Marko Zupan, canned replies, typing indicator, minimize). Fixed a layout bug where the hidden panel kept taking flow space.
9. **Lifecycle** page (EOX): summary donut + two date tables; later split — the all-devices table moved to the new **Devices** page and the tabs were removed.
10. **Alarms** page (severity cards, live filters; later Site/Severity/Source converted to dropdowns and Source data diversified, Active/All tabs, row action menu with Acknowledge).
11. **Advisories** (nav label "CVEs") page, gated behind the same upgrade unlock.
12. **Budget** removed from the sidebar (still reachable via internal links → generic placeholder).
13. **Cases** page (ServiceNow-style) + Overview Cases card now links to it.
14. **Uptime** page: summary cards, 7/30/90-day multi-series SVG trend chart with legend toggles, "Today by layer" bars, outage log. Chart geometry was generated by `docs/tools/gen_uptime_chart.py` and spliced into the HTML.
15. **Make it responsive**: hamburger + slide-in sidebar, grid `minmax(0,1fr)` sweep, health-score stacking, topbar collapse. Verified at 375 / 768 / desktop.
16. **Published** to GitHub Pages (installed `gh` via brew, device-flow auth, repo create, Pages enable).

## 4. Page-by-page spec (current behavior)

Sidebar (order): Overview · Devices · Alarms · Cases · CVEs · Lifecycle · Uptime · Reports · Settings. Reports/Settings (and Budget) show a generic placeholder with "Back to Overview".

**Overview** — IT Health Score card (ring 59/100 animates; "View breakdown" opens breakdown drawer; domain bars click through to their pages) · Hardware lifecycle (→ Lifecycle) · Alarms (→ Alarms) · Security advisories (locked until upgrade; "View all" → Advisories page; footer "Upgrade" link appears after unlock) · Cases (→ Cases) · Support (static) · Actions required (click to mark done, urgent/planned counters) · Budget (3-segment bar, legend hover highlights segment, "Drilldown" → placeholder) · Uptime & availability (legend click isolates rows) · floating chat widget.

**Lifecycle** — "Hardware lifecycle" summary card (3-segment donut 178/4/2 of 184, Act now 2, Plan this year 4, Est. investment €84k, Generate report / Get a quote toasts) + two tables ("End of support passed — replace immediately (2)" and "End of Sale passed — Plan replacement (4)"): select-all/row checkboxes, sortable ID, red = date passed, amber = imminent, info tooltips.

**Devices** — "All devices (184)" table, 14 sample rows, select-all, sortable ID, status pills (Replace now / Plan replacement / Supported), visual pagination (only page 1 has data; other pages toast), items-per-page select.

**Alarms** — 6 severity cards (Disaster 1, High 16, Average 34, Warning 58, Information 42, Unclassified 9); filters: text + Site/Severity/Source dropdowns (exact match, combinable); tabs Active (10) / All (14, includes 4 resolved); "…" menu per row: Acknowledge (dims row + toast) / View incident / Copy hostname.

**Cases** — ServiceNow-style. Header badge "Connected to ServiceNow · synced 2 min ago" + "New case"; 5 summary cards; filters: text + State/Priority/Assignment group; tabs Open (8) / All (10); P1–P4 pills, state pills, SLA column ("At risk · 4h left" in red); row menu: Open in ServiceNow / Assign to me / Copy number.

**Advisories (CVEs)** — Entire page blurred + overlay until the upgrade flow is completed. After unlock: filters (text, Severity, Vendor, OS, OS version), toggles ("Show advisories with affected devices only" default on → hides 4 zero-device rows, 10 of 14 shown; "Only count active devices" = toast only), sync status line + "…" menu, table of 14 Cisco advisories with solid severity pills (Critical/High/Medium) and Vendor pill.

**Uptime** — 5 summary cards; trend card with range toggle 7d/30d(default)/90d (three pre-rendered SVGs, one visible) and legend chips that toggle series; "Today by layer" bars (Core 99.8, Security 97.2 warn, Edge 99.5, WLAN 99.1, Services 100; 99% threshold tick); "Recent outages (30d)" table linking to Cases/Alarms identifiers. Layer ↔ device mapping: Core = ISR/core routers, Security = ASA/FPR firewalls, Edge = Catalyst switches, WLAN = Meraki APs, Services = servers.

**Global** — Topbar (sticky): hamburger (≤900px), logo, client switcher (toast), search (⌘K focus, Enter toasts "no results"), notifications dropdown (3 items), help (toast), user dropdown. Overlays: report drawer, breakdown drawer, upgrade modal, chat widget, toasts (stack bottom-right above the chat pill, `bottom:108px`), custom tooltip.

## 5. Code map (`script.js`, one IIFE; line numbers drift — search by the header comment)

Toasts → Tooltip (`[data-tip]`) → `[data-toast]` → Dropdowns/search → Header buttons → **Report drawer** → **Breakdown drawer** → `[data-open-modal]` → **Upgrade modal + `unlockSecurityAdvisories()`** (unlocks both the Overview card and the Advisories page) → **Chat widget** → **Routing** (`navigate`, `hideAllPages`, `pageMeta`) → **Mobile sidebar** → Lifecycle/Devices checkboxes/sort/pagination → **Alarms** → **Advisories** → **Cases** → **Uptime** (range toggle, legend) → Overview uptime legend filter → Budget hover link → Actions toggle → **Entrance animations** (`animateRing`, `animateBars`, `animateCounts`, `replayEntranceAnimations`).

Adding a page: add `<section id="page-X" style="display:none">`, add its const + `hideAllPages()` line + an `else if (page === "X")` branch in `navigate()`, add a sidebar `data-page="X"` button, and (if it has cards) include it in `replayCardAnimations`'s selector list.

Shared UI kit worth reusing: `.card`/`.card__head|__body|__foot`, `.kpis.kpis-3 > .kpi(.kpi-danger)`, `.row` (+ `.row__icon|__main|__right`), `.pill-*`, `.al-sev-card` summary card, `.al-filters/.al-filter` (inputs + selects), `.tabline`, `.lc-table-card > .lc-table-scroll > table.lc-table`, `.dropdown`/`.dropdown-item`, `.drawer-backdrop > .drawer`, `.modal-backdrop > .modal`, `.btn .btn-primary|-secondary|-outline`, `.badge`, `.locked-overlay` + `.card__body.blurred`.

## 6. Design tokens (v1 — this is what v2 replaces)

All in `:root` of `styles.css`. Palette: `--purple #4a318e` (brand/primary) `--purple-dark #382569` `--purple-light #8d7eb8` `--purple-tint #f1eefa` `--colors-indigo #5856d6` (report drawer only) · `--topbar-bg #1e0721 → --topbar-bg-2 #2b0e30` (gradient) · `--page-bg #f5f6f8` `--card-bg #fff` `--neutral-bg #f4f6f9` `--neutral-bg-2 #fafbfc` `--border #e6eaf0` · text `#23262d / #6b7280 / #9aa1ac` · status `--orange #ff9500` `--green #34c759` `--red #ff3b30` + `-tint` variants · severity set `--sev-high #ff5a36`, `--sev-warning #e8ac00`, `--sev-info #2f86eb`, `--sev-unclassified #8a94a6`, `--adv-medium #d99a00`, `--adv-critical #c0271f` (+ tints) · `--radius 14px` `--radius-sm 10px` · 3 shadow tokens · `--ease cubic-bezier(.22,1,.36,1)`.
Typography: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …` at 13px base — **Inter is NOT actually loaded** (no webfont); it only renders on machines with Inter installed, everyone else gets the system font. A real v2 should load its font deliberately.
Token coverage: ~478 `var()` uses; ~88 hardcoded hex outside `:root` (40× `#fff`, 8× `#b9660a` amber text, 6× `#eef0f4` track grey…), 43 `rgba()`, 77 inline `style=""` attributes in the HTML (31 with colours, mostly icon circles on the summary cards). A re-skin is largely a token swap plus cleanup of these stragglers.
Charts are coloured via CSS classes (`.ut-line.core|security|edge|wlan|services`, `.hs-bar__fill.*`, `.lc-donut__seg.*`) — not via a chart library theme.

## 7. Responsive behavior (as shipped)

Breakpoints in use: 1200, 1100, 900, 720, 700, 680, 640, 480, 460 (px, `max-width`). ≤1200 main grids → 2 cols; ≤900 sidebar becomes an off-canvas drawer opened by the hamburger (with backdrop, closes on navigate/Escape/backdrop) and the topbar compacts; ≤720 grids → 1 col; ≤700 health-score ring stacks above the domain list; ≤680 client switcher + username hidden; ≤480 logo wordmark and search hidden. Tables scroll horizontally inside `.lc-table-scroll`. Verified: no horizontal overflow on any of the 7 pages or 4 overlays at 375px and 768px. **Visually checked (screenshots):** Overview @375 and @768, Alarms @375, report drawer @375, breakdown drawer @375. **Only numerically checked (`scrollWidth`), never eyeballed on a phone:** Devices, Cases, Advisories, Lifecycle, Uptime (chart legibility, table scroll affordance, 5-card summary wrapping), the upgrade modal and chat panel. Landscape phones and ≥2000px screens untested. Treat these as the first things to review in v2.

## 8. Deployment (v1)

Repo `tommyknocker81/consciana-dashboard-prototype`, public, Pages from `main` `/` → `https://tommyknocker81.github.io/consciana-dashboard-prototype/`. Auth: `gh` (brew) with device flow; push needs `gh auth setup-git` in a fresh shell. A zip for sharing exists one level up (`consciana-dashboard-prototype.zip`, **stale**, from 2 Jul) and a stale snapshot folder `consciana-dashboard-prototype 2/` (same date) — ignore both.
Redeploy = commit + `git push` (Pages rebuilds in ~1 min; verify by curling a string that only exists in the new build).

## 9. Known limitations / loose ends

- **Count mismatch:** Cases summary says "6 open" but the Open tab lists 8; Alarms cards show totals (e.g. 16 High) while the table is a sample (3 High active). Intentional "sample of larger set" but visible if scrutinised.
- **Numbering schemes differ:** Alarms use bare incident numbers (30012…), Cases use ServiceNow-style (INC0089412…). Outage log references both.
- Advisories `Only count active devices` toggle only toasts; Devices/Lifecycle pagination is visual; Budget, Reports, Settings are placeholders; Support card is static; search only toasts.
- Cases footer says "1 case waiting" while table has 1 "Waiting on Vendor" — consistent; Overview Cases card rows are toasts, not links to the specific case.
- Accessibility not audited (focus rings, aria on custom controls, contrast of `--text-faint` on white, sidebar inactive grey is low contrast). No dark mode. No i18n. No persistence (state resets on reload). `prefers-reduced-motion` not honored.
- Inter font not shipped (see §6). Chat avatar is a generic SVG person.
- Date "today" is hard-coded as **26 May 2026 14:32 CET** everywhere.

## 10. Lessons learned (process)

1. Fetch Figma per card; whole-frame metadata/design-context overflows. Screenshots > metadata when they disagree.
2. Pasted mockups carry placeholder data that contradicts the app's story — adapt data to the established narrative (see `DATA_NARRATIVE.md`) instead of copying.
3. Cache-bust every edit (`?v=N`). Cached JS caused "silent" breakage where new markup had no behavior.
4. When something "overflows", first confirm the real viewport width. Then find the offending element with a `getBoundingClientRect` sweep instead of guessing.
5. Hide-by-class/attribute needs a matching CSS rule when the element has its own `display`.
6. Python was used to generate chart geometry and splice big HTML blocks (`str.replace` on a unique marker) — safer than pasting 30 KB through the editor.
7. Keep a sanity script: balanced-tag counter + JS parse check before every preview.
8. Use `el.click()` in `preview_eval` for interaction tests; wait ≥1.5s for animations before reading rings/counts.
9. Don't commit/push unless asked; when asked, verify the live URL actually serves the new build.

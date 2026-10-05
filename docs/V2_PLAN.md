# V2 PLAN — Conscia Landing Zone (token map + phased build)

Source of truth: Figma `VwNSXI42IxOdHwDoreNltr` ("Consciana – Landing zone"), frame **`203:4464`** (Overview, 1684×1806).
Only the Overview is designed; every other page is restyled with the same component language.

Decisions (user, 2026-10-05):
- **IA:** follow Figma. Sidebar = Overview · Lifecycle · Advisories · Cases · Recommendations · Admin · (bottom) Help.
  Devices, Alarms and Uptime pages stay, reachable from in-page links only. Recommendations + Admin = placeholder pages.
- **Data:** Figma numbers are the truth; rewrite `DATA_NARRATIVE.md` and every page so counts agree.
- **Gating:** the upgrade flow locks **Alarms** (Overview card + Alarms page). Advisories is open. Overlay copy fixed to "…access to Alarms."
- **Font:** `Saans` via `local()` only (licensed, installed on the designer's Mac) with a system-UI fallback. No font files in the repo.

## Status (5 Oct 2026)
Phases 0–7 done in one pass: assets, tokens + Saans `local()`, shell, Overview rebuild, data rewrite (see `DATA_NARRATIVE.md`),
other pages restyled, responsive (verified 1440 / 1280 / 1000 / 881 / 768 / 375, no overflow on any page or overlay), motion + reduced-motion, docs.
Picks: ISRs moved to the PastEOSale tab (count 4) · model stays ISR4331/K9 · Dutch sites (Uden / Veghel / Oss).
Open: repo name / publishing; Recommendations + Admin are placeholders; Figma-only Overview — other pages are an interpretation.

## Figma node map

| Node | What |
|---|---|
| `203:4466` | Topbar (burgundy, logo + "Landing Zone", client switcher, Report incident / Request service, bell, menu) |
| `203:4495` | Sidebar (104px, labelled icon buttons, Help pinned bottom) |
| `203:4497` | Page header ("Overview" 46px display + "Generate summary" secondary button) |
| `203:4500` | SOC card — 5 × KpiWithGraph with sparklines + trend pill |
| `203:5354` | Lifecycle management — 3 state tiles, CTA strip, Most urgent devices + tab group |
| `203:4553` | Security advisories — 2 tiles + Most urgent devices |
| `203:4602` | Cases — 3 tiles + P1/P2 incidents list |
| `203:4649` | Alarms — locked (blur + "Upgrade tier") |
| `203:4768` | Actions required — priority pills + rows |
| `203:4828` | Your Conscia Team — tab group + contact rows (photo, Email, Call) |
| `203:4893` | "Need help?" floating chat pill (consultant photo) |

Component documented in Figma — **KpiWithGraph** states: *Alert* (peach/300 on disaster border) · *Successful* (low subtle bg on low border) ·
*Neutral* (white on divider) · *Call to action* (secondary-button bg, blue/500). Plan-now uses warning/50 on warning/500.

## 1. Token map (v1 → v2)

### Colour
| v1 token | v1 value | v2 token | v2 value | Figma variable |
|---|---|---|---|---|
| `--purple` (primary) | `#4a318e` | `--brand` | `#4962ff` | blue/500 (brand) |
| `--purple-dark` | `#382569` | `--brand-hover` | `#3a4fe0` *(derived, hover only)* | — |
| `--purple-tint` | `#f1eefa` | `--brand-tint` | `#e5e9ff` | misc/secondary button bg · badge info bg |
| `--purple-light` (links/active) | `#8d7eb8` | `--brand` | `#4962ff` | misc/secondary button text |
| `--colors-indigo` | `#5856d6` | `--brand` | `#4962ff` | (merged) |
| `--topbar-bg` / `-2` gradient | `#1e0721 → #2b0e30` | `--topbar-bg` (flat) | `#1e0721` | burgundy/900 (brand) |
| — | — | `--topbar-border` | `#351838` | burgundy/600 |
| `--page-bg` | `#f5f6f8` | `--page-bg` | `#ffffff` | misc/default background (main area is white) |
| `--neutral-bg` | `#f4f6f9` | `--subtle-bg` | `#f3f4f5` | misc/subtle background (sidebar, neutral pills) |
| — | — | `--sidebar-active` | `#e4e4e5` | sidebar/active bg |
| `--card-bg` | `#fff` | `--card-bg` | `#ffffff` | misc/default background |
| `--border` | `#e6eaf0` | `--stroke` (section cards) | `#cbcace` | misc/subtle stroke |
| — | — | `--divider` (tiles, rows) | `#e4e4e5` | misc/divider |
| `--text` | `#23262d` | `--text` | `#0e080f` | misc/default text |
| `--text-muted` | `#6b7280` | `--text-muted` | `#6d6c75` | misc/muted text |
| `--text-faint` | `#9aa1ac` | `--text-faint` | `#8e8d95` *(derived, AA-checked on white for ≥14px)* | — |
| `--red` | `#ff3b30` | `--danger` | `#e52e3b` | danger/500 · severity/default/critical bg |
| `--red-tint` | `#ffebea` | `--danger-tint` | `#ffebec` | severity/subtle/critical bg |
| — | — | `--danger-text` | `#d42431` | severity/subtle/critical text |
| `--adv-critical` | `#c0271f` | `--disaster` | `#a41c26` | severity/default/disaster bg |
| — | — | `--alert-tint` | `#ffe8e9` | peach/300 (brand) — Alert tile bg |
| `--orange` | `#ff9500` | `--warning` | `#fa8b1b` | warning/500 |
| `--orange-tint` | `#fdf1de` | `--warning-tint` | `#fff3d4` | warning/50 |
| `--sev-high` | `#ff5a36` | `--high-text` / `--high-tint` | `#e14709` / `#ffebcc` | severity/subtle/high |
| `--green` | `#34c759` | `--success` | `#16a66c` | severity/default/low bg |
| `--green-tint` | `#e7f9ec` | `--success-tint` | `#e6faf1` | severity/subtle/low bg |
| — | — | `--success-text` | `#0b7d4f` | severity/subtle/low text |
| `--sev-warning`, `--adv-medium` | `#e8ac00`, `#d99a00` | `--warning` family | as above | (merged) |
| `--sev-info` / tint | `#2f86eb` / `#e8f2fd` | `--brand` / `--brand-tint` | `#4962ff` / `#e5e9ff` | badge info |
| `--sev-unclassified` / tint | `#8a94a6` / `#eef0f3` | `--text-muted` / `--subtle-bg` | | (merged) |
| hardcoded `#b9660a` ×8 (amber text) | | `--warning-text` | `#b25a00` *(derived for AA on warning/50)* | — |
| hardcoded `#eef0f4` ×6 (tracks) | | `--track` | `#ececee` *(derived)* | — |

Sparkline colours: red series = `--danger` line on `--danger-tint` fill; green = `--success` on `--success-tint`; neutral/blue = `--brand` on `--brand-tint`.

### Shape, elevation, motion
| v1 | v2 | Source |
|---|---|---|
| `--radius 14px` (cards) | `--radius 10px` | section cards + KPI tiles |
| `--radius-sm 10px` | `--radius-sm 8px` (list rows), `--radius-xs 6px` (buttons, sidebar items, icon chips) | Figma |
| pills 999px | `--radius-pill 100px` | tabs, trend pills |
| `--shadow-card` | `none` — Figma cards are flat, 1px border | Figma |
| `--shadow-hover` | `0 4px 14px rgba(14,8,15,.08)` *(hover only, subtle)* | new (animation brief) |
| `--shadow-pop` | `0 12px 32px rgba(14,8,15,.16)` | dropdowns, modal, drawers, chat |
| `--ease` | keep `cubic-bezier(.22,1,.36,1)`; add `--dur-fast 160ms`, `--dur 280ms`, `--dur-chart 900ms` | |

### Typography (Saans, `local()` + fallback `ui-sans-serif, -apple-system, "Segoe UI", Roboto, Arial`)
| Token | Size / line-height / tracking / weight | Used for |
|---|---|---|
| `display-lg` | 46 / 1.22 / −0.69px / 570 | page title, KPI numbers |
| `display-sm` | 32 / 1.2 / −0.48px / 570 | KPI unit suffix (`%`) |
| `text-xl` | 20 / 1.26 / −0.1px / 570 | section card titles |
| `text-md` | 16 / 1.3 / 0 / 570 or 380 | tile titles, sub-headings |
| `text-sm` | 14 / 1.26 / 0 / 570 or 380 | body, buttons, rows |
| `text-xs` | 12 / 1.3 / 0 / 570 or 380 | sidebar labels, pills, tabs, trend labels |
Base font-size moves 13px → **14px**. Weights 570/380 map to the Saans Medium/Regular faces via `@font-face { src: local("Saans Medium") }`; the fallback uses 500/400.
`font-feature-settings: "calt" 0` as in Figma.

### Components
| v1 | v2 |
|---|---|
| `.btn-primary` purple | **PrimaryButton** blue/500, 34px high, 6px radius, 12px x-padding, 18px icon, gap 8 |
| — | **PrimaryDangerButton** danger/500 (Report incident) |
| `.btn-secondary/-outline` | **SecondaryButton** brand-tint bg + brand text (Generate summary, Upgrade tier = primary) |
| text links | **TertiaryButton/LinkButton** brand text, ↗ arrow icon |
| `.tabline` underline tabs | **TabGroup**: pill tabs, active = black `#0e080f` bg + white text, 26px, 12px medium |
| `.kpi(-danger)` | **KpiWithGraph** tile (states Alert / Successful / Neutral / Call to action / Plan) |
| `.row` | 8px radius row, 1px border, 28px icon chip (6px radius), title 14 medium + subtitle 14 muted |
| `.pill-*` | 12px medium pills, tinted bg, 100px radius |
| sidebar rail (icons only) | 104px rail, 88px labelled buttons (24px icon + 12px label), active = `#e4e4e5` |
| topbar gradient + rotating logo | flat burgundy, 1px `#351838` bottom border, Conscia SVG logo + "Landing Zone" 23px |
| chat pill (SVG avatar) | Figma "Need help?" pill with consultant photo |

## 2. Data rewrite (Figma = truth) — decisions to confirm

Figma values: client **Bernhoven**; SOC Open incidents **0**, Incident trend **12** new (+53%), Threat pressure **0** attacks (−67%),
SLA adherence **100%**, Average triage **9 min** (+18.3%); Lifecycle Act now **23** (≤3 mo), Plan now **4** (3–6 mo), Budget & Schedule **17** (6+ mo);
tabs PastEOSupport **(2)** / PastEOSale **(3)**; Critical CVEs **2 devices**, High CVEs **2 devices**; Cases Open incidents **2**, Open cases **4**,
Awaiting you **2**; Alarms (locked) **2 / 4 / 24**; Team: Daan Herpers (Service delivery manager), Roel Ottenheijm (Account director), Michel Koerting (Engineering lead).

Contradictions inside the Figma that I propose to resolve like this (all pages updated to match):
1. **SOC "Open incidents 0" vs Cases "Open incidents 2"** → SOC counts *security* incidents (SOC), Cases counts ITSM incidents. Tooltips say so.
2. **"PastEOSupport (2)" tab lists ASA5506 ×2 *and* ISR ×4** → PastEOSupport tab = ASA5506 ×2 only; the ISR row moves to the PastEOSale tab. Tab count becomes **(4)**, or keep (3) and make it 3 ISRs. *(needs your pick)*
3. **"ISR22231/K8"** isn't a real Cisco model (v1 used ISR4331/K9) → keep Figma's label as drawn, or use ISR4331/K9 everywhere. *(needs your pick)*
4. **Act now 23 / Plan 4 / Schedule 17 = 44 devices** with a lifecycle milestone; the other 140 of 184 are fine. Lifecycle donut becomes 140 / 17 / 4 / 23.
5. **Critical CVEs "2 devices"** = CVE-2024-20356 on the two ASAs (matches). **High CVEs "2 devices"** = CVE-2024-20399 on FPR-2130 + CVE-2025-20084 on 2 × Catalyst → that's 3; I'll pick a set that gives 2.
6. **Cases 4 open (2 incidents, 2 awaiting you)** → Cases table trimmed/re-stated to 4 open + closed history; "Awaiting you" = state *Awaiting customer*.
7. **Sites** are Slovenian (Ljubljana/Maribor/Celje) but Bernhoven is Dutch → rename to Dutch sites (e.g. Uden HQ / Veghel / Oss)? *(needs your pick)*
8. **Removed Overview cards** (Health Score, Budget, Uptime, Support) → the breakdown drawer loses its trigger; "Generate summary" opens the report drawer with rewritten text (no 59/100 score).
   Uptime page reachable from the SOC "SLA adherence" ↗; Devices from Lifecycle "See all"; Alarms from the Alarms card (after unlock).
9. Chat consultant **Marko Zupan → Daan Herpers** (Service delivery manager), using the Figma photo.

## 3. Animation & hover brief ("subtle, more user-friendly")
- **Sparklines:** line draws in (stroke-dashoffset, 900ms ease-out, 60ms stagger per tile); area fill fades in after. Hover: crosshair + dot follows the pointer, tooltip shows day + value.
- **KPI numbers:** count-up (existing `data-count`), 700ms.
- **Tiles & rows:** hover = 1px border darkens + `--shadow-hover` + translateY(−1px), 160ms; ↗ icon nudges 2px up-right.
- **Tabs:** active pill slides between tabs (one moving indicator), 280ms.
- **Bars / donut / uptime chart** on other pages: keep v1 growth animations, retimed to the new durations.
- **Locked Alarms:** overlay fades; on unlock the blur dissolves (400ms) then numbers count up.
- **Buttons:** colour transition 160ms; press = scale(.98).
- All motion disabled under `prefers-reduced-motion: reduce`.

## 4. Phased build (each phase verified at 1440 / 768 / 375 + overflow recipe D3/D4)
0. **Assets** — download from Figma: Conscia logo SVG, 7 sidebar icons, topbar icons, ↗ / ⓘ / trend icons, 3 team photos + chat photo → `assets/`. Add to the sprite where they are strokes.
1. **Tokens & type** — replace `:root` per §1, Saans `@font-face local()`, base 14px; sweep hardcoded hex/rgba + inline `style=""` colours into classes.
2. **Shell** — topbar, sidebar (new items, Help at bottom, mobile drawer kept), page header, buttons, TabGroup, pills.
3. **Overview rebuild** — SOC, Lifecycle management, Security advisories, Cases, Alarms (locked), Actions required, Your Conscia Team, Need-help pill. New JS: sparkline renderer + hover, tab groups (Most urgent devices, Team), team Email/Call toasts.
4. **Data rewrite** — `DATA_NARRATIVE.md` v2, then Lifecycle → Devices → Advisories (unlock removed) → Cases → Alarms (lock added) → Uptime, keeping cross-page identifiers in sync.
5. **Other pages restyle** — tables, filters, dropdowns, drawers, modal (Upgrade tier), toasts, tooltip in the new language.
6. **Responsive** — SOC 5 tiles → 3/2/1 columns; section pairs → stacked ≤1100; sidebar drawer ≤900.
7. **Motion & a11y** — §3, reduced-motion, focus rings (`--brand` 2px), aria on tabs/accordions.
8. **Docs** — update CLAUDE.md / HANDOFF for v2. Publish only when asked (repo name still open).

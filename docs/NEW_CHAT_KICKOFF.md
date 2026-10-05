> **v1 history.** This document describes the v1 build it was copied from. For v2 read `../CLAUDE.md`, `V2_PLAN.md` and `DATA_NARRATIVE.md` (v2 data) first.

# NEW CHAT KICKOFF — v2 (same logic, new design language, new GitHub repo)

## What v2 is
Keep **everything functional from v1** — pages, information architecture, interactions, animations, fictional data, responsive behavior —
and replace the **visual design language** (colours, type, spacing, radii, shadows, component look, icon style, logo/brand chrome).
Publish as a **new** public GitHub repo + Pages URL. The v1 repo/URL stays untouched as the reference version.

What is *not* decided yet (the new chat must ask, not assume): the source of the new design language, whether layouts/IA may change or it is
purely visual, the font, and the repo name. See "Questions to settle" below.

---

## A. The only thing the user has to do

1. Open a **new Claude Code chat with the working folder set to**
   `/Users/tomazhocevar/Dropbox/2_DesignPark/Figma-Claud-app`
   (the parent folder — that is where the project memory, the shared `.claude/launch.json` preview configs, and the sibling `conscia-toolkit/` live).
2. Paste the prompt from section B as the first message.
3. Answer its questions (design inputs + repo name), approve its plan, review as it goes.

*(Optional manual alternative to let Claude do the copy: run this yourself first.)*
```bash
cd /Users/tomazhocevar/Dropbox/2_DesignPark/Figma-Claud-app
rsync -a --exclude '.git' consciana-dashboard-prototype/ consciana-dashboard-v2/
```

## B. Prompt to paste as the first message

```
I'm continuing a project from a previous chat. The folder `consciana-dashboard-prototype/` (next to this one) is a FINISHED v1:
a static, dependency-free clickable prototype of the "Consciana IT Health" dashboard (vanilla HTML/CSS/JS, ~5,000 lines, published on GitHub Pages).

GOAL — build v2: the SAME logic, pages, interactions, animations, fictional data and responsive behavior, but restyled with an UPDATED DESIGN LANGUAGE,
as a NEW project folder (`consciana-dashboard-v2` unless I say otherwise) with a NEW GitHub repo.

Do this, in order, and STOP at step 4 for my answers:
1. Read in full: consciana-dashboard-prototype/CLAUDE.md, then docs/HANDOFF.md, docs/DATA_NARRATIVE.md, docs/NEW_CHAT_KICKOFF.md.
2. Create the v2 folder by copying v1 WITHOUT its .git (rsync -a --exclude '.git'). Do NOT modify, commit to, or push to the v1 folder/repo
   (tommyknocker81/consciana-dashboard-prototype). Add a preview entry for v2 to .claude/launch.json (python3 http.server on port 4176).
3. Run v2 locally and confirm the baseline works: screenshot Overview at 1440px and 375px (verify window.innerWidth each time), check no console errors,
   and run the numeric overflow check from NEW_CHAT_KICKOFF.md §D across all 7 pages.
4. Reply to me with (a) ≤10 lines on what the project is, what's built and the gotchas you'll respect, and (b) the questions from NEW_CHAT_KICKOFF.md §C.
   Do not invent a design language — wait for my inputs.
After I answer: write a v1→v2 design-token map and a phased re-skin plan (§E) and wait for my OK before editing styles.

Standing rules: keep behavior/data/IA unchanged unless I say so; no frameworks or new dependencies; bump the ?v= cache-busters on every CSS/JS edit;
verify visually AND numerically in a browser after changes; keep the data consistent across pages (DATA_NARRATIVE.md);
init git + create the new repo only when I give you the repo name; never commit or push until I ask.
```

## C. Questions to settle with the user (the new chat should ask these first)

1. **Where does the new design language come from?** Options: (a) Figma file/frames — link + node IDs for the token/variable page, the component library, and at least one redesigned screen (e.g. Overview); (b) the **Conscia Angular design system** that sits next to the project (`conscia-toolkit/`, Angular 19 + Storybook 8, `@conscia/toolkit` v28.11.0 — run via the `conscia-toolkit-storybook` launch entry on port 6006; needs Node 22 at `/opt/homebrew/opt/node@22/bin`); (c) screenshots/mockups; (d) a written description. *Hint from v1 research:* the original Figma file's variables hint at a Conscia palette that v1 did not use — Blue 400 (Conscia) `#248DD8`, Indigo `#5856D6`, grays `#6C757D / #C9D0DB`, text `#272A31`, fonts Inter / Roboto / Source Sans Pro. v1's purple (`#4A318E`, topbar `#1E0721`) was **sampled from screenshots**, so it may not be the official brand.
2. **Visual-only or structural too?** May nav, page layouts, card compositions, table designs, chart styles change — or purely colour/type/spacing/radius/shadow/icons?
3. **Typography:** which font(s)? v1 *claims* Inter but never loads it (system fallback for most people). v2 should load fonts deliberately (self-hosted files are safest — v1 has zero external requests; Google Fonts is acceptable if the user says so).
4. **Icons:** keep the hand-drawn stroke icons in the SVG sprite, or adopt the new language's icon set/style?
5. **Dark mode / theme switching** in scope? (v1: none.)
6. **Brand chrome:** new logo/wordmark? v1's logo is a rotating CSS gradient square + "Consciana" text; the chat avatar is a generic SVG person (a real consultant photo was never supplied).
7. **Repo:** name (suggest `consciana-dashboard-v2`), public vs private (**GitHub Pages on free accounts needs public**), same account `tommyknocker81`.
8. **Fix v1's known loose ends in v2?** (HANDOFF §9: count mismatches, accessibility, reduced-motion, placeholder pages Reports/Settings/Budget, unverified mobile screenshots for 5 pages.)

## D. Verification recipes (paste into the browser eval tool)

```js
// 1. viewport sanity — ALWAYS check first (it silently drifted once and caused a false investigation)
JSON.stringify({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})

// 2. stylesheet/script freshness (cache-busting)
JSON.stringify([...document.styleSheets].filter(s=>s.href).map(s=>({href:s.href, rules:s.cssRules.length})))

// 3. horizontal-overflow check across every page (expect scrollWidth === innerWidth)
(() => { const r={}; ['overview','devices','alarms','cases','cves','lifecycle','uptime'].forEach(p=>{
  document.querySelector(`.sidebar__item[data-page="${p}"]`).click(); r[p]=document.documentElement.scrollWidth; });
  document.querySelector('.sidebar__item[data-page="overview"]').click(); return JSON.stringify(r); })()

// 4. find what overflows (run on the offending page)
JSON.stringify([...document.querySelectorAll('body *')].map(e=>[e,e.getBoundingClientRect()]).filter(([e,r])=>r.right>innerWidth+1||r.left<-1)
  .slice(0,15).map(([e,r])=>({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,50),left:r.left,right:r.right})))

// 5. sticky topbar still sticks after scrolling (expect top 0)
(() => { scrollTo(0,900); return document.querySelector('.topbar').getBoundingClientRect().top })()

// 6. open each overlay and re-check overflow
['btnGenerate','viewBreakdownBtn','chatWidgetPill'].forEach(id=>document.getElementById(id).click()); document.documentElement.scrollWidth
```
Other checks used before: tag-balance regex over `index.html` (div/table/tr/td/section/svg…) and `node -e "new Function(require('fs').readFileSync('script.js','utf8'))"` for a JS parse check.
Interaction tests: call `el.click()` and assert state (e.g. `sidebar.classList.contains('open')`, `hidden` flags, `textContent` of footers). Don't rely on synthetic mouse clicks.

## E. Suggested phased plan for the re-skin

0. **Baseline & fork** — copy, new preview entry (port 4176), baseline screenshots of all 7 pages + 4 overlays at 1440/768/375 (these become the before/after set; v1 mobile screenshots for Devices/Cases/Advisories/Lifecycle/Uptime were never eyeballed).
1. **Tokens** — write the v1→v2 token map; replace `:root`; add semantic aliases if useful (e.g. `--color-primary`); hunt down the stragglers: ~88 hardcoded hex values in `styles.css` (e.g. `#b9660a` amber text ×8, `#eef0f4` track grey ×6, `#fff` ×40), 43 `rgba()` shadows/overlays, and 77 inline `style=""` attributes in `index.html` (31 with colours; mostly the icon circles on summary cards — turn them into classes). Load the real font.
2. **Shell** — topbar, sidebar (rail + mobile drawer), page-head, buttons (`.btn-primary/-secondary/-outline`), tabs (`.tabline`), badges/pills.
3. **Components** — cards, KPI boxes, list rows, severity/priority/state pills, tables (`.lc-table`), filters/inputs/selects, dropdowns, tooltip, toast, modal (upgrade), drawers (report, breakdown), chat widget, locked/blurred overlay.
4. **Charts** — health ring, domain bars, uptime bars, budget bar, lifecycle donut, uptime line chart (CSS classes; re-run `docs/tools/gen_uptime_chart.py` only if size/density/data changes), chart legends/tooltips.
5. **Pages** in order: Overview → Lifecycle → Devices → Alarms → Cases → Advisories → Uptime (check each at 3 widths, with screenshots).
6. **Responsive re-verify** — recipes D3/D4/D5/D6; hamburger drawer; table scroll affordance; summary-card wrapping; topbar collapse.
7. **Accessibility pass** — contrast (especially faint grey text and inactive sidebar), visible focus, `aria-*` on custom controls (checkbox buttons, accordions, tabs), `prefers-reduced-motion`.
8. **Publish** — `git init -b main`, repo-scoped identity (`tommyknocker81` / `tommyknocker81@users.noreply.github.com`), `gh auth status` (re-login via `gh auth login --web` if needed; `gh auth setup-git` if push asks for a username), `gh repo create <name> --public --source=. --remote=origin --push`, enable Pages (`gh api -X POST repos/tommyknocker81/<name>/pages -f "source[branch]=main" -f "source[path]=/"`), then poll the live URL for a string unique to the new build. Remember to bump `?v=`.

## F. Things worth carrying over unchanged
The data contract (`DATA_NARRATIVE.md`) · the routing/overlay JS · the upgrade→unlock flow (Overview card **and** Advisories page) · chat widget behavior · count-up/bar/ring animations · the responsive breakpoints (re-tune only if the new design needs it) · the generator script for the uptime chart.

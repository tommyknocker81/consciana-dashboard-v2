# DATA NARRATIVE — v2 (Conscia Landing Zone · 3 clients)

Since 6 Oct 2026 the prototype has **three clients** (switcher in the topbar; account menu on phones). All data lives in `clients.js`.
| Client | State | Tier | Devices | Key story |
|---|---|---|---|---|
| **Noordkade Logistics** (Rotterdam / Moerdijk / Venlo) — contact P. de Graaf | alarming | Essential (Alarms locked) | 412 | Ransomware alert on SRV-FS01 (P1), WAN down at DC Moerdijk (P1), attacks +140%, SLA 92%; 44 act now (11 unsupported: 4 × ASA5506, 5 × Catalyst 3750-X, 2 × Windows Server 2012 R2; 32 × MR33; 1 FTD licence renewal), 12 plan (ISR4331), 26 budget (2960-X); 6 critical / 14 high CVE devices; 7 P1/P2 / 11 open / 4 awaiting; uptime 96.4%, 2/5 layers OK; €56k quoted + ~€232k to quote |
| **Bernhoven** (Uden / Veghel / Oss) — contact S. van Dijk | mixed | Essential (Alarms locked) | 184 | The original story below |
| **Rivierland Gemeente** (Tiel / Culemborg / Geldermalsen) — contact J. Bakker | all good | Standard (Alarms open) | 326 | SOC quiet and improving; 0 act now, 4 plan (3 × ISR4331 €42k quoted + FTD licence renewal), 14 budget (12 × 2960-X ~€28k 2027 + 2 × Windows Server 2016 upgrade); 0 critical / 1 high CVE (patch scheduled); 0 P1/P2 / 1 open request; uptime 99.9%, 5/5 layers |
The Conscia team (Daan, Roel, Michel, Inge, Service Desk) is the same for every client. The rest of this file details **Bernhoven**.


All data is fictional and hard-coded in `index.html` (+ `SPARK_DATA` in `script.js`). It is **deliberately consistent across pages**.
v2 took the Figma Overview numbers as the truth (user decision, 5 Oct 2026) and rewrote the v1 story around them.
If you change a number, change it everywhere in the matrix at the bottom.

## The story in one paragraph
Client **Bernhoven** (hospital group; viewed by **S. van Dijk**, IT manager; managed by Conscia — service delivery manager **Daan Herpers**,
account director **Roel Ottenheijm**, engineering lead **Michel Koerting**) runs **184 managed devices** across 3 sites. Today is **26 May 2026, 14:32 CET**.
The SOC is quiet (0 open security incidents, threat pressure down 67%), but the lifecycle is not: **2 × Cisco ASA5506** firewalls are 2y 9m past End-of-Support
and carry **CVE-2024-20356** (9.8, no fix) → the **Security layer's uptime is 97.2%** (below the 99% SLA) → the €84k replacement isn't budgeted.
**23 devices** hit a lifecycle milestone within 3 months (the 2 ASAs + 21 Meraki MR33 APs whose support ends 21/07/2026).
The core router went down 14 minutes ago (P1, pending assignment). Bernhoven's tier (**Essential**) includes Advisories but **not Alarms** → that card/page is locked until they upgrade to **Standard**.

## Sites
`HQ — Uden` · `DR site — Veghel` · `Branch — Oss`

## People
Client: **S. van Dijk** (IT manager, assignee of the 2 "awaiting you" requests). Conscia: Daan Herpers (chat consultant), Roel Ottenheijm, Michel Koerting,
Inge Willems (inside sales, Commercial tab), Conscia Service Desk 24/7 (Escalation tab). Case engineers: John Doe, M. Koerting, R. Jansen.

## Device inventory (Devices page shows 18 of 184)
| ID | Model | Hostname | Site | Status |
|---|---|---|---|---|
| 4102 / 4103 | ASA5506-X | FWP1L0S01A1 / A2 | HQ — Uden | Replace now (past EoSupport) |
| 6201 / 6202 | Catalyst 2960-X-48FPD-L | SWP2L2A001 / 002 | HQ — Uden | Budget & schedule (2 of 17 on Devices) |
| 6110 / 6111 | Meraki MR33 | APP1L1W011 / 012 | HQ — Uden | Replace within 3 months (2 of 21 on Devices; all 21 on Lifecycle) |
| 5210–5213 | ISR4331/K9 | RTP1C0M001–004 | HQ / DR / DR / Branch | Plan replacement (past EoSale) |
| 6001 / 6002 | Catalyst 9300-48P | SWP2L1C001 / 002 | HQ | Supported |
| 6103 / 6104 | Meraki MR46 | APP3L2W001 / 002 | Branch — Oss | Supported |
| 4087 | FPR-2130 | FPP1L0H0 | HQ | Supported |
| 7001 / 7002 | Dell PowerEdge R650 | SRV-DC01 / SRV-FILE02 | HQ / DR | Supported |
| 8231 | Dell Latitude 5440 | WKS-0231 | HQ | Supported |
Core router **RPP1L2C001H1** (10.20.0.1). Layer mapping (Uptime): Core = ISR/core routers · Security = ASA + FPR · Edge = Catalyst · WLAN = Meraki · Services = servers.

## Overview (Figma frame 203:4464)
- **SOC** (security incidents, not ITSM cases): Open incidents **0** (trend unchanged) · Incident trend **12** new in 7d (**+53%**) · Threat pressure **0** attacks (**−67%**) ·
  SLA adherence **100%** (unchanged) · Average triage **9 min** (**+18.3%**). Sparklines = 30 daily points ending 26 May (`SPARK_DATA`).
- **Lifecycle management:** Act now **24** (23 hardware + FTD 7.0 upgrade on FPP1L0H0) · Plan now **4** · Budget & Schedule **18** (17 × 2960-X + Windows Server 2019 upgrade on SRV-FILE02) → 46 with a milestone, 138 with none. Items carry an action tag: Replace / Upgrade / Renew.
  CTA "Contact Sales". Most urgent devices tabs: **PastEOSupport (2)** = ASA5506 × 2 "Overdue 2y 9m" · **PastEOSale (4)** = ISR4331/K9 × 4 "Overdue 2y 7m" (EoSale 31/10/2023).
- **Security advisories:** Critical CVEs **2 devices** (CVE-2024-20356 on both ASAs) · High CVEs **2 devices** (FPP1L0H0 via CVE-2024-20399, RTP1C0M001 via CVE-2025-20012).
  Rows: CVE-2024-20356 · ASA5506 "No fix patch" 9.8 · CVE-2024-20399 · FPR-2130 "Patch available" 7.2.
- **Cases:** P1 or P2 **3** (INC0089412 P1, INC0089388 P2, REQ0089301 P2) · Open cases **4** · Awaiting you **2**. Urgent cases list shows those 3, P1 first.
- **Alarms** (locked): Critical **2** (1 acknowledged) · High **4** · Avg. resolve **2.4 h**; rows Core router down (Critical, 14 min ago) · High CPU on firewall (High, 2 h ago).
- **Actions required:** First priority — Replace ASA5506 × 2 · Important — Acknowledge 1 critical alarm · Plan — Add €84k to capex plan · Important — Patch CVE-2024-20399.
- **Your Conscia Team:** Primary (Daan, Roel, Michel) · Commercial (Roel, Inge Willems) · Escalation (Service Desk 24/7, Daan).

## Lifecycle page
Donut **23 act / 4 plan / 17 schedule / 140 none of 184**. Tiles mirror the Overview + Est. investment **€84k quoted + ~€19k to quote**.
"View breakdown" (fictional, indicative list prices): 2 × ASA5506-X → Firepower 1120 **€28k** (quoted) · 4 × ISR4331/K9 → Catalyst 8300 **€56k** (quoted) ·
21 × Meraki MR33 → MR36 **~€19k** (to quote) · total ~€103k. The €84k (= ASA + ISR) is the figure used everywhere else (Actions, REQ0089180, Summary).
The 3 lifecycle tables show 5 rows, then "Show all N" (only the MR33 table has more: 21 rows, 6110–6130, APP1L1W011–031).
Tables are organised by **bucket** (tiles on Overview and Lifecycle scroll to them via `data-scroll`):
- **Act now — replace within 3 months (23):** 2 × ASA5506-X (EoSale 29/1/2021, EoSW 29/1/2022, EoSupport 31/8 + 24/7/2023 — already unsupported)
  + 21 × Meraki MR33 (6110–6130, APP1L1W011–031; EoSale 14/7/2022, EoSupport 21/7/2026).
- **Plan now — decide within 3–6 months (4):** 4 × ISR4331/K9 (EoSale 31/10/2023, software maintenance ended 24/5/2026, EoSupport 31/10/2028).
- **Budget & Schedule — 6+ months out (17):** 17 × Catalyst 2960-X-48FPD-L access switches (6201–6217, SWP2L2A001–017, Cisco IOS 15.2(7)E8;
  9 HQ, 4 DR, 4 Branch; EoSale 30/10/2022, EoSW 31/1/2027, EoSupport 31/10/2027).
Each table shows 5 rows, then "Show all N". Bucket = when Bernhoven has to act, not which vendor milestone passed.
Tables: End of support passed (2 ASA5506) · End of Support within 3 months (21 × MR33, 2 rows shown: EoSale 14/7/2022, EoSupport 21/7/2026) ·
End of Sale passed (4 × ISR4331/K9: EoSale 31/10/2023, EoSW 24/5/2026, EoSupport 31/10/2028).

## Alarms page (cards are totals; table is a sample)
Cards: Disaster **2** · High **4** · Average 34 · Warning 58 · Information 42 · Unclassified 9. Active tab shows **9**, All shows 14.
Changes vs v1: #3 Interface Gi0/1 down RTP1C0M002 is now **Disaster, DR site — Veghel, acknowledged**; #8 NTP sync lost RTP1C0M003 is **resolved** 22/05 11:40 (4 h 10 min).

## Cases page (ServiceNow)
Summary: Open incidents **2** · Open cases **4** · Awaiting you **2** · At risk (SLA) **1** · Resolved (30d) **4**. Open tab 4, All tab 8.
| Number | Description | Pri | State | Assigned |
|---|---|---|---|---|
| INC0089412 | Core router down — RPP1L2C001H1 | P1 | In Progress | Unassigned · **At risk 4h** |
| INC0089388 | High CPU on firewall — FPP1L0H0 | P2 | In Progress | John Doe |
| REQ0089301 | Replace ASA5506 firewalls — approval needed | P2 | Awaiting customer | S. van Dijk |
| REQ0089180 | Add €84k EoX budget to next capex plan | P3 | Awaiting customer | S. van Dijk |
| REQ0089345 | Cisco TAC guidance for ASA5506 replacement | P2 | Resolved | John Doe |
| INC0089042 | NTP time sync lost — RTP1C0M003 | P4 | Resolved | R. Jansen |
| INC0088765 | SNMP timeout — WKS-0231 | P4 | Closed | R. Jansen |
| INC0088701 | Host unavailable by ICMP ping — SWP2L1C002 | P2 | Resolved | John Doe |
(v1's CHG0041220 and INC0089256 were dropped to make the counts match the Figma.)

## Advisories page
Unlocked in v2. Same 14 Cisco advisories as v1; CVE-2025-20012 now has **1 vulnerable / 2 not vulnerable** (RTP1C0M001) so High CVEs = 2 devices.

## Uptime page
Unchanged series (Core 99.8 · Security 97.2 · Edge 99.5 · WLAN 99.1 · Services 100; generator `docs/tools/gen_uptime_chart.py`, seed 42).
Summary: 99.1% · 4/5 · 1 below target · **6h 5m** longest outage (v1 said 3h 12m, contradicting its own log) · 6 related incidents. Outage log: NTP row now Resolved, 4h 10min.

## Overlays
- **Summary drawer** ("Generate summary"): "2 decisions need your attention today" — approve REQ0089301, add €84k via REQ0089180.
- **Upgrade modal:** Essential (current, no Alarms) / **Standard** (Alarms included) / Enterprise; warning about the active core-router alarm; unlocks Alarms.
- **Chat:** Daan Herpers; greeting mentions the ASA5506 and the 2 cases awaiting you. **Notifications:** core router down · 2 cases awaiting you · weekly summary.

## Cross-page identifier matrix
| Thing | Appears on |
|---|---|
| ASA5506 ×2 / FWP1L0S01A1-2 / CVE-2024-20356 | Overview (Lifecycle, Advisories, Actions), Lifecycle, Devices, Alarms (#7, #14), Cases (REQ0089301, REQ0089345), Advisories, Uptime (Security), Summary, Chat |
| 23 / 4 / 17 lifecycle buckets | Overview, Lifecycle tiles + donut, Summary (23) |
| ISR4331/K9 ×4 / RTP1C0M001-4 | Overview PastEOSale tab, Lifecycle, Devices, Alarms (#3, #8), Cases (INC0089042), Advisories (CVE-2025-20012), Uptime |
| RPP1L2C001H1 core router | Overview (Cases, Alarms rows), Alarms #1, Cases INC0089412, Uptime log, Notifications, Upgrade modal, Summary |
| FPP1L0H0 / CVE-2024-20399 | Overview (Advisories, Cases, Alarms rows, Actions), Devices, Alarms #2, Cases INC0089388, Advisories, Uptime log |
| 2 open incidents / 4 open cases / 2 awaiting you | Overview Cases card, Cases page summary + tables, Notifications, Summary, Chat |
| €84k (+ ~€19k MR33 to quote) | Overview Actions, Lifecycle Est. investment + breakdown, Cases REQ0089180, Summary, Chat |
| 184 devices · 26 May 2026 14:32 | every page subtitle, Lifecycle donut, Summary date |

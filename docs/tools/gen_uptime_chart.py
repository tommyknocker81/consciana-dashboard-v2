#!/usr/bin/env python3
"""
Generates the three hand-rolled SVG line charts (7 / 30 / 90 days) used on the Uptime page.

How it was used in v1
---------------------
1. `python3 gen_uptime_chart.py > out.txt` prints three blocks, each starting with a
   `===== RANGE n =====` header followed by one `<svg class="ut-chart" data-range-chart="n" ...>` element
   (gridlines, 5 `<path class="ut-line <series>">`, `<circle class="ut-pt <series>" data-tip="...">` markers, x-axis labels).
2. The three <svg> blocks were pasted (via a Python `str.replace` on a unique marker, NOT by hand) inside
   `<div class="ut-chart-wrap">` in `index.html`. The 30d SVG is visible by default; 7d/90d carry the `hidden` attribute
   (CSS needs `.ut-chart[hidden]{display:none}`).
3. `script.js` ("Uptime page: range toggle + trend chart legend") only toggles which SVG is hidden and adds/removes
   the `series-hidden` class on `.ut-line.<series>` / `.ut-pt.<series>` for the legend chips.

Data model
----------
- Series: core, security, edge, wlan, services  (colours come from CSS: .ut-line.core etc., not from this script)
- Baselines: core 99.85, security 99.55, edge 99.5, wlan 99.05, services 99.97 with small random jitter (seed 42).
- Security ramps linearly down over the LAST 7 DAYS to 97.2 (the story: ASA5506 end-of-support problem).
- The final ("today") value of each series is forced to match the Overview page: 99.8 / 97.2 / 99.5 / 99.1 / 100.0.
- "Today" is hard-coded as 2026-05-26.

Geometry
--------
viewBox 800x260, margins L34 R10 T10 B24, y-domain 95.5..100.3, gridlines at 96..100.
Re-theming only needs CSS changes; re-run this script only if you change size, domain, density or data.
Marker density: every point for <=10 points, every 3rd for <=35, every 6th otherwise (last point always shown).
"""
import datetime
import random

random.seed(42)

W, H = 800, 260
ML, MR, MT, MB = 34, 10, 10, 24
PW = W - ML - MR
PH = H - MT - MB
YMIN, YMAX = 95.5, 100.3

SERIES = ["core", "security", "edge", "wlan", "services"]
LABELS = {"core": "Core", "security": "Security", "edge": "Edge", "wlan": "WLAN", "services": "Services"}
TODAY = datetime.date(2026, 5, 26)


def y_of(v):
    return MT + (YMAX - v) / (YMAX - YMIN) * PH


def x_of(i, n):
    return ML + (i / (n - 1)) * PW if n > 1 else ML


def make_series(n, base, noise, decline_days=0, decline_to=None):
    vals = [base + random.uniform(-noise, noise) for _ in range(n)]
    if decline_days and decline_to is not None:
        start_idx = n - decline_days
        start_val = vals[start_idx - 1] if start_idx > 0 else base
        for k in range(decline_days):
            idx = start_idx + k
            frac = (k + 1) / decline_days
            vals[idx] = start_val + (decline_to - start_val) * frac + random.uniform(-0.08, 0.08)
    return [max(YMIN + 0.1, min(YMAX - 0.1, v)) for v in vals]


def build_range(n, decline_days):
    data = {
        "core": make_series(n, 99.85, 0.12),
        "security": make_series(n, 99.55, 0.15, decline_days=decline_days, decline_to=97.2),
        "edge": make_series(n, 99.5, 0.1),
        "wlan": make_series(n, 99.05, 0.12),
        "services": make_series(n, 99.97, 0.05),
    }
    # force exact "today" values to match the Overview dashboard
    data["core"][-1] = 99.8
    data["security"][-1] = 97.2
    data["edge"][-1] = 99.5
    data["wlan"][-1] = 99.1
    data["services"][-1] = 100.0
    return data


# NOTE: order matters for reproducibility with the shipped HTML (7, then 30, then 90).
RANGES = {7: build_range(7, 7), 30: build_range(30, 7), 90: build_range(90, 7)}


def path_d(vals):
    n = len(vals)
    pts = [(x_of(i, n), y_of(v)) for i, v in enumerate(vals)]
    return "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def circles(vals, cls, label):
    n = len(vals)
    step = 1 if n <= 10 else (3 if n <= 35 else 6)
    out = []
    for i, v in enumerate(vals):
        if i % step != 0 and i != n - 1:
            continue
        date = TODAY - datetime.timedelta(days=(n - 1 - i))
        out.append(
            f'<circle class="ut-pt {cls}" cx="{x_of(i, n):.1f}" cy="{y_of(v):.1f}" r="2.6" '
            f'data-tip="{label} · {date.strftime("%d %b")}: {v:.1f}%"></circle>'
        )
    return "\n".join(out)


def gridlines():
    out = []
    for gy in [96, 97, 98, 99, 100]:
        y = y_of(gy)
        out.append(f'<line x1="{ML}" y1="{y:.1f}" x2="{W - MR}" y2="{y:.1f}" class="ut-grid"></line>')
        out.append(f'<text x="{ML - 6}" y="{y + 3:.1f}" class="ut-axis-label" text-anchor="end">{gy}%</text>')
    return "\n".join(out)


def xlabels(n):
    idxs = range(n) if n <= 7 else [round(i * (n - 1) / 5) for i in range(6)]
    out, seen = [], set()
    for i in idxs:
        if i in seen:
            continue
        seen.add(i)
        date = TODAY - datetime.timedelta(days=(n - 1 - i))
        out.append(f'<text x="{x_of(i, n):.1f}" y="{H - 6}" class="ut-axis-label" text-anchor="middle">{date.strftime("%d %b")}</text>')
    return "\n".join(out)


if __name__ == "__main__":
    for rng, data in RANGES.items():
        print(f"===== RANGE {rng} =====")
        print(f'<svg class="ut-chart" data-range-chart="{rng}" viewBox="0 0 {W} {H}" {"" if rng == 30 else "hidden"}>')
        print('<g class="ut-grid-group">')
        print(gridlines())
        print("</g>")
        for s in SERIES:
            print(f'<path class="ut-line {s}" d="{path_d(data[s])}"></path>')
        for s in SERIES:
            print(circles(data[s], s, LABELS[s]))
        print(f'<g class="ut-xlabels">{xlabels(len(data["core"]))}</g>')
        print("</svg>\n")

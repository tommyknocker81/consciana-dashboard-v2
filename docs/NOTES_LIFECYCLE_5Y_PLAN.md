# Notes — lifecycle budgeting feedback (2026-10-08)

Source: conversation with a colleague who works closely with clients. Discussion only; nothing built yet.

## What we heard
- 3/6/9-month horizons are too short to act on and budget for.
- They give clients a **5-year plan**, so that clients can budget the equipment for each year and sometimes bring purchases forward to get better financial outcomes.
- Today this is an **Excel sheet** listing every device with its expected or exact end-of-life date, imported manually from the device application (which could be integrated via API).
- Estimating a future end of life differs by device type (for example, a phone vs a switch).
- Prices: they use the vendor's price, but check whether it still includes everything it did before or whether parts must now be bought separately.
- For devices with no price yet, they estimate one manually. Even with a known replacement price, a replacement due in 3 years gets an estimated *future* price.
- The client gets price estimates per year, refreshed every year; they get more accurate as each year approaches (for example, 2030 is estimated at €3M in 2026 but could be €4M in 2029).
- The estimates are manual know-how; they can't be replaced by "number of devices × price".

## Goal of the discussion
Make preparing the sheet more effective (an internal team application) and offer the result to clients in the customer portal.

## Follow-up answers (2026-10-08)
1. **The sheet:** no formulas. A fixed first column lists the devices grouped by category (Core, WLAN, …). There is one column per year, and each year cell holds a quantity and an estimated price. Totals per year and per category are at the bottom or end.
2. **Updates:** once a year, by the individual account manager who owns the client.
3. **Client visibility:** clients see per-device prices.
4. **Scope:** hardware only today, but it would be useful to include other items too, such as services.
5. **Data source:** the in-house app has an API.

## Built (2026-10-08)
The portal view "5-year plan" is in the v2 prototype (see the V2_PLAN decision log). The internal account-manager editor is not built yet; it would be the same grid, made editable and pre-filled from the in-house app's API.

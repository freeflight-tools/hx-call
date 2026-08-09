# Background

Research notes behind `hx/data.js`. Not loaded into context automatically —
read it when working on the data or the rules.

## What HX means

An airspace marked HX has no fixed operating hours and can be activated at
30 minutes' notice or less. VFR RAC 4-0-0-1 §0.2.2 says the status may be
obtained from the responsible ATS unit, a designated frequency, **a telephone
number**, or an ATIS where one exists — and that if you can't obtain it, or
don't check, the airspace counts as active.

§0.2.3 then requires a continuous listening watch on the frequency the status
was requested on, so you learn about short-term changes. A phone tape isn't a
frequency you can monitor, so a call alone doesn't strictly satisfy this. Two
places have a negotiated substitute, and they're the model for the re-check
clock in the app:

- **Meiringen** — call the tape again by the next scheduled broadcast
  (07:30 / 13:15 / 17:05).
- **Bern** — re-query the ATIS number every 15 minutes.

Everything else defaults to 30 minutes in the app, matching the activation
notice period. That's our conservative choice, not a published rule.

Worth telling other pilots: a **receive-only airband scanner** needs no licence
and weighs ~100 g. It's the properly compliant option; the phone is the
fallback for people who don't carry one.

## Which airspaces are HX

From the SHV/FSVL *Luftraumbroschüre 2026* (March 2026), the authoritative
pilot-facing source:

CTRs and TMAs of **Bern, Buochs, Dübendorf, Emmen, Grenchen, Les Eplatures,
Locarno, Lugano, Meiringen, Payerne, St. Gallen**; the CTRs (without TMA) of
**Alpnach and Sion**; the Basel south approach sectors **T1–T3**; and the
Zürich TMA sectors **S1–S3**.

The remaining temporary TMAs of Alpnach and Sion are activated by NOTAM/DABS,
not by phone. They were deliberately **removed** from the dataset — every
flight computer already downloads airspace with NOTAM activation times, so
they were noise.

## Provenance of each number

All five are **unverified**. Verify against the aerodrome's AD INFO page in the
current eVFR Manual before relying on any of them.

| Zone | Number | Source |
|---|---|---|
| Meiringen CTR + TMA 1–6 | 0800 496 347 | SHV Sonderregelung Meiringen (valid from 21.03.2024). Mnemonic 0800-HX-MEIR. Fallbacks 058 461 67 06 (Flugdienstleiter), 058 461 64 64 (Zentrale). Radio 130.150. |
| Emmen CTR 1/2 + TMA, Buochs CTR, Alpnach CTR | 041 620 91 06 | LSZC AD INFO §10.5.1. INFO transmission H24, radio 134.130. One call covers all four. |
| Bern CTR + TMA sectors | 022 417 40 76 | SHV, procedure valid from 19.03.2026. ATIS, radio 125.130. |
| Basel TMA Tango T1–T3 | 061 325 34 67 | Luftraumbroschüre 2026. Tape also on 134.680. |
| Zürich TMA Sierra S1–S3 | 043 816 22 95 | Luftraumbroschüre 2026. |

Note the Basel info frequency moved from 134.675 to 134.680 at some point, and
Emmen TWR from 120.425 to 118.000 in March 2023 — figures in older PDFs are
stale. Frequencies are no longer displayed in the app (the flight computer
already shows them, and the target user has no radio), but they matter when
verifying a number against a source.

### Still missing

Payerne, Dübendorf, Sion, Locarno, Lugano, St. Gallen-Altenrhein, Grenchen,
Les Eplatures. Not published on the open web. They're in the AD INFO pages of
the eVFR Manual — subscription at skybriefing.com, around CHF 49/yr. That
subscription is the single highest-value purchase for this project: it fills
the gaps *and* verifies the five above.

## Circle geometry

Each entry is a centre and a radius, not a polygon. Rationale: a false positive
costs one extra entry on screen, a false negative costs a violation. So the
radii are generous and the sort is by distance to the circle *edge*.

Distances use an equirectangular approximation with a cached `cos(lat)`, not
haversine. Measured worst-case drift across Swiss test points is **0.5%** —
about 130 m on a 26 km radius, far below the error already inherent in
approximating a TMA as a circle, and much cheaper to compute.

SHV publishes real geometry at `airspace.shv-fsvl.ch/api/v2/geojson/airspaces`
with an `HX: true` flag per feature, plus `Callsign`, `Frequency` and
`AdditionalInfos`. It has no phone number field. If this project ever needs
real polygons, that's the source — but it would mean a build step and a much
larger payload, which is why it wasn't used.

## Prior art — live status tools

Two projects already show live status for some zones by reading the ATIS. This
reframes what HX Call is for: not competing with them, but covering the eleven
zones they don't, and working with no connectivity. See `docs/next-session.md`
for the open investigation.

**bern.pdcs.ch** — Lukas Buchs, Para-Deltaclub Stockhorn, published 13 April
2026. Loads the latest Bern ATIS automatically and colours the airspaces.
`/xct.html` is the XCTrack widget: two small badges, `W` and `E`, for the west
approach (TMA 4) and east approach (TMA 6), overlaid on the map top-right. It
polls Skyguide once per minute, turns red after 4 minutes without a connection,
and auto-hides when you aren't near Bern. Same author wrote the widely used
windspion XCTrack widget, whose URL conventions (`?size=0`, `&mode=dark`,
refresh rate 0) this project copied.

**pgairspace.ch "HX Monitor"** — built by a friend of this repo's owner. Covers
Bern and Meiringen. `?area=<area>`, `&sub=ctr,t1,t2` to filter sub-areas, and
`&transcript=[hide|only]`. It displays a **transcript** of the broadcast and
recommends keeping it visible so the pilot can verify. That word implies
speech-to-text over audio rather than a data feed — the `lszb-atc` GitHub org
publishes ATC audio streams from Bern-Belp including an ATIS channel, which is
a plausible input. The guide suggests running two widgets, one `hide` and one
`only`, to give the transcript a horizontal panel.

Both require a data connection, and Lukas states plainly that his data is
informational only and must not be used to decide entry or to monitor status in
flight — the radio or the phone remains the sanctioned channel. That is exactly
the gap HX Call fills.

## Other leads

**SHV airspace DB** (dominik@airriders.ch) — a `Phone` field there, or the
numbers in the existing `AdditionalInfos`, would benefit every Swiss tool at
once and be maintained officially. Higher leverage than this widget alone.

**SHV airspace commission** (luftraum@shv-fsvl.ch) — worth their sign-off
before publishing. Safety-relevant data with a wrong number is worse than no
tool, and their blessing is what makes other pilots trust it.

**burnair** — used to display these numbers and removed them. Parked for now.

## XCTrack integration notes

`XCTrack.getLocation()` is available in the Web page widget when *"Allow web
page to access XCTrack data"* is enabled. It's a **pull** API returning a JSON
string (or `"null"`), with an `isValid` field — hence polling rather than a
callback.

The widget also substitutes `${lat}` and `${lng}` into the configured URL, which
works even with the JS interface off. An unsubstituted placeholder arrives as
the literal `${lat}`, parses to NaN, and is ignored so the app falls through to
the next position source rather than showing a wrong position.

Two settings pilots get wrong: *Allow tapping on the web page when locked* must
be ON or the call button can't be pressed in flight, and refresh rate should be
0 with the JS interface (60–120 s with placeholders).

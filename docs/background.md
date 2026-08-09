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

One of the five is confirmed; the other four are **unverified**. Confirm a
number either against the aerodrome's AD INFO page in the current eVFR Manual,
or by calling it and reaching the right recorded status line — the call is the
weaker evidence of which number is official, and the stronger evidence that it
still works. Record which was done, and when.

| Zone | Number | Source |
|---|---|---|
| Meiringen CTR + TMA 1–6 | 0800 496 347 | SHV Sonderregelung Meiringen (valid from 21.03.2024). Mnemonic 0800-HX-MEIR. Fallbacks 058 461 67 06 (Flugdienstleiter), 058 461 64 64 (Zentrale). Radio 130.150. |
| Emmen CTR 1/2 + TMA, Buochs CTR, Alpnach CTR | 041 620 91 06 | LSZC AD INFO §10.5.1. INFO transmission H24, radio 134.130. One call covers all four. |
| Bern CTR + TMA sectors | 022 417 40 76 | SHV, procedure valid from 19.03.2026. ATIS, radio 125.130. |
| Basel TMA Tango T1–T3 | 061 325 34 67 | Luftraumbroschüre 2026. Tape also on 134.680. |
| Zürich TMA Sierra S1–S3 | 043 816 22 95 | Luftraumbroschüre 2026. **Confirmed by call, 09.08.2026** — reached the recorded status line. First verified entry. |
| Locarno CTR + TMA | 091 816 17 44 | SHV *TMA Locarno Statusinfo*, 14.07.2016 upd. 22.07.2019. Named there as the **only legally binding** source together with ATIS 133.450. Six years old — recheck. |
| Sion CTR | 022 417 40 80 | Sion Airport pilot info page, 09.08.2026, listed as the ATIS phone beside ATIS 130.630. CTR only; the Sion TMAs are TEMPO. |
| Grenchen CTR + TMA | 032 396 69 00 | Delta Club Weissenstein airspace page, 09.08.2026. **The tower, not a tape** — a controller answers, and entering an active CTR needs a clearance they may refuse. Radio 120.105. |

Note the Basel info frequency moved from 134.675 to 134.680 at some point, and
Emmen TWR from 120.425 to 118.000 in March 2023 — figures in older PDFs are
stale. Frequencies are no longer displayed in the app (the flight computer
already shows them, and the target user has no radio), but they matter when
verifying a number against a source.

### Still missing

Payerne, Dübendorf, Lugano, St. Gallen-Altenrhein, Les Eplatures — five of the
original eight, after the search of 09.08.2026 turned up Locarno, Sion and
Grenchen. The remainder are in the AD INFO pages of the eVFR Manual —
subscription at skybriefing.com, around CHF 49/yr. That subscription is still
the single highest-value purchase for this project: it fills the gaps *and*
verifies everything above.

**Payerne and Dübendorf are military** (LSMP, LSMD), so nothing is likely to
appear on the open web at all; the eVFR Manual or a direct call to the
aerodrome are the realistic routes.

**Skyguide runs a bank of ATIS-by-phone numbers on `022 417 40 xx`** — Bern is
`…76`, Sion `…80`. Lugano and St. Gallen-Altenrhein are Skyguide aerodromes and
plausibly sit in the same block, but no published list of it was found, and
guessing the last two digits of a safety-critical number is not acceptable.
Someone with the eVFR Manual can read them off in a minute.

Where the search looked, so nobody repeats it: SHV's `CTRTMA` document folder
(no directory listing, and guessed filenames for the other zones all 404),
club airspace pages, the aerodrome operators' own pilot pages, and general web
search in German, French and Italian.

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

Two projects already show live status for some zones. This reframes what HX
Call is for: not competing with them, but covering the eleven zones they don't,
and working with no connectivity.

Both require a data connection, and Lukas states plainly that his data is
informational only and must not be used to decide entry or to monitor status in
flight — the radio or the phone remains the sanctioned channel. That is exactly
the gap HX Call fills.

### How they actually work

Investigated 9 August 2026 by fetching the pages, their JS and their endpoints
directly. Both frontends are readable — no browser automation was needed. A
dozen requests total, no polling.

**bern.pdcs.ch** — Lukas Buchs, Para-Deltaclub Stockhorn, published 13 April
2026. Hand-written vanilla JS, no framework, unminified. `/` is a Leaflet map
(swisstopo grey tiles, airspace polygons from a local `resources/airspace.kml`,
plus live OGN traffic via `js/ogn.js`). `/xct.html` is the XCTrack widget: two
divs, `W` and `E`, and `js/xct.js`.

Single data call, **same-origin**: `fetch('php/Atis.php')`, and `?r=0` in the
widget to suppress the `raw` field. Response:

```json
{"success":true,
 "atis":{"letter":"PAPA","runway_number":32,"transition_level":70,
         "clearance_delivery_active":false,"temperature":34,"dewpoint":7,"qnh":1017,
         "airspace":{"ctr":{"isActive":true,"lower_ft":"GND","upper_ft":5500,
                            "lower_mt":"GND","upper_mt":1700},
                     "tma1":…,"tma2":…,"tma3":…,"tma4":…,"tma5":…,"tma6":…,
                     "lsr82":…},
         "time_of_generation":"2026-08-09T11:50:05+00:00"},
 "raw":"…","lastModified":"2026-08-09T11:51:18+00:00"}
```

The `raw` field is the full ATIS text, and it is **clean prose** — correct
capitalisation and punctuation, with its own generation timestamp and a
separate `lastModified`. That is an official text/digital ATIS document, not
speech-to-text. All parsing happens server-side in the PHP, so the upstream
host is not visible from outside; only Lukas can say what it is.

Its fail-safe logic is worth copying verbatim, because it fails **active**, not
just red:

```js
atisIsCurrent    = age(time_of_generation) < 35 min
loadTimeIsCurrent = age(last successful fetch) < 4 min
isActive = !atisIsCurrent || !loadTimeIsCurrent || (zone.isActive ?? null) !== false
```

Anything other than an explicit fresh `false` renders as active. The 4-minute
rule is not cosmetic — after 4 minutes offline every zone goes back to active.

The widget's auto-hide is a 9-point polygon around Bern with a ray-cast test
against `XCTrack.getLocation()`. Outside it, `body` gets `.not-near` and the
fetch is skipped — but only after it has data once; until then it retries every
5 s. Same author wrote the widely used windspion XCTrack widget, whose URL
conventions (`?size=0`, `&mode=dark`, refresh rate 0) this project copied.

**pgairspace.ch "HX Monitor"** — built by a friend of this repo's owner. A
Vite/React SPA with runtime config in `/config.js`:

```js
window.RUNTIME_CONFIG = {
  API_BASE_URL: 'https://api.pgairspace.ch',
  AIRPSACES_JSON_URL: 'https://airspace.shv-fsvl.ch/api/v1/geojson/airspaces',
  PRE_FILTER_GEO_JSON: true }
```

so it draws SHV's own polygons (v1 of the same API noted under *Circle
geometry*), filtered client-side to `["Meiringen","Bern"]`. Three REST
endpoints on a **separate public API host**:

| Endpoint | Returns |
|---|---|
| `GET /api/v1/areas` | all areas with per-sub-area `active` |
| `GET /api/v1/areas/{name}` | one area, same shape |
| `GET /api/v1/transcripts/{name}/latest` | `{date, transcript}` |

plus `wss://api.pgairspace.ch/ws`, which pushes `{"update":"<area>"}` and makes
the client refetch (reconnect after 5 s). There is also a 30 s poll, but only
while some area is past its `next_action`.

An area looks like this:

```json
{"name":"bern","retrieval_type":"radio","radio_frequency":"125.125 MHz",
 "is_stale":false,"last_action":"2026-08-09T12:12:00.953Z",
 "next_action":"2026-08-09T12:17:00.947Z","last_action_success":true,
 "last_error":"","num_errors":0,"flight_operating_hours":null,
 "sub_areas":[{"name":"bern-tma-4","full_name":"TMA Bern 4 HX",
               "active":false,"pending_activation":false}, …]}
```

**`retrieval_type` is the finding of this whole investigation.** Bern is
`"radio"` — an SDR listening on the ATIS frequency. Meiringen is `"call"`: the
backend **dials the phone tape** and transcribes it. The transcripts confirm
it, errors and all:

> *Bern:* "This is burn information papa at 1150. RNT approach Zulu tree two
> one way in use tree two transition level seven zero CPR is active TMA1 235
> and 6 R active TMA4 is not active…"

> *Meiringen:* "Admiring and CTR and PMA are not active. Expect CTR and TMA my
> ring and to be active again on the 18th of August 2026 from 7:30 local time.
> If you hear this message on the 18th of August 2026 after 7:30, local time
> contact, the Chiefs flight operations, my ringham from 058461 67, 06…"

"Meiringen" comes out as *Admiring*, *my ring and*, *my ringham*; "CTR" as
*CPR*. The interpreter still got the activation states right, but this is
exactly why the guide insists the pilot keeps the transcript visible.

Note the polling cadences differ by cost: Bern (radio, free) every **5
minutes**; Meiringen (a real phone call) is scheduled from what the tape itself
said — read 22 July, next call queued for **17 August 05:45Z**, the morning
before the announced reactivation.

Its widget takes `?area=bern`, `&sub=ctr,t1,t2`, `&transcript=[hide|only]`; the
guide suggests two widgets, one `hide` and one `only`, to give the transcript a
horizontal panel.

Every response carries `"disclaimer": "Use of this data subject to agreement;
https://pgairspace.ch/disclaimer.html"`. That page: experimental service, fully
automated transcription and interpretation, no guarantee of accuracy, users
waive claims, verify via official sources. Consuming the API means accepting
that **and passing it on to pilots**.

### The four questions, answered

**Same-origin or proxied?** Different answers. `bern.pdcs.ch` proxies
server-side through its own PHP — consistent with the guess that the subdomain
exists to host that proxy. `pgairspace.ch` does not: `api.pgairspace.ch` is a
deliberate public API, separate host, documented-looking paths.

**CORS?** A request to `bern.pdcs.ch/php/Atis.php` with
`Origin: https://elgandoz.github.io` came back with **no**
`access-control-allow-origin` header — a browser on GitHub Pages cannot read
it. Every `api.pgairspace.ch` endpoint returns **`access-control-allow-origin:
*`**, so a static page can call it directly with no server of our own.

**Token?** Neither. Both served full data to an unauthenticated `curl` with no
cookie, no key, no `Referer`. Nothing to reuse, nothing to leak — but also
nothing stopping either author from adding one.

**What does the ATIS actually say?** Bern, 9 August 2026 11:50Z, verbatim from
`raw`:

```
THIS IS BERN INFORMATION PAPA, AT 1150.
RNP APPROACH ZULU 32, RUNWAY IN USE 32.
TRANSITION LEVEL: 70.
CTR IS ACTIVE. TMA 1, 2, 3, 5 AND 6 ARE ACTIVE. TMA 4 IS NOT ACTIVE.
BERN CLEARANCE DELIVERY: NOT ACTIVE.
WIND: 310 DEGREES, 10 KNOTS. CAVOK.
TEMPERATURE 34. DEWPOINT 7. QNH 1017.
BERN INFORMATION PAPA.
```

One line out of eleven carries the airspace status, and it collapses a list of
sectors into one sentence. Both projects reduce it to a per-sector boolean; the
fragile part is exactly that sentence, and it is markedly more fragile when it
arrives via speech-to-text.

**Does anything equivalent exist for the other zones?** Not yet — but
`retrieval_type: "call"` proves the pipeline does not need a radio receiver.
Anything with a tape and a number is a candidate, which is the entire HX Call
dataset. **Emmen/Buochs/Alpnach is the strongest one**: 041 620 91 06 covers
four airspaces in one call and transmits H24. The blockers are not technical —
whether the backend accepts new areas, who pays for and is comfortable with an
automated system dialling an operational (and in Meiringen's and Emmen's case,
military) line on a schedule, and how often you may call before it's rude. Ask
before assuming.

### Loose ends noticed on the way

- pgairspace listens to Bern on **125.125 MHz**; SHV and `hx/data.js` say the
  ATIS is on **125.130**. One of them is stale. It doesn't affect the phone
  number, but check which is current when verifying Bern against AD INFO.
- `bern.pdcs.ch` also tracks **LSR 82**, a temporary restricted area not in our
  dataset — it shows and hides the polygon by ATIS state.
- The `lszb-atc` GitHub org (ATC audio from Bern-Belp) was the guessed input
  for pdcs. It isn't: pdcs consumes clean text. It may still be relevant to
  anyone building a receiver.

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

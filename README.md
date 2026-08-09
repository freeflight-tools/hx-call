# HX Call

Phone numbers for Swiss **HX** airspaces, sorted by how close you are to them.

HX means an airspace has no fixed operating hours and can be activated at 30 minutes' notice. You're allowed to check its status by phone, which is useful if you don't carry a VHF radio. This finds the right number for where you are and gives you one button to call it.

**It is not an airspace tool.** No map, no boundaries, no altitudes — your flight computer already has those. If you can't confirm a status, the airspace is active.

**→ [elgandoz.github.io/hx-call](https://elgandoz.github.io/hx-call/)**

## Two versions

| | |
|---|---|
| **`widget.html`** | Compact grid of call buttons on a transparent background, for the XCTrack Web page widget. Shows nothing at all when nothing is in range. |
| **`app.html`** | Full page: names, landmarks, notes, re-check state, settings. For planning, and for anyone not using XCTrack. |
| **`index.html`** | Pick a version, configure it, then copy the URL or scan it off the screen with your phone. |

Both are driven by the same engine, so a change to the data or the logic lands in both.

```
index.html      launcher + config builder
app.html        standalone view   (layout inline)
widget.html     widget view       (layout inline)
hx/data.js      the zones          ← edit this
hx/core.js      config, position, ranking, re-check clock
hx/base.css     colour tokens, light/dark, shared primitives
hx/qr.js        QR encoder, launcher page only — never loaded in flight
hx/offline.js   registers the service worker, failures ignored on purpose
sw.js           precaches everything so the list works with no signal
```

No dependencies, no build step, no network at runtime. Any static host: GitHub Pages, Netlify, or a local file.

## XCTrack setup

Add a **Web page** widget and paste the URL from `index.html` — configure it
there first, then either copy the URL or scan the QR code with the phone you fly
with, which saves typing a long URL on a small screen. Then:

| Setting | Value | Why |
|---|---|---|
| Allow web page to access XCTrack data | **ON** | This is what gives it your position |
| Allow tapping on the web page when locked | **ON** | Otherwise you can't press the call button in flight |
| Disable unlocking | ON | Stops a stray swipe rearranging it |
| Refresh rate | **0** | The page updates itself |

If you leave *Allow web page to access XCTrack data* off, use placeholders instead and set the refresh rate to 60–120 s:

```
widget.html?lat=${lat}&lng=${lng}&max=3
```

## Standalone

Open `app.html` in any browser and allow location when asked. Needs `https://`. Settings are in the sheet at the bottom of the page; they're saved and also written into the URL so you can share your setup.

### On your phone

Open the app and add it to the home screen — *Share → Add to Home Screen* on iOS, *⋮ → Add to Home screen* on Android. It launches full screen, without browser chrome, straight into the list.

**It then works with no signal.** Everything is cached on first visit, so the numbers are there at 3000 m with no data connection, which is the point. Corrections still reach you: the cached copy is shown immediately and a fresh one is fetched in the background for next time, so an updated number arrives on the following launch rather than never.

The widget caches itself the same way, though whether XCTrack's WebView allows it is untested — if it doesn't, the widget behaves exactly as before, online only. Offline is an enhancement here, never something the phone list depends on.

## Parameters

Identical for both pages, and identical to the settings UI — the fields are generated from the same spec.

| Parameter | Default | |
|---|---|---|
| `max=N` | `4` | At most this many of the matching zones are listed |
| `range=KM` | `10` | Hide zones further than this |
| `refresh=SEC` | `60` | Seconds between position updates, 5–900 |
| `size=N` | `0` | Text scale, 0–100 (%) |
| `theme=` | `auto` | `auto` follows the phone, or `dark` / `light` |
| `nonum=` | `0` | `1` also shows zones whose number isn't known yet |

Position, if you want to supply it yourself:

| Parameter | |
|---|---|
| `lat=` `lng=` | Also accepts `lon`, `long`, `latitude`, `longitude` |
| `at=LAT,LON` | Same, one parameter |
| `pin=LAT,LON` | Fixed position. Overrides everything, shown as **PINNED** in amber |

**Priority:** `pin` → XCTrack → `lat`/`lng` → browser geolocation.
**Config precedence:** URL parameter → saved setting → default.

An unsubstituted placeholder (the literal `${lat}`) is ignored rather than misread, so a misconfigured widget falls through to the next position source instead of showing a wrong position.

## Reading it

One entry is one phone call — zones sharing a number appear once.

Distance is to the **edge** of the zone, not its centre. In the widget: `0` means you're laterally inside, one decimal below 1 km, whole km above. The full page says `INSIDE` and adds a bearing.

Colour on the left edge: blue = not checked, green = checked and still valid, amber = re-check due, grey = no number on file.

Tapping a number starts the re-check clock. Meiringen follows its tape schedule (07:30 / 13:15 / 17:05), Bern is 15 minutes, the rest default to 30. This matters — VFR RAC 4-0-0-1 §0.2.3 expects you to stay informed of status changes, not just check once.

**unverified** means nobody has confirmed the number yet — neither against the current eVFR Manual nor by ringing it. Do one of those before relying on it.

Zones with **no number on file** are hidden by default: this is a speed-dial, and a zone you can't ring is a button that does nothing. They are still in the data, and `nonum=1` shows them.

Turn it on if you want them, but either way **read the airspace off your flight computer, not off this list**. Eight of the thirteen entries have no number yet, so by default the list is silent about most Swiss HX airspace. An empty screen here means "nothing to dial", never "no HX here".

Two behaviours worth knowing:

- The full page always keeps the nearest zone visible even outside `range`, because a blank page reads as broken. The widget doesn't — an empty transparent panel is the correct output there.
- When the fix is coarser than ±2 km the limits are ignored and everything is shown, because the ranking can't be trusted.

## Running it locally

Static files, no build step. Don't open them via `file://` — browsers block
geolocation there.

    python3 -m http.server 8080     # then http://localhost:8080

For testing on a phone or in XCTrack you need https (a LAN IP won't do):
publish to GitHub Pages, or tunnel with
`cloudflared tunnel --url http://localhost:8080`.

## Editing the data

Everything is in `hx/data.js`, one object per entry, documented at the top of the file.

The circles are **deliberately generous**. An extra entry on screen costs nothing; a missing one costs a violation. They are not airspace boundaries and must never be used as such.

Leave `v:false` on anything you add. It is set only after the number has been confirmed — against the aerodrome's AD INFO page in the eVFR Manual, or by ringing it and reaching the right recorded status line. Note which, and the date, in `src`.

## Missing numbers

Payerne, Dübendorf, Sion, Locarno, Lugano, St. Gallen, Grenchen and Les Eplatures are HX but their numbers aren't published openly — they're in the AD INFO pages of the eVFR Manual.

## Contributing

Found a wrong number, a missing zone, or a bug? [Open an issue](https://github.com/elgandoz/hx-call/issues), or send a pull request directly. Corrections to `hx/data.js` are the most useful kind — one entry per commit, with the source and the date you checked it.

The aim is for the data to be community maintained. Numbers are the exception: send them in with `v:false` and a source, and the maintainer confirms each one before it ships as verified. Nobody has to take an unchecked number on trust.

## Built with AI

Most of the code here was written by an AI assistant, under human direction and review. The phone numbers are a separate matter: each one lists the source it came from, and any number nobody has confirmed yet is tagged **unverified** in the app. Judge the data on its sources, not on how the code was written.

## Disclaimer

Unofficial. No warranty. Only the official publications (eVFR Manual, glider chart, DABS, NOTAM) have legal validity. You are responsible for your own flight preparation.

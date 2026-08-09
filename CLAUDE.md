# HX Call

Phone directory for Swiss HX airspaces. A pilot in flight taps one button to
call the recorded line that says whether a CTR/TMA is active. Two views share
one engine: `widget.html` (XCTrack web widget) and `app.html` (standalone).

**Who it's for.** Swiss XC paraglider pilots who don't carry a VHF radio —
which is most of them. HX airspaces legally allow a phone check of their status
(VFR RAC 4-0-0-1 §0.2.2), and that is the only channel available to a pilot
without a radio licence. Meant to be shared with other pilots, not private.

**Conditions of use.** In the air, one-handed, in gloves, in bright sunlight,
on a small screen, often with no data connection. Every design decision comes
back to that: big tap targets, few results, no scrolling, no network, minimal
battery draw. It exists to save one specific action — finding and dialling the
right number fast — and should never grow into a general airspace app.

- `docs/background.md` — sources, provenance of every number, prior art.
  Read before touching `hx/data.js`.
- `docs/next-session.md` — the current investigation task, if one is open.

## Where this fits

Two other projects already show **live** status for some zones by reading the
ATIS, which is strictly better than a phone number where it works:
`bern.pdcs.ch` (Bern) and `pgairspace.ch` "HX Monitor" (Bern, Meiringen —
built by a friend of the owner). Both need a data connection.

HX Call's distinct value is therefore: **the eleven zones nobody has
automated**, and **working with no connectivity at all**. Treat those two as
the product. Don't try to out-compete the live-status tools; if anything, link
to them.

## Safety rules — do not relax these

- **The circles in `hx/data.js` are not airspace boundaries.** They are
  deliberately oversized triage radii. Never tighten one to "improve accuracy",
  and never present them as boundaries. An extra entry on screen costs nothing;
  a missing one costs an airspace violation.
- **Never delete a zone that has no phone number.** They stay in `hx/data.js`
  and render as "no number on file" when shown. `nonum` decides whether they
  are displayed; it defaults to 0, because a button that can't be dialled
  misses the point of a speed-dial and the airspace reference is the map.
  That default is a deliberate trade: it means the list is silent about eight
  of thirteen zones, so the pages must never imply the list is a survey of
  what is nearby. Deleting the entries would foreclose the choice entirely.
- **Never set `v:true`** on a zone unless the number has actually been
  confirmed — either against that aerodrome's AD INFO page in the current eVFR
  Manual, or by calling it and reaching the right recorded status line. A call
  is the weaker source for *which* number is official and the stronger one for
  whether it works today. Record which was done, and the date, in `src`.
  `v:false` renders a red "unverified" tag. That tag is the point: a number
  copied from a secondary source is not verified, however plausible it looks.
- **Keep the "if you can't confirm the status, the airspace is active" line**
  visible in `app.html`. It is the legal default under VFR RAC 4-0-0-1 §0.2.2.
- The re-check clock is not a nicety. §0.2.3 expects continuous awareness of
  status changes, not one check. Meiringen follows its tape schedule, Bern is
  15 min, others default to 30. Don't lengthen these.
- **Any live-status feature is an optional enhancement layer, never a
  dependency.** If a zone's live status can't be fetched, its phone entry must
  still render exactly as it does today. Stale live data must announce itself
  (bern.pdcs.ch goes red after 4 minutes without a connection — copy that), and
  must never suppress the phone number.

## Technical constraints

- **Offline is served by `sw.js`, and it is an enhancement, not a dependency.**
  Registration lives in `hx/offline.js` and swallows every failure, because an
  old WebView without service workers must still get a working list. The
  strategy is stale-while-revalidate on purpose: cache-first would mean a
  corrected phone number could never reach a pilot who already has the page.
  Entries are keyed on the path, not the full URL, or XCTrack's `?lat=…&lng=…`
  reloads would miss the cache every time. Bump `CACHE` when the file list
  changes.
- **No dependencies, no build step, and the phone list works with no network.**
  It runs offline at 3000 m on a phone with no signal. Adding npm, a bundler or
  a CDN import defeats the design. Any geo library costs more than the ~20 lines
  of maths it would replace.
- **`hx/core.js` touches no DOM and renders nothing.** It hands pages a state
  object; pages only draw. This is what keeps the two views from drifting.
- **`HX.SPEC` is the single source of truth** for URL parameters *and* the
  settings UI in both `app.html` and `index.html`. Add a parameter there and it
  appears everywhere, already clamped. Never hand-write a settings field.
  `only:"widget"` marks one that applies to a single view: `app.html` skips it
  rather than showing a dead control, while the launcher keeps showing it
  because that is where widget URLs are built. Anything reading `HX.SPEC` to
  populate fields must tolerate a missing element.
- **The widget's `<body>` must stay unpainted.** XCTrack renders a white or
  absent background as transparent so the widget floats over the map. Every
  chip carries its own background. Don't add a body background.
- **The widget renders nothing when nothing is in range** (`keepNearest:false`).
  An empty transparent panel is correct output there. `app.html` keeps the
  nearest entry instead, because a blank page reads as broken.
- **Minimise DOM writes.** Elements are built once and reused; each update
  writes only text nodes whose value changed, and reorders only when the sort
  order changed. A stationary pilot should cause zero writes.
- Default position poll is 60 s. Don't lower it — battery matters more than
  freshness for data that changes on a 15–30 minute cycle.
- `localStorage` is always accessed through the guarded wrapper in `core.js`.
  It is load-bearing: with `${lat}/${lng}` substitution XCTrack reloads the
  whole page periodically, and this is what carries the re-check clock across.
- Plain ES5-compatible JS, no modules, no transpilation. Old Android WebViews.

## Open threads

1. **Eight numbers are missing** — Payerne, Dübendorf, Sion, Locarno, Lugano,
   St. Gallen, Grenchen, Les Eplatures. They live in the AD INFO pages of the
   eVFR Manual (skybriefing, ~CHF 49/yr). Not on the open web.
2. **Four of the five numbers are unverified.** Zürich S1–S3 was confirmed by
   call on 09.08.2026; Meiringen, Emmen/Buochs/Alpnach, Bern and Basel still
   need confirming. The owner checks numbers personally — the long-term aim is
   that the rest of the data is community maintained, with contributed numbers
   arriving `v:false` and only being marked verified after that check.
3. **Untested on device: does XCTrack's WebView honour `tel:` links?** Some
   Android WebViews swallow non-http schemes. If it fails, the standalone page
   becomes the workaround and it's worth reporting to the XCTrack devs.
4. **Live status.** See `docs/next-session.md`. Ask the friend who built
   pgairspace.ch before reverse-engineering anything.
5. **Upstream the data** to the SHV airspace DB (dominik@airriders.ch) rather
   than maintaining it alone, and check with luftraum@shv-fsvl.ch before
   publishing. Neither contacted yet.

## Running it locally

Pure static files, so any web server works. Do **not** open the pages via
`file://` — browsers refuse geolocation there, so `app.html` can't get a fix.

    cd hx-call && python3 -m http.server 8080     # then http://localhost:8080

`localhost` counts as a secure context, so geolocation works. Any equivalent is
fine (`npx serve`, `php -S localhost:8080`).

Testing on the phone or in XCTrack is different: a LAN address like
`http://192.168.x.x:8080` is **not** a secure context, so geolocation is
blocked there. Either publish to GitHub Pages (the real target anyway) or open
a temporary https tunnel, e.g. `cloudflared tunnel --url http://localhost:8080`.

There is nothing to build, install or watch. Reload the page.

## Conventions

- Data edits go in `hx/data.js` only. One entry per commit, with the source and
  the date checked.
- `sn` (widget short name) stays under ~14 characters.
- The README is written for pilots, not developers. Keep it scannable.

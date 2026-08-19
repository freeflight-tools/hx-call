# HX Call

Phone directory for Swiss HX airspaces. A pilot in flight taps one button to
call the recorded line that says whether a CTR/TMA is active. Two views share
one engine: `widget.html` (XCTrack web widget) and `app.html` (standalone).

**Who it's for.** Swiss XC paraglider pilots who don't carry a VHF radio,
which is most of them. HX airspaces legally allow a phone check of their status
(VFR RAC 4-0-0-1 §0.2.2), and that is the only channel available to a pilot
without a radio licence. Meant to be shared with other pilots, not private.

**Conditions of use.** In the air, one-handed, in gloves, in bright sunlight,
on a small screen, often with no data connection. Every design decision comes
back to that: big tap targets, few results, no scrolling, no network, minimal
battery draw. It exists to save one specific action, finding and dialling the
right number fast, and should never grow into a general airspace app.

- `docs/background.md`: sources, provenance of every number, prior art.
  Read before touching `hx/data.js`.
- `docs/next-session.md`: the current investigation task, if one is open.

## Where this fits

Two other projects already show **live** status for some zones by reading the
ATIS, which is strictly better than a phone number where it works:
`bern.pdcs.ch` (Bern) and `pgairspace.ch` "HX Monitor" (Bern, Meiringen,
built by a friend of the owner). Both need a data connection.

HX Call's distinct value is therefore: **the eleven zones nobody has
automated**, and **working with no connectivity at all**. Treat those two as
the product. Don't try to out-compete the live-status tools; if anything, link
to them.

## Safety rules: do not relax these

- **The circles in `hx/data.js` are not airspace boundaries.** They are
  deliberately oversized triage radii. Never tighten one to "improve accuracy",
  and never present them as boundaries. An extra entry on screen costs nothing;
  a missing one costs an airspace violation.
- **The display must not out-claim the circles.** Every distance prints with a
  leading `~`, and `d <= 0` prints `HX.IN_RANGE` ("IN RANGE"), never a number.
  It used to read `0` in the widget and `INSIDE` on the page, which both
  asserted the one thing a triage radius cannot support: that the pilot is in
  the airspace. A tracklog replay at Brunni on 2026-08-14 showed MEIRINGEN and
  EMMEN at `0` while 25.6 and 21.8 km from their centres, i.e. 420 m and 4.2 km
  inside 26 km circles and nowhere near either boundary. Don't put the number
  back, and don't drop the `~`. There is also **no altitude test anywhere**: a
  TMA sector shows the same at 800 m as at 3000 m, which is deliberate under
  the same "an extra entry costs nothing" rule, and another reason the figure
  must not read as a measurement.
- **Never delete a zone that has no phone number.** They stay in `hx/data.js`
  and render as "no number on file" when shown. `nonum` decides whether they
  are displayed; it defaults to 0, because a button that can't be dialled
  misses the point of a speed-dial and the airspace reference is the map.
  That default is a deliberate trade: it means the list is silent about five
  of thirteen zones, so the pages must never imply the list is a survey of
  what is nearby. Deleting the entries would foreclose the choice entirely.
- **Never set `v:true`** on a zone unless the number has actually been
  confirmed. Either against that aerodrome's AD INFO page in the current eVFR
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
  (bern.pdcs.ch goes red after 4 minutes without a connection, copy that), and
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
  It runs at 3000 m on a phone with no data connection. Adding npm, a bundler or
  a CDN import defeats the design. Any geo library costs more than the ~20 lines
  of maths it would replace.
- **`hx/core.js` touches no DOM and renders nothing.** It hands pages a state
  object; pages only draw. This is what keeps the two views from drifting.
- **`HX.SPEC` is the single source of truth** for URL parameters *and* the
  settings UI in both `app.html` and `index.html`. Add a parameter there and it
  appears everywhere, already clamped. Never hand-write a settings field.
  `only:"widget"` marks one that applies to a single view: `app.html` skips it
  rather than showing a dead control, while the launcher keeps showing it
  because that is where widget URLs are built. `type:"set"` is a comma-separated
  token list, rendered as a collapsed `<details>` of checkboxes, `""` is a
  real value for it, so `clamp` handles sets before the empty-string guard or
  the last box could never be unticked.
- **`hx/fields.js` renders every settings control**, for both pages, from
  `HX.SPEC`. It is the only DOM-touching shared file; core.js stays clean of
  the DOM, which is what keeps the engine testable in node.
- **`hide=` drops zones the pilot watches elsewhere** (`hide=brn,mei`, by id or
  by a zone's `grp`). It is applied as a visibility rule, not a filter on the
  dataset: excluded zones fail `strict` so the widget never draws them, while
  `showAll` still reaches them in `app.html`, hidden in the air, never
  unreachable while planning. `keepNearest` picks the nearest *non-hidden*
  zone, or hiding one would drag it straight back. Deliberately still hidden
  when inside its circle: the circles are oversized triage radii, so anything
  else would defeat the feature for its main use. The live-status tools it
  exists for need a data connection; this list does not.
- **The widget's `<body>` must stay unpainted.** XCTrack renders a white or
  absent background as transparent so the widget floats over the map. Every
  chip carries its own background. Don't add a body background.
- **The widget renders nothing when nothing is in range** (`keepNearest:false`),
  and nothing at all when there is no position yet. An empty transparent panel
  is correct output there. Without a fix the engine drops the limits and offers
  every zone, right for `app.html`, wrong for a panel floating over the map,
  where it would be a screenful of buttons that rank nothing. `app.html` keeps
  the nearest entry instead, because a blank page reads as broken.
- **Minimise DOM writes.** Elements are built once and reused; each update
  writes only text nodes whose value changed, and reorders only when the sort
  order changed. A stationary pilot should cause zero writes.
- Default position poll is 60 s. Don't lower it, battery matters more than
  freshness for data that changes on a 15–30 minute cycle.
- `localStorage` is always accessed through the guarded wrapper in `core.js`.
  It is load-bearing: with `${lat}/${lng}` substitution XCTrack reloads the
  whole page periodically, and this is what carries the re-check clock across.
- Plain ES5-compatible JS, no modules, no transpilation. Old Android WebViews.

**Live ATIS status is one file, `hx/live.js`, and "enhancement layer" is meant
literally: delete the file and the widget is unchanged.** It puts the active
Bern sectors on the Bern chip, in green, above the number. Everything about it
is arranged so that failing is invisible rather than misleading.

- **It reads the ATIS, not a transcript.** `bern.pdcs.ch/php/Atis.php` returns
  clean punctuated prose with its own generation timestamp, i.e. a text ATIS,
  while `api.pgairspace.ch` recognises radio audio and returns "Burn clearance
  delivery" and "TMA tree four five and six" (both re-checked 2026-08-19).
  Owner's call, and the reason is the one sentence in eleven that carries the
  status: a recogniser that drops a word in that sentence changes the answer.
  `docs/background.md` has both pipelines in full.
- **Two clocks, both from the pdcs widget, and they fail differently.** The
  ATIS goes out of date at the source after 35 minutes; our own connection can
  die with a green line on screen, so a successful load older than 4 minutes is
  also stale. Either alone leaves a hole. Stale prints `STALE` in red and drops
  the sector list, because at that point the number below it is the answer.
- **`WILL BE ACTIVATED` is scanned for in the raw text**, which is why the
  fetch asks for `r=1`. The tape says "is active", "is not active" AND "will be
  activated", the JSON has one boolean, so a sector about to switch on is
  indistinguishable from one that is off. Finding the phrase turns the whole
  line amber and reads `ACTIVATING`. Believed, never parsed further.
- **The line sits between the name and the number, never after it.** `.ph` is
  pinned to the bottom of a stretched chip so every number in a row shares a
  baseline; put the line last and Bern's number alone would sit a line high.
- **Polling is gated on the zone being drawn**, told to `HX.live.watch()` by
  the render loop, so a pilot nowhere near Bern makes no requests at all. One a
  minute while it is on screen, matching the pdcs widget, and failures back off
  (three at a minute, then five, then stop) so a dead endpoint costs about ten
  requests per page load. That is what makes `live` safe to default ON.
- **It is on the widget only.** `app.html` is the planning view and a phone
  number is what it is for; live sector state there would be read hours before
  the flight and would be worth nothing by then.

**`Accept: application/json` is mandatory, and its absence is silent.**
`Atis.php` content-negotiates: without that header it answers `text/plain`
ATIS prose for **every** value of `r`, so `JSON.parse` fails, `fail()` runs,
the poll backs off and the chip renders as though the feature were switched
off. Measured 2026-08-19. `Accept` is CORS-safelisted and `application/json`
has no unsafe bytes, so it triggers no preflight and costs nothing. The `r`
parameter selects whether the *raw* text is included **inside** the JSON; it
does not select JSON.

**And it does not work yet, for one more reason.** `Atis.php` sends no
`access-control-allow-origin` header, re-measured 2026-08-19 on both GET and a
preflight OPTIONS, so the browser refuses us the body and the chip renders
exactly as it always has. Either pdcs.ch adds that one header, which is the
right fix and keeps the data theirs, or `SRC` points at a mirror that does:
`tools/atis-proxy.js` is a dev proxy for a laptop and carries the eight-line
Cloudflare Worker for the real one. A separate host behind a feature flag is
what this file already allowed; the offline core stays static either way.

**`index.html` never links to `widget.html`, and the app gets a card after the
setup steps.** The widget was linked from the top of the page and opened a
**white page**: it is transparent by design and draws nothing until a zone is
in range, so in a browser there is simply nothing to see, and it reads as
broken. The URL box and the QR are the only ways that URL leaves this page.
`refreshLinks()` no longer touches a `#towidget`; re-adding the line without the
element throws and takes the page's whole link building with it.

**The page runs as three numbered steps, same as Windmap's:** choose what you
will see, get the link onto your phone, set it up in XCTrack. Step 2 is new.
The URL box and the QR used to sit under the configurator heading with nothing
explaining them, so a reader met a read-only field of text and had to work out
what it was for. Section heads are `1.06em/700` in `--fg`, each opening with a
hairline, and they carry an accent badge (`h2 .n`, coloured `--on-accent`)
rather than the words "Step 1:". Numbers for the steps, an **app grid** for the
app section (filled rects, because a stroked phone outline goes mushy at 12px;
Windmap also has a **star** for its bonus step). The app section is
**`h2.apart`**: a full band of space plus a 2px rule in the accent instead of
the hairline, because the app is not step 4 and with the steps' own heading
treatment it read as one. `.warn` carries a 3px left bar so a tinted box that
warns cannot be mistaken for a tinted box that opens something.

**Both setup pages say "The standalone app" and "Open the app", word for word**,
both open the blurb with *"A separate page from the widget, and it needs none of
the setup above"*, and both name the platforms: *iPhone, Android and any desktop
browser*. Only the clause after that differs. This one names the freedom (no
XCTrack at all), Windmap's names the limit (no map). Keep the frame identical.

**The app card says "no XCTrack needed" in its heading, and that is not
filler.** This tool is a phone directory, so a plain list needs no map and no
overlay and IS the whole product, which makes `app.html` the only version
available to a pilot on iOS or to anyone who does not fly with XCTrack. Worth
stating outright, because "App" alone leaves a reader to infer it. The sibling
project is the mirror image: Windmap's list loses the point of Windmap without a
map, so there the same card is billed as an extra.

**The setup page shares one visual language with Windmap's, and it comes from
the family page** (`freeflight-tools.github.io`). Change one, change all three.
Each tool owns a single `--accent`, declared on bare `:root` and re-declared in
both dark blocks: HX Call the blue of its handset, Windmap the amber of its own
arrow. It carries the mono kicker above the `<h1>` (with that tool's glyph, and
the family page's band wording verbatim), the `.pick` card and the one filled
action. **Exactly one stadium per page**, and it is the action the page exists
for: Copy widget URL. Everything you can *open* is a `.pick` card, and the card
carries the tool's `--wash` (its band colour from the family page) plus a
phone-and-app-tile glyph, rather than the neutral `--panel` every other box
uses. `.wrap` takes 52px of top padding under 380px, because the GTranslate
switcher is `position:fixed` at `top:12px right:12px` and would otherwise sit on
the kicker. `--amber-str` lives in `hx/base.css` for the same reason it does in
Windmap's: bold text inside an amber panel needs a tint that moves with the
theme, or the emphasised words become the least legible in the box.

**Visit counting is on `index.html` ONLY, and never on `app.html` or
`widget.html`.** Cloudflare Web Analytics, cookieless: page views and country,
no cookies, no identifier, nothing stored on the device, no cross-site profile.
That is what keeps it out of consent-banner territory, so **there is no cookie
dialog and there must not need to be one**. Pick a tool that sets a cookie and
you have bought a banner for a free tool aimed at pilots.

The beacon is INJECTED by a guarded snippet rather than written as a plain
`<script src>`: the token is checked against `/^[a-f0-9]{32}$/` first, so an
unconfigured copy makes no request at all. Fail closed, so the page is safe to
ship before the account exists.

**The privacy copy is part of this change, not decoration.** These pages said
"no analytics" before there were any. The line that is now true, and the one a
reader cares about, is not tools-versus-nothing but *the pages you fly with*
against *the pages you set up on*: `app.html` and `widget.html` still say "no
analytics" and still mean it. Adding a beacon to either would make the page lie
about itself, which is the one thing this project cannot do.

**`icon-512.png` and `icon-512-maskable.png` are two different pictures, and
merging them undoes both.** The maskable one is a full-bleed square with a
plate, because Android crops it to the launcher's shape and treats the outer
fifth as disposable; the `any` one is what browsers show in bookmarks and the
install prompt, composited on their own surface, so a plate there is a visible
square. Windmap's `any` icons are therefore TRANSPARENT (that white box behind
the arrow was this), while its apple-touch `icon-180.png` stays opaque because
iOS composites alpha onto black. Regenerate with
`freeflight-tools.github.io/tools/make-icons.py`, which holds the full table.

**The OG card embeds the icon art rather than linking it, so it goes stale
silently.** `tools/og-card.html` had the pre-rename artwork long after the
favicon changed, which means every link ever shared showed a different logo
from the site. Re-render it whenever `icon.svg` changes.

## Open threads

1. **Five numbers are missing**, Payerne, Dübendorf, Lugano, St. Gallen, Les
   Eplatures. They live in the AD INFO pages of the eVFR Manual (skybriefing,
   ~CHF 49/yr). Not on the open web, and some may never be. Sion, Locarno and
   Grenchen have since been sourced and are in `data.js` as `v:false`; the
   README said "eight missing" until 2026-08-13, which was three numbers out
   of date. Count from `data.js`, not from prose.
2. **Six of the eight numbers are unverified.** Zürich S1–S3 and Basel T1–T3
   were confirmed by call on 09.08.2026; Meiringen, Emmen/Buochs/Alpnach, Bern,
   and the newly sourced Locarno, Sion and Grenchen still need confirming.
   The owner checks numbers personally: the long-term aim is
   that the rest of the data is community maintained, with contributed numbers
   arriving `v:false` and only being marked verified after that check.
3. **`tel:` does not work in XCTrack, measured, and worked around.** With
   `tools/tel-probe.html` on Android 17 / WebView 150: an anchor `tel:` link,
   `tel:` by assignment, `intent://…ACTION_DIAL` and `window.open` every one
   landed on the "Web page not available" page, which strands the widget there
   until it reloads. `navigator.clipboard` worked. So `HX.NO_TEL` detects the
   WebView and the widget copies the number instead of linking to it. An issue
   asking XCTrack to forward the intent is drafted; if they ship it, drop
   `NO_TEL` and the chips go back to dialling directly.
4. **Live status is built and blocked on one header.** `hx/live.js` renders
   Bern's active sectors on the widget chip; `bern.pdcs.ch/php/Atis.php` sends
   no `access-control-allow-origin`, so nothing shows until Lukas adds it or a
   mirror goes up. **Asking him is the whole task.** The pgairspace API needs
   no such ask (it sends `*`), but it is speech-to-text and was rejected for
   that. `docs/background.md` has both.
5. **Upstream the data** to the SHV airspace DB (dominik@airriders.ch) rather
   than maintaining it alone, and check with luftraum@shv-fsvl.ch before
   publishing. Neither contacted yet.

## Running it locally

Pure static files, so any web server works. Do **not** open the pages via
`file://`: browsers refuse geolocation there, so `app.html` can't get a fix.

    cd hx-call && python3 -m http.server 8080     # then http://localhost:8080

`localhost` counts as a secure context, so geolocation works. Any equivalent is
fine (`npx serve`, `php -S localhost:8080`).

Testing on the phone or in XCTrack is different: a LAN address like
`http://192.168.x.x:8080` is **not** a secure context, so geolocation is
blocked there. Either publish to GitHub Pages (the real target anyway) or open
a temporary https tunnel, e.g. `cloudflared tunnel --url http://localhost:8080`.

There is nothing to build, install or watch, but **an edit takes two reloads
to appear**. `localhost` is a secure context, so `sw.js` registers there too,
and its stale-while-revalidate serves the cached copy while fetching your
change for next time. Measured: edit, reload → old file; reload again → new
file. Hard-reload (`Cmd`/`Ctrl`+`Shift`+`R`), or tick *Bypass for network*
under DevTools → Application → Service workers, and the problem disappears.
Chasing a change that "didn't take" is otherwise a good way to lose an hour.

## Conventions

- Data edits go in `hx/data.js` only. One entry per commit, with the source and
  the date checked.
- `sn` (widget short name) stays under ~14 characters.
- The README is written for pilots, not developers. Keep it scannable.

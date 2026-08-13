# Next session: how do the live-status tools work?

A task brief, not permanent context. Delete or replace it when the
investigation is done and the findings are in `docs/background.md`.

## Goal

Two projects already show live HX airspace status by reading the ATIS. Find out
how, then decide whether HX Call should consume that data as an **optional
layer** on top of the phone list, never as a replacement for it.

| | |
|---|---|
| `https://bern.pdcs.ch/` and `/xct.html` | Bern only. By Lukas Buchs, Para-Deltaclub Stockhorn. Also wrote the widely used windspion XCTrack widget. |
| `https://pgairspace.ch/` "HX Monitor", `/xctrack?area=bern`, `/xctrack-guide.html` | Bern and Meiringen, more configurable. Built by a friend of the repo owner. |

## Do this first

**Ask the friend who built pgairspace.ch.** One message beats an afternoon of
reverse-engineering, and if he's already running the pipeline the real question
is whether HX Call should call his API rather than rebuild it. Everything below
is the fallback if he's slow to reply.

Be a decent neighbour about it: a handful of requests, never a polling loop
against someone's small club server.

## What is already known

From the pdcs.ch blog post of 13 April 2026:

- The Bern page loads the latest ATIS automatically and colours the airspaces.
- The widget queries the status **once per minute, at Skyguide**.
- It **turns red after 4 minutes** without an internet connection.
- It **auto-hides** when you aren't near Bern, using the XCTrack position.
- `xct.html` shows two badges, `W` and `E`, west approach (TMA 4) and east
  approach (TMA 6). Small, in the top right, over the map.
- Lukas's own disclaimer: informational only, must not be used to decide entry
  or to monitor status in flight; use 125.130 MHz or 022 417 40 76 for that.

From the pgairspace XCTrack guide:

- `?area=bern`, and areas include Meiringen.
- `&sub=ctr,t1,t2` filters sub-areas.
- `&transcript=[hide|only]`: it displays a **transcript**, and recommends
  keeping it visible so the pilot can double-check.
- Suggests two widgets (one `hide`, one `only`) to give the transcript a
  horizontal panel, since a vertical one squishes it.

**"Transcript" implies audio.** You transcribe speech, not JSON. That points to
a speech-to-text pipeline over the ATIS broadcast rather than a data feed,
which would also explain why the raw text is shown for verification. Possible
input: the `lszb-atc` GitHub organisation publishes ATC audio streams from
Bern-Belp including an ATIS channel.

## How to find the endpoints

Claude Code runs on the local machine, so unlike the chat sandbox it can
actually reach these hosts.

1. `curl -s https://bern.pdcs.ch/xct.html` and read the real HTML, including
   the `<script src>` tags. Fetch the referenced JS, pretty-print it
   (`npx js-beautify`), and grep for `fetch(`, `XMLHttpRequest`, `https://`.
   For a small hand-written page this alone may be enough.
2. Same for pgairspace, but it's a React build, minified, chunked. Grep the
   chunks for URL literals.
3. If that's inconclusive, use Playwright to watch the network for one poll
   cycle:

```js
const { chromium } = require('playwright');
const b = await chromium.launch();
const p = await b.newPage();
p.on('response', async r => {
  if (['xhr','fetch'].includes(r.request().resourceType()))
    console.log(r.status(), r.url(), JSON.stringify(r.headers()),
                (await r.text()).slice(0, 500));
});
await p.goto('https://bern.pdcs.ch/xct.html');
await p.waitForTimeout(70000);          // catch the once-a-minute poll
await b.close();
```

## The questions that actually decide this

- **Same-origin or not?** If the call goes to `bern.pdcs.ch/api/...` rather
  than a skyguide host, it's proxied server-side, meaning the upstream needs
  auth or blocks CORS, and a static GitHub Pages site cannot call it directly.
  The fact that this lives on its own subdomain rather than the club's
  WordPress hints at exactly that.
- **Is there an `access-control-allow-origin` header?** No CORS, no direct use.
- **Is a token attached?** If so it isn't ours to reuse.
- **What does the ATIS actually say?** Bern's is a full weather broadcast; the
  TMA status is one phrase inside it (`is not active` / `will be activated` /
  `is active`). Whatever extracts that is the fragile part.
- **Does anything equivalent exist for the other zones?** Meiringen has a tape
  on 130.150. If HX Monitor already transcribes it, the same trick may extend
  to Emmen/Buochs/Alpnach on 134.130. That would be the high-value outcome.

## If it turns out to be usable

Design constraints from `CLAUDE.md` that apply:

- The phone entry must render identically when live status is unavailable.
- Stale data announces itself; copy the 4-minute red rule.
- Live status never suppresses the phone number.
- No build step, no runtime dependency for the offline path. If live status
  needs a server, it belongs behind a feature flag and a separate host, the
  core stays static.

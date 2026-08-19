/* ══════════════════════════════════════════════════════════════════════
   HX CALL: live ATIS status. No DOM, no rendering.

   An ENHANCEMENT LAYER over the phone list, never a dependency. When this
   file fails to load, fails to fetch, or is switched off with ?live=0, the
   chip renders exactly as it always has: name, distance, number. Nothing
   here may ever suppress a phone number.

     HX.live.watch(["brn", ...]);   // ids currently on screen; drives polling
     HX.live.get("brn");            // null, or {state, at, list}
     HX.live.onChange(fn);          // fn() when the answer may have changed

   ONE ZONE HAS A SOURCE TODAY: Bern. `bern.pdcs.ch/php/Atis.php` is the
   Para-Deltaclub Stockhorn's reader of the LSZB ATIS, and it returns the
   ATIS text plus a parsed `isActive` per sector. Measured 2026-08-19: the
   text is clean, punctuated, digit-formatted prose, not the output of a
   speech recogniser, so a phrase does not go missing because a synthesiser
   slurred it. That is why this reads the ATIS rather than the transcript
   service at pgairspace.ch, which recognises radio audio and returned
   "Burn clearance delivery" and "TMA tree four five and six" the same day.

   ── THE ONE THING STOPPING THIS WORKING ────────────────────────────────
   `Atis.php` sends NO `access-control-allow-origin` header. Measured
   2026-08-19 on both GET and a preflight OPTIONS, from this origin. So a
   browser will refuse to hand us the body and every poll below fails
   silently until either

     (a) pdcs.ch adds one header, `Access-Control-Allow-Origin: *`, which
         is the whole fix and costs them one line, or
     (b) SRC is pointed at a mirror that does. `tools/atis-proxy.js` is a
         dev proxy for testing and carries the eight-line Cloudflare Worker
         to deploy as a real one.

   Failing polls back off (3 at a minute, then 5 minutes, then stop), so an
   endpoint that never opens up costs a handful of requests and nothing else.
   ══════════════════════════════════════════════════════════════════ */

(function(global){
"use strict";

const HX = global.HX = global.HX || {};

/* The only line to edit when the endpoint moves. `r=1` asks for the raw
   ATIS text alongside the parsed booleans; see PENDING below for why we
   want both. NOTE the JSON shape is selected by the `Accept` header in
   fetch() below, NOT by `r`: every value of `r` returns prose without it. */
const SRC  = "https://bern.pdcs.ch/php/Atis.php?r=1";
const ZONE = "brn";                      // the hx/data.js id this describes

const POLL_MS = 60000;                   // same cadence as the pdcs widget
/* Both clocks come from the pdcs widget and both must hold, because they
   fail differently: ATIS_MAX is the broadcast going out of date at the
   source, LOAD_MAX is our own connection dying with a green line on screen.
   Either one alone leaves a hole. */
const ATIS_MAX_MS = 35 * 60000;          // an ATIS older than this is not current
const LOAD_MAX_MS =  4 * 60000;          // ...nor is one we last reached this long ago

/* Printed in ORDER and GROUPED, so "CTR · TMA 1 2" fits a chip that is
   124px wide at its narrowest. Never "T1", which is Basel's Tango sector
   and 200 km away. */
const SECTORS = [
  {k:"ctr",   g:"CTR",  n:""},
  {k:"tma1",  g:"TMA",  n:"1"},
  {k:"tma2",  g:"TMA",  n:"2"},
  {k:"tma3",  g:"TMA",  n:"3"},
  {k:"tma4",  g:"TMA",  n:"4"},
  {k:"tma5",  g:"TMA",  n:"5"},
  {k:"tma6",  g:"TMA",  n:"6"},
  {k:"lsr82", g:"LS-R", n:"82"}
];

/* The Bern tape says "is active", "is not active" AND "will be activated",
   but the JSON has one boolean, so a sector about to switch on is
   indistinguishable from one that is off. Scanning the raw text for the
   third phrase is what stops that being rendered as a green all-clear.
   Believed, never parsed further: it turns the whole line amber and the
   pilot dials. */
const PENDING = /WILL\s+BE\s+ACTIVAT/i;

let data   = null;      // last successful read: {at, atMs, list, pending}
let loaded = 0;         // when that read arrived
let errs   = 0, dead = false, busy = false;
let timer  = null, wanted = false;
let onChange = null;

/* ES5 Date.parse only guarantees the "Z" form; `+00:00` is ES6 and an old
   Android WebView can hand back NaN for it. The endpoint sends `+00:00`. */
function parseIso(s){
  const m = /^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d):(\d\d)(?:\.\d+)?(Z|[+-]\d\d:?\d\d)?$/.exec(String(s || ""));
  if (!m) return 0;
  let t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  const z = m[7];
  if (z && z !== "Z"){
    const sign = z.charAt(0) === "-" ? 1 : -1;
    const hh = +z.slice(1, 3), mm = +z.slice(-2);
    t += sign * (hh * 60 + mm) * 60000;
  }
  return t;
}

/* LOCAL time, like every other clock in this tool: the re-check line beside
   it reads local, and two clocks in one chip must not disagree. The ATIS
   itself says UTC, so this is 09:20 where the tape says 0720. */
function hhmm(ms){
  const d = new Date(ms);
  return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

/* Active sectors, in SECTORS order, grouped by prefix. Anything the
   endpoint grows that SECTORS does not know about is appended by its own
   key rather than dropped: a new sector must never go missing quietly. */
function listOf(sp){
  const out = [], seen = {};
  let label = null, nums = null;

  function flush(){
    if (label === null) return;
    out.push(nums.length ? label + " " + nums.join(" ") : label);
    label = null; nums = null;
  }

  for (const s of SECTORS){
    seen[s.k] = true;
    const v = sp[s.k];
    /* `!== true` on purpose: absent, null and "maybe" are all not-active. */
    if (!v || v.isActive !== true) continue;
    if (s.g !== label){ flush(); label = s.g; nums = []; }
    if (s.n) nums.push(s.n);
  }
  flush();

  for (const k in sp){
    if (!Object.prototype.hasOwnProperty.call(sp, k) || seen[k]) continue;
    if (sp[k] && sp[k].isActive === true) out.push(String(k).toUpperCase());
  }
  return out.join(" · ");
}

function fail(){
  busy = false;
  errs++;
  /* Nothing is thrown away here. The last good read stays on screen until
     LOAD_MAX_MS ages it out, which is what makes one missed poll invisible
     and four of them red. */
  if (errs >= 10){ dead = true; stop(); }
  if (onChange) onChange();
  if (!dead) arm();
}

function poll(){
  if (busy || dead) return;
  busy = true;

  let xhr;
  try { xhr = new XMLHttpRequest(); } catch(e){ return fail(); }

  xhr.onload = function(){
    busy = false;
    let d;
    try { d = JSON.parse(xhr.responseText); } catch(e){ return fail(); }
    if (!d || d.success !== true || !d.atis || !d.atis.airspace) return fail();

    const atMs = parseIso(d.atis.time_of_generation);
    if (!atMs) return fail();

    errs   = 0;
    loaded = Date.now();
    data   = {
      at:      hhmm(atMs),
      atMs:    atMs,
      list:    listOf(d.atis.airspace),
      /* raw is what we asked for; if a future endpoint stops sending it we
         lose the check, not the reading. */
      pending: typeof d.raw === "string" && PENDING.test(d.raw)
    };
    if (onChange) onChange();
    arm();
  };
  xhr.onerror = fail;
  xhr.ontimeout = fail;

  try {
    /* Cache-busted rather than no-store: XHR cannot set the header on an
       old WebView, and a stale reading served from a browser cache would
       defeat both clocks above. */
    xhr.open("GET", SRC + (SRC.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), true);
    /* MANDATORY. Atis.php content-negotiates: without this it answers
       text/plain ATIS prose and JSON.parse below fails, whatever `r` says.
       Measured 2026-08-19. `Accept` is a CORS-safelisted request header and
       `application/json` contains no unsafe bytes, so this adds no preflight
       and does not make the CORS problem below any worse. */
    xhr.setRequestHeader("Accept", "application/json");
    xhr.timeout = 12000;
    xhr.send();
  } catch(e){ fail(); }
}

function arm(){
  if (timer || !wanted || dead) return;
  /* Three tries at the normal cadence, then five minutes, then give up.
     A CORS-blocked endpoint therefore costs ~10 requests per page load. */
  const wait = errs === 0 ? POLL_MS : errs < 3 ? POLL_MS : 5 * 60000;
  timer = setTimeout(function(){ timer = null; poll(); }, wait);
}

function stop(){
  if (timer){ clearTimeout(timer); timer = null; }
}

function want(on){
  const was = wanted;
  wanted = !!on && !document.hidden;
  if (wanted === was) return;
  if (!wanted){ stop(); return; }
  if (data && Date.now() - loaded < POLL_MS) arm();   // still fresh, don't refetch
  else poll();
}

document.addEventListener("visibilitychange", function(){
  if (document.hidden){ wanted = false; stop(); }
});

HX.live = {
  /* Which zones the caller is showing. Polling runs only while a zone we
     have a source for is actually on screen, so a pilot 200 km from Bern
     makes no requests at all. */
  watch: function(ids){
    let on = false;
    if (HX.config && HX.config.live)
      for (const id of ids || []) if (id === ZONE){ on = true; break; }
    want(on);
  },

  /* null means "say nothing", and the chip is then byte for byte what it
     was before this file existed: no source for this zone, switched off,
     or nothing fetched yet. Once something HAS been shown it never goes
     back to null; it goes stale instead, because a green line vanishing
     silently is indistinguishable from all-clear. */
  get: function(id){
    if (id !== ZONE || !data) return null;
    if (!(HX.config && HX.config.live)) return null;

    const now = Date.now();
    if (now - data.atMs > ATIS_MAX_MS || now - loaded > LOAD_MAX_MS)
      return {state:"stale",   at:data.at, list:""};
    if (data.pending)
      return {state:"pending", at:data.at, list:""};
    return {state:"ok", at:data.at, list:data.list};
  },

  onChange: function(fn){ onChange = fn; }
};

})(window);

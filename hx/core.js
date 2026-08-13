/* ══════════════════════════════════════════════════════════════════════
   HX CALL: shared engine. No DOM, no rendering.

   Everything both pages need lives here so they can't drift apart:
   the config spec, URL parsing, position sources, distance ranking and
   the re-check clock. Pages only draw what HX.state gives them.

   Usage:
     HX.start(function(state){ ...render... }, {keepNearest:true});

   state = {
     fix        {lat, lon, acc} or null
     fixSrc     "pinned" | "XCTrack" | "URL" | "device" | ""
     geoState   "" | idle | asking | live | denied | lost | insecure
     trust      false when the fix is too coarse to rank zones
     rows       [{z, k, dist, brg, compass, inside, strict, visible,
                  state:"none"|"fresh"|"due", until:"HH:MM"}]
     shown      how many rows are visible
     hidden     how many rows the limits are hiding
   }
   ══════════════════════════════════════════════════════════════════ */

(function(global){
"use strict";

/* ── config spec: the single source of truth for both the URL
      parameters and the settings UI ─────────────────────────────── */

const SPEC = [
  /* `hint` IS THE PILOT'S TEXT. One short line, read one-handed on a phone in
     gloves, never a description of the mechanism. Anything explaining *why* a
     default is what it is belongs in a comment here, where the next developer
     looks and the pilot does not. Rewritten 2026-08-13; do not let
     "At most this many of the matching zones are listed" creep back. */
  {key:"max",     type:"int",  min:1, max:99,  def:4,      label:"How many zones to show", hint:"The nearest ones first"},
  /* Distance is to the zone EDGE, not its centre, and the circles in data.js
     are deliberately oversized triage radii, so this is generous by design. */
  {key:"range",   type:"int",  min:1, max:999, def:10,     label:"Hide zones further than",  unit:"km", hint:"Measured to the edge of the zone, not its centre"},
  /* 60 s is deliberate: status changes on a 15–30 min cycle, so a faster poll
     spends battery to learn nothing. Don't lower the default. */
  {key:"refresh", type:"int",  min:5, max:900, def:60,     label:"Check your position every", unit:"s", hint:"Faster costs battery and changes nothing"},
  {key:"size",    type:"int",  min:0, max:100, def:0,      label:"Text size", unit:"%", hint:"Bigger text and bigger buttons"},
  {key:"theme",   type:"enum", options:["auto","dark","light"], def:"auto", label:"Theme", hint:"Auto follows your phone"},
  /* Off by default: a button that can't be dialled misses the point of a
     speed-dial. The entries stay in data.js either way. See CLAUDE.md. */
  {key:"nonum",   type:"bool", def:0,          label:"Show zones with no number", hint:"Nothing to dial, but you'll know they're there"},
  {key:"valign",  type:"enum", options:["top","center","bottom"], def:"top", only:"widget",
   label:"Where the buttons sit", hint:"When the widget is taller than the list of results"},
  {key:"hide",    type:"set",  def:"",
   label:"Hidden zones", hint:"Ones you already watch elsewhere. Still under SHOW ALL"}
];

/* `only` marks a parameter that belongs to one view. app.html skips the
   widget-only ones rather than showing a control that does nothing; the
   launcher shows everything, because that is where widget URLs are built. */

const COARSE_M = 2000;      // above this the fix can't be trusted to rank
const DEG_KM   = 111.195;
const COMPASS  = ["N","NE","E","SE","S","SW","W","NW"];
const CFG_KEY  = "hxcfg";

/* ── guarded storage ──────────────────────────────────────────────
      Load-bearing: with ${lat}/${lng} substitution the widget reloads
      the whole page on its refresh interval, and this is what carries
      the re-check clock across those reloads. */

const store = (function(){
  var mem = {}, ok = false;
  try { localStorage.setItem("_","1"); localStorage.removeItem("_"); ok = true; } catch(e){}
  return {
    g:function(k){ try{ return ok ? localStorage.getItem(k) : mem[k]; }catch(e){ return mem[k]; } },
    s:function(k,v){ try{ ok ? localStorage.setItem(k,v) : (mem[k]=v); }catch(e){ mem[k]=v; } },
    d:function(k){ try{ ok ? localStorage.removeItem(k) : delete mem[k]; }catch(e){ delete mem[k]; } }
  };
})();

/* ── URL parameters ───────────────────────────────────────────────
      Query string and hash both work. An unsubstituted placeholder
      such as the literal "${lat}" parses to NaN and is ignored, so a
      misconfigured widget falls through to the next position source
      instead of showing a wrong position. */

const PARAMS = (function(){
  try {
    return new URLSearchParams(
      (location.search || "").replace(/^\?/, "") + "&" +
      (location.hash   || "").replace(/^#/, "")
    );
  } catch(e){ return new URLSearchParams(""); }
})();

function coordOk(a, b){
  return isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
}
function pairOf(v){
  if (!v) return null;
  const m = String(v).split(",");
  if (m.length !== 2) return null;
  const a = parseFloat(m[0]), b = parseFloat(m[1]);
  return coordOk(a, b) ? {lat:a, lon:b} : null;
}

function clamp(spec, raw){
  /* A set is checked before the empty-string guard below: "" is a real
     value here, nothing hidden, and rejecting it would make the last
     box impossible to untick, since setConfig skips nulls.

     Unknown tokens are kept rather than dropped. A URL built against a
     newer data.js then survives a round trip through an older one instead
     of quietly losing what someone chose to hide. */
  if (spec.type === "set"){
    if (raw === null || raw === undefined) return null;
    const seen = {}, out = [];
    for (const t of String(raw).split(",")){
      const s = t.trim();
      if (!s || seen[s]) continue;
      seen[s] = true;
      out.push(s);
    }
    return out.join(",");
  }
  if (raw === null || raw === undefined || raw === "") return null;
  if (spec.type === "enum")
    return spec.options.indexOf(String(raw)) >= 0 ? String(raw) : null;
  if (spec.type === "bool"){
    const s = String(raw).toLowerCase();
    if (s === "1" || s === "true"  || s === "yes") return 1;
    if (s === "0" || s === "false" || s === "no")  return 0;
    return null;
  }
  const v = parseFloat(raw);
  if (!isFinite(v)) return null;
  return Math.round(Math.min(spec.max, Math.max(spec.min, v)));
}

/* precedence: URL parameter > saved setting > default */
function loadConfig(){
  let saved = {};
  try { saved = JSON.parse(store.g(CFG_KEY) || "{}") || {}; } catch(e){}
  const cfg = {};
  for (const sp of SPEC){
    let v = clamp(sp, PARAMS.get(sp.key));
    if (v === null) v = clamp(sp, saved[sp.key]);
    if (v === null) v = sp.def;
    cfg[sp.key] = v;
  }
  return cfg;
}

function parseUrlFix(){
  const pinned = pairOf(PARAMS.get("pin"));
  if (pinned){ pinned.acc = 0; pinned.pin = true; return pinned; }
  const at = pairOf(PARAMS.get("at"));
  if (at){ at.acc = 0; at.pin = false; return at; }

  const num = function(names){
    for (const n of names){
      const v = parseFloat(PARAMS.get(n));
      if (isFinite(v)) return v;
    }
    return null;
  };
  const la = num(["lat","latitude"]);
  const lo = num(["lng","lon","long","longitude"]);
  if (la !== null && lo !== null && coordOk(la, lo))
    return {lat:la, lon:lo, acc:0, pin:false};
  return null;
}

/* ── state ────────────────────────────────────────────────────────── */

let cfg      = loadConfig();
let zones    = [];
let hideSet  = {};          // id or group -> true, from the hide parameter
let urlFix   = parseUrlFix();
const PINNED = !!(urlFix && urlFix.pin);

const HAS_XCT = (function(){
  try { return typeof XCTrack !== "undefined" && typeof XCTrack.getLocation === "function"; }
  catch(e){ return false; }
})();

const USE_GEO = !PINNED && !HAS_XCT && !urlFix;

/* An Android WebView resolves http(s) and nothing else unless the host app
   forwards other schemes, and XCTrack's does not: a tel: link lands on the
   "Web page not available" page and the widget is stuck there until it
   reloads. Measured on device: tel:, intent://…DIAL and window.open all
   fail, and only the clipboard works. Detected by the JS interface, or by
   the "wv" token Android puts in a WebView user agent; Chrome proper does
   not carry it, so an ordinary phone browser still dials.
   Revisit if XCTrack starts forwarding the intent. */
const NO_TEL = (function(){
  try { return HAS_XCT || /;\s?wv\)/.test(navigator.userAgent); }
  catch(e){ return false; }
})();

let fix = null, fixSrc = "", geoState = "";
let watchId = null, timer = null, showAll = false;
let onUpdate = null, keepNearest = true;

function parseHide(s){
  const out = {};
  for (const t of String(s || "").split(",")) if (t) out[t] = true;
  return out;
}

function selectZones(){
  zones = (global.HX_ZONES || []).filter(function(z){ return cfg.nonum || z.p; });
  hideSet = parseHide(cfg.hide);
}

/* A zone is hidden by its own id or by its group, so a future `grp:"heli"`
   can be switched off with one token instead of a dozen. Group names must
   not collide with zone ids, since they share this one namespace. */
function isHidden(z){
  return hideSet[z.id] === true || (!!z.grp && hideSet[z.grp] === true);
}

/* ── position ─────────────────────────────────────────────────────── */

function readXCTrack(){
  let raw;
  try { raw = XCTrack.getLocation(); } catch(e){ return null; }
  if (!raw || raw === "null") return null;
  let o;
  try { o = JSON.parse(raw); } catch(e){ return null; }
  if (!o || o.isValid === false) return null;
  if (typeof o.lat !== "number" || typeof o.lon !== "number") return null;
  return {lat:o.lat, lon:o.lon, acc:0};
}

function startWatch(){
  if (watchId !== null) return;
  if (!navigator.geolocation){ geoState = "insecure"; emit(); return; }
  geoState = "asking"; emit();
  watchId = navigator.geolocation.watchPosition(
    function(p){
      fix = {lat:p.coords.latitude, lon:p.coords.longitude, acc:p.coords.accuracy || 0};
      fixSrc = "device"; geoState = "live"; emit();
    },
    function(err){
      fix = null;
      geoState = err.code === 1 ? "denied" : "lost";
      emit();
    },
    {enableHighAccuracy:true, maximumAge:cfg.refresh * 1000, timeout:25000}
  );
}

/* Only auto-start without a user gesture when permission is already
   granted, or iOS will not reliably show the sheet otherwise. */
function initGeo(){
  if (!navigator.geolocation){ geoState = "insecure"; emit(); return; }
  if (!global.isSecureContext && location.protocol !== "file:"){ geoState = "insecure"; emit(); return; }
  if (navigator.permissions && navigator.permissions.query){
    navigator.permissions.query({name:"geolocation"}).then(function(st){
      if (st.state === "granted") startWatch();
      else { geoState = st.state === "denied" ? "denied" : "idle"; emit(); }
      st.onchange = function(){ if (st.state === "granted") startWatch(); };
    }).catch(function(){ geoState = "idle"; emit(); });
  } else { geoState = "idle"; emit(); }
}

/* ── re-check clock ───────────────────────────────────────────────── */

function validity(z, now){
  const raw = store.g("hx" + z.id);
  if (!raw) return {state:"none", until:""};
  const from = parseInt(raw, 10);
  let until;

  if (Array.isArray(z.rc)){
    let found = null;
    for (const t of z.rc){
      const hm = t.split(":");
      const c = new Date(from);
      c.setHours(+hm[0], +hm[1], 0, 0);
      if (c.getTime() > from){ found = c; break; }
    }
    if (!found){
      const hm = z.rc[0].split(":");
      found = new Date(from);
      found.setDate(found.getDate() + 1);
      found.setHours(+hm[0], +hm[1], 0, 0);
    }
    until = found;
  } else {
    until = new Date(from + (z.rc || 30) * 60000);
  }
  return {
    state: now < until.getTime() ? "fresh" : "due",
    until: ("0" + until.getHours()).slice(-2) + ":" + ("0" + until.getMinutes()).slice(-2)
  };
}

/* ── compute + emit ───────────────────────────────────────────────── */

function compute(){
  if (PINNED){ fix = urlFix; fixSrc = "pinned"; }
  else if (HAS_XCT){
    const x = readXCTrack();
    if (x){ fix = x; fixSrc = "XCTrack"; }
    else if (urlFix){ fix = urlFix; fixSrc = "URL"; }
    else { fix = null; fixSrc = "XCTrack"; }
  } else if (urlFix){ fix = urlFix; fixSrc = "URL"; }
  // geolocation assigns fix in its own callback

  const now   = Date.now();
  const trust = !!fix && fix.acc <= COARSE_M;
  const rows  = [];

  for (const z of zones){
    let d = null, b = 0;
    if (fix){
      // equirectangular: inside 1% out to 100 km, far cheaper than haversine
      const cosLat = Math.cos(fix.lat * 0.017453292519943295);
      const dx = (z.lon - fix.lon) * cosLat, dy = z.lat - fix.lat;
      d = Math.sqrt(dx*dx + dy*dy) * DEG_KM - z.r;
      b = Math.atan2(dx, dy) * 57.29577951308232;
    }
    const v = z.p ? validity(z, now) : {state:"none", until:""};
    rows.push({
      z:z, dist:d, brg:b,
      compass: fix ? COMPASS[(Math.round(b / 45) + 8) & 7] : "",
      inside: d !== null && d <= 0,
      state:v.state, until:v.until,
      excluded: isHidden(z),
      k:0, strict:true, visible:true
    });
  }

  if (fix) rows.sort(function(a,b){ return a.dist - b.dist; });

  /* keepNearest holds the closest zone the pilot has *not* switched off,
     so hiding Bern cannot drag Bern back the moment nothing else is in
     range. */
  let nearestKept = -1;
  rows.forEach(function(r, k){ if (nearestKept < 0 && !r.excluded) nearestKept = k; });

  let hidden = 0, shown = 0;
  rows.forEach(function(r, k){
    r.k = k;
    // without a trustworthy fix the limits are ignored: hiding zones
    // confidently on a bad position is worse than a longer list.
    // Excluded zones fail `strict`, so the widget never draws them, while
    // SHOW ALL still reaches them in app.html: hidden in the air, never
    // unreachable while planning.
    r.strict  = showAll || (!r.excluded && (!trust || (k < cfg.max && r.dist <= cfg.range)));
    r.visible = r.strict || (keepNearest && k === nearestKept);
    if (r.visible) shown++; else hidden++;
  });

  return {fix:fix, fixSrc:fixSrc, geoState:geoState, trust:trust,
          rows:rows, shown:shown, hidden:hidden, showAll:showAll};
}

function emit(){ if (onUpdate) onUpdate(compute()); }

/* ── public API ───────────────────────────────────────────────────── */

const HX = {
  SPEC: SPEC,
  HAS_XCT: HAS_XCT,
  NO_TEL: NO_TEL,
  PINNED: PINNED,
  USE_GEO: USE_GEO,

  get config(){ return cfg; },

  /* apply the theme param to <html> so CSS can pick it up */
  applyTheme: function(){
    const el = document.documentElement;
    if (cfg.theme === "auto") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", cfg.theme);
    el.setAttribute("data-valign", cfg.valign);
    el.style.setProperty("--scale", (1 + cfg.size / 100).toFixed(3));
  },

  start: function(cb, opts){
    onUpdate = cb;
    if (opts && opts.keepNearest === false) keepNearest = false;
    selectZones();
    this.applyTheme();
    if (USE_GEO) initGeo();
    run(true);
    document.addEventListener("visibilitychange", function(){ run(!document.hidden); });
    global.addEventListener("hashchange", function(){
      const u = parseUrlFix();
      if (u){ urlFix = u; emit(); }
    });
  },

  /* live settings change: no reload, URL kept shareable */
  setConfig: function(patch){
    let refreshChanged = false;
    for (const sp of SPEC){
      if (!(sp.key in patch)) continue;
      const v = clamp(sp, patch[sp.key]);
      if (v === null) continue;
      if (sp.key === "refresh" && v !== cfg.refresh) refreshChanged = true;
      cfg[sp.key] = v;
    }
    try { store.s(CFG_KEY, JSON.stringify(cfg)); } catch(e){}
    selectZones();
    this.applyTheme();
    this.syncUrl();
    if (refreshChanged){ run(false); run(true); } else emit();
  },

  resetConfig: function(){
    store.d(CFG_KEY);
    const fresh = {};
    for (const sp of SPEC) fresh[sp.key] = sp.def;
    this.setConfig(fresh);
  },

  /* build a shareable URL for a page with the current (or given) config */
  buildUrl: function(page, over){
    const c = Object.assign({}, cfg, over || {});
    const qs = [];
    for (const sp of SPEC) if (c[sp.key] !== sp.def) qs.push(sp.key + "=" + encodeURIComponent(c[sp.key]));
    return page + (qs.length ? "?" + qs.join("&") : "");
  },

  syncUrl: function(){
    if (!history.replaceState) return;
    const qs = [];
    for (const sp of SPEC) if (cfg[sp.key] !== sp.def) qs.push(sp.key + "=" + cfg[sp.key]);
    for (const k of ["lat","lng","lon","long","latitude","longitude","at","pin"])
      if (PARAMS.get(k)) qs.push(k + "=" + encodeURIComponent(PARAMS.get(k)));
    try { history.replaceState(null, "", location.pathname + (qs.length ? "?" + qs.join("&") : "")); } catch(e){}
  },

  /* Which ids and groups the hide parameter names, for the settings UI to
     tick its boxes against. Derived from cfg rather than the cached map,
     because the settings render before start() has ever called
     selectZones() and would otherwise show everything unticked. */
  hideSet: function(){ return parseHide(cfg.hide); },

  markCalled: function(id){ store.s("hx" + id, String(Date.now())); emit(); },
  clearCall:  function(id){ store.d("hx" + id); emit(); },

  requestLocation: function(){
    if (geoState === "insecure") return;
    if (watchId !== null){ navigator.geolocation.clearWatch(watchId); watchId = null; }
    startWatch();
  },

  setShowAll: function(v){ showAll = !!v; emit(); },

  /* widget style: 0 when inside, one decimal below 1 km, whole km above */
  fmtShort: function(d){
    if (d === null) return "";
    if (d <= 0) return "0";
    if (d < 1)  return d.toFixed(1);
    return String(Math.round(d));
  },
  /* standalone style: keeps a decimal until 10 km */
  fmtLong: function(d){
    if (d === null) return "-";
    if (d <= 0) return "INSIDE";
    if (d < 10) return d.toFixed(1);
    return String(Math.round(d));
  },

  refresh: emit
};

function run(on){
  if (on && !timer){ emit(); timer = setInterval(emit, cfg.refresh * 1000); }
  else if (!on && timer){ clearInterval(timer); timer = null; }
}

global.HX = HX;

})(window);

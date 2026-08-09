/* ══════════════════════════════════════════════════════════════════════
   HX CALL — zone data. The single source of truth for every page.

   id    unique, used as the storage key for the re-check clock
   n     full name (standalone)
   sn    short name (widget) — keep under ~14 chars, it may wrap
   w     subtitle: local landmarks, so you recognise it without a map
   p     phone digits for tel:  — omit entirely for "no number on file"
   s     phone number as displayed
   lat lon r   triage circle centre and radius in km
   grp   optional group token, so a whole category (heliports, say) can be
         switched off with one ?hide= token. Must not collide with any id
   rc    re-check: minutes, or an array of tape broadcast times "HH:MM"
   v     verified against the current AD INFO? set true once you check
   src   where the number came from
   note  anything a pilot needs to know before or after calling

   THE CIRCLES ARE NOT AIRSPACE BOUNDARIES. They are deliberately
   generous: an extra strip on screen costs nothing, a missing one
   costs a violation. Use your flight computer for actual boundaries.
   ══════════════════════════════════════════════════════════════════ */

window.HX_DATA_REV = "2026-08-09";

window.HX_ZONES = [

 {id:"mei", n:"Meiringen CTR + TMA 1-6", sn:"MEIRINGEN",
  w:"Haslital, Grimsel, Susten, Brienzersee",
  p:"0800496347", s:"0800 496 347", lat:46.744, lon:8.110, r:26,
  rc:["07:30","13:15","17:05"], v:false, src:"SHV Sonderregelung Meiringen",
  note:"Mnemonic 0800-HX-MEIR. If the tape is unclear: 058 461 67 06 (Flugdienstleiter) or 058 461 64 64 (Zentrale). You must call again by the next broadcast time."},

 {id:"zch", n:"Emmen CTR 1/2 + TMA · Buochs CTR · Alpnach CTR", sn:"EMMEN BUOCHS ALPNACH",
  w:"Pilatus, Stanserhorn, Entlebuch",
  p:"+41416209106", s:"041 620 91 06", lat:47.020, lon:8.300, r:26,
  rc:30, v:false, src:"LSZC AD INFO 10.5.1",
  note:"One call covers all four zones, H24. Emmen CTR 2 is only active in IMC. The local hang-glider Sonderregelung for this area is stricter than the general HX rule."},

 {id:"brn", n:"Bern CTR + TMA sectors", sn:"BERN",
  w:"Belpberg, Gantrisch, Emmental",
  p:"+41224174076", s:"022 417 40 76", lat:46.914, lon:7.497, r:30,
  rc:15, v:false, src:"SHV, valid from 19.03.2026",
  note:"Listen for \"is not active\" / \"will be activated\" / \"is active\". On \"will be activated\", leave immediately. Re-query every 15 minutes."},

 {id:"bsl", n:"Basel TMA Tango T1-T3", sn:"BASEL T1-3",
  w:"Jura, Weissenstein, Delémont",
  p:"+41613253467", s:"061 325 34 67", lat:47.350, lon:7.480, r:34,
  rc:30, v:false, src:"SHV Luftraumbroschüre 2026",
  note:"Active during Basel south approaches, but can be activated at any time of day at 30 minutes' notice."},

 {id:"zrh", n:"Zürich TMA Sierra S1-S3", sn:"ZÜRICH S1-3",
  w:"Albis, Zugerberg, Einsiedeln",
  p:"+41438162295", s:"043 816 22 95", lat:47.200, lon:8.550, r:30,
  rc:30, v:true, src:"SHV Luftraumbroschüre 2026 · called 09.08.2026",
  note:"Mostly mornings and evenings for Zürich south approaches, but can be activated outside those hours."},

 /* ── HX with no number sourced yet ──────────────────────────────────
    Listed on purpose. A missing entry would read as "no HX here",
    which is the dangerous failure. Hide them with ?nonum=0.        */

 {id:"pay", n:"Payerne CTR + TMA 1-5", sn:"PAYERNE", w:"Broye, Jura sud",
  lat:46.843, lon:6.915, r:30, note:"See LSMP AD INFO in the eVFR Manual."},

 {id:"dub", n:"Dübendorf CTR + TMA", sn:"DÜBENDORF", w:"Zürcher Oberland, Pfannenstiel",
  lat:47.398, lon:8.648, r:18, note:"See LSMD AD INFO."},

 {id:"sio", n:"Sion CTR", sn:"SION", w:"Rhonetal, Rawil, Sanetsch",
  p:"+41224174080", s:"022 417 40 80", lat:46.219, lon:7.327, r:16,
  rc:30, v:false, src:"Sion Airport pilot info, 09.08.2026",
  note:"ATIS tape on the same Skyguide bank as Bern. CTR only - the Sion TMAs are TEMPO and come with your airspace update."},

 {id:"loc", n:"Locarno CTR + TMA", sn:"LOCARNO", w:"Maggiatal, Centovalli",
  p:"+41918161744", s:"091 816 17 44", lat:46.161, lon:8.879, r:16,
  rc:30, v:false, src:"SHV TMA Locarno Statusinfo (22.07.2019)",
  note:"ATIS tape, and the only legally binding source. \"Tower and Flight Information Service not active\" or \"Flight Information Service active\" both mean CTR and TMA are off; \"Control Zone active\" is the CTR only; \"Control Zone and Terminal Area active\" is both. The club's Facebook forecast is informational only."},

 {id:"lug", n:"Lugano CTR + TMA", sn:"LUGANO", w:"Malcantone, Monte Tamaro",
  lat:46.004, lon:8.910, r:16, note:"See LSZA AD INFO."},

 {id:"stg", n:"St. Gallen-Altenrhein CTR + TMA", sn:"ST. GALLEN", w:"Rheintal, Appenzell",
  lat:47.485, lon:9.561, r:16,
  note:"See LSZR AD INFO. Note the cross-border TMZ with Friedrichshafen."},

 {id:"gre", n:"Grenchen CTR + TMA", sn:"GRENCHEN", w:"Weissenstein, Jurasüdfuss",
  p:"+41323966900", s:"032 396 69 00", lat:47.182, lon:7.417, r:14,
  rc:30, v:false, src:"DC Weissenstein, 09.08.2026",
  note:"This one is the tower, not a tape - a controller answers. Inside an active CTR you need a clearance, and they can refuse it or attach conditions. An RMZ of the same lateral size applies below 600 m AGL when the CTR is off. Keep 5 km from the runways regardless."},

 {id:"epl", n:"Les Eplatures CTR + TMA", sn:"EPLATURES", w:"Neuchâtel Jura, Chasseral",
  lat:47.084, lon:6.793, r:14, note:"See LSGC AD INFO."}
];

/* ══════════════════════════════════════════════════════════════════════
   HX CALL — service worker registration.

   Kept apart from core.js, which has no side effects by design. Every
   failure path is swallowed on purpose: an old Android WebView that has no
   service worker, or an XCTrack build that refuses to register one, must
   still get a working phone list. Offline is an enhancement here, never a
   dependency.
   ══════════════════════════════════════════════════════════════════ */

(function(){
"use strict";

if (!navigator.serviceWorker) return;

// Service workers need a secure context; file:// and plain http never qualify.
if (location.protocol !== "https:" &&
    location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

window.addEventListener("load", function(){
  try {
    navigator.serviceWorker.register("sw.js").catch(function(){});
  } catch(e){}
});

})();

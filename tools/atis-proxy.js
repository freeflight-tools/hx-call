/* ══════════════════════════════════════════════════════════════════════
   HX CALL: ATIS dev proxy.

   `bern.pdcs.ch/php/Atis.php` sends no `access-control-allow-origin`
   header (measured 2026-08-19, GET and preflight OPTIONS alike), so a
   browser will not hand its body to a page served from anywhere else.
   That is the ONLY thing between hx/live.js and a working Bern chip.

   Three ways out, best first:

   1. Ask pdcs.ch to add the header. One line on their side, no server on
      ours, and it stays their data with their disclaimer attached.
   2. Deploy the eight-line Cloudflare Worker at the bottom of this file and
      point `SRC` in hx/live.js at it. A separate host behind a feature
      flag, which is what CLAUDE.md allows; the offline core stays static.
   3. This file, for testing on a laptop. NOT for production: no cache, no
      rate limit, one process.

       node tools/atis-proxy.js            # http://localhost:8081/
       # then set SRC in hx/live.js to http://localhost:8081/?r=1

   Be a decent neighbour either way: one request a minute, no tighter, and
   the reading belongs to Para-Deltaclub Stockhorn, not to us.
   ══════════════════════════════════════════════════════════════════ */

const http  = require("http");
const https = require("https");

const UP   = "https://bern.pdcs.ch/php/Atis.php";
const PORT = +process.env.PORT || 8081;

http.createServer(function(req, res){
  const q = req.url.indexOf("?") >= 0 ? req.url.slice(req.url.indexOf("?")) : "";

  https.get(UP + q, {headers:{accept:"application/json"}}, function(up){
    let body = "";
    up.setEncoding("utf8");
    up.on("data", function(c){ body += c; });
    up.on("end", function(){
      res.writeHead(up.statusCode || 502, {
        "content-type": up.headers["content-type"] || "text/plain",
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      });
      res.end(body);
      console.log(new Date().toISOString(), up.statusCode, q, body.length + "b");
    });
  }).on("error", function(e){
    res.writeHead(502, {"access-control-allow-origin":"*"});
    res.end(String(e.message));
    console.error("upstream:", e.message);
  });
}).listen(PORT, function(){
  console.log("ATIS dev proxy on http://localhost:" + PORT + "/  ->  " + UP);
});

/* ── the production version, as a Cloudflare Worker ────────────────────

export default {
  async fetch(request) {
    const q = new URL(request.url).search;
    const up = await fetch("https://bern.pdcs.ch/php/Atis.php" + q, {
      cf: {cacheTtl: 30, cacheEverything: true}     // never hit them faster
    });
    return new Response(up.body, {
      status: up.status,
      headers: {
        "content-type": up.headers.get("content-type") || "text/plain",
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      }
    });
  }
};

   ────────────────────────────────────────────────────────────────────── */

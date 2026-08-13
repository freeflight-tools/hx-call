/* ══════════════════════════════════════════════════════════════════════
   HX CALL: settings fields, generated from HX.SPEC.

   Shared by app.html and index.html so the two can never drift apart, and
   so a new parameter needs no hand-written control anywhere. The markup is
   deliberately plain: a .field row holding a <label> with a <small> hint
   and one input, and each page styles it to taste.

   The only DOM-touching file besides the pages themselves. core.js stays
   clean of it, which is what keeps the engine testable.

     const f = HX.fields(el, {skipWidgetOnly:true, onChange:fn});
     f.reload();        // pull values back out of HX.config, e.g. after reset

   Not loaded by widget.html: it has no settings.
   ══════════════════════════════════════════════════════════════════ */

(function(global){
"use strict";

const HX = global.HX = global.HX || {};

/* ── the hide list: one collapsed row holding a checkbox per zone ─────
   Left expandable rather than inline because thirteen entries, and more
   once heliports arrive, would bury every other setting. */

function buildSet(sp, onInput){
  const row = document.createElement("details");
  row.className = "field set";

  const sum = document.createElement("summary");
  row.appendChild(sum);

  const hint = document.createElement("small");
  hint.textContent = sp.hint;
  sum.appendChild(hint);

  const list = document.createElement("div");
  list.className = "setlist";
  row.appendChild(list);

  const zones = global.HX_ZONES || [];
  const boxes = [];

  for (const z of zones){
    const lab = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = z.id;
    lab.appendChild(box);
    lab.appendChild(document.createTextNode(z.n));
    if (!z.p){
      const tag = document.createElement("i");
      tag.textContent = "no number";
      lab.appendChild(tag);
    }
    list.appendChild(lab);
    boxes.push(box);

    box.addEventListener("change", function(){
      /* rebuilt in data order every time, so the value is canonical no
         matter which order the boxes were ticked in */
      const on = boxes.filter(function(b){ return b.checked; })
                      .map(function(b){ return b.value; });
      onInput(on.join(","));
    });
  }

  function load(){
    const set = HX.hideSet();
    let n = 0;
    for (const b of boxes){
      b.checked = !!set[b.value];
      if (b.checked) n++;
    }
    sum.firstChild.nodeValue = sp.label + " · " + (n ? n + " hidden" : "none");
  }

  sum.insertBefore(document.createTextNode(""), hint);
  return {el:row, load:load};
}

/* ── one ordinary row ─────────────────────────────────────────────── */

function buildField(sp, onInput){
  const row = document.createElement("div");
  row.className = "field";

  const lab = document.createElement("label");
  lab.htmlFor = "f_" + sp.key;
  lab.appendChild(document.createTextNode(sp.label + (sp.unit ? " (" + sp.unit + ")" : "")));
  const hint = document.createElement("small");
  hint.textContent = sp.hint;
  lab.appendChild(hint);
  row.appendChild(lab);

  let input;
  if (sp.type === "enum"){
    input = document.createElement("select");
    for (const o of sp.options){
      const op = document.createElement("option");
      op.value = o; op.textContent = o;
      input.appendChild(op);
    }
  } else if (sp.type === "bool"){
    input = document.createElement("input");
    input.type = "checkbox";
  } else {
    input = document.createElement("input");
    input.type = "number";
    input.min = sp.min; input.max = sp.max; input.inputMode = "numeric";
  }
  input.id = "f_" + sp.key;
  row.appendChild(input);

  function load(){
    const v = HX.config[sp.key];
    if (sp.type === "bool") input.checked = !!v; else input.value = v;
  }

  input.addEventListener("change", function(){
    onInput(sp.type === "bool" ? (input.checked ? 1 : 0) : input.value);
  });

  return {el:row, load:load};
}

/* ── public ───────────────────────────────────────────────────────── */

HX.fields = function(container, opts){
  const o = opts || {};
  const built = [];

  for (const sp of HX.SPEC){
    if (o.skipWidgetOnly && sp.only === "widget") continue;

    const apply = function(value){
      const patch = {};
      patch[sp.key] = value;
      HX.setConfig(patch);
      reload();                       // reflect clamping back into the fields
      if (o.onChange) o.onChange();
    };

    const f = sp.type === "set" ? buildSet(sp, apply) : buildField(sp, apply);
    f.load();
    container.appendChild(f.el);
    built.push(f);
  }

  function reload(){ for (const f of built) f.load(); }

  return {reload:reload};
};

})(window);

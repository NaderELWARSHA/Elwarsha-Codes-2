/* =====================================================================
   eng-dedupe.js — كشف التكرار والدمج لأكواد الأعطال والكباسات (v15.1)
   محرك نقي بلا DOM (يُختبر في Node). لا يغيّر أي بيانات بنفسه: يرجع خطط
   وتقارير، والواجهة هي اللي تنفّذ بعد موافقة المستخدم.
   - مكرر «مؤكد»: نفس المفتاح بعد توحيد الكتابة (همزات، تاء مربوطة، أرقام
     عربية، مسافات وشرطات) — هو نفس مفتاح الاستيراد في sync.js.
   - «شبيه» (محتمل): نفس الماركة وكود/موديل متقارب: أصفار بادئة (E01=E1)،
     حرف O مكان صفر، I/L مكان 1، أو نفس الكود مع فئة/موديل ناقص في أحدهما.
   ===================================================================== */
(function (g) {
  "use strict";
  const normAr = v => String(v ?? "").toLowerCase().normalize("NFKC")
    .replace(/[ً-ٰٟ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ـ/g, "")
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\s\-_./\\]+/g, "").trim();

  /* الماركة: «إل جي (LG)» و«LG» و«ال جى» تبقى واحدة لو فيها اسم لاتيني بين قوسين */
  const brandKey = b => { const s = String(b ?? ""), m = s.match(/\(([^)]+)\)/); return normAr(m ? m[1] : s); };

  /* كود/موديل «قريب» (للمقارنة فقط): O→0 ، I/L→1 ، وحذف الأصفار البادئة في كل مجموعة أرقام */
  const nearKey = v => normAr(v).toUpperCase()
    .replace(/O/g, "0").replace(/[IL]/g, "1") // للمقارنة بس: O↔0 و I/L↔1 أشهر لخبطة في أرقام الموديلات
    .replace(/(^|[^0-9])0+(?=\d)/g, "$1");

  /* نفس مفتاح الاستيراد في sync.js */
  const faultKey = r => [r.kind === "test" ? "test" : "", r.deviceType, r.brand, r.category, r.model, r.kind === "test" ? r.title : r.code].map(normAr).join("|");
  /* مفتاح الكاشف: زي مفتاح الاستيراد بس الماركة بـ brandKey («إل جي (LG)» = «LG») */
  const faultKeyB = r => [r.kind === "test" ? "test" : "", normAr(r.deviceType), brandKey(r.brand), normAr(r.category), normAr(r.model), normAr(r.kind === "test" ? r.title : r.code)].join("|");
  /* الشبيه لازم يكون لنفس الجهاز: نوع الجهاز والفئة والموديل متساويين أو واحد فيهم فاضي
     (E1 في موديل 8 كيلو و E01 في موديل فول أوتوماتيك تاني مش تكرار — دي أكواد موديلات مختلفة) */
  const nearCompat = (a, b) => ["deviceType", "category", "model"].every(f => { const x = normAr(a && a[f]), y = normAr(b && b[f]); return !x || !y || x === y; });
  const nearKeyF = r => [r.kind === "test" ? "test" : "", brandKey(r.brand), nearKey(r.kind === "test" ? r.title : r.code)].join("|");
  const faultLabel = r => (r.kind === "test" ? "تيست مود: " + (r.title || "") : (r.code || "")) + " — " + (r.brand || "كل الماركات") + (r.deviceType ? " · " + r.deviceType : "") + (r.model ? " · " + r.model : "");

  /* تجميع: يرجع مجموعات مؤكدة ومجموعات شبيهة (كل مجموعة ≥ 2) بدون تكرار نفس الزوج */
  function groupBy(list, keyFn) { const m = new Map(); list.forEach((x, i) => { const k = keyFn(x); if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(i); }); return [...m.values()].filter(a => a.length > 1); }

  function faultDups(faults) {
    const L = faults || [];
    const exact = groupBy(L, faultKeyB).map(ix => ({ type: "exact", ids: ix.map(i => L[i].id), why: "نفس الكود والماركة ونوع الجهاز والفئة والموديل (بعد توحيد الكتابة)" }));
    const inExact = new Set(exact.flatMap(g => g.ids.join("|")));
    const near = [];
    groupBy(L, nearKeyF).forEach(ix => {
      ix = ix.filter(i => ix.some(j => j !== i && nearCompat(L[i], L[j]))); if (ix.length < 2) return;
      const ids = ix.map(i => L[i].id); if (inExact.has(ids.join("|"))) return;
      const ex = exact.find(g => g.ids.every(id => ids.includes(id))); if (ex && ex.ids.length == ids.length) return;
      const recs = ix.map(i => L[i]), sameCode = new Set(recs.map(r => normAr(r.kind === "test" ? r.title : r.code))).size == 1;
      const why = sameCode ? "نفس الكود والماركة، والفرق في نوع الجهاز/الفئة/الموديل (ممكن واحد فيهم ناقص)" : "كود متقارب لنفس الماركة (" + [...new Set(recs.map(r => r.code || r.title))].join(" ≈ ") + ")";
      near.push({ type: "near", ids, why });
    });
    return { exact, near, label: id => { const r = L.find(x => x.id == id); return r ? faultLabel(r) : id; } };
  }

  /* الكباسات المضافة: مكرر بينها، وشبيه، وموجود أصلًا في القاعدة المرجعية */
  function compDups(custom, baseDb) {
    const L = custom || [], key = c => brandKey(c.brand) + "|" + normAr(c.rec && c.rec.model);
    const exact = groupBy(L, key).map(ix => ({ type: "exact", ids: ix.map(i => L[i].id), why: "نفس الماركة والموديل" }));
    const done = new Set(exact.map(g => g.ids.join("|")));
    const near = [];
    groupBy(L, c => brandKey(c.brand) + "|" + nearKey(c.rec && c.rec.model)).forEach(ix => { const ids = ix.map(i => L[i].id); if (!done.has(ids.join("|"))) near.push({ type: "near", ids, why: "موديل متقارب لنفس الماركة (" + ix.map(i => L[i].rec.model).join(" ≈ ") + ")" }); });
    const inBase = [];
    if (baseDb) {
      const bk = new Map(); Object.entries(baseDb).forEach(([b, rows]) => (rows || []).forEach(r => { bk.set(brandKey(b) + "|" + normAr(r.model), b); bk.set("*|" + normAr(r.model), b); }));
      L.forEach(c => { const m = normAr(c.rec && c.rec.model), b = bk.get(brandKey(c.brand) + "|" + m) || bk.get("*|" + m); if (b) inBase.push({ type: "base", ids: [c.id], baseBrand: b, why: `الموديل موجود في القاعدة المرجعية تحت «${b}»` }); });
    }
    return { exact, near, inBase, label: id => { const c = L.find(x => x.id == id); return c ? (c.rec.model + " — " + c.brand) : id; } };
  }

  /* ---------------- الدمج ---------------- */
  const empty = v => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v == "object" && !Array.isArray(v) && !Object.keys(v).length);
  const same = (a, b) => typeof a == "object" || typeof b == "object" ? JSON.stringify(a) === JSON.stringify(b) : normAr(a) === normAr(b);
  /* مقارنة خانة بخانة: same / onlyA / onlyB / conflict */
  function compare(a, b, fields) {
    return fields.map(k => { const x = a[k], y = b[k]; const st = empty(x) && empty(y) ? "none" : empty(y) ? "onlyA" : empty(x) ? "onlyB" : same(x, y) ? "same" : "conflict"; return { k, a: x, b: y, st }; }).filter(r => r.st != "none");
  }
  /* اختيار افتراضي ذكي: الموجود عند واحد بس يتاخد، والتعارض في النصوص الطويلة «الاتنين» */
  function defaultChoice(rows, textFields) { const c = {}; rows.forEach(r => { c[r.k] = r.st == "onlyB" ? "b" : r.st == "conflict" && (textFields || []).includes(r.k) ? "both" : "a"; }); return c; }
  /* جمع نصين بدون تكرار السطور المتطابقة */
  function joinText(x, y) { const A = String(x || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean), seen = new Set(A.map(normAr)); String(y || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(s => { if (!seen.has(normAr(s))) { A.push(s); seen.add(normAr(s)); } }); return A.join("\n"); }
  /* تنفيذ الدمج على نسخة: A هو الباقي (يحتفظ بمعرفه وتاريخ إنشائه)، B يُحذف */
  function applyMerge(a, b, fields, choice) {
    const out = JSON.parse(JSON.stringify(a));
    fields.forEach(k => { const c = choice[k]; if (c == "b") { if (empty(b[k])) delete out[k]; else out[k] = JSON.parse(JSON.stringify(b[k])); } else if (c == "both") { if (typeof a[k] == "object" || typeof b[k] == "object") out[k] = Object.assign({}, b[k] || {}, a[k] || {}); else out[k] = joinText(a[k], b[k]); } });
    const imgs = [...new Set([...(a.imgs || []), ...(b.imgs || [])])]; if (imgs.length) out.imgs = imgs;
    return out;
  }
  /* «كمّل الناقص»: سجل وارد يطابق سجل موجود → الخانات الفاضية بس تتملي (ولا قيمة موجودة تتغير) */
  function fillMissing(existing, incoming, fields) {
    const out = JSON.parse(JSON.stringify(existing)), filled = [], differ = [];
    fields.forEach(k => { const v = incoming[k]; if (empty(v)) return; if (empty(existing[k])) { out[k] = JSON.parse(JSON.stringify(v)); filled.push(k); } else if (!same(existing[k], v)) differ.push(k); });
    if (incoming.temp_capacity && existing.temp_capacity) { const tc = Object.assign({}, existing.temp_capacity); let n = 0; Object.entries(incoming.temp_capacity).forEach(([t, v]) => { if (tc[t] == null) { tc[t] = v; n++; } }); if (n) { out.temp_capacity = tc; if (!filled.includes("temp_capacity")) filled.push("temp_capacity"); } }
    return { rec: out, filled, differ };
  }
  /* تحويل الروابط المحفوظة (مفضلة/سجل تصفح) من السجل المحذوف للباقي */
  function remapLinks(list, from, to) { return (list || []).map(x => x && x.h === from ? { ...x, h: to } : x).filter((x, i, a) => !x || a.findIndex(y => y && x && y.h === x.h) === i); }

  const api = { normAr, brandKey, nearKey, nearKeyF, nearCompat, faultKey, faultKeyB, faultLabel, faultDups, compDups, compare, defaultChoice, joinText, applyMerge, fillMissing, remapLinks, empty };
  if (typeof module == "object" && module.exports) module.exports = api; else g.DUP = api;
})(typeof window != "undefined" ? window : globalThis);

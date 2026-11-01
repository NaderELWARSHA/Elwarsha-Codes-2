/* =====================================================================
   eng-pack.js — «حزمة المرجع» (v15.3): بيانات صاحب البرنامج تبقى مرجع لكل اللي بيفتح اللينك
   ---------------------------------------------------------------------
   • صاحب البرنامج بينزّل data-pack.json من الإدارة ويرفعه مع ملفات البرنامج.
   • أي جهاز يفتح البرنامج بيقرا الحزمة ويدمجها في بياناته المحلية **دمج ثلاثي**:
       - سجل جديد في الحزمة ← يتضاف.
       - سجل اتعدّل في الحزمة والمستخدم ما لمسوش ← يتحدّث.
       - المستخدم عدّل السجل ← نسخته هي اللي تفضل (ما نكتبش فوق شغله).
       - المستخدم مسح سجل جاي من الحزمة ← ما يرجعش تاني.
       - سجل اتشال من الحزمة والمستخدم ما لمسوش ← يتشال.
       - سجل المستخدم نفسه (مش من الحزمة) ← عمره ما يتلمس.
   • التتبع في inst: لكل سجل «بصمة» (hash) نسخة الحزمة اللي اتركّبت عنده.
   • الحزمة ما فيهاش أي حاجة شخصية: لا قياسات، لا ضفائر، لا سجل، لا مفضلة، لا قفل الإدارة، ولا صور.
   محرك نقي بلا DOM (يُختبر في Node).
   ===================================================================== */
(function (g) {
  "use strict";
  const isObj = o => o && typeof o == "object" && !Array.isArray(o);
  const VOLATILE = new Set(["imgs", "createdAt", "updatedAt", "addedAt", "source", "_i", "_legacy", "_builtin", "_edited"]);
  /* JSON بمفاتيح مترتبة ومن غير الخانات المتغيرة — عشان نفس المحتوى = نفس البصمة */
  const canon = v => Array.isArray(v) ? "[" + v.map(canon).join(",") + "]" : isObj(v) ? "{" + Object.keys(v).filter(k => !VOLATILE.has(k) && v[k] !== undefined).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}" : JSON.stringify(v === undefined ? null : v);
  function hash(v) { const s = canon(v); let h1 = 0x811c9dc5, h2 = 0; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = (h2 * 31 + c) >>> 0; } return h1.toString(36) + h2.toString(36) + s.length.toString(36); }
  const strip = r => { const o = {}; Object.keys(r || {}).forEach(k => { if (!VOLATILE.has(k)) o[k] = r[k]; }); return o; };
  const keyOf = r => r && (r.id != null && r.id !== "" ? "id:" + r.id : "h:" + hash(r));
  const KEYS = { sensors: r => r && (r.id ? "id:" + r.id : "s:" + [r.brand || "", r.name || ""].join("|")) };

  const FORMAT = "mrf-pack";
  /* بناء الحزمة من بيانات صاحب البرنامج */
  function build(st, opt) {
    opt = Object.assign({ faults: true, custom: true, content: true, lists: true }, opt || {});
    const p = { format: FORMAT, v: 1, ver: opt.ver || new Date().toISOString(), app: opt.app || "", note: opt.note || "" };
    if (opt.faults) p.faults = (st.faults || []).map(strip);
    if (opt.custom) p.custom = (st.custom || []).map(strip);
    if (opt.content) {
      p.cms = {}; Object.entries(st.cms || {}).forEach(([k, s]) => { if (isObj(s)) p.cms[k] = { items: isObj(s.items) ? Object.fromEntries(Object.entries(s.items).map(([id, r]) => [id, strip(r)])) : {}, deleted: Array.isArray(s.deleted) ? s.deleted.slice() : [] }; });
      p.lib = {}; Object.entries(st.lib || {}).forEach(([k, a]) => { if (Array.isArray(a)) p.lib[k] = a.map(strip); });
      p.flows = (st.flows || []).map(strip); p.sensors = (st.sensors || []).map(strip);
    }
    if (opt.lists && isObj(st.lists)) p.lists = JSON.parse(JSON.stringify(st.lists));
    p.counts = count(p);
    return p;
  }
  function count(p) { return { faults: (p.faults || []).filter(r => r.kind != "test").length, tests: (p.faults || []).filter(r => r.kind == "test").length, custom: (p.custom || []).length, content: Object.values(p.cms || {}).reduce((s, x) => s + Object.keys(x.items || {}).length, 0) + Object.values(p.lib || {}).reduce((s, a) => s + a.length, 0) + (p.flows || []).length + (p.sensors || []).length }; }
  function validate(p) { if (!isObj(p) || p.format !== FORMAT) return "الملف مش حزمة مرجع"; if (!p.ver) return "الحزمة فاضية"; for (const k of ["faults", "custom", "flows", "sensors"]) if (p[k] != null && !Array.isArray(p[k])) return "الحزمة تالفة (" + k + ")"; return ""; }

  /* دمج قائمة: local وpack مصفوفات، inst = {key: بصمة النسخة المركّبة} */
  function mergeArr(local, pack, inst, keyFn, keepLocal) {
    keyFn = keyFn || keyOf; inst = Object.assign({}, inst || {}); const st = { added: 0, updated: 0, removed: 0, kept: 0 };
    const out = (local || []).slice(), idx = new Map(out.map((r, i) => [keyFn(r), i])), inPack = new Set();
    (pack || []).forEach(p => {
      const k = keyFn(p), h = hash(p); inPack.add(k); const i = idx.get(k);
      if (i != null) {
        const L = out[i], lh = hash(L);
        if (inst[k] == null) { if (lh == h) inst[k] = h; else st.kept++; }            // سجل عنده من قبل: لو زي الحزمة يتبنّى، غير كده بتاعه
        else if (lh == inst[k]) { if (lh != h) { out[i] = keepLocal ? keepLocal(L, p) : p; st.updated++; } inst[k] = h; } // ما اتلمسش ← يتحدّث
        else st.kept++;                                                                  // اتعدّل عنده ← نسخته
      } else if (inst[k] == null) { idx.set(k, out.length); out.push(p); inst[k] = h; st.added++; } // جديد
      // inst[k] موجود والسجل مش عنده = المستخدم مسحه ← ما يرجعش
    });
    const drop = new Set();
    Object.keys(inst).forEach(k => { if (inPack.has(k)) return; const i = idx.get(k); if (i != null && hash(out[i]) == inst[k]) { drop.add(i); st.removed++; } delete inst[k]; });
    return { list: drop.size ? out.filter((_, i) => !drop.has(i)) : out, inst, st };
  }
  const add = (a, b) => { ["added", "updated", "removed", "kept"].forEach(k => a[k] += b[k]); return a; };
  const uniq = a => [...new Set(a)];
  /* الدمج الكامل. local = {faults, custom, cms, lib, flows, sensors, lists} ، inst0 = سجل التركيب السابق */
  function apply(local, pack, inst0) {
    const e = validate(pack); if (e) return { err: e };
    const I = isObj(inst0) ? JSON.parse(JSON.stringify(inst0)) : {}, out = Object.assign({}, local), S = { added: 0, updated: 0, removed: 0, kept: 0 };
    const keepImgs = (L, p) => L.imgs && L.imgs.length ? Object.assign({}, p, { imgs: L.imgs }) : p;
    const stamp = (L, p) => Object.assign({}, p, L.createdAt ? { createdAt: L.createdAt } : {}, L.source ? { source: L.source } : {});
    if (pack.faults) { const r = mergeArr(local.faults, pack.faults.map(x => Object.assign({}, x, { source: "pack", createdAt: pack.ver, updatedAt: pack.ver })), I.faults, null, (L, p) => keepImgs(L, stamp(L, p))); out.faults = r.list; I.faults = r.inst; add(S, r.st); }
    if (pack.custom) { const r = mergeArr(local.custom, pack.custom, I.custom, null, keepImgs); out.custom = r.list; I.custom = r.inst; add(S, r.st); }
    ["flows", "sensors"].forEach(k => { if (pack[k]) { const r = mergeArr(local[k], pack[k], I[k], KEYS[k]); out[k] = r.list; I[k] = r.inst; add(S, r.st); } });
    if (pack.lib) { out.lib = Object.assign({}, local.lib || {}); I.lib = I.lib || {}; Object.entries(pack.lib).forEach(([k, a]) => { const r = mergeArr((local.lib || {})[k], a, I.lib[k]); out.lib[k] = r.list; I.lib[k] = r.inst; add(S, r.st); }); }
    if (pack.cms) {
      out.cms = Object.assign({}, local.cms || {}); I.cms = I.cms || {};
      Object.entries(pack.cms).forEach(([k, ps]) => {
        const ls = isObj(out.cms[k]) ? out.cms[k] : { items: {}, deleted: [] }, items = isObj(ls.items) ? ls.items : {};
        const L = Object.entries(items).map(([id, r]) => Object.assign({}, r, { id })), P = Object.entries(ps.items || {}).map(([id, r]) => Object.assign({}, r, { id }));
        const r = mergeArr(L, P, I.cms[k]); I.cms[k] = r.inst; add(S, r.st);
        out.cms[k] = { items: Object.fromEntries(r.list.map(x => { const o = Object.assign({}, x); return [x.id, o]; })), deleted: uniq((Array.isArray(ls.deleted) ? ls.deleted : []).concat(ps.deleted || [])) };
      });
    }
    if (pack.lists && isObj(pack.lists)) {
      const L = isObj(local.lists) ? JSON.parse(JSON.stringify(local.lists)) : {};
      Object.entries(pack.lists).forEach(([k, v]) => { if (Array.isArray(v)) L[k] = uniq((Array.isArray(L[k]) ? L[k] : []).concat(v)); else if (isObj(v)) { L[k] = isObj(L[k]) ? L[k] : {}; Object.entries(v).forEach(([d, a]) => { if (Array.isArray(a)) L[k][d] = uniq((Array.isArray(L[k][d]) ? L[k][d] : []).concat(a)); }); } });
      out.lists = L;
    }
    I.ver = pack.ver; I.at = new Date().toISOString();
    return { local: out, inst: I, stats: S };
  }
  /* السجل ده جاي من المرجع وما اتعدّلش؟ (للشارة 📚) */
  const fromPack = (inst, coll, r) => !!(inst && inst[coll] && r && inst[coll]["id:" + r.id] && inst[coll]["id:" + r.id] == hash(r));

  const api = { FORMAT, hash, canon, strip, build, count, validate, mergeArr, apply, fromPack };
  if (typeof module == "object" && module.exports) module.exports = api; else g.PK = api;
})(typeof window != "undefined" ? window : globalThis);

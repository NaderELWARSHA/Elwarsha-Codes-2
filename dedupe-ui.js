/* =====================================================================
   dedupe-ui.js — واجهات v15.1:
   • #/dups            كاشف التكرار (مؤكد + شبيه + موجود في القاعدة) مع «مش مكرر»
   • #/merge/f|c/A/B   شاشة دمج سجلين خانة بخانة (A يبقى، B يتشال)
   • #/import          استيراد Excel / CSV / JSON للكباسات وأكواد الأعطال:
                       مطابقة الأعمدة ← معاينة (جديد/شبيه/يكمّل الناقص/موجود/مرفوض) ← اعتماد
   • تنبيه التكرار وانت بتكتب في نموذج الإضافة + تأكيد قبل حفظ مكرر مؤكد
   • تصدير Excel وقوالب Excel فاضية
   يُحمَّل قبل app.js ويستخدم دواله (D, commit, snap, base, comps, Y, dl, readFile…)
   وقت التشغيل فقط. كل تعديل للبيانات: لقطة قبله (snap) + سجل التغييرات، والتراجع
   من «الإدارة ← تراجع عن آخر تغيير».
   ===================================================================== */
(function (g) {
  "use strict";
  const E = s => MR.e(s), $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const st = () => MR.makeStore(localStorage);
  const XMIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const IGN = "mw_dupign";
  const ign = () => new Set(st().get(IGN, []) || []);
  const pairKey = ids => ids.slice().sort().join("|");
  const FFIELDS = () => Y.FK, TFIELDS = () => Y.TK, CFIELDS = () => ["brand", "model", ...Y.CK, "temp_capacity"];
  const TEXTF = ["cause", "fix", "note", "notes", "enter", "tests", "exit", "srcNote", "compat_doc"];
  const lab = k => (typeof LB != "undefined" && LB[k]) || ({ model: "الموديل", brand: "الماركة", temp_capacity: "القدرة عند درجات التبخير", code: "كود العطل", imgs: "الصور" })[k] || k;
  const val = v => v == null || v === "" ? '<span class="mu">—</span>' : typeof v == "object" ? `<span dir="ltr">${E(Object.entries(v).map(([a, b]) => a + ": " + b).join(" · "))}</span>` : E(String(v)).replace(/\n/g, "<br>");
  const compFlat = c => ({ brand: c.brand, ...c.rec });
  const gate = fn => { if (!admin) { ADM.gate(app, fn); return false; } return true; };

  /* ================= كاشف التكرار ================= */
  async function page() {
    if (!gate(page)) return;
    app.innerHTML = `<p class="mu">⏳ جارٍ الفحص…</p>`;
    let B = null; try { B = await base(); } catch (e) { B = null; }
    learn(); const I = ign(), fd = DUP.faultDups(D.faults), cd = DUP.compDups(D.custom, B);
    const keep = g => !I.has(pairKey(g.ids));
    const F = { exact: fd.exact.filter(keep), near: fd.near.filter(keep) }, C = { exact: cd.exact.filter(keep), near: cd.near.filter(keep), inBase: cd.inBase.filter(keep) };
    const tot = F.exact.length + F.near.length + C.exact.length + C.near.length + C.inBase.length;
    const fLink = id => { const r = D.faults.find(x => x.id == id); return `<a href="#/fault/${E(id)}">${E(DUP.faultLabel(r))}</a>`; };
    const cIdx = id => { const k = D.custom.findIndex(x => x.id == id); return CL ? CL.length + k : -1; };
    const cLink = id => { const c = D.custom.find(x => x.id == id); return `<a href="#/comp/${cIdx(id)}">${E(c.rec.model + " — " + c.brand)}</a>`; };
    const grp = (g, kind) => `<div class="item dup-g ${g.type}" data-ids="${E(g.ids.join("|"))}"><div class="chips"><span class="chip ${g.type == "exact" ? "st-bad" : g.type == "base" ? "st-info" : "st-warn"}">${g.type == "exact" ? "مكرر مؤكد" : g.type == "base" ? "موجود في القاعدة" : "شبيه — راجع"}</span><span class="mu">${E(g.why)}</span></div>
      <ol>${g.ids.map(id => `<li>${kind == "f" ? fLink(id) : cLink(id)}</li>`).join("")}</ol>
      <div class="row">${g.type != "base" ? g.ids.slice(1).map((id, k) => `<a class="primary" href="#/merge/${kind}/${E(g.ids[0])}/${E(id)}">🔀 دمج ${g.ids.length > 2 ? "(" + (k + 2) + ") في (1)" : ""}</a>`).join("") : `<a class="secondary" href="#/comps/${E(encodeURIComponent((D.custom.find(x => x.id == g.ids[0]) || { rec: {} }).rec.model || ""))}">🔎 قارنه بالقاعدة</a>`}<button class="secondary" type="button" data-ign="${E(g.ids.join("|"))}">مش مكرر — تجاهل</button></div>${g.type == "base" ? `<details class="more"><summary>⋯ خيارات أكتر</summary><button class="danger-btn" type="button" data-delc="${E(g.ids[0])}">حذف الإضافة (نسخة القاعدة هتفضل)</button></details>` : ""}</div>`;
    const sec = (t, a, kind) => a.length ? `<h3 class="h">${t} (${a.length})</h3>${a.map(g => grp(g, kind)).join("")}` : "";
    app.innerHTML = `<p class="mu">بيقارن بعد توحيد الكتابة (همزات، تاء مربوطة، أرقام عربية، مسافات وشرطات). «مؤكد» = نفس المفتاح بالظبط. «شبيه» = نفس الماركة وكود/موديل متقارب (E01 = E1، حرف O مكان صفر…) أو نفس الكود وخانة ناقصة — لازم تراجعه بعينك.</p>
     ${tot ? "" : '<div class="empty"><div class="empty-ic">✅</div><b>مفيش تكرار</b><p class="mu">لما تستورد أو تضيف، الفحص بيتعمل تلقائيًا.</p></div>'}
     ${F.exact.length + F.near.length ? `<h2 class="h">🧯 أكواد الأعطال والتيست مود</h2>${sec("مكرر مؤكد", F.exact, "f")}${sec("شبيه", F.near, "f")}` : ""}
     ${C.exact.length + C.near.length + C.inBase.length ? `<h2 class="h">🧊 الكباسات المضافة</h2>${sec("مكرر مؤكد", C.exact, "c")}${sec("شبيه", C.near, "c")}${sec("موجود أصلًا في القاعدة المرجعية", C.inBase, "c")}` : ""}
     ${B ? "" : '<div class="notice">تعذر تحميل القاعدة المرجعية: مقارنة الإضافات بالقاعدة اتسابت.</div>'}
     ${I.size ? `<p class="mu">${I.size} مجموعة متعلّمة «مش مكرر». <button class="secondary" type="button" id="dpclr">إظهارها تاني</button></p>` : ""}
     <div class="row"><a class="secondary" href="#/clean">🧹 شيل البيانات القديمة لما تستورد أحدث</a><a class="secondary" href="#/import">📥 استيراد Excel / CSV</a><a class="secondary" href="#/admin">← الإدارة</a></div>`;
    $$("[data-ign]").forEach(b => b.onclick = () => { const s = st().get(IGN, []) || []; s.push(pairKey(b.dataset.ign.split("|"))); st().set(IGN, s); X2.log("تكرار", "تعليم «مش مكرر»"); page(); });
    const cl = $("#dpclr"); if (cl) cl.onclick = () => { st().remove(IGN); page(); };
    $$("[data-delc]").forEach(b => b.onclick = () => { const c = D.custom.find(x => x.id == b.dataset.delc); if (!c || !confirm(`حذف «${c.rec.model}» من الإضافات؟ نسخته في القاعدة المرجعية هتفضل. (تقدر تتراجع من الإدارة)`)) return; snap(); if (commit(d => { d.custom = d.custom.filter(x => x.id != c.id); })) { CL && fixCompLinks(cIdx(c.id), -1); X2.log("حذف كباس مكرر مع القاعدة", c.rec.model); toast("اتحذف ✓"); page(); } });
  }
  /* ================= تنظيف بيانات قديمة لما يتستورد مصدر أحدث (#/clean) ================= */
  const learn = () => DUP.learnBrands([].concat((typeof LSt != "undefined" && LSt && LSt.brand) || [], (Y.SEED && Y.SEED.brand) || [], D.faults.map(r => r.brand)));
  async function cleanPage(srcArg) {
    if (!gate(() => cleanPage(srcArg))) return;
    learn();
    const SRC = DUP.sources(D.faults);
    if (!SRC.length) { app.innerHTML = `<div class="empty"><div class="empty-ic">🧹</div><b>مفيش سجلات عليها «مصدر»</b><p class="mu">التنظيف بيشتغل لما تستورد ملف فيه خانة المصدر (زي ملفات الكتالوجات اللي بنجهزها). السجلات القديمة اللي من غير مصدر هتظهر هنا كـ«قديم» قدام المصدر الجديد.</p></div><div class="row"><a class="secondary" href="#/dups">← كاشف التكرار</a></div>`; return; }
    const src = SRC.some(x => x.src == srcArg) ? srcArg : SRC[0].src, P = DUP.sourcePlan(D.faults, src);
    const byId = new Map(D.faults.map(r => [r.id, r])), lbl = id => E(DUP.faultLabel(byId.get(id) || {}));
    const rowR = x => `<li><label class="chk"><input type="checkbox" data-cl="${E(x.id)}" checked> <a href="#/fault/${E(x.id)}">${lbl(x.id)}</a></label><div class="mu">↳ النسخة الجديدة: ${x.to.slice(0, 3).map(id => `<a href="#/fault/${E(id)}">${lbl(id)}</a>`).join(" ، ")}${x.to.length > 3 ? ` +${x.to.length - 3}` : ""}</div></li>`;
    const rowO = x => `<li><label class="chk"><input type="checkbox" data-cl="${E(x.id)}" data-orph="1" ${x.manual ? "" : "checked"}> <a href="#/fault/${E(x.id)}">${lbl(x.id)}</a>${x.manual ? ' <span class="chip st-info">إضافة يدوية</span>' : ""}</label></li>`;
    app.innerHTML = `<p class="mu">لو استوردت بيانات <b>أحدث</b> من نفس المصدر، هنا بتشيل النسخ القديمة وتفضل الجديدة. المقارنة بالماركة (عربي أو إنجليزي: «تورنيدو» = «Tornado»)، والكود (E2 = «E2 (E21, E23)»، E01 = E1)، ونوع الجهاز والموديل.</p>
     <div class="im-opts"><label>المصدر اللي هيفضل<select id="clsrc">${SRC.map(x => `<option value="${E(x.src)}" ${x.src == src ? "selected" : ""}>${E(x.src)} — ${x.n} سجل</option>`).join("")}</select></label></div>
     <div class="chips"><span class="chip st-ok">✔ هيفضل: ${P.keep}</span><span class="chip st-warn">🔁 قديم ليه نسخة جديدة: ${P.replace.length}</span><span class="chip st-info">📦 قديم لنفس الماركات من غير مقابل: ${P.orphans.length}</span></div>
     ${P.replace.length + P.orphans.length ? "" : '<div class="empty"><div class="empty-ic">✅</div><b>مفيش بيانات قديمة لنفس الماركات</b></div>'}
     ${P.replace.length ? `<h3 class="h">🔁 قديم ليه نسخة جديدة (${P.replace.length})</h3><p class="mu">نفس الكود لنفس الماركة والجهاز في المصدر الجديد — متعلّمين للحذف. صورهم (لو فيه) بتتنقل للنسخة الجديدة، والمفضلة كمان.</p><details class="more" open><summary>عرض القائمة</summary><ol>${P.replace.map(rowR).join("")}</ol></details>` : ""}
     ${P.orphans.length ? `<h3 class="h">📦 قديم من غير مقابل (${P.orphans.length})</h3><p class="mu">سجلات لنفس الماركات ونوع الجهاز مش لاقي لها نفس الكود في المصدر الجديد (ممكن مكتوبة بشكل مختلف، أو تيست مود بعنوان تاني). المستورد متعلّم، و<b>الإضافات اليدوية مش متعلّمة</b> — راجعهم بعينك.</p><div class="row"><button class="secondary" type="button" id="clall">حدد الكل</button><button class="secondary" type="button" id="clnone">شيل التحديد</button></div><details class="more"><summary>عرض القائمة</summary><ol>${P.orphans.map(rowO).join("")}</ol></details>` : ""}
     ${P.replace.length + P.orphans.length ? `<div class="row"><button class="danger-btn" type="button" id="clgo">🗑️ احذف المتعلّم عليهم (<span id="cln">0</span>)</button><button class="secondary" type="button" id="clx">⬇️ القائمة Excel</button></div><p class="mu">قبل الحذف بتتاخد نسخة — تقدر تتراجع من «الإدارة ← تراجع عن آخر تغيير».</p>` : ""}
     <div class="row"><a class="secondary" href="#/dups">← كاشف التكرار</a><a class="secondary" href="#/admin">← الإدارة</a></div>`;
    const cnt = () => { const n = $$("[data-cl]:checked").length, c = $("#cln"); if (c) c.textContent = n; return n; }; cnt();
    $$("[data-cl]").forEach(c => c.onchange = cnt);
    $("#clsrc").onchange = ev => cleanPage(ev.target.value);
    const sa = $("#clall"), sn = $("#clnone"); if (sa) sa.onclick = () => { $$("[data-orph]").forEach(c => c.checked = true); cnt(); }; if (sn) sn.onclick = () => { $$("[data-orph]").forEach(c => c.checked = false); cnt(); };
    const xb = $("#clx"); if (xb) xb.onclick = () => dl("تنظيف-بيانات-قديمة.xlsx", XLSX.write([{ name: "التنظيف", widths: [26, 12, 16, 14, 26, 18, 40, 50], rows: [["الحالة", "الجهاز", "الماركة", "الفئة", "الموديل", "الكود/العنوان", "الوصف", "النسخة الجديدة"]].concat(P.replace.map(x => ["قديم ليه نسخة جديدة", x.id, x.to]).concat(P.orphans.map(x => ["قديم من غير مقابل", x.id, []])).map(([t, id, to]) => { const r = byId.get(id) || {}; return [t, r.deviceType || "", r.brand || "", r.category || "", r.model || "", r.code || r.title || "", r.title || "", to.map(i => DUP.faultLabel(byId.get(i) || {})).join(" | ")]; })) }]), XMIME);
    const go = $("#clgo"); if (go) go.onclick = () => {
      const del = new Set($$("[data-cl]:checked").map(c => c.dataset.cl)); if (!del.size) return toast("مفيش حاجة متعلّم عليها");
      if (!confirm(`حذف ${del.size} سجل قديم؟ هيفضل ${P.keep} سجل من «${src}». (تقدر تتراجع من الإدارة)`)) return;
      const to = new Map(P.replace.map(x => [x.id, x.to[0]])), imgs = new Map();
      D.faults.forEach(r => { if (del.has(r.id) && to.has(r.id) && (r.imgs || []).length) { const k = to.get(r.id); imgs.set(k, [...new Set([...(imgs.get(k) || []), ...r.imgs])]); } });
      if (snap() === false) return;
      const ok = commit(d => { d.faults = d.faults.filter(r => !del.has(r.id)).map(r => imgs.has(r.id) ? { ...r, imgs: [...new Set([...(r.imgs || []), ...imgs.get(r.id)])] } : r); });
      if (!ok) return;
      ["mw_fav", "mw_rv"].forEach(k => { let L = S.get(k, []) || []; del.forEach(id => { L = to.has(id) ? DUP.remapLinks(L, "#/fault/" + id, "#/fault/" + to.get(id)) : L.filter(x => !x || x.h !== "#/fault/" + id); }); S.set(k, L); });
      X2.log("تنظيف بيانات قديمة", `حذف ${del.size} — المصدر الباقي: ${src}`); toast(`اتحذف ${del.size} ✓`); cleanPage(src);
    };
  }

  /* بعد حذف إضافة كباس، روابط الكباسات بعدها في المفضلة/السجل بتتزحلق خطوة */
  function fixCompLinks(removed, keptIdx) {
    const fix = L => (L || []).map(x => { if (!x || !x.h) return x; const m = x.h.match(/^#\/comp\/(\d+)$/); if (!m) return x; const n = +m[1]; if (n == removed) return keptIdx >= 0 ? { ...x, h: "#/comp/" + keptIdx } : null; return n > removed ? { ...x, h: "#/comp/" + (n - 1) } : x; }).filter(Boolean);
    ["mw_fav", "mw_rv"].forEach(k => S.set(k, fix(S.get(k, []))));
  }

  /* ================= شاشة الدمج ================= */
  async function merge(kind, a, b) {
    if (!gate(() => merge(kind, a, b))) return;
    const isF = kind == "f";
    let A = isF ? D.faults.find(x => x.id == a) : D.custom.find(x => x.id == a), Bx = isF ? D.faults.find(x => x.id == b) : D.custom.find(x => x.id == b);
    if (!A || !Bx || a == b) { app.innerHTML = warn("واحد من السجلين مش موجود (يمكن اتدمج أو اتحذف). ") + '<a class="secondary" href="#/dups">← كاشف التكرار</a>'; return; }
    if (isF && (A.kind == "test") != (Bx.kind == "test")) { app.innerHTML = warn("مينفعش تدمج كود عطل مع تيست مود."); return; }
    const fa = isF ? A : compFlat(A), fb = isF ? Bx : compFlat(Bx);
    const fields = isF ? (A.kind == "test" ? TFIELDS() : FFIELDS()).concat(["code"].filter(k => A.kind != "test" && !FFIELDS().includes(k))) : CFIELDS();
    const rows = DUP.compare(fa, fb, fields), sameN = rows.filter(r => r.st == "same").length, diff = rows.filter(r => r.st != "same");
    const ch = DUP.defaultChoice(diff, TEXTF), imgN = new Set([...(fa.imgs || []), ...(fb.imgs || [])]).size;
    app.innerHTML = `<p class="mu">السجل <b>(1)</b> هيفضل برقمه ومكانه في المفضلة، والسجل <b>(2)</b> هيتشال بعد ما تختار لكل خانة القيمة اللي تفضل. الخانات اللي عند واحد بس اتختارت تلقائي، والنصوص الطويلة المختلفة اتختار لها «الاتنين».</p>
     <div class="kvs"><div class="kv"><span>(1) يفضل</span><b>${E(isF ? DUP.faultLabel(A) : A.rec.model + " — " + A.brand)}</b></div><div class="kv"><span>(2) يتشال</span><b>${E(isF ? DUP.faultLabel(Bx) : Bx.rec.model + " — " + Bx.brand)}</b></div></div>
     <div class="row"><a class="secondary" href="#/merge/${kind}/${E(b)}/${E(a)}">⇄ خلّي (2) هو اللي يفضل</a></div>
     ${diff.length ? `<div class="mg-tbl">${diff.map(r => `<fieldset class="mg-row" data-k="${E(r.k)}"><legend>${E(lab(r.k))} ${r.st == "conflict" ? '<span class="chip st-warn">مختلف</span>' : '<span class="chip">عند واحد بس</span>'}</legend>
        <label class="mg-op"><input type="radio" name="m_${E(r.k)}" value="a" ${ch[r.k] == "a" ? "checked" : ""}><span><b>(1)</b> ${val(r.a)}</span></label>
        <label class="mg-op"><input type="radio" name="m_${E(r.k)}" value="b" ${ch[r.k] == "b" ? "checked" : ""}><span><b>(2)</b> ${val(r.b)}</span></label>
        ${r.st == "conflict" && (TEXTF.includes(r.k) || r.k == "temp_capacity") ? `<label class="mg-op"><input type="radio" name="m_${E(r.k)}" value="both" ${ch[r.k] == "both" ? "checked" : ""}><span><b>الاتنين</b> ${r.k == "temp_capacity" ? "(كل درجات الحرارة، و(1) يكسب لو نفس الدرجة)" : "(السطور من غير تكرار)"}</span></label>` : ""}</fieldset>`).join("")}</div>` : '<p>كل الخانات متطابقة — الدمج هيشيل النسخة الزيادة بس.</p>'}
     <p class="mu">${sameN} خانة متطابقة.${imgN ? ` الصور هتتجمع (${imgN}).` : ""}</p>
     <div class="row"><button class="primary" id="mgok" type="button">🔀 دمج واحذف (2)</button><a class="secondary" href="#/dups">إلغاء</a></div>`;
    $("#mgok").onclick = async () => {
      const choice = {}; diff.forEach(r => { const x = document.querySelector(`input[name="m_${CSS.escape(r.k)}"]:checked`); choice[r.k] = x ? x.value : "a"; });
      if (!confirm("دمج السجلين؟ السجل (2) هيتشال. تقدر تتراجع من «الإدارة ← تراجع عن آخر تغيير».")) return;
      const out = DUP.applyMerge(fa, fb, fields, choice);
      let ok;
      if (isF) { out.updatedAt = new Date().toISOString(); ok = snap() !== false && commit(d => { d.faults = d.faults.map(x => x.id == a ? out : x).filter(x => x.id != b); }); if (ok) ["mw_fav", "mw_rv"].forEach(k => S.set(k, DUP.remapLinks(S.get(k, []), "#/fault/" + b, "#/fault/" + a))); }
      else {
        const { brand, ...rr } = out, rec = Y.cleanRec(rr); if (!rec) return alert("الموديل فاضي بعد الدمج"); if (out.temp_capacity) rec.temp_capacity = out.temp_capacity;
        try { await comps(); } catch (e) { }
        const base0 = CL ? CL.length : 0, ia = D.custom.findIndex(x => x.id == a), ib = D.custom.findIndex(x => x.id == b);
        ok = snap() !== false && commit(d => { d.custom = d.custom.map(x => x.id == a ? { ...x, brand: brand || x.brand, rec } : x).filter(x => x.id != b); });
        if (ok && CL) fixCompLinks(base0 + ib, base0 + (ia > ib ? ia - 1 : ia));
      }
      if (ok) { X2.log("دمج", (isF ? "أعطال: " : "كباسات: ") + (isF ? A.code || A.title : A.rec.model)); toast("اتدمجوا ✓"); location.hash = isF ? "#/fault/" + a : "#/dups"; }
    };
  }

  /* ================= الاستيراد من Excel / CSV / JSON ================= */
  let IMP = null; // {kind, sheets, si, plan, rows}
  async function readSheetFile(f) {
    if (!f) return null;
    const name = f.name || "", ext = (name.match(/\.(\w+)$/) || [])[1] ? name.match(/\.(\w+)$/)[1].toLowerCase() : "";
    if (ext == "xls") { alert("ملف Excel القديم (.xls) مش مدعوم: افتحه واحفظه «Excel Workbook (.xlsx)» أو CSV."); return null; }
    if (!["xlsx", "csv", "json"].includes(ext)) { alert("نوع الملف غير مدعوم: Excel (.xlsx) أو CSV أو JSON"); return null; }
    if (f.size > 5 * 1024 * 1024) { alert("الملف أكبر من 5 ميغابايت"); return null; }
    if (ext == "xlsx") { try { return { type: "xlsx", ...(await XLSX.read(await f.arrayBuffer())) }; } catch (e) { alert("تعذر قراءة ملف Excel: " + e.message); return null; } }
    const t = await readFile(f); if (t == null) return null;
    if (ext == "json") { let j; try { j = JSON.parse(t); } catch (e) { alert("ملف JSON تالف"); return null; } return { type: "json", json: j }; }
    return { type: "csv", sheets: [{ name: "CSV", rows: CMAP.parseCSV(t) }] };
  }
  const brandOpts = async () => { let B = {}; try { B = await base(); } catch (e) { } return [...new Set(Object.keys(B).concat(D.custom.map(c => c.brand)))].sort((a, b) => a.localeCompare(b, "ar")); };

  async function importPage() {
    if (!gate(importPage)) return;
    const kind = (IMP && IMP.kind) || "comp";
    app.innerHTML = `<p class="mu">ارفع شيت كباسات أو أكواد أعطال (Excel ‎.xlsx أو CSV أو JSON بصيغة النظام). البرنامج يتعرف على الأعمدة بالعربي أو الإنجليزي، ويوريك كل حاجة قبل ما يحفظ. <b>مش بيخمّن أي قيمة</b>: الخانة الفاضية تفضل فاضية.</p>
     <div class="seg" role="radiogroup" aria-label="نوع البيانات"><button type="button" data-ik="comp" class="${kind == "comp" ? "on" : ""}">🧊 كباسات</button><button type="button" data-ik="fault" class="${kind == "fault" ? "on" : ""}">🧯 أكواد أعطال</button></div>
     <label>الملف<input type="file" id="imf" accept=".xlsx,.csv,.json,text/csv"></label>
     <div class="row"><button class="secondary" type="button" id="imtpl">⬇️ قالب Excel فاضي</button></div>
     <div id="imstep"></div>`;
    $$("[data-ik]").forEach(b => b.onclick = () => { IMP = { kind: b.dataset.ik }; importPage(); });
    $("#imtpl").onclick = () => template(kind);
    $("#imf").onchange = async ev => {
      const r = await readSheetFile(ev.target.files[0]); if (!r) return;
      if (r.type == "json") { const arr = kind == "comp" ? Y.parseComps(r.json) : Y.parseFaults(r.json); if (!arr) return $("#imstep").innerHTML = warn("الملف مش بصيغة " + (kind == "comp" ? "customCompressors" : "faultCodes")); IMP = { kind, recs: arr.map((x, i) => ({ row: i + 1, rec: x, warn: [] })), errors: [], json: true }; $("#imstep").innerHTML = '<div id="imprev"></div>'; return previewStep(); }
      if (!r.sheets.length) return $("#imstep").innerHTML = warn("الملف فاضي");
      IMP = { kind, sheets: r.sheets, si: 0 }; mapStep();
    };
  }

  async function mapStep() {
    const { kind, sheets } = IMP, rows = sheets[IMP.si].rows;
    if (!IMP.plan || IMP.planFor != IMP.si) { IMP.plan = CMAP.detect(rows, kind); IMP.planFor = IMP.si; }
    const P = IMP.plan, FL = CMAP.fieldsOf(kind), B = kind == "comp" ? await brandOpts() : [];
    const sample = c => rows.slice(P.start, P.start + 3).map(r => r && r[c] != null ? String(r[c]) : "").filter(Boolean).slice(0, 2).join(" · ");
    const hasCap = P.cols.some(c => c.field == "temp" || c.field == "capacity");
    const o = IMP.opts || (IMP.opts = { brand: "", src: "", status: "manual", capUnit: P.capUnit || "" });
    $("#imstep").innerHTML = `${sheets.length > 1 ? `<label>الورقة<select id="imsh">${sheets.map((s, i) => `<option value="${i}" ${i == IMP.si ? "selected" : ""}>${E(s.name)} (${s.rows.length} صف)</option>`).join("")}</select></label>` : ""}
     <h3 class="h">① الأعمدة</h3><p class="mu">${P.header < 0 ? E(P.note) : `صف العناوين: ${P.header + 1}${P.twoRow ? " و" + (P.header + 2) + " (عنوان على صفين)" : ""} — البيانات من الصف ${P.start + 1}`}. غيّر أي عمود غلط، أو اختار «تجاهل».</p>
     <label>صف العناوين<input id="imhr" inputmode="numeric" value="${P.header + 1}" style="max-width:90px"></label>
     <div class="im-cols">${P.cols.map((c, i) => `<div class="im-col"><div><b>${E(c.head || "عمود " + (c.c + 1))}</b><div class="mu" dir="auto">${E(sample(c.c)) || "—"}</div></div>${c.field == "temp" ? `<span class="chip st-info">قدرة عند ${E(c.temp)}°C</span>` : `<select data-ci="${i}" aria-label="خانة العمود ${E(c.head)}"><option value="">— تجاهل —</option>${FL.map(f => `<option value="${f.k}" ${c.field == f.k ? "selected" : ""}>${E(f.l)}</option>`).join("")}</select>`}</div>`).join("")}</div>
     <h3 class="h">② بيانات لكل الملف</h3><div class="fgrid">
      ${kind == "comp" ? `<label>الماركة (لو مش في الشيت)<input id="imbr" list="imbrl" value="${E(o.brand)}" placeholder="مثال: باناسونيك"><datalist id="imbrl">${B.map(b => `<option value="${E(b)}">`).join("")}</datalist></label>
       <label>الفريون (لو مش في الشيت)<input id="imrf" value="${E(o.refrigerant || "")}" placeholder="مثال: R134a"></label><label>التطبيق (لو مش في الشيت)<select id="imap"><option value="">—</option>${["LBP", "MBP", "HBP", "L/MBP", "CBP"].map(x => `<option ${o.application == x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
       ${hasCap ? `<label>وحدة قدرة التبريد في الشيت ${P.capUnit ? '<span class="chip st-ok">اتعرفت من العنوان</span>' : '<span class="chip st-warn">لازم تختار</span>'}<select id="imcu"><option value="">— اختار —</option><option value="W" ${o.capUnit == "W" ? "selected" : ""}>W (وات)</option><option value="kcal" ${o.capUnit == "kcal" ? "selected" : ""}>kcal/h</option><option value="btu" ${o.capUnit == "btu" ? "selected" : ""}>BTU/h</option></select></label>` : ""}`
        : `<label>الماركة (لو مش في الشيت)<input id="imbr" value="${E(o.brand)}"></label><label>نوع الجهاز (لو مش في الشيت)<input id="imdt" value="${E(o.deviceType || "")}" placeholder="غسالة / ثلاجة / تكييف"></label>`}
      <label>المصدر (اسم الكتالوج أو الرابط)<input id="imsrc" value="${E(o.src)}" placeholder="مثال: Panasonic QB catalog 2001"></label>
      <label>حالة التحقق<select id="imst"><option value="manufacturer" ${o.status == "manufacturer" ? "selected" : ""}>موثق من الشركة</option><option value="secondary" ${o.status == "secondary" ? "selected" : ""}>مصدر ثانوي</option><option value="manual" ${o.status == "manual" ? "selected" : ""}>يدوي</option></select></label></div>
     <div class="row"><button class="primary" id="imgo" type="button">③ معاينة ←</button></div><div id="imprev"></div>`;
    const sh = $("#imsh"); if (sh) sh.onchange = () => { IMP.si = +sh.value; IMP.plan = null; mapStep(); };
    $("#imhr").onchange = () => { const n = parseInt(X2.num($("#imhr").value)) - 1; const sub = rows.slice(Math.max(0, n)); const p = CMAP.detect([rows[n] || []].concat(rows.slice(n + 1, n + 2)), kind); p.header = n; p.start = n + (p.twoRow ? 2 : 1); IMP.plan = p; mapStep(); };
    $$("[data-ci]").forEach(s => s.onchange = () => { P.cols[+s.dataset.ci].field = s.value || null; });
    $("#imgo").onclick = () => {
      if (!IMP || !IMP.sheets) return;
      const v = id => { const x = $("#" + id); return x ? x.value.trim() : ""; };
      Object.assign(o, { brand: v("imbr"), src: v("imsrc"), status: v("imst"), refrigerant: CMAP.normRef(v("imrf")) || v("imrf"), application: v("imap"), capUnit: v("imcu") || P.capUnit || "", deviceType: v("imdt") });
      if (hasCap && !o.capUnit) return toast("اختار وحدة قدرة التبريد الأول");
      const r = CMAP.build(rows, P, { kind, ...o, capUnit: o.capUnit || null });
      IMP.recs = r.recs; IMP.errors = r.errors; previewStep();
    };
  }

  /* تصنيف كل صف: جديد / شبيه / يكمّل الناقص / مطابق / موجود في القاعدة / مكرر داخل الملف / مرفوض */
  async function classify() {
    learn(); const { kind } = IMP, out = [], seen = new Map(), seenN = new Map();
    if (kind == "comp") {
      let Bdb = {}; try { Bdb = await base(); } catch (e) { }
      const bk = new Map(), bnear = new Map(); Object.entries(Bdb).forEach(([b, rows]) => rows.forEach(r => { bk.set(DUP.brandKey(b) + "|" + DUP.normAr(r.model), b); bnear.set(DUP.brandKey(b) + "|" + DUP.nearKey(r.model), r.model); }));
      const ck = new Map(D.custom.map(c => [DUP.brandKey(c.brand) + "|" + DUP.normAr(c.rec.model), c])), cnear = new Map(D.custom.map(c => [DUP.brandKey(c.brand) + "|" + DUP.nearKey(c.rec.model), c]));
      IMP.recs.forEach(x => {
        const raw = x.rec, src = raw && raw.rec ? { ...raw.rec, model: raw.rec.model || raw.model } : raw, rec = Y.cleanRec(src); if (!rec) return out.push({ ...x, st: "bad", why: "الموديل فاضي" });
        if (src.temp_capacity) rec.temp_capacity = src.temp_capacity;
        const brand = String(raw.brand || "").trim() || "إضافات يدوية", k = DUP.brandKey(brand) + "|" + DUP.normAr(rec.model), nk = DUP.brandKey(brand) + "|" + DUP.nearKey(rec.model);
        if (seen.has(k)) return out.push({ ...x, brand, rec, st: "file", why: "مكرر داخل الملف (صف " + seen.get(k) + ")" }); seen.set(k, x.row);
        const sn = seenN.get(nk); if (sn) return out.push({ ...x, brand, rec, st: "near", why: "شبيه بصف " + sn.row + " في نفس الملف (" + sn.model + ") — اتأكد إنه مختلف فعلًا" }); seenN.set(nk, { row: x.row, model: rec.model });
        if (bk.has(k)) return out.push({ ...x, brand, rec, st: "base", why: "موجود في القاعدة المرجعية تحت «" + bk.get(k) + "»" });
        const ex = ck.get(k); if (ex) { const f = DUP.fillMissing(ex.rec, rec, Y.CK.concat(["temp_capacity"])); return out.push({ ...x, brand, rec, st: f.filled.length ? "fill" : "same", target: ex.id, filled: f.filled, differ: f.differ, merged: f.rec, why: f.filled.length ? "موجود عندك — هيكمّل: " + f.filled.map(lab).join("، ") : "موجود عندك ومطابق" + (f.differ.length ? " (فيه اختلاف في: " + f.differ.map(lab).join("، ") + " — مش هيتغير)" : "") }); }
        const nb = bnear.get(nk), nc = cnear.get(nk);
        if (nb || nc) return out.push({ ...x, brand, rec, st: "near", why: "شبيه بموديل موجود: " + (nb || nc.rec.model) + " — اتأكد إنه مختلف فعلًا" });
        out.push({ ...x, brand, rec, st: "new", why: "" });
      });
    } else {
      const fk = new Map(D.faults.map(r => [DUP.faultKeyB(r), r])), fnear = new Map(); D.faults.forEach(r => { const q = DUP.nearKeyF(r); if (!fnear.has(q)) fnear.set(q, []); fnear.get(q).push(r); });
      IMP.recs.forEach(x => {
        const rec = Y.cleanFault(x.rec); if (!rec) return out.push({ ...x, st: "bad", why: "ناقص (الكود مطلوب)" });
        const k = DUP.faultKeyB(rec), nk = DUP.nearKeyF(rec);
        if (seen.has(k)) return out.push({ ...x, rec, st: "file", why: "مكرر داخل الملف (صف " + seen.get(k) + ")" }); seen.set(k, x.row);
        const sn = (seenN.get(nk) || []).find(o => DUP.nearCompat(o.rec, rec)); if (sn) return out.push({ ...x, rec, st: "near", why: "شبيه بصف " + sn.row + " في نفس الملف" }); if (!seenN.has(nk)) seenN.set(nk, []); seenN.get(nk).push({ row: x.row, rec });
        const ex = fk.get(k); if (ex) { const f = DUP.fillMissing(ex, rec, rec.kind == "test" ? Y.TK : Y.FK); return out.push({ ...x, rec, st: f.filled.length ? "fill" : "same", target: ex.id, filled: f.filled, differ: f.differ, merged: f.rec, why: f.filled.length ? "موجود — هيكمّل: " + f.filled.map(lab).join("، ") : "موجود ومطابق" }); }
        const n = (fnear.get(nk) || []).find(r => DUP.nearCompat(r, rec)); if (n) return out.push({ ...x, rec, st: "near", why: "شبيه بـ: " + DUP.faultLabel(n) });
        out.push({ ...x, rec, st: "new", why: "" });
      });
    }
    IMP.errors.forEach(e => out.push({ row: e.row, st: "bad", why: e.why, warn: [] }));
    return out.sort((a, b) => a.row - b.row);
  }

  const STL = { new: ["🆕 جديد", "st-ok"], near: ["⚠️ شبيه", "st-warn"], fill: ["➕ يكمّل الناقص", "st-info"], same: ["✔ موجود ومطابق", ""], base: ["📚 موجود في القاعدة", ""], file: ["↺ مكرر في الملف", ""], bad: ["❌ مرفوض", "st-bad"] };
  async function previewStep() {
    const L = await classify(), cnt = k => L.filter(x => x.st == k).length, box = $("#imprev") || $("#imstep"), isC = IMP.kind == "comp";
    const line = x => `<tr class="im-${x.st}"><td>${x.row}</td><td><span class="chip ${STL[x.st][1]}">${STL[x.st][0]}</span></td><td dir="auto"><b>${E(x.rec ? (isC ? x.rec.model : (x.rec.code || x.rec.title || "")) : "—")}</b>${x.rec && isC ? ` <span class="mu">${E(x.brand || "")}</span>` : x.rec ? ` <span class="mu">${E([x.rec.brand, x.rec.deviceType].filter(Boolean).join(" · "))}</span>` : ""}${isC && x.rec ? `<div class="mu" dir="auto">${E([x.rec.refrigerant, x.rec.application, x.rec.hp && x.rec.hp + " HP", x.rec.kcal && x.rec.kcal + " kcal/h", x.rec.freq && x.rec.freq + " Hz"].filter(Boolean).join(" · "))}</div>` : ""}</td><td>${E(x.why || "")}${(x.warn || []).map(w => `<div class="mu">⚠️ ${E(w)}</div>`).join("")}</td>${x.st == "near" ? `<td><label class="chk"><input type="checkbox" data-nr="${x.row}"> أضفه برضه</label></td>` : "<td></td>"}</tr>`;
    box.innerHTML = `<h3 class="h">③ المعاينة</h3>
     <div class="chips">${Object.keys(STL).filter(k => cnt(k)).map(k => `<span class="chip ${STL[k][1]}">${STL[k][0]}: ${cnt(k)}</span>`).join("")}</div>
     ${cnt("fill") ? `<label class="chk"><input type="checkbox" id="imfill" checked> كمّل الخانات الناقصة في ${cnt("fill")} سجل موجود (القيم الموجودة مش هتتغير)</label>` : ""}
     ${cnt("near") ? `<div class="notice">⚠️ ${cnt("near")} سجل شبيه بموجود. لو الملف ده <b>نسخة أحدث</b> من بيانات عندك: علّمهم كلهم وضيفهم، وبعدين شيل القديم من «🧹 تنظيف بيانات قديمة».<div class="row"><button class="secondary" type="button" id="imnall">✔ علّم كل الشبيه</button></div></div>` : ""}
     <div class="im-tbl"><table class="vt"><thead><tr><th>صف</th><th>الحالة</th><th>السجل</th><th>ملاحظة</th><th></th></tr></thead><tbody>${L.slice(0, 300).map(line).join("")}</tbody></table>${L.length > 300 ? `<p class="mu">+${L.length - 300} صف تاني</p>` : ""}</div>
     <div class="row"><button class="primary" id="imok" type="button" ${cnt("new") + cnt("fill") + cnt("near") ? "" : "disabled"}>اعتماد: إضافة ${cnt("new")}${cnt("fill") ? " + تكميل " + cnt("fill") : ""}</button><button class="secondary" type="button" id="imx">⬇️ تقرير المعاينة Excel</button></div>`;
    let allN = false; const na = $("#imnall"); if (na) na.onclick = () => { allN = true; $$("[data-nr]").forEach(c => c.checked = true); toast("اتعلّم " + cnt("near")); };
    $("#imx").onclick = () => dl("معاينة-الاستيراد.xlsx", XLSX.write([{ name: "المعاينة", widths: [6, 16, 22, 18, 60], rows: [["صف", "الحالة", isC ? "الموديل" : "الكود", isC ? "الماركة" : "الماركة/الجهاز", "ملاحظة"]].concat(L.map(x => [x.row, STL[x.st][0], x.rec ? (isC ? x.rec.model : x.rec.code || x.rec.title) : "", isC ? x.brand || "" : x.rec ? [x.rec.brand, x.rec.deviceType].filter(Boolean).join(" · ") : "", [x.why].concat(x.warn || []).filter(Boolean).join(" | ")])) }]), XMIME);
    $("#imok").onclick = ev => {
      if (!IMP || !IMP.recs) return;
      const near = new Set($$("[data-nr]:checked").map(c => +c.dataset.nr)); if (allN) L.slice(300).forEach(x => x.st == "near" && near.add(x.row)); const fill = $("#imfill") ? $("#imfill").checked : false;
      const add = L.filter(x => x.st == "new" || x.st == "near" && near.has(x.row)), upd = fill ? L.filter(x => x.st == "fill") : [];
      if (!add.length && !upd.length) return toast("مفيش حاجة تتضاف");
      ev.target.disabled = true; snap(); const now = new Date().toISOString();
      const ok = commit(d => {
        if (isC) { d.custom = d.custom.map(c => { const u = upd.find(x => x.target == c.id); return u ? { ...c, rec: u.merged } : c; }).concat(add.map(x => ({ id: MR.uid(), brand: x.brand, rec: x.rec, addedAt: now }))); }
        else { d.faults = d.faults.map(r => { const u = upd.find(x => x.target == r.id); return u ? { ...u.merged, updatedAt: now } : r; }).concat(add.map(x => ({ id: MR.uid(), ...x.rec, source: "imported", createdAt: now, updatedAt: now }))); }
      });
      if (!ok) { ev.target.disabled = false; return; }
      X2.log("استيراد " + (isC ? "كباسات" : "أعطال") + " (Excel/CSV)", `إضافة ${add.length}، تكميل ${upd.length}`);
      $("#imf").value = ""; $("#imstep").innerHTML = `<div class="notice">✅ اتضاف ${add.length}${upd.length ? " واتكمّل " + upd.length : ""}. تقدر تتراجع من «الإدارة ← تراجع عن آخر تغيير».</div><div class="row"><a class="primary" href="${isC ? "#/comps" : "#/faults"}">افتح ${isC ? "الكباسات" : "الأعطال"}</a><a class="secondary" href="#/dups">🔍 افحص التكرار</a>${isC ? "" : '<a class="secondary" href="#/clean">🧹 شيل القديم وخلّي الجديد</a>'}</div><p class="mu">عايز تستورد ملف تاني؟ اختاره من فوق.</p>`;
      IMP = { kind: IMP.kind };
    };
  }

  /* ================= Excel: تصدير وقوالب ================= */
  const CHEAD = [["brand", "الماركة"], ["model", "الموديل"], ["hp", "الحصان"], ["refrigerant", "الفريون"], ["application", "التطبيق"], ["freq", "التردد"], ["displacement", "الإزاحة cc"], ["kcal", "قدرة التبريد kcal/h"], ["btu", "قدرة التبريد BTU/h"], ["watt", "القدرة الكهربائية W"], ["amp", "التيار A"], ["run_capacitor", "مكثف التشغيل"], ["start_capacitor", "مكثف البدء"], ["oil_qty", "كمية الزيت"], ["rpm", "RPM"], ["compat_doc", "البدائل"], ["notes", "ملاحظات"], ["srcRef", "المصدر"]];
  const FHEAD = [["deviceType", "نوع الجهاز"], ["brand", "الماركة"], ["category", "الفئة"], ["model", "الموديل"], ["code", "كود العطل"], ["title", "الوصف"], ["cause", "الأسباب"], ["fix", "الحل"], ["note", "ملاحظات"], ["srcRef", "المصدر"]];
  function template(kind) { const H = kind == "comp" ? CHEAD : FHEAD; dl(kind == "comp" ? "قالب-كباسات.xlsx" : "قالب-أكواد-أعطال.xlsx", XLSX.write([{ name: kind == "comp" ? "كباسات" : "أعطال", widths: H.map(() => 18), rows: [H.map(h => h[1])] }, { name: "طريقة الملء", widths: [100], rows: [["اكتب كل كباس/كود في صف. الأعمدة الفاضية تتساب فاضية — البرنامج مش بيخمّن."], [kind == "comp" ? "قدرة التبريد: اكتبها في العمود اللي فيه وحدتها (kcal/h أو BTU/h). لو عندك قدرات عند درجات تبخير مختلفة أضف أعمدة عناوينها درجة الحرارة زي -23.3°C واختار الوحدة وقت الاستيراد." : "الكود مطلوب. اكتب الأسباب والحل كل خطوة في سطر (Alt+Enter في Excel)."], ["ممكن تستخدم عناوين إنجليزي (Model, Brand, HP, Refrigerant…) أو شيت الشركة كما هو: البرنامج بيتعرف على الأعمدة."]] }]), XMIME); }
  function exportFaults() { const rows = [["النوع"].concat(FHEAD.map(h => h[1]), ["طريقة الدخول", "الاختبارات", "طريقة الخروج"])].concat(D.faults.map(r => [r.kind == "test" ? "تيست مود" : "كود"].concat(FHEAD.map(h => r[h[0]] ?? ""), [r.enter || "", r.tests || "", r.exit || ""]))); dl("أكواد-الأعطال.xlsx", XLSX.write([{ name: "الأعطال", widths: [10, 12, 14, 12, 14, 10, 30, 40, 40, 25, 20, 25, 25, 25], rows }]), XMIME); }
  function exportComps() { if (!D.custom.length) return alert("لا توجد إضافات كباسات للتصدير."); const temps = [...new Set(D.custom.flatMap(c => Object.keys(c.rec.temp_capacity || {})))].sort((a, b) => +a - +b); const rows = [CHEAD.map(h => h[1]).concat(temps.map(t => `قدرة ${t}°C (W)`))].concat(D.custom.map(c => CHEAD.map(h => h[0] == "brand" ? c.brand : c.rec[h[0]] ?? "").concat(temps.map(t => (c.rec.temp_capacity || {})[t] ?? "")))); dl("الكباسات-المضافة.xlsx", XLSX.write([{ name: "الكباسات المضافة", widths: CHEAD.map(() => 14).concat(temps.map(() => 12)), rows }]), XMIME); }

  /* ================= تنبيه التكرار في نموذج الإضافة/التعديل ================= */
  async function formWatch(kind, id) {
    const f = $("#f"); if (!f) return;
    const box = document.createElement("div"); box.id = "dupw"; box.setAttribute("aria-live", "polite"); f.prepend(box);
    let Bdb = null; if (kind == "comp") { try { Bdb = await base(); } catch (e) { } }
    const vals = () => { const o = {}; [...new FormData(f)].forEach(([k, v]) => { if (typeof v == "string" && !k.endsWith("__new")) o[k] = v.trim(); }); [...f.querySelectorAll("[name$='__new']")].forEach(i => { const k = i.name.replace("__new", ""); if (o[k] == "__new__") o[k] = i.value.trim(); }); if (kind == "test") o.kind = "test"; return o; };
    const find = () => {
      const o = vals(), hits = [];
      if (kind == "comp") {
        if (!o.model) return hits; const k = DUP.brandKey(o.brand) + "|" + DUP.normAr(o.model), nk = DUP.brandKey(o.brand) + "|" + DUP.nearKey(o.model);
        const anyB = !o.brand || o.brand == "__new__"; // الماركة لسه مش متختارة: قارن بالموديل في كل الماركات
        D.custom.forEach((c, i) => { if (c.id == id) return; const ck = (anyB ? "" : DUP.brandKey(c.brand)) + "|" + DUP.normAr(c.rec.model); if (ck == (anyB ? "|" + DUP.normAr(o.model) : k)) hits.push({ exact: 1, t: c.rec.model + " — " + c.brand, h: CL ? "#/comp/" + (CL.length + i) : "#/comps/" + encodeURIComponent(c.rec.model) }); else if ((anyB ? "" : DUP.brandKey(c.brand)) + "|" + DUP.nearKey(c.rec.model) == (anyB ? "|" + DUP.nearKey(o.model) : nk)) hits.push({ t: c.rec.model + " — " + c.brand, h: "#/comps/" + encodeURIComponent(c.rec.model) }); });
        if (Bdb) Object.entries(Bdb).forEach(([b, rows]) => rows.forEach(r => { if (DUP.normAr(r.model) == DUP.normAr(o.model)) hits.push({ exact: anyB || DUP.brandKey(b) == DUP.brandKey(o.brand) ? 1 : 0, base: 1, t: r.model + " — " + b + " (القاعدة المرجعية)", h: "#/comps/" + encodeURIComponent(r.model) }); }));
      } else {
        const key = kind == "test" ? o.title : o.code; if (!key) return hits; const k = DUP.faultKeyB(o), anyB = !o.brand || o.brand == "__new__", nk = (anyB ? "" : DUP.brandKey(o.brand)) + "|" + DUP.nearKey(key);
        D.faults.forEach(r => { if (r.id == id || (r.kind == "test") != (kind == "test")) return; if (!anyB && DUP.faultKeyB(r) == k) hits.push({ exact: 1, t: DUP.faultLabel(r), h: "#/fault/" + r.id }); else if ((anyB ? "" : DUP.brandKey(r.brand)) + "|" + DUP.nearKey(r.kind == "test" ? r.title : r.code) == nk) hits.push({ t: DUP.faultLabel(r), h: "#/fault/" + r.id }); });
      }
      return hits.slice(0, 6);
    };
    const draw = () => { const H = find(); box.innerHTML = H.length ? `<div class="notice ${H.some(h => h.exact) ? "dup-hard" : ""}" role="status"><b>${H.some(h => h.exact) ? "⚠️ ده موجود بالفعل:" : "ℹ️ فيه سجل شبيه:"}</b>${H.map(h => `<div><a href="${E(h.h)}" target="_blank" rel="noopener">${E(h.t)} ↗</a></div>`).join("")}<div class="mu">افتحه وعدّله بدل ما تكرره${H.some(h => h.exact && !h.base) ? "، أو ادمجهم بعدين من «كاشف التكرار»" : ""}.</div></div>` : ""; };
    let tm; f.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(draw, 250); }); f.addEventListener("change", draw); draw();
    f.addEventListener("submit", ev => { const H = find().filter(h => h.exact); if (H.length && !confirm(`السجل ده موجود بالفعل:\n• ${H.map(h => h.t).join("\n• ")}\n\nتحفظه كنسخة تانية برضه؟`)) { ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);
  }

  /* ================= قسم الإدارة ================= */
  function adminBlock() {
    learn(); const n = (() => { const I = ign(), d = DUP.faultDups(D.faults); return d.exact.concat(d.near).filter(g => !I.has(pairKey(g.ids))).length + DUP.compDups(D.custom, null).exact.length; })();
    return `<h2>🔍 التكرار والاستيراد من Excel</h2><div class="row"><a class="primary" href="#/dups" id="admdup">🔍 كاشف التكرار والدمج${n ? ` <span class="chip st-warn">${n}</span>` : ""}</a><a class="primary" href="#/import">📥 استيراد Excel / CSV</a><a class="secondary" href="#/clean">🧹 تنظيف بيانات قديمة</a></div>
     <div class="row"><button class="secondary" id="xfx" type="button">⬇️ الأعطال Excel</button><button class="secondary" id="xcx" type="button">⬇️ الكباسات المضافة Excel</button><button class="secondary" id="xtc" type="button">⬇️ قالب كباسات</button><button class="secondary" id="xtf" type="button">⬇️ قالب أعطال</button></div>`;
  }
  function wireAdmin() { const b = (id, f) => { const x = $(id); if (x) x.onclick = f; }; b("#xfx", exportFaults); b("#xcx", exportComps); b("#xtc", () => template("comp")); b("#xtf", () => template("fault")); wirePack(); }

  /* ================= 📦 نشر المرجع للكل (حزمة data-pack.json) ================= */
  function packBlock() {
    if (typeof PK == "undefined" || typeof packState != "function") return "";
    const P = PK.build(packState(), { ver: "x" }), c = P.counts, I = st().get("mw_pack", null), dt = v => { try { return new Date(v).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return v; } };
    return `<h2>📦 نشر المرجع للكل</h2>
     <p class="mu">أي حد يفتح لينك البرنامج هياخد نسخة من البيانات دي كـ<b>مرجع</b> على جهازه (يقدر يزود عليها حاجاته، وتعديلاته ما بتتكتبش فوقها). <b>مش بيتنشر:</b> القياسات، الضفائر، سجل التغييرات، المفضلة، الصور، وقفل الإدارة.</p>
     <div class="pk-opts"><label class="chk"><input type="checkbox" id="pkf" checked> 🧯 أكواد الأعطال (${c.faults}) والتيست مود (${c.tests})</label>
     <label class="chk"><input type="checkbox" id="pkc" checked> 🧊 الكباسات المضافة (${c.custom})</label>
     <label class="chk"><input type="checkbox" id="pkt" checked> 🧰 محتوى الإدارة: دوائر، مسارات تشخيص، مكونات، جداول، حساسات (${c.content})</label>
     <label class="chk"><input type="checkbox" id="pkl" checked> 🏷️ قوائم الماركات والفئات</label></div>
     <label>ملاحظة على النسخة (اختياري)<input id="pkn" maxlength="120" placeholder="مثلًا: أضفت أكواد دليل العربي"></label>
     <div class="row"><button class="primary" id="pkgo" type="button">⬇️ نزّل ملف المرجع (data-pack.json)</button></div>
     <ol class="steps2"><li>نزّل الملف.</li><li>ارفعه مع ملفات البرنامج <b>بنفس الاسم data-pack.json</b> مكان القديم — من غير ما تغيّر رقم الإصدار.</li><li>أي حد يفتح البرنامج وهو متصل بالنت هياخد التحديث لوحده ويظهرله «📚 اتحدّث المرجع».</li></ol>
     <p class="mu">${I && I.ver ? `المرجع المركّب على الجهاز ده: نسخة ${E(dt(I.ver))}` : "لسه مفيش مرجع منشور اتركّب على الجهاز ده."}</p>`;
  }
  function wirePack() {
    const go = $("#pkgo"); if (!go) return;
    go.onclick = () => {
      const opt = { faults: $("#pkf").checked, custom: $("#pkc").checked, content: $("#pkt").checked, lists: $("#pkl").checked, note: $("#pkn").value.trim(), app: typeof APP_VERSION != "undefined" ? APP_VERSION : "" };
      if (!opt.faults && !opt.custom && !opt.content && !opt.lists) return toast("اختار حاجة واحدة على الأقل");
      const P = PK.build(packState(), opt), c = P.counts;
      if (!confirm(`هتنزّل مرجع فيه: ${opt.faults ? c.faults + " كود و" + c.tests + " تيست مود، " : ""}${opt.custom ? c.custom + " كباس، " : ""}${opt.content ? c.content + " عنصر محتوى، " : ""}${opt.lists ? "القوائم" : ""}.\nأي حد يفتح اللينك هيشوفهم. نكمّل؟`)) return;
      dl("data-pack.json", JSON.stringify(P), "application/json");
      st().set("mw_pack_pub", { ver: P.ver, counts: c }); X2.log("نشر المرجع", `نسخة ${P.ver}`);
      toast("اتنزّل ✓ — ارفعه مع ملفات البرنامج باسم data-pack.json");
    };
  }

  g.DUPUI = { page, cleanPage, packBlock, merge, importPage, formWatch, adminBlock, wireAdmin, exportFaults, exportComps, template, fixCompLinks };
})(window);

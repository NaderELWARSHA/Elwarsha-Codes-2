/* =====================================================================
   eng-colmap.js — تحويل شيت (Excel/CSV) لسجلات كباسات أو أكواد أعطال (v15.1)
   محرك نقي (يُختبر في Node). الخطوات:
   1) detect(rows, kind): يلاقي صف العناوين (حتى لو العنوان على صفين، زي
      «Capacity (W)» وتحته «-23.3°C») ويطابق كل عمود بخانة من خانات النظام
      بالعربي أو الإنجليزي، ويكتشف وحدة القدرة لو مكتوبة.
   2) build(rows, plan, opts): يحوّل كل صف لسجل بنفس صيغة النظام، مع:
      - «تنزيل» القيمة للخلايا المدمجة (الماركة/الجهد/التردد/الفريون…).
      - توحيد الكتابة: R-600a→R600a، «L B P»→LBP، «1/4 حصان»→1/4، الجهد والتردد.
      - تحويل الوحدات المعلنة فقط (W↔kcal/h↔BTU/h)؛ لا يخمّن وحدة ولا قيمة.
   أي خانة فاضية تفضل فاضية، وأي شيء غير مفهوم يظهر كتحذير للصف.
   ===================================================================== */
(function (g) {
  "use strict";
  const normAr = v => String(v ?? "").toLowerCase().normalize("NFKC").replace(/[ً-ٰٟ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ـ/g, "").replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0)).replace(/[\s\-_.\\:()\[\]*]+/g, "").trim();
  /* نفس قواعد X2.num: أرقام عربية، «٫» و«,» عشرية، «12,000» آلاف */
  const num = s => { if (typeof s == "number") return s; let t = String(s ?? "").replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٬\s ]/g, "").replace(/[−–]/g, "-").trim(); if (/^[-+]?\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, ""); t = t.replace(/[٫,]/g, "."); return t === "" ? NaN : Number(t); };
  const isNum = v => typeof v == "number" && isFinite(v);
  const KCAL_PER_W = 0.859845, BTU_PER_KCAL = 3.96832;

  /* خانات النظام ومرادفاتها (الأطول أولًا داخل كل خانة) */
  const F = {
    comp: [
      ["model", "الموديل", ["model no", "model number", "رقم الموديل", "الموديل", "موديل", "model", "type"], 1],
      ["brand", "الماركة", ["manufacturer", "الشركة المصنعة", "الماركة", "ماركة", "الشركة", "brand", "make", "المصنع"]],
      ["refrigerant", "الفريون", ["refrigerant", "وسيط التبريد", "الفريون", "فريون", "gas", "غاز"]],
      ["application", "التطبيق", ["application", "التطبيق", "الاستخدام", "app"]],
      ["hp", "القدرة (حصان)", ["horse power", "horsepower", "القدرة حصان", "حصان", "hp"]],
      ["volt", "الجهد (يُكتب في الملاحظات)", ["voltage", "الجهد", "فولت", "volt"]],
      ["freq", "التردد", ["frequency", "التردد", "freq", "hz"]],
      ["displacement", "الإزاحة (cc)", ["displacement", "الازاحه", "ازاحه", "cm3", "cc"]],
      ["capacity", "قدرة التبريد (حدد الوحدة)", ["cooling capacity", "قدره التبريد", "القدره التبريديه", "capacity", "السعه"]],
      ["kcal", "قدرة التبريد kcal/h", ["kcal/h", "kcalh", "kcal", "كيلو كالوري"]],
      ["btu", "قدرة التبريد BTU/h", ["btu/h", "btuh", "btu"]],
      ["watt", "القدرة الكهربائية (W)", ["power input", "input power", "motor input", "القدره الكهربائيه", "الدخل", "input", "watt"]],
      ["amp", "التيار (A)", ["rated current", "current", "التيار", "امبير", "rla", "amps", "amp"]],
      ["lra", "تيار البدء LRA (ملاحظات)", ["locked rotor", "lra", "تيار البدء"]],
      ["run_capacitor", "مكثف التشغيل", ["run capacitor", "run cap", "مكثف التشغيل", "مكثف تشغيل"]],
      ["start_capacitor", "مكثف البدء", ["start capacitor", "start cap", "مكثف البدء", "مكثف بدء"]],
      ["oil_qty", "كمية الزيت", ["oil charge", "oil quantity", "كميه الزيت", "شحنه الزيت", "الزيت", "oil"]],
      ["rpm", "RPM", ["rpm", "السرعه"]],
      ["cop", "COP (ملاحظات)", ["cop", "eer", "الكفاءه"]],
      ["motor", "نوع الموتور (ملاحظات)", ["motor type", "نوع الموتور", "motor"]],
      ["compat_doc", "بدائل موثقة", ["alternatives", "equivalent", "البدائل", "بدائل"]],
      ["notes", "ملاحظات", ["remarks", "ملاحظات", "ملاحظه", "notes", "note"]],
      ["srcRef", "المصدر", ["reference", "المصدر", "source"]]
    ],
    fault: [
      ["code", "كود العطل", ["error code", "fault code", "كود العطل", "الكود", "كود", "code", "error"], 1],
      ["brand", "الماركة", ["manufacturer", "الماركة", "ماركة", "الشركة", "brand", "make"]],
      ["deviceType", "نوع الجهاز", ["device type", "appliance", "نوع الجهاز", "الجهاز", "device"]],
      ["category", "الفئة", ["category", "الفئه", "النوع"]],
      ["model", "الموديل", ["model", "الموديل", "موديل"]],
      ["title", "الوصف / العنوان", ["description", "meaning", "وصف العطل", "المعنى", "الوصف", "العطل", "title"]],
      ["cause", "السبب المحتمل", ["possible cause", "causes", "cause", "الاسباب", "السبب"]],
      ["fix", "الفحص / الحل", ["solution", "remedy", "خطوات الفحص", "الاصلاح", "الحل", "fix", "check"]],
      ["note", "ملاحظات", ["remarks", "notes", "note", "ملاحظات", "ملاحظه"]],
      ["srcRef", "المصدر", ["reference", "المصدر", "source"]]
    ]
  };
  /* خانات تقبل أكتر من عمود (بتتجمع في الملاحظات بعنوان كل عمود) */
  const MULTI = new Set(["notes", "cop", "motor", "lra"]);
  const FILL_DOWN = { comp: ["brand", "refrigerant", "application", "volt", "freq"], fault: ["brand", "deviceType", "category", "model"] };
  const SYN = {}; Object.entries(F).forEach(([k, L]) => SYN[k] = L.map(([f, l, s]) => [f, s.map(normAr)]));
  const fieldsOf = kind => F[kind].map(([k, l]) => ({ k, l }));

  /* عمود درجة حرارة تبخير: «-23.3°C» أو «−30 °C» أو «-15» */
  const tempOf = h => { const m = String(h ?? "").replace(/[−–]/g, "-").match(/^\s*([+-]?\d{1,2}(?:[.,]\d)?)\s*(?:°\s*c|℃|c)?\s*$/i); return m ? String(+m[1].replace(",", ".")) : null; };
  const unitOf = t => { const s = String(t || "").toLowerCase(); return /kcal/.test(s) ? "kcal" : /btu/.test(s) ? "btu" : /\(\s*w\s*\)|\bwatts?\b|\bw\b|وات/.test(s) ? "W" : null; };

  function matchField(kind, header) {
    const h = normAr(header); if (!h) return null; let best = null, bs = 0;
    for (const [f, syns] of SYN[kind]) for (const s of syns) { const sc = h === s ? 3 : h.startsWith(s) ? 2 : s.length >= 3 && h.includes(s) ? 1 : 0; if (sc > bs) { bs = sc; best = f; } }
    return best ? { field: best, score: bs } : null;
  }

  /* 1) اكتشاف صف العناوين وخطة الأعمدة */
  function detect(rows, kind) {
    const R = (rows || []).slice(0, 25); let h = -1, hs = 0;
    R.forEach((r, i) => { const s = (r || []).reduce((n, c) => n + (matchField(kind, c) ? 1 : 0), 0); if (s > hs) { hs = s; h = i; } });
    if (h < 0) return { header: -1, start: 0, cols: [], capUnit: null, note: "ملقيتش صف عناوين معروف — حدّد الأعمدة بنفسك" };
    const top = rows[h] || [], sub = rows[h + 1] || [];
    const twoRow = kind == "comp" && sub.filter(c => tempOf(c) != null).length >= 2;
    const width = Math.max(top.length, twoRow ? sub.length : 0);
    let last = ""; const cols = [];
    const used = new Set();
    for (let c = 0; c < width; c++) {
      const t = top[c] != null && String(top[c]).trim() !== "" ? String(top[c]) : ""; if (t) last = t;
      const s = twoRow && sub[c] != null ? String(sub[c]) : "";
      const temp = twoRow ? tempOf(s) : (kind == "comp" ? tempOf(t) : null);
      const head = (t || (twoRow && s ? last : "")) + (s && !temp ? " " + s : "");
      if (temp != null && kind == "comp") { cols.push({ c, head: (last ? last + " " : "") + s, field: "temp", temp }); continue; }
      const m = matchField(kind, t || head); let field = m ? m.field : null;
      if (field && used.has(field) && !MULTI.has(field)) field = null; if (field) used.add(field);
      cols.push({ c, head: (head || t || "").trim(), field });
    }
    const around = rows.slice(Math.max(0, h - 3), h + 2).flat().join(" ");
    const capUnit = cols.some(x => x.field == "temp" || x.field == "capacity") ? (unitOf(cols.filter(x => x.field == "temp" || x.field == "capacity").map(x => x.head).join(" ")) || unitOf(around)) : null;
    return { header: h, start: h + (twoRow ? 2 : 1), cols, capUnit, twoRow };
  }

  /* ---------------- التوحيد ---------------- */
  const LOWER_A = new Set(["134", "600", "152", "1234"]);
  function normRef(v) { const m = String(v ?? "").toUpperCase().replace(/[\s\-_]/g, "").match(/^R?(\d{2,4})([A-Z]{0,2})$/); if (!m) return null; let s = m[2]; if (s == "A" && LOWER_A.has(m[1])) s = "a"; return "R" + m[1] + s; }
  function normApp(v) { const s = String(v ?? "").toUpperCase().replace(/[\s\-]/g, ""); return /^(LBP|MBP|HBP|CBP|L\/MBP|M\/HBP|LMBP|HMBP)$/.test(s) ? s.replace("LMBP", "L/MBP").replace("HMBP", "M/HBP") : null; }
  function normHp(v) { if (isNum(v)) return String(v); const s = String(v ?? "").replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/حصان|hp|h\.p\.?/gi, "").replace(/\s/g, ""); const m = s.match(/^(\d+)\/(\d+)$|^(\d+(?:[.,]\d+)?)$|^(\d+)\s*(\d+)\/(\d+)$/); if (!m) return null; return m[1] ? m[1] + "/" + m[2] : m[3] ? String(+m[3].replace(",", ".")) : null; }
  function parseVoltFreq(v) { const s = String(v ?? "").replace(/[−–]/g, "-"); const vm = s.match(/(\d{2,3}(?:\s*[-\/~]\s*\d{2,3})?)\s*v/i), fm = s.match(/(50|60)\s*(?:[\/,]\s*(50|60))?\s*hz/i); return { volt: vm ? vm[1].replace(/\s/g, "") + "V" : null, freq: fm ? (fm[2] ? fm[1] + "/" + fm[2] : +fm[1]) : null }; }
  function normFreq(v) { if (isNum(v) && (v == 50 || v == 60)) return v; const s = String(v ?? "").replace(/hz/i, "").replace(/\s/g, ""); return /^(50|60)$/.test(s) ? +s : /^(50\/60|60\/50)$/.test(s) ? "50/60" : null; }
  const txt = v => v == null ? "" : String(v).replace(/\s+/g, " ").trim();

  /* 2) بناء السجلات */
  function build(rows, plan, opts = {}) {
    const kind = opts.kind || "comp", out = [], errors = [], last = {};
    const fd = new Set(FILL_DOWN[kind]); const cols = plan.cols.filter(c => c.field);
    const keyField = kind == "comp" ? "model" : "code";
    for (let i = plan.start; i < rows.length; i++) {
      const r = rows[i] || []; if (!r.some(c => c != null && String(c).trim() !== "")) continue;
      const raw = {}, temps = {}, warn = [];
      const multi = [];
      cols.forEach(({ c, field, temp, head }) => { const v = r[c], ok = v != null && String(v).trim() !== "" && String(v).trim() !== "-"; if (!ok) return; if (field == "temp") { temps[temp] = v; return; } if (MULTI.has(field) && cols.filter(x => x.field == field).length > 1) { multi.push([field, head, v]); return; } raw[field] = v; });
      fd.forEach(f => { if (raw[f] != null) last[f] = raw[f]; else if (last[f] != null) raw[f] = last[f]; });
      const rowNo = i + 1;
      if (!txt(raw[keyField])) { if (Object.keys(raw).filter(k => !fd.has(k)).length) errors.push({ row: rowNo, why: kind == "comp" ? "الموديل فاضي" : "كود العطل فاضي" }); continue; }
      if (kind == "fault") {
        const rec = {}; ["deviceType", "brand", "category", "model", "code", "title", "cause", "fix", "note", "srcRef"].forEach(k => { const t = txt(raw[k]); if (t) rec[k] = t; });
        if (multi.length) rec.note = [rec.note].concat(multi.map(([f, h, v]) => txt(h) + ": " + txt(v))).filter(Boolean).join(" · ");
        if (!rec.brand && opts.brand) rec.brand = opts.brand; if (!rec.deviceType && opts.deviceType) rec.deviceType = opts.deviceType;
        if (!rec.srcRef && opts.src) rec.srcRef = opts.src; if (opts.status) rec.srcStatus = opts.status;
        out.push({ row: rowNo, rec, warn }); continue;
      }
      const rec = { model: txt(raw.model) }, notes = [];
      const brand = txt(raw.brand) || opts.brand || "";
      if (raw.refrigerant != null) { const n = normRef(raw.refrigerant); if (n) rec.refrigerant = n; else { rec.refrigerant = txt(raw.refrigerant); warn.push("الفريون مكتوب بشكل غير معروف: " + txt(raw.refrigerant)); } } else if (opts.refrigerant) rec.refrigerant = opts.refrigerant;
      if (raw.application != null) { const n = normApp(raw.application); if (n) rec.application = n; else { rec.application = txt(raw.application); warn.push("التطبيق غير معروف: " + txt(raw.application)); } } else if (opts.application) rec.application = opts.application;
      if (raw.hp != null) { const n = normHp(raw.hp); if (n) rec.hp = n; else warn.push("الحصان مش رقم واضح: " + txt(raw.hp)); }
      let vf = { volt: null, freq: null }; if (raw.volt != null) vf = parseVoltFreq(raw.volt);
      if (raw.freq != null) { const f = normFreq(raw.freq) ?? parseVoltFreq(raw.freq).freq; if (f != null) rec.freq = f; else warn.push("التردد غير واضح: " + txt(raw.freq)); } else if (vf.freq != null) rec.freq = vf.freq;
      if (vf.volt || raw.volt != null) notes.push("الجهد: " + (vf.volt || txt(raw.volt)));
      [["displacement", "الإزاحة"], ["watt", "القدرة الكهربائية"], ["amp", "التيار"], ["run_capacitor", "مكثف التشغيل"], ["start_capacitor", "مكثف البدء"], ["oil_qty", "كمية الزيت"], ["rpm", "RPM"]].forEach(([k, l]) => { if (raw[k] == null) return; const n = num(raw[k]); if (isNum(n) && n >= 0) rec[k] = n; else { warn.push(l + " مش رقم: " + txt(raw[k]) + " — اتكتب في الملاحظات"); notes.push(l + ": " + txt(raw[k])); } });
      if (rec.oil_qty != null) rec.oil_unit = opts.oilUnit || "cc";
      // قدرة التبريد بالوحدة المعلنة فقط
      const cu = opts.capUnit || plan.capUnit, toW = v => cu == "W" ? v : cu == "kcal" ? v / KCAL_PER_W : cu == "btu" ? v / BTU_PER_KCAL / KCAL_PER_W : NaN;
      const tc = {}; Object.entries(temps).forEach(([t, v]) => { const n = num(v); if (isNum(n) && n > 0) { if (!cu) return; tc[t] = +toW(n).toFixed(3); } });
      if (Object.keys(temps).length && !cu) warn.push("أعمدة القدرة عند درجات الحرارة اتسابت: حدّد وحدة القدرة (W أو kcal/h أو BTU/h)");
      if (Object.keys(tc).length) rec.temp_capacity = tc;
      const setCap = W => { rec.kcal = +(W * KCAL_PER_W).toFixed(3); rec.btu = +(rec.kcal * BTU_PER_KCAL).toFixed(3); };
      if (raw.kcal != null && isNum(num(raw.kcal))) { rec.kcal = num(raw.kcal); rec.btu = +(rec.kcal * BTU_PER_KCAL).toFixed(3); }
      else if (raw.btu != null && isNum(num(raw.btu))) { rec.btu = num(raw.btu); rec.kcal = +(rec.btu / BTU_PER_KCAL).toFixed(3); }
      else if (raw.capacity != null && isNum(num(raw.capacity))) { if (cu) { setCap(toW(num(raw.capacity))); notes.push("قدرة التبريد من الملف بدون درجة تبخير محددة"); } else warn.push("عمود القدرة اتساب: حدّد وحدته"); }
      else if (tc["-23.3"] != null) setCap(tc["-23.3"]);
      if (raw.lra != null) notes.push("LRA: " + txt(raw.lra)); if (raw.cop != null) notes.push("COP: " + txt(raw.cop)); if (raw.motor != null) notes.push("نوع الموتور: " + txt(raw.motor));
      if (raw.compat_doc != null) rec.compat_doc = txt(raw.compat_doc);
      const ML = { cop: "COP", motor: "نوع الموتور", lra: "LRA", notes: "" };
      multi.forEach(([f, h, v]) => notes.push((ML[f] ? ML[f] + " (" + txt(h) + ")" : txt(h)) + ": " + txt(v)));
      if (raw.notes != null) notes.push(txt(raw.notes));
      if (notes.length) rec.notes = notes.join(" · ");
      rec.srcRef = txt(raw.srcRef) || opts.src || ""; if (!rec.srcRef) delete rec.srcRef;
      if (opts.status) rec.srcStatus = opts.status; if (opts.srcDate) rec.srcDate = opts.srcDate;
      if (cu && (Object.keys(tc).length || raw.capacity != null)) rec.srcNote = `وحدة القدرة في الملف: ${cu == "W" ? "W" : cu == "kcal" ? "kcal/h" : "BTU/h"}؛ التحويل: kcal/h = W × ${KCAL_PER_W} ، BTU/h = kcal/h × ${BTU_PER_KCAL}`;
      if (!brand) warn.push("الماركة فاضية — اختار «الماركة لكل الملف»");
      out.push({ row: rowNo, rec: { brand: brand || "إضافات يدوية", rec }, warn });
    }
    return { recs: out, errors };
  }

  /* CSV بسيط (فاصلة أو ;) مع علامات التنصيص */
  function parseCSV(t) { const rows = []; let row = [], cell = "", q = false; t = String(t).replace(/^﻿/, ""); const first = t.split(/\r?\n/)[0], sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? "\t" : ",";
    for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c == '"') { if (t[i + 1] == '"') { cell += '"'; i++; } else q = false; } else cell += c; } else if (c == '"') q = true; else if (c == sep) { row.push(cell); cell = ""; } else if (c == "\n" || c == "\r") { if (c == "\r" && t[i + 1] == "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); } return rows; }

  const api = { F, fieldsOf, detect, build, parseCSV, normRef, normApp, normHp, normFreq, parseVoltFreq, tempOf, unitOf, num, matchField, KCAL_PER_W, BTU_PER_KCAL };
  if (typeof module == "object" && module.exports) module.exports = api; else g.CMAP = api;
})(typeof window != "undefined" ? window : globalThis);

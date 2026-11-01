/* اختبارات v15 (Node): إصلاحات المنطق + سلامة الوثائق والكاش + قواعد محتوى طبقة الشرح.
   كل اختبار يقابل بندًا في AUDIT.md (رقم البند بين []). */
const assert = require("assert"), fs = require("fs"), path = require("path");
const EE = require("./eng-elec.js"), ER = require("./eng-refrig.js"), EC = require("./eng-comp.js"), EU = require("./eng-units.js"), ED = require("./eng-diag.js");
let p = 0, f = 0;
const t = (n, fn) => { try { fn(); p++; console.log("PASS", n); } catch (x) { f++; console.log("FAIL", n, "-", x.message); } };
const close = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const read = x => fs.readFileSync(path.join(__dirname, x), "utf8");

/* ---- دالة قراءة الأرقام من app2.js (نفس الكود بالظبط) [4] ---- */
const src2 = read("app2.js"), m = src2.match(/num=s=>\{[\s\S]*?return t===""\?NaN:Number\(t\)\};/);
const num = eval("(" + m[0].replace(/^num=/, "").replace(/;$/, "") + ")");
t("[4] «12,000» = 12000 (فاصل آلاف) و«1,500,000» = 1500000", () => { assert.equal(num("12,000"), 12000); assert.equal(num("1,500,000"), 1500000); assert.equal(num("-12,000"), -12000); });
t("[4] «1,5» = 1.5 و«12,5» = 12.5 (فاصلة عشرية)", () => { assert.equal(num("1,5"), 1.5); assert.equal(num("12,5"), 12.5); assert.equal(num("0,25"), 0.25); });
t("[4] أرقام عربية و«٫» و«٬» ومسافات", () => { assert.equal(num("١٢٫٥"), 12.5); assert.equal(num("١٢٬٠٠٠"), 12000); assert.equal(num(" 12 000 "), 12000); assert.equal(num("۳٫۵"), 3.5); });
t("[4] قيم غير صالحة = NaN والفارغ = NaN", () => { assert(Number.isNaN(num("abc"))); assert(Number.isNaN(num(""))); assert(Number.isNaN(num("1,2,3"))); });

/* ---- فاحص ملفات الكباس [2][3] ---- */
t("[2] الترتيب المجهول: رسالة «أكبر من المجموع» تذكر الزوج الفعلي وليس R-S", () => { const r = EC.windings({ known: false, a: 3, b: 5, c: 20 }); assert.equal(r.status, "inconsistent"); assert(r.findings.join(" ").includes("2-3")); assert(!/قراءة R-S/.test(r.findings.join(" "))); });
t("[2] الترتيب المعروف ما زال يذكر R-S", () => { const r = EC.windings({ known: true, a: 3, b: 5, c: 20 }); assert(r.findings.join(" ").includes("R-S")); });
t("[3] قراءة واحدة شبه صفر = قصر محتمل بين الطرفين بالاسم", () => { const r = EC.windings({ known: false, a: 0.05, b: 3, c: 3.1 }); assert.equal(r.status, "one-low"); assert(/قصر محتمل بين الطرفين 1 و2/.test(r.findings[0])); });
t("[3] قراءات سليمة لا تتأثر بالحالة الجديدة", () => { const r = EC.windings({ known: false, a: 3, b: 5, c: 8 }); assert.equal(r.status, "consistent"); assert.deepEqual(r.terminals, { C: "1", R: "2", S: "3" }); });
t("فاحص الملفات: الثلاثة مفتوحة = أوفرلود/قطع، وقراءات متساوية = ثلاثي", () => { assert.equal(EC.windings({ known: false, a: "OL", b: "OL", c: "OL" }).status, "all-open"); assert.equal(EC.windings({ known: false, a: 4, b: 4.05, c: 4 }).status, "looks-3ph"); });
t("الثلاثي: عدم الاتزان = أقصى |x−المتوسط| ÷ المتوسط", () => { const r = EC.windings3({ a: 4, b: 4, c: 4.6 }), m = 12.6 / 3; assert(close(r.maxDev, Math.max(...[4, 4, 4.6].map(x => Math.abs(x - m) / m)))); });

/* ---- مقارنة الحسابات بحساب يدوي مستقل ---- */
t("أوم: 220V/44Ω = 5A و1100W ؛ 1000W/220V → 48.4Ω", () => { const r = EE.ohm4({ V: 220, R: 44 }); assert(close(r.I, 5)); assert(close(r.P, 1100)); assert(close(EE.ohm4({ P: 1000, V: 220 }).R, 48.4)); });
t("القدرة: أحادي 220V×5A×0.8 = 880W ، ثلاثي √3×380×10×0.85", () => { assert(close(EE.power({ mode: "ac1", V: 220, I: 5, pf: 0.8 }).P, 880)); assert(close(EE.power({ mode: "ac3", V: 380, I: 10, pf: 0.85 }).P, Math.sqrt(3) * 380 * 10 * 0.85)); });
t("هبوط الجهد: أحادي 2×L×I×ρ/S وثلاثي √3×L×I×ρ/S (نحاس 20°C)", () => { assert(close(EE.vdrop({ mat: "cu", S: 2.5, L: 30, I: 16, V: 220, phase: 1, pf: 1, temp: 20 }).dv, 2 * 30 * 16 * 0.017241 / 2.5, 1e-4)); assert(close(EE.vdrop({ mat: "cu", S: 4, L: 50, I: 20, V: 380, phase: 3, pf: 1, temp: 20 }).dv, Math.sqrt(3) * 50 * 20 * 0.017241 / 4, 1e-4)); });
t("التيار المتوقع وسخان 2000W/220V = 24.2Ω", () => { assert(close(EE.expectedCurrent({ P: 1500, V: 220, pf: 0.9, phase: 1, eff: 0.9 }).I, 1500 / (220 * 0.81))); assert(close(EE.loadResistance({ P: 2000, V: 220 }).R, 24.2)); });
t("التحويل: 12000 BTU/h = 3516.85W ، 1 bar = 14.5038 psi ، 1 HP(mech) = 745.7W", () => { assert(close(EU.convert("power", 12000, "BTU/h", "W").value, 3516.8528, 1e-6)); assert(close(EU.convert("pressure", 1, "bar", "psi").value, 14.50377, 1e-5)); assert(close(EU.convert("power", 1, "HP(mech)", "W").value, 745.6999, 1e-5)); });
t("مانومتر↔مطلق: 500 kPa(g) = 601.325 kPa(abs) والافتراضي مانومتر في الحسابات", () => { assert(close(EU.gaugeToAbs(500).abs, 601.325)); const F = ER.fluids(); const a = ER.satFromGauge(F.R22, 500), b = ER.satFromGauge(F.R22, 500, { mode: "abs" }); assert(close(a.pAbs, 601.325)); assert(a.Tdew > b.Tdew); });
t("السوبرهيت = حرارة الماسورة − Tsat(Dew) ، السابكول = Tsat(Bubble) − خط السائل", () => { const F = ER.fluids(); const s = ER.superheat(F.R410A, { p: 800, mode: "gauge", tLine: 10 }), sat = ER.satFromGauge(F.R410A, 800); assert(close(s.SH, 10 - sat.Tdew)); const c = ER.subcooling(F.R410A, { p: 2600, mode: "gauge", tLine: 38 }), sat2 = ER.satFromGauge(F.R410A, 2600); assert(close(c.SC, sat2.Tbubble - 38)); });
t("ضغط مطلق سالب أو خارج الجدول يُرفض بوضوح (لا استقراء)", () => { const F = ER.fluids(); assert(ER.superheat(F.R410A, { p: -150, mode: "gauge", tLine: 10 }).err); assert(/خارج نطاق/.test(ER.superheat(F.R410A, { p: -50, mode: "gauge", tLine: 10 }).err)); });

/* ---- الكاش والإصدار والوثائق [12][13] ---- */
const ver = read("version.js"), sw = read("sw.js"), idx = read("index.html"), readme = read("README.md");
t("[12] اسم الكاش في مكان واحد: version.js (mrf-v15…) و sw.js يستورده بلا اسم ثابت", () => { assert(/CACHE_NAME\s*=\s*"mrf-v15[\w-]*"/.test(ver)); assert(/importScripts\("version\.js"\)/.test(sw)); assert(!/"mrf-v\d/.test(sw)); assert(/const C=self\.CACHE_NAME/.test(sw)); });
t("[12] كل ملف تحمّله index.html موجود ومُخزَّن في الـ SW", () => { const refs = [...idx.matchAll(/(?:src|href)="([^"#:]+?\.(?:js|css|png|svg|webmanifest))"/g)].map(x => x[1]); assert(refs.length > 20); const pre = JSON.parse(sw.match(/F=(\[[^\]]+\])/)[1]); refs.forEach(r => { assert(fs.existsSync(path.join(__dirname, r)), "مفقود: " + r); assert(pre.includes(r), "غير مخزّن في SW: " + r); }); pre.filter(x => x != "./").forEach(x => assert(fs.existsSync(path.join(__dirname, x)), "SW يشير لملف غير موجود: " + x)); });
t("[12] أيقونات الـ manifest موجودة", () => { const mf = JSON.parse(read("manifest.webmanifest")); mf.icons.forEach(i => assert(fs.existsSync(path.join(__dirname, i.src)), i.src)); });
t("[13] README يذكر الكاش الحالي فقط، وكل ملف يذكره موجود", () => { const cur = ver.match(/CACHE_NAME\s*=\s*"([^"]+)"/)[1], caches = [...readme.matchAll(/mrf-v[\w-]+/g)].map(x => x[0]); assert(caches.length && caches.every(c => c == cur), "كاش في README: " + [...new Set(caches)] + " والحالي " + cur); const files = [...new Set([...readme.matchAll(/`([\w.\-/]+\.(?:js|py|css|md|png|svg|html|webmanifest|json))`/g)].map(x => x[1]))]; assert(files.length > 15); files.forEach(x => assert(fs.existsSync(path.join(__dirname, x)), "README يشير لملف غير موجود: " + x)); });
t("[1] الإدارة مقفولة افتراضيًا في الكود المنشور", () => { assert(/const ADMIN_DEV=false/.test(read("app.js"))); });

/* ---- قواعد محتوى طبقة الشرح ---- */
global.window = global; require("./kit-guide.js"); const KG = global.KG;
const toolIds = new Set(["kit.js", "kit2.js", "circuit-ui.js", "harness-ui.js"].flatMap(x => [...read(x).matchAll(/reg\("([\w-]+)"/g)].map(m => m[1])));
t("[17] كل أداة مسجّلة لها «ما هذه الأداة؟» و«متى» في القالب الموحد", () => { const miss = [...toolIds].filter(id => !KG.G[id] || !KG.G[id].what); assert.deepEqual(miss, []); });
t("[17] كل رابط «وبعدين أعمل إيه؟» يشير لأداة/مسار/مصطلح موجود", () => { const flows = new Set(ED.BUILTIN.map(x => x.id)), gl = new Set(KG.GL.map(x => x[0])); Object.entries(KG.G).forEach(([id, g]) => (g.next || []).forEach(([l, h]) => { if (h == "#/glossary") return; const m = h.match(/^#\/kit\/diag\/([\w-]+)$/) || h.match(/^#\/glossary\/([\w-]+)$/) || h.match(/^#\/kit\/([\w-]+)$/); assert(m, id + " رابط غير معروف " + h); if (h.startsWith("#/kit/diag/")) assert(flows.has(m[1]), h); else if (h.startsWith("#/glossary/")) assert(gl.has(m[1]), h); else assert(toolIds.has(m[1]), h); })); });
t("[16] مفاتيح السلامة صحيحة، وكل أداة فيها كهرباء/مكثف/ضغط لها تحذير", () => { Object.entries(KG.G).forEach(([id, g]) => (g.safety || []).forEach(k => assert(KG.SAFETY[k], id + ":" + k))); ["ohm", "loadR", "comp-wind", "cap-check", "motor-wind", "components", "harness", "superheat", "subcool", "pt", "cycle", "capillary", "gauge"].forEach(id => assert((KG.G[id].safety || []).length, "بلا تحذير: " + id)); assert(KG.G["cap-check"].safety.includes("cap")); assert(KG.G.capillary.safety.includes("flam")); });
t("[20] القاموس: مصطلحات أساسية موجودة وروابط الأدوات صحيحة", () => { const ids = KG.GL.map(x => x[0]); ["safety", "superheat", "subcool", "pt", "gauge", "lra", "ptc", "overload", "capillary", "relay", "crs", "megger"].forEach(k => assert(ids.includes(k), k)); KG.GL.forEach(x => { if (x[5]) assert(toolIds.has(x[5]), "أداة غير موجودة " + x[5]); }); assert.equal(new Set(ids).size, ids.length); });
t("[17] كل «جرّب مثالًا» موسوم كمثال تعليمي ومكتوب له شرح", () => { Object.entries(KG.G).forEach(([id, g]) => { if (g.ex) assert((g.ex._note || "").length > 10, id); }); assert(/مثال تعليمي، ليس قراءة حقيقية/.test(read("kit-guide.js"))); });
t("مستويات الشرح ثلاثة والافتراضي مبتدئ", () => { assert.deepEqual(KG.LEVELS.map(x => x[0]), ["beg", "tech", "pro"]); assert(/get\("mw_level", "beg"\)/.test(read("kit-guide.js"))); });

console.log(`\n${p} نجح، ${f} فشل`); process.exitCode = f ? 1 : 0;

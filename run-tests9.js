/* اختبارات v15.3 (Node): «حزمة المرجع» — البناء والدمج الثلاثي */
const assert = require("assert"), PK = require("./eng-pack.js");
let p = 0, f = 0; const Q = [];
const t = (n, fn) => Q.push([n, fn]);
const F = (id, code, extra) => Object.assign({ id, deviceType: "غسالة", brand: "شارب (Sharp)", code, title: "عطل " + code }, extra || {});
const owner = () => ({
  faults: [F("a", "E1", { fix: "افحص الطلمبة", imgs: ["img1"], createdAt: "2026-01-01", source: "imported" }), F("b", "E2"), { id: "t1", kind: "test", deviceType: "غسالة", brand: "شارب (Sharp)", title: "تيست", enter: "x", tests: "y" }],
  custom: [{ id: "c1", brand: "باناسونيك", rec: { model: "QB1", refrigerant: "R134a" }, addedAt: "2026-01-01" }],
  cms: { circuits: { items: { u1: { name: "دائرتي", comps: [], wires: [] } }, deleted: ["ckt-timer"] } },
  lib: { capillary: [{ refrigerant: "R600a", id_mm: 0.7, length_m: 3 }] },
  flows: [{ id: "fl1", title: "مسار", nodes: {}, start: "n1" }], sensors: [{ brand: "LG", name: "حساس", points: [[25, 10]] }],
  lists: { brand: ["شارب (Sharp)", "ماركة جديدة"], catmap: { "غسالة": ["تحميل علوي"] }, seeded: true },
  meas: [{ secret: 1 }], harness: [{ x: 1 }], log: ["x"], admin: { hash: "zz" }
});

t("البناء: كل المحتوى، من غير الصور والخانات المتغيرة، ومن غير أي حاجة شخصية", () => {
  const P = PK.build(owner(), { ver: "v1" });
  assert.equal(PK.validate(P), ""); assert.equal(P.format, "mrf-pack");
  assert.deepEqual(P.counts, { faults: 2, tests: 1, custom: 1, content: 4 });
  assert(!JSON.stringify(P).includes("img1") && !JSON.stringify(P).includes("createdAt") && !JSON.stringify(P).includes("addedAt"));
  ["meas", "harness", "log", "admin"].forEach(k => assert(!(k in P), k));
  const P2 = PK.build(owner(), { ver: "v1", content: false, lists: false }); assert(!P2.cms && !P2.lib && !P2.flows && !P2.lists && P2.faults.length == 3);
});
t("البصمة: نفس المحتوى = نفس البصمة مهما اختلف ترتيب الخانات أو الصور", () => {
  assert.equal(PK.hash({ a: 1, b: [1, { c: 2, d: 3 }] }), PK.hash({ b: [1, { d: 3, c: 2 }], a: 1, imgs: ["x"], updatedAt: "y" }));
  assert.notEqual(PK.hash({ a: 1 }), PK.hash({ a: 2 }));
});
t("جهاز جديد فاضي: كل الحزمة تتضاف ومعلّمة إنها من المرجع", () => {
  const P = PK.build(owner(), { ver: "v1" }), r = PK.apply({ faults: [], custom: [], cms: {}, lib: {}, flows: [], sensors: [], lists: {} }, P, null);
  assert.equal(r.stats.added, 3 + 1 + 1 + 1 + 1 + 1); assert.equal(r.local.faults.length, 3); assert.equal(r.local.faults[0].source, "pack");
  assert(PK.fromPack(r.inst, "faults", r.local.faults[0])); assert.equal(r.inst.ver, "v1");
  assert.deepEqual(r.local.cms.circuits.deleted, ["ckt-timer"]); assert(r.local.cms.circuits.items.u1);
  assert(r.local.lists.brand.includes("ماركة جديدة") && r.local.lists.catmap["غسالة"].includes("تحميل علوي"));
});
t("جهاز صاحب البرنامج: بياناته زي الحزمة ← ما يتضافش ولا يتكرر حاجة (يتبنّى بس)", () => {
  const O = owner(), P = PK.build(O, { ver: "v1" }), r = PK.apply(O, P, null);
  assert.equal(r.stats.added, 0); assert.equal(r.stats.updated, 0); assert.equal(r.local.faults.length, 3);
  assert.deepEqual(r.local.faults[0].imgs, ["img1"], "صوره عنده تفضل"); assert(PK.fromPack(r.inst, "faults", r.local.faults[0]));
});
t("تحديث الحزمة: الجديد يتضاف، المعدّل يتحدّث، المشال يتشال — وتعديلات المستخدم ومسحه وسجلاته محفوظة", () => {
  const O = owner(), P1 = PK.build(O, { ver: "v1" });
  let r = PK.apply({ faults: [F("mine", "X9")], custom: [], cms: {}, lib: {}, flows: [], sensors: [], lists: {} }, P1, null);
  let L = r.local, I = r.inst;
  L.faults = L.faults.map(x => x.id == "b" ? Object.assign({}, x, { fix: "تعديلي أنا" }) : x);      // المستخدم عدّل b
  L.faults = L.faults.filter(x => x.id != "t1");                                                        // ومسح التيست مود
  L.faults = L.faults.map(x => x.id == "a" ? Object.assign({}, x, { imgs: ["myphoto"] }) : x);         // وحط صورة على a (مش تعديل)
  O.faults = O.faults.map(x => x.id == "a" ? Object.assign({}, x, { fix: "حل أحدث" }) : x.id == "b" ? Object.assign({}, x, { fix: "حل الشركة" }) : x);
  O.faults.push(F("c", "E3")); O.faults = O.faults.filter(x => x.id != "t1"); O.custom = [];             // صاحب البرنامج: حدّث a وb، ضاف c، شال الكباس
  const P2 = PK.build(O, { ver: "v2" }); r = PK.apply(L, P2, I);
  const by = id => r.local.faults.find(x => x.id == id);
  assert.equal(by("a").fix, "حل أحدث"); assert.deepEqual(by("a").imgs, ["myphoto"], "صورة المستخدم ما اتشالتش");
  assert.equal(by("b").fix, "تعديلي أنا", "تعديل المستخدم ما يتكتبش فوقه");
  assert(by("c") && by("mine") && !by("t1"), "الجديد اتضاف، وسجله فاضل، والممسوح ما رجعش");
  assert.equal(r.local.custom.length, 0, "الكباس اللي اتشال من الحزمة اتشال");
  assert.equal(r.stats.added, 1); assert.equal(r.stats.updated, 1); assert(r.stats.removed >= 1); assert(r.stats.kept >= 1);
  assert(!PK.fromPack(r.inst, "faults", by("b")) && PK.fromPack(r.inst, "faults", by("a")));
});
t("نفس الحزمة مرتين: ولا تغيير", () => {
  const P = PK.build(owner(), { ver: "v1" }); let r = PK.apply({ faults: [], custom: [] }, P, null); const r2 = PK.apply(r.local, P, r.inst);
  assert.deepEqual(r2.stats, { added: 0, updated: 0, removed: 0, kept: 0 }); assert.equal(r2.local.faults.length, 3);
});
t("ملف مش حزمة أو تالف ← يترفض من غير ما يلمس حاجة", () => {
  assert(PK.apply({ faults: [] }, { foo: 1 }, null).err); assert(PK.apply({ faults: [] }, { format: "mrf-pack", ver: "" }, null).err);
  assert(PK.apply({ faults: [] }, { format: "mrf-pack", ver: "x", faults: "bad" }, null).err);
});
t("الحزمة الافتراضية اللي جاية مع البرنامج فاضية (ما بتعملش حاجة لحد ما صاحب البرنامج ينشر)", () => {
  const D = JSON.parse(require("fs").readFileSync(__dirname + "/data-pack.json", "utf8")); assert.equal(D.format, "mrf-pack"); assert.equal(D.ver, ""); assert(PK.validate(D));
});

(async () => { for (const [n, fn] of Q) { try { await fn(); p++; console.log("PASS " + n); } catch (e) { f++; console.log("FAIL " + n + " - " + e.message); } } console.log(`\n${p} نجح، ${f} فشل`); process.exitCode = f ? 1 : 0; })();

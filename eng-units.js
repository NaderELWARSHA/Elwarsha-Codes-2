/* محرك تحويل الوحدات — منطق نقي بلا DOM. كل المعاملات تعريفات قياسية دقيقة (exact) أو معرّفة دوليًا (IT).
   ممنوع الخلط: «حصان ميكانيكي» وحدة قدرة فيزيائية؛ «حصان التكييف التجاري» تصنيف سوقي تقريبي لقدرة التبريد في جدول منفصل. */
(function(g){"use strict";
const isNum=v=>typeof v=="number"&&isFinite(v);
/* كل فئة: الوحدة الأساسية + معامل كل وحدة إليها + مصدر/ملاحظة المعامل */
const CAT={
power:{t:"القدرة (كهربائية أو ميكانيكية أو حرارية)",base:"W",u:{
 W:[1,"وات"],kW:[1e3,"كيلووات"],MW:[1e6,"ميجاوات"],
 "HP(mech)":[745.69987158227022,"حصان ميكانيكي (550 ft·lbf/s) — تعريف دقيق"],
 "HP(metric)":[735.49875,"حصان متري PS/CV (75 kgf·m/s) — تعريف دقيق"],
 "BTU/h":[0.29307107017222,"BTU(IT)/ساعة: 1055.05585262 J ÷ 3600"],
 "kcal/h":[1.163,"kcal(IT)/ساعة: 4186.8 J ÷ 3600 — تعريف دقيق"],
 TR:[3516.8528420667,"طن تبريد = 12000 BTU/h"]}},
energy:{t:"الطاقة",base:"J",u:{J:[1,"جول"],kJ:[1e3,"كيلوجول"],MJ:[1e6,"ميجاجول"],Wh:[3600,"وات·ساعة"],kWh:[3.6e6,"كيلووات·ساعة (وحدة عداد الكهرباء)"],BTU:[1055.05585262,"BTU (IT)"],kcal:[4186.8,"كيلو كالوري (IT)"],cal:[4.1868,"كالوري (IT)"]}},
pressure:{t:"الضغط",base:"Pa",u:{Pa:[1,"باسكال"],kPa:[1e3,"كيلو باسكال"],MPa:[1e6,"ميجا باسكال"],bar:[1e5,"بار"],mbar:[100,"مللي بار"],psi:[6894.757293168361,"رطل/بوصة² (lbf/in²)"],atm:[101325,"ضغط جوي قياسي"],"kgf/cm²":[98066.5,"كجم قوة/سم²"],mmHg:[133.322387415,"مم زئبق (Torr تقريبًا)"],inHg:[3386.388640341,"بوصة زئبق عند 0°C"],"inH2O":[249.08891,"بوصة ماء عند 4°C"],mmH2O:[9.80665,"مم ماء"]},note:"التحويل هنا لنفس نوع الضغط (مطلق ← مطلق أو قياس ← قياس). للتحويل بين المطلق وضغط المانومتر استخدم أداة «ضغط مطلق/قياس»."},
temperature:{t:"درجة الحرارة",base:"K",affine:true,u:{"°C":[1,"سيلزيوس"],"°F":[1,"فهرنهايت"],K:[1,"كلفن"],"°R":[1,"رانكن"]}},
tdiff:{t:"فرق درجات الحرارة (سوبرهيت/سابكولينج)",base:"K",u:{K:[1,"كلفن (= فرق °C)"],"Δ°C":[1,"فرق سيلزيوس"],"Δ°F":[5/9,"فرق فهرنهايت"]},note:"فرق 10°C = فرق 18°F. لا تستخدم معادلة تحويل الحرارة على الفروق."},
flow:{t:"التدفق الحجمي (هواء/ماء)",base:"m³/s",u:{"m³/s":[1,""],"m³/h":[1/3600,""],"L/s":[1e-3,""],"L/min":[1e-3/60,""],CFM:[0.028316846592/60,"قدم³/دقيقة"],"GPM(US)":[0.003785411784/60,"جالون أمريكي/دقيقة"]}},
length:{t:"الطول",base:"m",u:{m:[1,""],mm:[1e-3,""],cm:[1e-2,""],km:[1e3,""],in:[0.0254,"بوصة — تعريف دقيق"],ft:[0.3048,"قدم — تعريف دقيق"],mil:[2.54e-5,"1/1000 بوصة"]}},
area:{t:"المساحة",base:"m²",u:{"m²":[1,""],"cm²":[1e-4,""],"mm²":[1e-6,"مقطع الكابلات"],"in²":[0.00064516,""],"ft²":[0.09290304,""]}},
volume:{t:"الحجم",base:"m³",u:{"m³":[1,""],L:[1e-3,""],mL:[1e-6,"= cc"],cc:[1e-6,"سم³ (إزاحة الكباس)"],"in³":[1.6387064e-5,""],"ft³":[0.028316846592,""],"gal(US)":[0.003785411784,""],"fl oz(US)":[2.95735295625e-5,"أونصة سائلة (زيت)"]}},
mass:{t:"الكتلة (شحنة الفريون)",base:"kg",u:{kg:[1,""],g:[1e-3,""],lb:[0.45359237,"رطل — تعريف دقيق"],oz:[0.028349523125,"أونصة"]}}};
function tToK(v,u){switch(u){case"°C":return v+273.15;case"°F":return (v-32)*5/9+273.15;case"K":return v;case"°R":return v*5/9}return NaN}
function kToT(k,u){switch(u){case"°C":return k-273.15;case"°F":return (k-273.15)*9/5+32;case"K":return k;case"°R":return k*9/5}return NaN}
function convert(cat,v,from,to){const C=CAT[cat];if(!C)return{err:"فئة غير معروفة"};if(!isNum(v))return{err:"أدخل رقمًا صحيحًا"};if(!(from in C.u)||!(to in C.u))return{err:"وحدة غير معروفة"};
 if(C.affine){const k=tToK(v,from);if(k<0)return{err:"أقل من الصفر المطلق — قيمة غير ممكنة"};const r=kToT(k,to);return{value:r,base:k,formula:`${v} ${from} → ${+k.toFixed(6)} K → ${+r.toFixed(6)} ${to}`}}
 if(v<0&&cat!="tdiff")return{err:"القيمة لا تكون سالبة في هذه الفئة"};
 const b=v*C.u[from][0],r=b/C.u[to][0];return{value:r,base:b,formula:`${v} ${from} × ${+C.u[from][0].toPrecision(12)} = ${+b.toPrecision(10)} ${C.base} ÷ ${+C.u[to][0].toPrecision(12)} = ${+r.toPrecision(10)} ${to}`}}
const convertAll=(cat,v,from)=>CAT[cat]?Object.keys(CAT[cat].u).map(u=>({u,...convert(cat,v,from,u)})):[{err:"فئة غير معروفة"}];
/* ---- ضغط مطلق ↔ ضغط قياس (مانومتر). المانومتر يقرأ فرقًا عن الضغط الجوي المحلي ---- */
const ATM=101.325;
function gaugeToAbs(pg,atm=ATM){if(!isNum(pg)||!isNum(atm))return{err:"أدخل أرقامًا صحيحة"};if(atm<50||atm>110)return{err:"الضغط الجوي خارج النطاق المنطقي (50–110 kPa)"};const pa=pg+atm;if(pa<0)return{err:"ضغط مطلق سالب: قراءة الفاكيوم أكبر من الضغط الجوي"};return{abs:pa,formula:`P(abs) = P(gauge) + P(atm) = ${pg} + ${atm} = ${+pa.toFixed(3)} kPa`}}
function absToGauge(pa,atm=ATM){if(!isNum(pa)||!isNum(atm))return{err:"أدخل أرقامًا صحيحة"};if(pa<0)return{err:"الضغط المطلق لا يكون سالبًا"};return{gauge:pa-atm,formula:`P(gauge) = P(abs) − P(atm) = ${pa} − ${atm} = ${+(pa-atm).toFixed(3)} kPa`}}
/* الضغط الجوي من الارتفاع (معادلة الغلاف الجوي القياسي ISA حتى 11 km) — تقريب للطقس العادي */
function atmAtAltitude(h){if(!isNum(h)||h<-500||h>11000)return{err:"الارتفاع بين −500 و11000 م"};const p=101.325*Math.pow(1-2.25577e-5*h,5.25588);return{atm:p,note:"الغلاف الجوي القياسي ISA؛ الضغط الفعلي يتغير مع الطقس ±2%"}}
/* ---- حصان التكييف التجاري: جدول سوقي تقريبي منفصل وقابل للتعديل ---- */
const AC_HP_SEED=[
 {hp:1.5,btu:12000,status:"secondary",src:"تصنيف شائع في السوق المصري (مثال من صاحب المشروع)",note:"قدرة التبريد الفعلية تختلف بين الموديلات"},
 {hp:2.25,btu:18000,status:"secondary",src:"قوائم موديلات بالسوق المصري: Haier HSU-18 · Carrier QHCT18 · Sharp AY-A18 · Unionaire 018 (btech.com / 2b.com.eg)",note:""},
 {hp:3,btu:24000,status:"secondary",src:"قوائم موديلات بالسوق المصري: Fresh FUFW24 (btech.com)",note:""},
 {hp:5,btu:36000,status:"secondary",src:"قوائم موديلات بالسوق المصري: Carrier 42QDMT36 (btech.com)",note:""}];
function cleanHpTable(a){if(!Array.isArray(a))return[];return a.filter(x=>x&&isNum(+x.hp)&&+x.hp>0&&isNum(+x.btu)&&+x.btu>0).map(x=>({hp:+x.hp,btu:+x.btu,status:String(x.status||"manual").slice(0,20),src:String(x.src||"").slice(0,300),note:String(x.note||"").slice(0,300)})).sort((a,b)=>a.hp-b.hp)}
/* بحث في الجدول فقط: لا يُستكمل ولا يُستنتج خارج الجدول */
function acHp(table,{hp,btu}){const T=cleanHpTable(table);if(!T.length)return{err:"جدول حصان التكييف فارغ — أضف قيمًا من الإدارة"};
 if(isNum(hp)){const r=T.find(x=>Math.abs(x.hp-hp)<1e-9);if(!r)return{err:`التصنيف ${hp} حصان غير موجود في الجدول. القيم المسجلة: ${T.map(x=>x.hp).join("، ")}`,table:T};return{row:r,btu:r.btu,kW:r.btu*CAT.power.u["BTU/h"][0]/1000,TR:r.btu/12000,mechHpEquivalent:r.btu*CAT.power.u["BTU/h"][0]/745.69987158227022}}
 if(isNum(btu)){const r=T.find(x=>Math.abs(x.btu-btu)<1e-6);if(r)return{row:r,hp:r.hp,exact:true};let near=T.reduce((a,b)=>Math.abs(b.btu-btu)<Math.abs(a.btu-btu)?b:a);return{nearest:near,exact:false,note:`لا يوجد ${btu} BTU/h في الجدول؛ أقرب تصنيف مسجل ${near.btu} BTU/h ≈ ${near.hp} حصان تكييف. هذه ليست قيمة محسوبة.`}}
 return{err:"أدخل الحصان التجاري أو BTU/h"}}
const DIFFS=[["الحصان الميكانيكي HP","وحدة قدرة فيزيائية = 745.7 W. تُكتب على الموتورات."],["حصان التكييف التجاري","اسم تسويقي لفئة قدرة تبريد. 1.5 حصان ≈ 12000 BTU/h تبريد، وليس 1.5 × 745.7 W."],["قدرة التبريد (BTU/h أو kcal/h أو W)","الحرارة التي يسحبها الجهاز من المكان. تُقرأ من الكتالوج عند ظروف قياس محددة."],["القدرة الكهربائية المستهلكة (W)","ما يسحبه الجهاز من الكهرباء. أقل من قدرة التبريد عادةً بنسبة = معامل الأداء COP/EER."]];
const api={CAT,convert,convertAll,tToK,kToT,ATM,gaugeToAbs,absToGauge,atmAtAltitude,AC_HP_SEED,cleanHpTable,acHp,DIFFS};
if(typeof module!="undefined")module.exports=api;else g.EU=api})(typeof window!="undefined"?window:globalThis);

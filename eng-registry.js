/* سجل البيانات الفنية (Technical Data Registry) — منطق نقي بلا DOM.
   تصنيف دقة كل معلومة + حقول المصدر + تقرير جودة (ناقص/مكرر/متعارض/وحدات/بلا مصدر/يحتاج مراجعة) + معاينة فروق الاستيراد. */
(function(g){"use strict";
const isObj=o=>o&&typeof o=="object"&&!Array.isArray(o),isNum=v=>typeof v=="number"&&isFinite(v);
const CLS={manufacturer:["موثقة من الشركة المصنعة","ok",5],service:["موثقة من دليل خدمة","ok",4],secondary:["مرجع فني ثانوي","info",3],field:["قياسات وتجارب عملية موثقة","info",3],engineering:["تقدير هندسي","warn",2],incomplete:["بيانات غير مكتملة","warn",1],conflict:["بيانات متعارضة","bad",0]};
/* ربط التصنيفات القديمة في التطبيق */
const LEGACY={manual:"incomplete"};const clsOf=s=>CLS[s]?s:(LEGACY[s]||"");
const SRC_FIELDS=["srcClass","srcRef","srcUrl","appliesTo","srcDate","srcNote","scope","confidence"];
const s=(v,n=300)=>String(v??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").trim().slice(0,n);
function cleanSrc(r){const o={};const c=clsOf(r.srcClass||r.status||r.srcStatus);if(c)o.srcClass=c;o.srcRef=s(r.srcRef||r.src);o.srcUrl=/^https?:\/\//.test(r.srcUrl||r.url||"")?s(r.srcUrl||r.url,500):"";o.appliesTo=s(r.appliesTo,200);o.srcDate=/^\d{4}-\d{2}-\d{2}$/.test(r.srcDate||r.date||"")?(r.srcDate||r.date):"";o.srcNote=s(r.srcNote||r.note,500);o.scope=s(r.scope,300);o.confidence=["high","med","low"].includes(r.confidence)?r.confidence:"";Object.keys(o).forEach(k=>{if(o[k]==="")delete o[k]});return o}
/* تعريف المجموعات: المفتاح، الحقول المطلوبة، الحقول الرقمية ومداها المنطقي، دالة التنظيف */
const COLL={
capillary:{t:"الكابيلاري",key:r=>[r.refrigerant,r.compModel||r.model,r.id_mm,r.length_m].join("|").toLowerCase(),req:["id_mm","length_m","refrigerant"],num:{id_mm:[0.4,3],length_m:[0.3,12],od_mm:[1,8],te:[-50,20],tc:[20,70]},label:r=>`${r.refrigerant||"?"} — ID ${r.id_mm} mm × ${r.length_m} m ${r.compModel?"— "+r.compModel:""}`},
windRef:{t:"مقاومات ملفات الكباسات (مرجع)",key:r=>[r.brand,r.model].join("|").toLowerCase().replace(/\s/g,""),req:["model","CR","CS"],num:{CR:[0.05,500],CS:[0.05,1000],RS:[0.1,1500],Tref:[-10,50]},label:r=>`${r.brand||""} ${r.model} — C-R ${r.CR} Ω / C-S ${r.CS} Ω`},
ampTables:{t:"جداول سعة تيار الكابلات",key:r=>String(r.id||r.name).toLowerCase(),req:["name","rows"],num:{},label:r=>`${r.name} (${(r.rows||[]).length} مقطع)`},
fluids:{t:"فريونات إضافية (جداول PT)",key:r=>String(r.id).toUpperCase(),req:["id","rows"],num:{},label:r=>`${r.id} (${(r.rows||[]).length} نقطة)`},
hpTable:{t:"حصان التكييف التجاري",key:r=>String(r.hp),req:["hp","btu"],num:{hp:[0.5,30],btu:[3000,400000]},label:r=>`${r.hp} حصان ≈ ${r.btu} BTU/h`},
circuits:{t:"الدوائر الجاهزة",key:r=>String(r.id),req:["id","name","comps","wires"],num:{},label:r=>r.name},
flows:{t:"مسارات التشخيص",key:r=>String(r.id),req:["id","title","nodes","start"],num:{},label:r=>r.title},
sensors:{t:"منحنيات الحساسات",key:r=>[r.brand,r.name].join("|").toLowerCase(),req:["name","points"],num:{},label:r=>`${r.brand||""} ${r.name}`}};
function missingReq(k,r){return COLL[k].req.filter(f=>r[f]==null||r[f]===""||(Array.isArray(r[f])&&!r[f].length)||(f=="nodes"&&isObj(r[f])&&!Object.keys(r[f]).length))}
function unitIssues(k,r){const o=[];for(const [f,[lo,hi]] of Object.entries(COLL[k].num)){if(r[f]==null||r[f]==="")continue;const v=+r[f];if(!isNum(v))o.push(`${f}: ليست رقمًا`);else if(v<lo||v>hi)o.push(`${f} = ${v} خارج المدى المنطقي (${lo}–${hi}) — وحدة خاطئة؟`)}
 if(k=="capillary"&&+r.id_mm>0&&+r.od_mm>0&&+r.od_mm<=+r.id_mm)o.push("القطر الخارجي ≤ الداخلي");if(k=="windRef"&&isNum(+r.RS)&&+r.RS>0&&isNum(+r.CR)&&isNum(+r.CS)){const sm=+r.CR+ +r.CS;if(Math.abs(sm-r.RS)>0.08*r.RS)o.push(`R-S (${r.RS}) لا يساوي C-R + C-S (${+sm.toFixed(3)})`)}return o}
/* تقرير الجودة لمجموعة */
function quality(k,list){const L=Array.isArray(list)?list:[],out={missing:[],dups:[],conflicts:[],units:[],noSource:[],review:[]},seen=new Map();
 L.forEach((r,i)=>{if(!isObj(r))return;const lab=(COLL[k].label(r)||"سجل "+(i+1)),m=missingReq(k,r);if(m.length)out.missing.push({i,lab,d:"ينقص: "+m.join("، ")});
  const u=unitIssues(k,r);if(u.length)out.units.push({i,lab,d:u.join(" · ")});const sc=clsOf(r.srcClass||r.status||r.srcStatus);
  if(!s(r.srcRef||r.src)&&!r.builtin&&!["engineering"].includes(sc))out.noSource.push({i,lab,d:"لا يوجد مصدر"});
  if(!sc||sc=="incomplete"||sc=="conflict"||sc=="engineering")out.review.push({i,lab,d:sc?CLS[sc][0]:"بلا تصنيف دقة"});
  const key=COLL[k].key(r);if(seen.has(key)){const j=seen.get(key),a=JSON.stringify(strip(L[j])),b=JSON.stringify(strip(r));(a===b?out.dups:out.conflicts).push({i,j,lab,d:a===b?"مكرر تمامًا مع سجل "+(j+1):"نفس المفتاح بقيم مختلفة مع سجل "+(j+1)})}else seen.set(key,i)});
 out.total=L.length;out.issues=Object.entries(out).filter(([a,v])=>Array.isArray(v)).reduce((s,[,v])=>s+v.length,0);return out}
const strip=r=>{const o={...r};["_id","addedAt","updatedAt","createdAt"].forEach(k=>delete o[k]);return o};
/* معاينة استيراد: جديد / مطابق / مختلف (مع الحقول) / مرفوض */
function diffImport(k,existing,incoming,validate){const ex=new Map((existing||[]).map((r,i)=>[COLL[k].key(r),{r,i}])),plan={add:[],same:[],changed:[],bad:[]},inSeen=new Set();
 (Array.isArray(incoming)?incoming:[]).forEach((r,i)=>{if(!isObj(r))return plan.bad.push({i,why:"ليس سجلًا"});const errs=(validate?validate(r):[]).concat(missingReq(k,r).map(f=>"ينقص "+f));if(errs.length)return plan.bad.push({i,why:errs.join("، ")});
  const key=COLL[k].key(r);if(inSeen.has(key))return plan.bad.push({i,why:"مكرر داخل الملف"});inSeen.add(key);const e=ex.get(key);if(!e)return plan.add.push({i,r});
  const a=strip(e.r),b=strip(r),fields=[...new Set(Object.keys(a).concat(Object.keys(b)))].filter(f=>JSON.stringify(a[f])!==JSON.stringify(b[f]));fields.length?plan.changed.push({i,r,at:e.i,fields:fields.map(f=>({f,old:a[f],new:b[f]}))}):plan.same.push({i})});return plan}
function applyImport(existing,plan,{overwrite}={}){const out=(existing||[]).slice();plan.add.forEach(x=>out.push(x.r));if(overwrite)plan.changed.forEach(x=>{out[x.at]=x.r});return out}
const api={CLS,LEGACY,clsOf,SRC_FIELDS,cleanSrc,COLL,missingReq,unitIssues,quality,diffImport,applyImport};
if(typeof module!="undefined")module.exports=api;else g.EG=api})(typeof window!="undefined"?window:globalThis);

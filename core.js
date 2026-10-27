/* منطق المرجع الفني القابل للاختبار (بلا اعتماد على DOM) */
(function(g){
const SCHEMA=1,MAXFILE=2*1024*1024,MAXLEN=5000;
const FIELDS={
faults:[["type","نوع الجهاز",1],["brand","الشركة",1],["model","الموديل / السلسلة"],["code","كود العطل",1],["meaning","وصف العطل",1],["causes","الأسباب المحتملة","t"],["steps","خطوات الفحص بالترتيب","t"],["measures","القياسات المطلوبة","t"],["fixes","الحلول المحتملة","t"],["safety","تحذيرات السلامة","t"],["source","المصدر / الرابط"],["reviewed","تاريخ آخر مراجعة","d"],["verified","مؤكدة من مصدر موثوق (نعم/لا)"]],
comps:[["brand","الشركة",1],["model","رقم الموديل كما على اللوحة",1],["family","السلسلة"],["use","نوع الاستخدام"],["tech","نوع / تقنية الكباس"],["hp","القدرة (حصان)"],["cap","قدرة التبريد (W أو BTU/h)"],["gas","وسيط التبريد"],["volt","الجهد والتردد"],["amps","التيار المقنن وتيار البدء"],["oil","الزيت"],["cc","الإزاحة CC"],["cond","ظروف التشغيل المرجعية"],["wiring","التوصيلات الكهربائية","t"],["dims","الأبعاد / القطع البديلة"],["datasheet","رابط الداتا شيت"],["notes","ملاحظات البدائل والتوافق","t"],["source","المصدر"],["reviewed","تاريخ التحقق","d"]]};
const e=s=>String(s??"").replace(/[&<>"'`]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"}[c]));
const norm=s=>String(s??"").toLowerCase().replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[\s\-_\/.]/g,"");
const need=k=>FIELDS[k].filter(f=>f[2]===1).map(f=>f[0]);
const dupKey=(k,r)=>norm(k=="faults"?[r.brand,r.model,r.code,r.type].join("|"):[r.brand,r.model].join("|"));
const hay=(k,r)=>norm(FIELDS[k].map(f=>r[f[0]]).join(" "));
const find=(db,k,q,flt={})=>{const n=norm(q);return db[k].filter(r=>(!n||hay(k,r).includes(n))&&Object.entries(flt).every(([a,b])=>!b||r[a]===b))};
const na=v=>v==null||String(v).trim()===""?"غير متاح":String(v);
// تنظيف سجل: حقول معروفة فقط، نصوص فقط، بلا محارف تحكم
function clean(k,r){const n={};if(!r||typeof r!="object"||Array.isArray(r))return null;
FIELDS[k].forEach(([f])=>{let v=r[f];if(v==null||v==="")return;if(typeof v=="object")return;v=String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").trim().slice(0,MAXLEN);if(v)n[f]=v});return n}
const missing=(k,n)=>need(k).filter(x=>!n[x]);
function planImport(db,k,rows){const keys=new Set(db[k].map(r=>dupKey(k,r))),acc=[],dup=[],err=[];
if(!Array.isArray(rows))return{err:["البنية غير صالحة: المتوقع مصفوفة سجلات"],acc,dup,next:null};
rows.forEach((r,i)=>{const n=clean(k,r);if(!n)return err.push(`سطر ${i+1}: ليس سجلًا`);const m=missing(k,n);if(m.length)return err.push(`سطر ${i+1}: ينقص ${m.join("، ")}`);
const d=dupKey(k,n);if(keys.has(d))return dup.push(`سطر ${i+1}`);keys.add(d);n.id=uid();n.updated=today();acc.push(n)});
return{acc,dup,err,next:db[k].concat(acc)}}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),today=()=>new Date().toISOString().slice(0,10);
function checkFile(name,size,text){if(!/\.(json|csv)$/i.test(name))return"نوع الملف غير مدعوم (JSON أو CSV فقط)";if(size>MAXFILE)return"الملف أكبر من 2 ميغابايت";if(!String(text).trim())return"الملف فارغ";return null}
function csv(t){const rows=[];let r=[],c="",q=false;t=t.replace(/^\uFEFF/,"");for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch=='"'){t[i+1]=='"'?(c+='"',i++):q=false}else c+=ch}else if(ch=='"')q=true;else if(ch==","){r.push(c);c=""}else if(ch=="\n"||ch=="\r"){if(ch=="\r"&&t[i+1]=="\n")i++;r.push(c);rows.push(r);r=[];c=""}else c+=ch}
if(q)throw new Error("اقتباس غير مغلق في CSV");if(c||r.length){r.push(c);rows.push(r)}
if(!rows.length)throw new Error("لا ترويسة");const h=rows.shift().map(x=>x.trim());return rows.filter(a=>a.some(x=>x.trim())).map(a=>Object.fromEntries(h.map((x,i)=>[x,a[i]])))}
const cell=v=>{v=String(v??"");if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
const toCsv=(k,d)=>{const fs=FIELDS[k].map(f=>f[0]);return "\uFEFF"+[fs.join(","),...d.map(r=>fs.map(f=>cell(r[f])).join(","))].join("\r\n")};
const toCsvRows=(fs,d)=>"\uFEFF"+[fs.join(","),...d.map(r=>fs.map(f=>cell(r[f])).join(","))].join("\r\n");
function makeBackup(db,extra={}){return{app:"mrf",schema:SCHEMA,created:new Date().toISOString(),data:db,favorites:extra.favorites||[],history:extra.history||[],settings:extra.settings||{}}}
function validateBackup(o){if(!o||typeof o!="object")return{ok:false,reason:"ليس ملف نسخة احتياطية"};
if(o.app!="mrf")return{ok:false,reason:"الملف ليس من هذا التطبيق"};if(o.schema!==SCHEMA)return{ok:false,reason:"إصدار المخطط غير متوافق: "+o.schema};
const d=o.data;if(!d||!Array.isArray(d.faults)||!Array.isArray(d.comps))return{ok:false,reason:"بنية البيانات تالفة"};
const out={faults:[],comps:[]};
for(const k of["faults","comps"])for(const [i,r] of d[k].entries()){const n=clean(k,r);if(!n||missing(k,n).length)return{ok:false,reason:`سجل تالف في ${k} رقم ${i+1}`};
n.id=/^[\w-]{1,40}$/.test(r.id)?r.id:uid();if(r.demo)n.demo=1;if(r.updated)n.updated=String(r.updated).slice(0,10);out[k].push(n)}
return{ok:true,data:out,summary:{faults:out.faults.length,comps:out.comps.length,created:o.created}}}
function makeStore(ls){let ok=true;try{ls.setItem("__t","1");ls.removeItem("__t")}catch{ok=false}
return{get ok(){return ok},get(k,d){try{const v=ls.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}},
set(k,v){try{const s=JSON.stringify(v);ls.setItem(k,s);if(ls.getItem(k)!==s)throw 0;return true}catch{return false}},remove(k){try{ls.removeItem(k)}catch{}}}}
function hist(S,key,v,n=8){const a=S.get(key,[]).filter(x=>(v.id?x.id!==v.id:x.q!==v.q));a.unshift(v);return S.set(key,a.slice(0,n))}
// تنفيذ تغيير مترابط مع تراجع تلقائي إن فشل الحفظ
function tx(S,key,db,mutate){const before=JSON.stringify(db);mutate(db);if(S.set(key,db))return true;const b=JSON.parse(before);for(const k in db)delete db[k];Object.assign(db,b);return false}
const api={toCsvRows,SCHEMA,MAXFILE,FIELDS,e,norm,need,dupKey,find,na,clean,missing,planImport,checkFile,csv,toCsv,makeBackup,validateBackup,makeStore,hist,tx,uid,today};
if(typeof module!="undefined")module.exports=api;else g.MR=api})(typeof window!="undefined"?window:globalThis);

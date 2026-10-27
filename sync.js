/* طبقة التوافق مع صيغ ملفات نظام الورشة الفنية (أكواد الأعطال + إضافات الكباسات) */
(function(g){
const normAr=v=>String(v??"").toLowerCase().normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ـ/g,"").replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06F0)).replace(/[\s\-_./\\]+/g,"").trim();
const T=(v,n=5000)=>String(v??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").trim().slice(0,n);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),now=()=>new Date().toISOString();
const FK=["deviceType","brand","category","model","code","title","cause","fix","note","addedBy"],TK=["deviceType","brand","category","model","title","enter","tests","exit","note"];
const CK=["hp","refrigerant","btu","kcal","application","run_capacitor","start_capacitor","oil_qty","oil_unit","amp","watt","freq","displacement","rpm","notes"];
const isObj=o=>o&&typeof o=="object"&&!Array.isArray(o);
function cleanFault(raw){if(!isObj(raw))return null;const test=raw.kind==="test",n={};(test?TK:FK).forEach(k=>{const v=T(raw[k]);if(v)n[k]=v});if(test)n.kind="test";
return (test?n.title&&n.enter:n.code)?n:null}
const faultKey=r=>[r.kind==="test"?"test":"",r.deviceType,r.brand,r.category,r.model,r.kind==="test"?r.title:r.code].map(normAr).join("|");
const parseFaults=j=>Array.isArray(j)?j:Array.isArray(j&&j.faultCodes)?j.faultCodes:null;
function planFaults(existing,incoming){const keys=new Set(existing.map(faultKey)),acc=[],dup=[],err=[];if(!Array.isArray(incoming))return{err:["الملف ليس ملف أكواد أعطال"],acc,dup,next:null};
incoming.forEach((raw,i)=>{const n=cleanFault(raw);if(!n)return err.push(`سجل ${i+1}: ناقص (الكود مطلوب، وللتيست مود العنوان وطريقة الدخول)`);const k=faultKey(n);if(keys.has(k))return dup.push(`سجل ${i+1}`);keys.add(k);acc.push({id:uid(),...n,source:"imported",createdAt:now(),updatedAt:now()})});
return{acc,dup,err,next:existing.concat(acc)}}
const exportFaults=l=>({faultCodes:l.map(r=>({...r,media:[]})),_meta:{exportedAt:now(),app:"المرجع الفني — أكواد الأعطال",kind:"fault-codes-only"}});
function cleanRec(raw){const n={};if(!isObj(raw))return null;const m=T(raw.model,200);if(!m)return null;n.model=m;
CK.forEach(k=>{const v=raw[k];if(typeof v=="number"&&isFinite(v))n[k]=v;else if(typeof v=="string"&&T(v))n[k]=T(v,500)});
if(isObj(raw.temp_capacity)){const t={};Object.entries(raw.temp_capacity).slice(0,30).forEach(([a,b])=>{if(typeof b=="number"||typeof b=="string")t[T(a,20)]=b});n.temp_capacity=t}return n}
const compKey=(b,m)=>normAr(b)+"|"+normAr(m);
function planComps(baseDb,custom,incoming){const keys=new Set(custom.map(c=>compKey(c.brand,c.rec.model))),acc=[],dup=[],err=[];
for(const [b,rows] of Object.entries(baseDb||{}))rows.forEach(r=>keys.add(compKey(b,r.model)));
if(!Array.isArray(incoming))return{err:["الملف ليس ملف إضافات كباسات"],acc,dup,next:null};
incoming.forEach((raw,i)=>{const src=isObj(raw)&&isObj(raw.rec)?{...raw.rec,model:raw.rec.model||raw.model}:raw,rec=cleanRec(src);if(!rec)return err.push(`سجل ${i+1}: الموديل مطلوب`);
const brand=T(raw.brand,100)||"إضافات يدوية",k=compKey(brand,rec.model);if(keys.has(k))return dup.push(`سجل ${i+1}`);keys.add(k);acc.push({id:uid(),brand,rec,addedAt:now()})});
return{acc,dup,err,next:custom.concat(acc)}}
const parseComps=j=>Array.isArray(j)?j:Array.isArray(j&&j.customCompressors)?j.customCompressors:null;
const exportComps=l=>({customCompressors:l,_meta:{exportedAt:now(),app:"المرجع الفني — أكواد الكباسات",kind:"compressor-custom-only"}});
function makeBackup(D,x={}){return{app:"mw-ref",schema:2,created:now(),faults:D.faults,custom:D.custom,favorites:x.favorites||[],history:x.history||[]}}
function validateBackup(o){if(!isObj(o)||o.app!=="mw-ref")return{ok:false,reason:"الملف ليس نسخة من هذا التطبيق"};if(o.schema!==2)return{ok:false,reason:"إصدار المخطط غير متوافق: "+o.schema};
if(!Array.isArray(o.faults)||!Array.isArray(o.custom))return{ok:false,reason:"بنية البيانات تالفة"};const ID=x=>/^[\w-]{1,40}$/.test(x)?x:uid(),faults=[],custom=[];
for(const [i,r] of o.faults.entries()){const n=cleanFault(r);if(!n)return{ok:false,reason:"سجل عطل تالف رقم "+(i+1)};faults.push({id:ID(r.id),...n,source:T(r.source,20),createdAt:T(r.createdAt,40),updatedAt:T(r.updatedAt,40)})}
for(const [i,c] of o.custom.entries()){const rec=cleanRec(c&&c.rec);if(!rec||!T(c.brand))return{ok:false,reason:"إضافة كباس تالفة رقم "+(i+1)};custom.push({id:ID(c.id),brand:T(c.brand,100),rec,addedAt:T(c.addedAt,40)})}
return{ok:true,data:{faults,custom},summary:{faults:faults.length,custom:custom.length,created:o.created}}}

/* بدائل الكباسات: مطابقة بالبيانات المتاحة (نفس الفريون والتطبيق والتردد وقدرة تبريد متقاربة) */
const refN=v=>{const s=String(v??"").toUpperCase().replace(/[\s\-]/g,"");return /^R\d{2,4}[A-Z]?$/.test(s)?s:""};
const appN=v=>{const s=String(v??"").toUpperCase().replace(/\s/g,"");return /^[A-Z\/]{2,6}$/.test(s)?s:""};
const num=v=>typeof v=="number"&&isFinite(v)?v:(typeof v=="string"&&/^\d+(\.\d+)?$/.test(v.trim())?parseFloat(v):null);
const capOf=r=>{const k=num(r.kcal);if(k)return k;const b=num(r.btu);return b?b/3.968:null};
const near=(a,b,t)=>a==null||b==null||Math.abs(a-b)<=t*Math.max(a,b);
const both=(a,b)=>a!=null&&b!=null;
const altKey=r=>{const f=refN(r.refrigerant),c=capOf(r);return f&&c?f+"|"+appN(r.application)+"|"+(num(r.freq)||""):null};
function buildAltIndex(rows){const m=new Map();rows.forEach((x,i)=>{const k=altKey(x.r);if(k){if(!m.has(k))m.set(k,[]);m.get(k).push(i)}});return m}
function alts(idx,rows,i,max=30){const s=rows[i].r,k=altKey(s);if(!k)return{total:0,list:[]};const c=capOf(s),out=[];
for(const j of idx.get(k)||[]){if(j===i)continue;const t=rows[j].r;if(rows[j].b===rows[i].b&&t.model===s.model)continue;const c2=capOf(t);if(!near(c,c2,.04))continue;
if(s.hp&&t.hp&&String(s.hp).trim()!==String(t.hp).trim())continue;if(!near(num(s.amp),num(t.amp),.12))continue;if(!near(num(s.displacement),num(t.displacement),.05))continue;
const vs=normAr(s.voltage_frequency),vt=normAr(t.voltage_frequency);if(vs&&vt&&vs!==vt)continue;if(s.phase&&t.phase&&normAr(s.phase)!==normAr(t.phase))continue;
const v=(both(num(s.amp),num(t.amp))?1:0)+(both(num(s.displacement),num(t.displacement))?1:0)+(s.hp&&t.hp?1:0)+(vs&&vt?1:0);
out.push({j,v,d:Math.abs(c-c2)/c})}
out.sort((a,b)=>b.v-a.v||a.d-b.d);return{total:out.length,list:out.slice(0,max).map(o=>o.j)}}

/* ترتيب النتائج بقوة المطابقة (n مُطبَّع مسبقًا، وكل حقل [نص مُطبَّع، وزن، اسم]) */
function scoreN(n,fs){let s=0,l="";for(const [x,w,lb] of fs){if(!x)continue;let v=0;if(x===n)v=100;else if(x.startsWith(n))v=80;else if(x.includes(n))v=50;else continue;v=v*w+5*n.length/x.length;if(v>s){s=v;l=lb}}return{s,l}}
function hlSplit(text,q){const t=String(text??""),ch=[...String(q??"").replace(/[\s\-_./]/g,"")].slice(0,40);if(!ch.length)return[t,"",""];
let re;try{re=new RegExp(ch.map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("[\\s\\-_./]*"),"i")}catch{return[t,"",""]}const m=re.exec(t);return m?[t.slice(0,m.index),m[0],t.slice(m.index+m[0].length)]:[t,"",""]}
 const api={scoreN,hlSplit,refN,capOf,altKey,buildAltIndex,alts,normAr,cleanFault,faultKey,parseFaults,planFaults,exportFaults,cleanRec,planComps,parseComps,exportComps,makeBackup,validateBackup,FK,TK,CK};
if(typeof module!="undefined")module.exports=api;else g.SY=api})(typeof window!="undefined"?window:globalThis);

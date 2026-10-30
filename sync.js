/* طبقة التوافق مع صيغ ملفات نظام الورشة الفنية (أكواد الأعطال + إضافات الكباسات) */
(function(g){
const normAr=v=>String(v??"").toLowerCase().normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ـ/g,"").replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06F0)).replace(/[\s\-_./\\]+/g,"").trim();
const T=(v,n=5000)=>String(v??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").trim().slice(0,n);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),now=()=>new Date().toISOString();
const FK=["deviceType","brand","category","model","code","title","cause","fix","note","addedBy","srcStatus","srcRef","srcDate","srcNote"],TK=["deviceType","brand","category","model","title","enter","tests","exit","note","srcStatus","srcRef","srcDate","srcNote"];
const CK=["hp","refrigerant","btu","kcal","application","run_capacitor","start_capacitor","oil_qty","oil_unit","amp","watt","freq","displacement","rpm","notes","compat_doc","srcStatus","srcRef","srcDate","srcNote"];
const isObj=o=>o&&typeof o=="object"&&!Array.isArray(o);
const STATUSES=["manufacturer","secondary","manual","conflict"],okId=x=>typeof x=="string"&&/^[\w-]{1,40}$/.test(x);
const cleanImgs=a=>Array.isArray(a)?[...new Set(a.filter(okId))].slice(0,12):[];
function cleanFault(raw){if(!isObj(raw))return null;const test=raw.kind==="test",n={};(test?TK:FK).forEach(k=>{const v=T(raw[k]);if(v)n[k]=v});if(test)n.kind="test";if(n.srcStatus&&!STATUSES.includes(n.srcStatus))delete n.srcStatus;const im=cleanImgs(raw.imgs);if(im.length)n.imgs=im;
return (test?n.title&&n.enter:n.code)?n:null}
const faultKey=r=>[r.kind==="test"?"test":"",r.deviceType,r.brand,r.category,r.model,r.kind==="test"?r.title:r.code].map(normAr).join("|");
const parseFaults=j=>Array.isArray(j)?j:Array.isArray(j&&j.faultCodes)?j.faultCodes:null;
function planFaults(existing,incoming){const keys=new Set(existing.map(faultKey)),acc=[],dup=[],err=[];if(!Array.isArray(incoming))return{err:["الملف ليس ملف أكواد أعطال"],acc,dup,next:null};
incoming.forEach((raw,i)=>{const n=cleanFault(raw);if(!n)return err.push(`سجل ${i+1}: ناقص (الكود مطلوب، وللتيست مود العنوان وطريقة الدخول)`);const k=faultKey(n);if(keys.has(k))return dup.push(`سجل ${i+1}`);keys.add(k);acc.push({id:uid(),...n,source:"imported",createdAt:now(),updatedAt:now()})});
return{acc,dup,err,next:existing.concat(acc)}}
const exportFaults=l=>({faultCodes:l.map(r=>({...r,media:[]})),_meta:{exportedAt:now(),app:"المرجع الفني — أكواد الأعطال",kind:"fault-codes-only"}});
function cleanRec(raw){const n={};if(!isObj(raw))return null;const m=T(raw.model,200);if(!m)return null;n.model=m;
CK.forEach(k=>{const v=raw[k];if(typeof v=="number"&&isFinite(v))n[k]=v;else if(typeof v=="string"&&T(v))n[k]=T(v,500)});
if(isObj(raw.temp_capacity)){const t={};Object.entries(raw.temp_capacity).slice(0,30).forEach(([a,b])=>{if(typeof b=="number"||typeof b=="string")t[T(a,20)]=b});n.temp_capacity=t}if(n.srcStatus&&!STATUSES.includes(n.srcStatus))delete n.srcStatus;const im=cleanImgs(raw.imgs);if(im.length)n.imgs=im;return n}
const compKey=(b,m)=>normAr(b)+"|"+normAr(m);
function planComps(baseDb,custom,incoming){const keys=new Set(custom.map(c=>compKey(c.brand,c.rec.model))),acc=[],dup=[],err=[];
for(const [b,rows] of Object.entries(baseDb||{}))rows.forEach(r=>keys.add(compKey(b,r.model)));
if(!Array.isArray(incoming))return{err:["الملف ليس ملف إضافات كباسات"],acc,dup,next:null};
incoming.forEach((raw,i)=>{const src=isObj(raw)&&isObj(raw.rec)?{...raw.rec,model:raw.rec.model||raw.model}:raw,rec=cleanRec(src);if(!rec)return err.push(`سجل ${i+1}: الموديل مطلوب`);
const brand=T(raw.brand,100)||"إضافات يدوية",k=compKey(brand,rec.model);if(keys.has(k))return dup.push(`سجل ${i+1}`);keys.add(k);acc.push({id:uid(),brand,rec,addedAt:now()})});
return{acc,dup,err,next:custom.concat(acc)}}
const parseComps=j=>Array.isArray(j)?j:Array.isArray(j&&j.customCompressors)?j.customCompressors:null;
const exportComps=l=>({customCompressors:l,_meta:{exportedAt:now(),app:"المرجع الفني — أكواد الكباسات",kind:"compressor-custom-only"}});
function makeBackup(D,x={}){return{app:"mw-ref",schema:3,attachments:x.attachments||[],created:now(),faults:D.faults,custom:D.custom,favorites:x.favorites||[],history:x.history||[],lists:x.lists?cleanLists(x.lists):undefined,kit:x.kit&&typeof x.kit=="object"?x.kit:undefined}}
const ATYPES=["image/jpeg","image/png","image/webp"];
function cleanAtt(a){if(!isObj(a)||!okId(a.id)||!ATYPES.includes(a.type)||typeof a.data!="string"||a.data.length>6e6||!/^[A-Za-z0-9+/=]+$/.test(a.data))return null;return{id:a.id,type:a.type,name:T(a.name,120),desc:T(a.desc,300),hash:T(a.hash,80),data:a.data}}
function validateBackup(o){if(!isObj(o)||o.app!=="mw-ref")return{ok:false,reason:"الملف ليس نسخة من هذا التطبيق"};if(o.schema!==2&&o.schema!==3)return{ok:false,reason:"إصدار المخطط غير متوافق: "+o.schema};
if(!Array.isArray(o.faults)||!Array.isArray(o.custom))return{ok:false,reason:"بنية البيانات تالفة"};const ID=x=>/^[\w-]{1,40}$/.test(x)?x:uid(),faults=[],custom=[];
for(const [i,r] of o.faults.entries()){const n=cleanFault(r);if(!n)return{ok:false,reason:"سجل عطل تالف رقم "+(i+1)};faults.push({id:ID(r.id),...n,source:T(r.source,20),createdAt:T(r.createdAt,40),updatedAt:T(r.updatedAt,40)})}
for(const [i,c] of o.custom.entries()){const rec=cleanRec(c&&c.rec);if(!rec||!T(c.brand))return{ok:false,reason:"إضافة كباس تالفة رقم "+(i+1)};custom.push({id:ID(c.id),brand:T(c.brand,100),rec,addedAt:T(c.addedAt,40)})}
let atts=[];if(o.attachments!==undefined){if(!Array.isArray(o.attachments))return{ok:false,reason:"بنية المرفقات تالفة"};for(const [i,a] of o.attachments.entries()){const c=cleanAtt(a);if(!c)return{ok:false,reason:"مرفق تالف رقم "+(i+1)};atts.push(c)}}
return{ok:true,data:{faults,custom,attachments:atts,lists:isObj(o.lists)?cleanLists(o.lists):null},summary:{faults:faults.length,custom:custom.length,attachments:atts.length,created:o.created}}}

/* بدائل الكباسات: مطابقة بالبيانات المتاحة (نفس الفريون والتطبيق والتردد وقدرة تبريد متقاربة) */
const refN=v=>{const s=String(v??"").toUpperCase().replace(/[\s\-]/g,"");return /^R\d{2,4}[A-Z]?$/.test(s)?s:""};
const appN=v=>{const s=String(v??"").toUpperCase().replace(/\s/g,"");return /^[A-Z\/]{2,6}$/.test(s)?s:""};
const num=v=>typeof v=="number"&&isFinite(v)?v:(typeof v=="string"&&/^\d+(\.\d+)?$/.test(v.trim())?parseFloat(v):null);
const capOf=r=>{const k=num(r.kcal);if(k)return k;const b=num(r.btu);return b?b/3.968:null};
const near=(a,b,t)=>a==null||b==null||Math.abs(a-b)<=t*Math.max(a,b);
const both=(a,b)=>a!=null&&b!=null;
const altKey=r=>{const f=refN(r.refrigerant),c=capOf(r);return f&&c?f+"|"+appN(r.application)+"|"+(num(r.freq)||""):null};
function buildAltIndex(rows){const m=new Map();rows.forEach((x,i)=>{const k=altKey(x.r);if(k){if(!m.has(k))m.set(k,[]);m.get(k).push(i)}});return m}
const r2=v=>Math.round(v*100)/100;
function assess(s,t){const why=[],diffs=[],missing=[],blk=[];let v=0;
const rs=refN(s.refrigerant),rt=refN(t.refrigerant);if(!rs||!rt)blk.push("وسيط التبريد غير محدد أو مركّب");else if(rs!==rt)blk.push(`وسيط التبريد مختلف (${rs} ≠ ${rt})`);else why.push("نفس وسيط التبريد "+rs);
const as=appN(s.application),at=appN(t.application);if(as&&at){if(as!==at)blk.push(`التطبيق مختلف (${as} ≠ ${at})`);else why.push("نفس التطبيق "+as)}else missing.push("التطبيق (LBP/HBP…)");
const fs=num(s.freq),ft=num(t.freq);if(fs&&ft){if(fs!==ft)blk.push(`التردد مختلف (${fs} ≠ ${ft} Hz)`);else why.push("نفس التردد "+fs+" Hz")}else missing.push("التردد");
const cs=capOf(s),ct=capOf(t);if(!cs||!ct)blk.push("قدرة التبريد غير متوفرة");else{const d=(ct-cs)/cs*100;if(Math.abs(d)>4)blk.push(`قدرة التبريد تختلف ${d.toFixed(1)}%`);else{why.push(`قدرة التبريد ${r2(cs)} مقابل ${r2(ct)} kcal/h (${d>=0?"+":""}${d.toFixed(1)}%)`);diffs.push("شروط قياس قدرة التبريد غير معروفة؛ المقارنة تقريبية")}}
if(s.hp&&t.hp){if(String(s.hp).trim()!==String(t.hp).trim())blk.push(`القدرة الحصانية مختلفة (${s.hp} ≠ ${t.hp})`);else{why.push("نفس القدرة الحصانية "+s.hp);v++}}else missing.push("القدرة الحصانية");
const am=[num(s.amp),num(t.amp)];if(both(...am)){if(!near(...am,.12))blk.push(`التيار يختلف (${am[0]} ≠ ${am[1]} A)`);else{why.push(`التيار متقارب (${am[0]} / ${am[1]} A)`);v++}}else missing.push("التيار");
const dp=[num(s.displacement),num(t.displacement)];if(both(...dp)){if(!near(...dp,.05))blk.push(`الإزاحة تختلف (${dp[0]} ≠ ${dp[1]} cc)`);else{why.push(`الإزاحة متقاربة (${dp[0]} / ${dp[1]} cc)`);v++}}else missing.push("الإزاحة الحجمية");
const vs=normAr(s.voltage_frequency),vt=normAr(t.voltage_frequency);if(vs&&vt){if(vs!==vt)blk.push("الجهد/التردد مختلف");else{why.push("نفس الجهد والتردد");v++}}else missing.push("الجهد");
if(s.phase&&t.phase&&normAr(s.phase)!==normAr(t.phase))blk.push("عدد الأطوار مختلف");
if(!(s.run_capacitor&&t.run_capacitor)&&!(s.start_capacitor&&t.start_capacitor))missing.push("بيانات مكثفات التشغيل/البدء");else if(normAr(s.run_capacitor)!==normAr(t.run_capacitor)||normAr(s.start_capacitor)!==normAr(t.start_capacitor))diffs.push("اختلاف في مكثفات التشغيل/البدء");
if(!(s.oil_qty&&t.oil_qty))missing.push("بيانات الزيت");else if(normAr(s.oil_qty)!==normAr(t.oil_qty))diffs.push("كمية الزيت مختلفة");
return{blk,why,diffs,missing,v,known:!!(as&&at)}}
const LVL={documented:"موثق من الشركة المصنعة",likely:"بديل محتمل (شروط فنية متحققة)",partial:"تشابه جزئي — يحتاج تحقق",unsuitable:"غير مناسب وفق البيانات المعروفة"};
function docList(r){return String(r.compat_doc||"").split(/[,،;\n]+/).map(normAr).filter(Boolean)}
function levelOf(a){return a.blk.length?"unsuitable":(a.v>=3&&a.known?"likely":"partial")}
function compatPair(s,t){const a=assess(s,t),doc=docList(s).includes(normAr(t.model))||docList(t).includes(normAr(s.model));return{...a,level:doc?"documented":levelOf(a)}}
function altsG(idx,rows,i,max=30){const s=rows[i].r,k=altKey(s);if(!k)return{total:0,items:[]};const out=[];const dm=docList(s);
const cand=new Set(idx.get(k)||[]);if(dm.length)rows.forEach((x,j)=>{if(dm.includes(normAr(x.r.model)))cand.add(j)});
for(const j of cand){if(j===i)continue;const t=rows[j].r;if(rows[j].b===rows[i].b&&t.model===s.model)continue;const a=assess(s,t),doc=dm.includes(normAr(t.model))||docList(t).includes(normAr(s.model));
if(a.blk.length&&!doc)continue;const lv=doc?"documented":levelOf(a),c=capOf(s),c2=capOf(t),d=c&&c2?Math.abs(c-c2)/c:1;out.push({j,level:lv,why:a.why,diffs:doc&&a.blk.length?a.blk.map(x=>"تنبيه: "+x).concat(a.diffs):a.diffs,missing:a.missing,v:a.v,d})}
const rank={documented:0,likely:1,partial:2};out.sort((x,y)=>rank[x.level]-rank[y.level]||y.v-x.v||x.d-y.d);return{total:out.length,items:out.slice(0,max)}}
function alts(idx,rows,i,max=30){const r=altsG(idx,rows,i,max);return{total:r.total,list:r.items.map(x=>x.j)}}
/* ترحيل قاعدة البيانات المحلية من أي إصدار سابق دون فقد سجلات */
const DBVER=3;
function migrateDb(o){const out={faults:[],custom:[],ver:DBVER};if(!isObj(o))return out;const seen=new Set(),ID=r=>{let id=okId(r.id)&&!seen.has(r.id)?r.id:uid();seen.add(id);return id};
for(const r of Array.isArray(o.faults)?o.faults:[])if(isObj(r)&&(r.code||r.title))out.faults.push({...r,id:ID(r)});
for(const c of Array.isArray(o.custom)?o.custom:[])if(isObj(c)&&isObj(c.rec)&&c.rec.model)out.custom.push({...c,brand:T(c.brand,100)||"إضافات يدوية",id:ID(c)});return out}
/* ترتيب النتائج بقوة المطابقة (n مُطبَّع مسبقًا، وكل حقل [نص مُطبَّع، وزن، اسم]) */
function scoreN(n,fs){let s=0,l="";for(const [x,w,lb] of fs){if(!x)continue;let v=0;if(x===n)v=100;else if(x.startsWith(n))v=80;else if(x.includes(n))v=50;else continue;v=v*w+5*n.length/x.length;if(v>s){s=v;l=lb}}return{s,l}}
function hlSplit(text,q){const t=String(text??""),ch=[...String(q??"").replace(/[\s\-_./]/g,"")].slice(0,40);if(!ch.length)return[t,"",""];
let re;try{re=new RegExp(ch.map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("[\\s\\-_./]*"),"i")}catch{return[t,"",""]}const m=re.exec(t);return m?[t.slice(0,m.index),m[0],t.slice(m.index+m[0].length)]:[t,"",""]}
 
/* قوائم الاختيارات: دمج وتنظيف بلا تكرار (مع توحيد الهمزات والمسافات) */
const LISTKEYS=["deviceType","brand","category","cbrand","capp","cgas"];
const cleanName=v=>String(v??"").replace(/[\u0000-\u001F]/g,"").replace(/\s+/g," ").trim().slice(0,60);
function mergeOpts(...arrs){const m=new Map();for(const a of arrs)for(const v of a||[]){const c=cleanName(v);if(!c)continue;const k=normAr(c);if(!m.has(k))m.set(k,c)}return[...m.values()].sort((a,b)=>a.localeCompare(b,"ar"))}
const SEED={deviceType:["غسالة","ثلاجة","تكييف"],
brand:["إل جي (LG)","سامسونج (Samsung)","توشيبا (Toshiba)","شارب (Sharp)","هيتاشي (Hitachi)","باناسونيك (Panasonic)","ميتسوبيشي (Mitsubishi)","دايكن (Daikin)","فوجيتسو (Fujitsu)","جنرال (General)","كاريير (Carrier)","يورك (York)","ترين (Trane)","ميديا (Midea)","جري (Gree)","هاير (Haier)","هايسنس (Hisense)","TCL","تورنيدو (Tornado)","فريش (Fresh)","يونيون اير (Unionaire)","يونيفرسال (Universal)","كريازي (Kiriazi)","أولمبيك إلكتريك (Olympic Electric)","زانوسي (Zanussi)","إيديال زانوسي (Ideal Zanussi)","أريستون (Ariston)","إنديزيت (Indesit)","هوتبوينت (Hotpoint)","بيكو (Beko)","بوش (Bosch)","سيمنز (Siemens)","كاندي (Candy)","ويرلبول (Whirlpool)","إلكترولكس (Electrolux)","هوفر (Hoover)","ميلي (Miele)","جورنيه (Gorenje)","آيه إي جي (AEG)","نيف (Neff)","فريجيدير (Frigidaire)","ليبهر (Liebherr)","فيستل (Vestel)","وستنجهاوس (Westinghouse)"],
catmap:{"غسالة":["تحميل أمامي","تحميل علوي","غسالة أطباق"],"ثلاجة":["ثلاجة ديجيتال","ثلاجة إنفرتر","ديب فريزر"],"تكييف":["سبليت","سبليت إنفرتر","شباك","ستاند (دولابي)","كاسيت / سقفي"]}};
function cleanLists(o){const r={};LISTKEYS.forEach(k=>{r[k]=Array.isArray(o&&o[k])?mergeOpts(o[k].filter(x=>typeof x=="string").slice(0,500)):[]});
const cm={};if(isObj(o&&o.catmap))Object.entries(o.catmap).slice(0,100).forEach(([d,a])=>{const k=cleanName(d)||"*";if(Array.isArray(a))cm[k]=mergeOpts(cm[k]||[],a.filter(x=>typeof x=="string").slice(0,200))});r.catmap=cm;r.seeded=!!(o&&o.seeded);return r}
function seedLists(l){const r=cleanLists(l);r.deviceType=mergeOpts(r.deviceType,SEED.deviceType);r.brand=mergeOpts(r.brand,SEED.brand);for(const d in SEED.catmap)r.catmap[d]=mergeOpts(r.catmap[d],SEED.catmap[d]);r.seeded=true;return r}
const api={DBVER,migrateDb,assess,compatPair,altsG,LVL,STATUSES,SEED,seedLists,LISTKEYS,cleanName,mergeOpts,cleanLists,scoreN,hlSplit,refN,capOf,altKey,buildAltIndex,alts,normAr,cleanFault,faultKey,parseFaults,planFaults,exportFaults,cleanRec,planComps,parseComps,exportComps,makeBackup,validateBackup,FK,TK,CK};
if(typeof module!="undefined")module.exports=api;else g.SY=api})(typeof window!="undefined"?window:globalThis);

/* محرك تحليل الدوائر — مستقل تمامًا عن واجهة الرسم.
   المستويات: (1) تحليل طوبولوجي للمسارات والقصر والفتح، (2) DC مقاومي/خطي بطريقة MNA، (3) AC جيبي بالمتجهات (Phasors) لعناصر خطية،
   (4) ريليهات بحالات تُحدَّث بالتكرار، (5) سيناريوهات زمنية = تتابع حالات ثابتة. لا يحاكي: العوابر، البدء، الانزلاق، أشباه الموصلات، الحرارة. */
(function(g){"use strict";
const isNum=v=>typeof v=="number"&&isFinite(v);
/* ---- أعداد مركبة ---- */
const C=(r,i=0)=>[r,i],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const div=(a,b)=>{const d=b[0]*b[0]+b[1]*b[1];return[(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d]},abs=a=>Math.hypot(a[0],a[1]),conj=a=>[a[0],-a[1]],neg=a=>[-a[0],-a[1]];
/* ---- كتالوج العناصر: الأطراف والخصائص الافتراضية ---- */
const T={
vac:{t:"مصدر متردد (فاز/نيوترال)",terms:["L","N"],props:{V:220,f:50},src:1},
vdc:{t:"مصدر مستمر",terms:["+","-"],props:{V:12},src:1},
gnd:{t:"أرضي (مرجع)",terms:["g"],props:{}},
junction:{t:"نقطة توصيل",terms:["n"],props:{}},
switch:{t:"مفتاح",terms:["a","b"],props:{},state:{closed:false}},
fuse:{t:"فيوز",terms:["a","b"],props:{rating:10},state:{blown:false}},
thermalFuse:{t:"فيوز حراري",terms:["a","b"],props:{tripC:72},state:{blown:false}},
overload:{t:"أوفرلود",terms:["a","b"],props:{tripA:5},state:{tripped:false}},
thermostat:{t:"ثرموستات",terms:["a","b"],props:{},state:{closed:true}},
bimetal:{t:"بيمتال (منهي الديفروست)",terms:["a","b"],props:{},state:{closed:true}},
res:{t:"مقاومة",terms:["a","b"],props:{R:1000}},
sensor:{t:"حساس (NTC/PTC) كمقاومة",terms:["a","b"],props:{R:10000}},
cap:{t:"مكثف",terms:["a","b"],props:{uF:10}},
coil:{t:"ملف (محاثة + مقاومة)",terms:["a","b"],props:{L:0.1,R:10}},
heater:{t:"سخان",terms:["a","b"],props:{P:200,Vn:220}},
lamp:{t:"لمبة",terms:["a","b"],props:{P:15,Vn:220}},
motor:{t:"موتور (حمل مكافئ)",terms:["a","b"],props:{P:100,Vn:220,pf:0.8}},
pump:{t:"طلمبة (حمل مكافئ)",terms:["a","b"],props:{P:30,Vn:220,pf:0.8}},
valve:{t:"صمام مياه (ملف)",terms:["a","b"],props:{R:4000}},
compressor:{t:"كباس (C/R/S)",terms:["C","R","S"],props:{P:150,Vn:220,pf:0.75,Rrun:12,Rstart:20}},
relay:{t:"ريليه (ملف + COM/NO/NC)",terms:["c1","c2","com","no","nc"],props:{Vcoil:12,Rcoil:120,pickup:0.75,dropout:0.3}},
timer:{t:"تايمر ديفروست",terms:["m1","m2","com","cool","defrost"],props:{Rm:8000},state:{pos:"cool"}},
spdt:{t:"مفتاح تحويل",terms:["com","a","b"],props:{},state:{pos:"a"}}};
const ZERO_TYPES=new Set(["switch","fuse","thermalFuse","overload","thermostat","bimetal"]);
/* فروع كل عنصر حسب حالته: {a,b,k:"Z"|"zero"|"open"|"V",z(w)} */
function branches(c,w,dc,eng){const p={...(T[c.type]||{}).props,...(c.props||{})},s={...(T[c.type]||{}).state,...(c.state||{})},B=[],Z=(a,b,z,tag)=>B.push({a,b,k:"Z",z,tag}),O=(a,b,tag)=>B.push({a,b,k:"open",tag}),Q=(a,b,tag)=>B.push({a,b,k:"zero",tag});
 const loadZ=(P,Vn,pf)=>{const S=P/(pf||1),m=Vn*Vn/S,ph=Math.acos(Math.min(1,pf||1));return dc?C(m*(pf||1)):C(m*Math.cos(ph),m*Math.sin(ph))};
 switch(c.type){
 case"vac":case"vdc":B.push({a:T[c.type].terms[0],b:T[c.type].terms[1],k:"V",v:+p.V});break;
 case"switch":case"thermostat":case"bimetal":s.closed?Q("a","b"):O("a","b");break;
 case"fuse":case"thermalFuse":s.blown?O("a","b"):Q("a","b");break;
 case"overload":s.tripped?O("a","b"):Q("a","b");break;
 case"res":case"sensor":case"valve":Z("a","b",C(+p.R));break;
 case"cap":if(dc)O("a","b");else Z("a","b",C(0,-1/(w*p.uF*1e-6)));break;
 case"coil":if(dc){p.R>0?Z("a","b",C(+p.R)):Q("a","b")}else Z("a","b",C(+p.R,w*p.L));break;
 case"heater":case"lamp":Z("a","b",C(p.Vn*p.Vn/p.P));break;
 case"motor":case"pump":Z("a","b",loadZ(p.P,p.Vn,p.pf));break;
 case"compressor":if(dc){Z("C","R",C(+p.Rrun),"run");Z("C","S",C(+p.Rstart),"start")}else{Z("C","R",loadZ(p.P,p.Vn,p.pf),"run");Z("C","S",C(+p.Rstart),"start")}break;
 case"relay":Z("c1","c2",C(+p.Rcoil),"coil");if(eng[c.id]){Q("com","no","no");O("com","nc","nc")}else{O("com","no","no");Q("com","nc","nc")}break;
 case"timer":Z("m1","m2",C(+p.Rm),"motor");if(s.pos=="defrost"){Q("com","defrost","defrost");O("com","cool","cool")}else{Q("com","cool","cool");O("com","defrost","defrost")}break;
 case"spdt":if(s.pos=="b"){Q("com","b","b");O("com","a","a")}else{Q("com","a","a");O("com","b","b")}break}
 return B}
function propErr(c){const p={...(T[c.type]||{}).props,...(c.props||{})},pos=k=>isNum(+p[k])&&+p[k]>0;
 const need={vac:["V","f"],vdc:[],res:["R"],sensor:["R"],valve:["R"],cap:["uF"],coil:["L"],heater:["P","Vn"],lamp:["P","Vn"],motor:["P","Vn","pf"],pump:["P","Vn","pf"],compressor:["P","Vn","pf","Rrun","Rstart"],relay:["Vcoil","Rcoil","pickup"],timer:["Rm"]}[c.type]||[];
 const bad=need.filter(k=>!pos(k));if(c.type=="vdc"&&!isNum(+p.V))bad.push("V");if(["motor","pump","compressor"].includes(c.type)&&+p.pf>1)bad.push("pf");if(c.type=="coil"&&!(isNum(+p.R)&&+p.R>=0))bad.push("R");return bad}
/* ---- اتحاد-بحث ---- */
function UF(n){const p=[...Array(n).keys()];const f=x=>{while(p[x]!==x){p[x]=p[p[x]];x=p[x]}return x};return{f,u:(a,b)=>{a=f(a);b=f(b);if(a===b)return false;p[a]=b;return true}}}
/* ---- حل نظام خطي مركب بالحذف مع اختيار المحور ---- */
function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let m=i,mv=abs(A[i][i]);for(let r=i+1;r<n;r++){const v=abs(A[r][i]);if(v>mv){mv=v;m=r}}if(mv<1e-18)return null;if(m!==i){[A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]]}
 for(let r=i+1;r<n;r++){const f=div(A[r][i],A[i][i]);if(f[0]===0&&f[1]===0)continue;for(let c=i;c<n;c++)A[r][c]=sub(A[r][c],mul(f,A[i][c]));b[r]=sub(b[r],mul(f,b[i]))}}
 const x=Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s=sub(s,mul(A[i][c],x[c]));x[i]=div(s,A[i][i])}return x}
/* ---- فحص بنية الدائرة ---- */
function normalize(ckt){const comps=(ckt&&Array.isArray(ckt.comps)?ckt.comps:[]).filter(c=>c&&T[c.type]&&typeof c.id=="string").slice(0,300),ids=new Set(comps.map(c=>c.id));
 const wires=(ckt&&Array.isArray(ckt.wires)?ckt.wires:[]).filter(w=>w&&w.a&&w.b&&ids.has(w.a.c)&&ids.has(w.b.c)).filter(w=>{const ca=comps.find(c=>c.id==w.a.c),cb=comps.find(c=>c.id==w.b.c);return T[ca.type].terms.includes(w.a.t)&&T[cb.type].terms.includes(w.b.t)}).slice(0,1000);return{comps,wires}}
/* ---- التحليل الكامل لحالة واحدة ---- */
function analyze(ckt,opt={}){const {comps,wires}=normalize(ckt),iss=[],add=(lvl,code,msg,ids=[])=>iss.push({lvl,code,msg,comps:ids});
 const res={issues:iss,comps:{},wires:{},mode:"topology",scope:""};if(!comps.length){add("info","EMPTY","الدائرة فارغة");return res}
 const srcs=comps.filter(c=>T[c.type].src);if(!srcs.length)add("error","NO_SOURCE","لا يوجد مصدر جهد في الدائرة");
 const kinds=new Set(srcs.map(c=>c.type));if(kinds.size>1){add("error","MIXED","مصدر متردد ومستمر في نفس الدائرة: غير مدعوم في هذا المحرك");return res}
 const dc=!kinds.has("vac"),freqs=new Set(srcs.filter(c=>c.type=="vac").map(c=>+({...T.vac.props,...c.props}).f));if(freqs.size>1){add("error","MULTI_F","مصادر بترددات مختلفة: غير مدعوم");return res}
 const w=2*Math.PI*(freqs.size?[...freqs][0]:50);
 for(const c of comps){const b=propErr(c);if(b.length){add("error","BAD_PROP",`قيم غير صالحة في ${label(c)}: ${b.join("، ")}`,[c.id]);}}
 if(iss.some(x=>x.lvl=="error"))return res;
 /* أطراف بلا توصيل */
 const tKey=(c,t)=>c+"|"+t,TI=new Map();comps.forEach(c=>T[c.type].terms.forEach(t=>TI.set(tKey(c.id,t),TI.size)));const deg=new Map();
 wires.forEach(x=>{[tKey(x.a.c,x.a.t),tKey(x.b.c,x.b.t)].forEach(k=>deg.set(k,(deg.get(k)||0)+1))});
 comps.forEach(c=>{if(c.type=="junction"||c.type=="gnd")return;const free=T[c.type].terms.filter(t=>!deg.get(tKey(c.id,t)));if(free.length==T[c.type].terms.length)add("warn","UNCONNECTED",`${label(c)} غير متصل بأي سلك`,[c.id]);else if(free.length&&!(c.type=="relay"&&free.every(t=>["no","nc"].includes(t)))&&!(c.type=="timer"&&free.length==1&&["cool","defrost"].includes(free[0]))&&!(c.type=="spdt"&&free.length==1&&free[0]!="com"))add("warn","OPEN_TERM",`نقطة توصيل مفقودة: ${free.map(t=>"«"+t+"»").join("، ")} في ${label(c)}`,[c.id])});
 /* العُقد: الأسلاك تدمج الأطراف */
 const uf=UF(TI.size);wires.forEach(x=>uf.u(TI.get(tKey(x.a.c,x.a.t)),TI.get(tKey(x.b.c,x.b.t))));const NI=new Map();const node=k=>{const r=uf.f(TI.get(k));if(!NI.has(r))NI.set(r,NI.size);return NI.get(r)};
 comps.forEach(c=>T[c.type].terms.forEach(t=>node(tKey(c.id,t))));const nN=NI.size;const gndNode=comps.filter(c=>c.type=="gnd").map(c=>node(tKey(c.id,"g")));
 /* ريليهات: تكرار حتى الاستقرار */
 let eng={};comps.filter(c=>c.type=="relay").forEach(c=>eng[c.id]=!!(c.state&&c.state.energized));const seen=new Set();let sol=null,BR=null,it=0,unstable=false;
 for(;it<25;it++){BR=[];comps.forEach(c=>branches(c,w,dc,eng).forEach(b=>BR.push({...b,c:c.id,na:node(tKey(c.id,b.a)),nb:node(tKey(c.id,b.b))})));
  sol=solveNet(BR,nN,gndNode,dc,iss,comps);if(!sol)break;const next={};let ch=false;
  comps.filter(c=>c.type=="relay").forEach(c=>{const p={...T.relay.props,...c.props},br=BR.find(b=>b.c==c.id&&b.tag=="coil"),v=abs(sub(sol.V[br.na],sol.V[br.nb]));next[c.id]=eng[c.id]?v>=p.dropout*p.Vcoil:v>=p.pickup*p.Vcoil;if(next[c.id]!==eng[c.id])ch=true});
  if(!ch)break;const key=JSON.stringify(next);if(seen.has(key)){unstable=true;break}seen.add(key);eng=next}
 if(unstable)add("error","RELAY_OSC","حالة غير مستقرة: ريليه يفصل ويوصل نفسه باستمرار (اهتزاز)",Object.keys(eng));
 if(!sol)return res;
 res.mode=dc?"dc":"ac";res.scope=dc?"DC بحالة مستقرة: المكثفات مفتوحة، الملفات = مقاومتها":"AC جيبي بحالة مستقرة (Phasors) بتردد "+(w/2/Math.PI)+" Hz. الموتورات والكباسات = حمل مكافئ عند التشغيل المقنن (لا بدء ولا عزم). القيم تقريبية لهذه العناصر.";
 res.relays=eng;
 /* نتائج العناصر */
 const eps=1e-6;BR.forEach(b=>{const r=res.comps[b.c]||(res.comps[b.c]={I:0,V:0,P:0,parts:[]});let I=[0,0],V=sub(sol.V[b.na],sol.V[b.nb]);
  if(b.k=="Z")I=div(V,b.z);else if(b.k=="V"||b.k=="zero")I=b.idx!=null?sol.I[b.idx]:null;
  const part={tag:b.tag||"",k:b.k,V:abs(V),I:I?abs(I):null,P:I?mul(V,conj(I))[0]:null,amb:I===null};r.parts.push(part);
  if(part.I!=null&&part.I>r.I)r.I=part.I;if(part.V>r.V)r.V=part.V;if(part.P!=null&&b.k=="Z")r.P+=part.P});
 Object.values(res.comps).forEach(r=>{r.on=r.I>eps});
 /* قصر عبر عنصر: طرفاه على نفس مجموعة المقاومة الصفرية */
 const zuf=UF(nN);BR.filter(b=>b.k=="zero").forEach(b=>zuf.u(b.na,b.nb));
 BR.filter(b=>b.k=="Z").forEach(b=>{if(zuf.f(b.na)===zuf.f(b.nb)){const c=comps.find(x=>x.id==b.c);add("warn","SHORTED",`${label(c)}${b.tag?" ("+b.tag+")":""} مقصور: طرفاه موصلان ببعض عبر سلك أو مفتاح مغلق — لا يمر به تيار`,[b.c])}});
 /* تيار قصر عبر حمل منخفض المقاومة */
 const lim=isNum(opt.shortA)?opt.shortA:100;srcs.forEach(s=>{const r=res.comps[s.id];if(r&&r.I>lim)add("error","LOW_Z",`تيار المصدر ${r.I.toFixed(1)} A أكبر من حد التنبيه ${lim} A: قصر عبر حمل منخفض المقاومة`,[s.id])});
 /* حمايات */
 comps.forEach(c=>{const r=res.comps[c.id];if(!r)return;const p={...T[c.type].props,...c.props};if(c.type=="fuse"&&r.I>p.rating)add("warn","FUSE_OVER",`التيار في ${label(c)} = ${r.I.toFixed(2)} A أكبر من تقنينه ${p.rating} A: الفيوز سيحترق`,[c.id]);if(c.type=="overload"&&r.I>p.tripA)add("warn","OL_OVER",`التيار في ${label(c)} = ${r.I.toFixed(2)} A أكبر من ${p.tripA} A: الأوفرلود سيفصل (بعد زمن يعتمد على منحناه)`,[c.id])});
 /* مسار مفتوح: أحمال بلا تيار ولكن يوجد مسار لو أُغلقت عناصر مفتوحة */
 const loads=comps.filter(c=>["res","sensor","heater","lamp","motor","pump","valve","compressor","coil","cap"].includes(c.type)||c.type=="timer"||c.type=="relay");
 loads.forEach(c=>{const r=res.comps[c.id];if(!r||r.I>eps)return;if(iss.some(x=>x.code=="SHORTED"&&x.comps.includes(c.id)))return;if(c.type=="cap"&&dc)return;const why=openWhy(c,BR,nN,comps,node,tKey);if(why.blocking.length)add("info","OPEN_PATH",`${label(c)} لا يمر به تيار: المسار مقطوع عند ${why.blocking.map(id=>label(comps.find(x=>x.id==id))).join("، ")}`,[c.id,...why.blocking]);else if(!why.reach)add("warn","NO_PATH",`${label(c)} لا يقع على مسار كامل بين طرفي المصدر (توصيل ناقص أو خاطئ)`,[c.id])});
 /* التوقع: مسار غير مقصود أو حمل لا يعمل */
 comps.forEach(c=>{if(!c.expect)return;const on=!!(res.comps[c.id]&&res.comps[c.id].I>eps);if(c.expect=="off"&&on)add("error","UNINTENDED",`مسار غير مقصود: ${label(c)} يعمل وكان المتوقع أن يكون متوقفًا في هذه الحالة`,[c.id]);if(c.expect=="on"&&!on)add("warn","NOT_RUNNING",`${label(c)} المتوقع تشغيله لا يمر به تيار`,[c.id])});
 /* أمان */
 srcs.forEach(s=>{const v=+({...T[s.type].props,...s.props}).V;if(s.type=="vac"&&v>50||s.type=="vdc"&&v>120)add("info","HV",`جهد ${v} V خطر على الحياة. المحاكاة لا تثبت سلامة دائرة حقيقية ولا تغني عن اختبار العزل والتأريض والحماية.`,[s.id])});
 /* أسلاك المسار */
 const activeT=new Set();BR.forEach(b=>{const r=res.comps[b.c];const I=b.k=="Z"?abs(div(sub(sol.V[b.na],sol.V[b.nb]),b.z)):(b.idx!=null?abs(sol.I[b.idx]):0);if(I>eps){activeT.add(tKey(b.c,b.a));activeT.add(tKey(b.c,b.b))}});
 const netAct=new Map();activeT.forEach(k=>{const n=node(k);netAct.set(n,(netAct.get(n)||0)+1)});
 comps.filter(c=>c.type=="junction").forEach(c=>{const k=tKey(c.id,"n");if((netAct.get(node(k))||0)>=2)activeT.add(k)});
 wires.forEach(x=>{res.wires[x.id]={on:activeT.has(tKey(x.a.c,x.a.t))&&activeT.has(tKey(x.b.c,x.b.t))}});
 res.nets=nN;res.iterations=it+1;return res}
const label=c=>c?((c.name||T[c.type].t)+(c.name?"":" "+c.id)):"?";
function solveNet(BR,nN,gndNode,dc,iss,comps){/* فحص حلقات المصادر والعناصر الصفرية */
 const z=UF(nN);BR.forEach(b=>{delete b.loop;delete b.idx});for(const b of BR.filter(b=>b.k=="zero"))if(!z.u(b.na,b.nb))b.loop=true;
 const vs=BR.filter(b=>b.k=="V");for(const b of vs){if(!z.u(b.na,b.nb)){const c=comps.find(x=>x.id==b.c),par=vs.some(x=>x!==b&&x.idx===undefined&&z.f(x.na)==z.f(b.na)&&x.done);iss.push({lvl:"error",code:par?"SRC_PARALLEL":"SRC_SHORT",msg:par?`${label(c)} موصل على التوازي مع مصدر آخر مباشرة: غير مدعوم/خطر`:`قصر مباشر على ${label(c)}: طرفا المصدر متصلان بدون أي حمل (سلك أو مفتاح مغلق أو فيوز سليم فقط)`,comps:[b.c].concat(BR.filter(x=>x.k=="zero"&&z.f(x.na)==z.f(b.na)).map(x=>x.c))});return null}b.done=true}
 const ref=gndNode.length?gndNode[0]:-1,idxOf=n=>n===ref?-1:(ref>=0&&n>ref?n-1:n),nn=ref>=0?nN-1:nN;
 const vb=BR.filter(b=>(b.k=="V"||b.k=="zero")&&!b.loop);vb.forEach((b,i)=>b.idx=i);const N=nn+vb.length;
 const A=Array.from({length:N},()=>Array.from({length:N},()=>C(0))),rhs=Array.from({length:N},()=>C(0));
 const gmin=1e-12;for(let i=0;i<nn;i++)A[i][i]=add(A[i][i],C(gmin));
 gndNode.slice(1).forEach(n=>{const i=idxOf(n);if(i>=0)A[i][i]=add(A[i][i],C(1e6))});
 BR.filter(b=>b.k=="Z").forEach(b=>{if(abs(b.z)<1e-12)return;const y=div(C(1),b.z),i=idxOf(b.na),j=idxOf(b.nb);if(i>=0)A[i][i]=add(A[i][i],y);if(j>=0)A[j][j]=add(A[j][j],y);if(i>=0&&j>=0){A[i][j]=sub(A[i][j],y);A[j][i]=sub(A[j][i],y)}});
 vb.forEach(b=>{const r=nn+b.idx,i=idxOf(b.na),j=idxOf(b.nb);if(i>=0){A[i][r]=add(A[i][r],C(1));A[r][i]=add(A[r][i],C(1))}if(j>=0){A[j][r]=sub(A[j][r],C(1));A[r][j]=sub(A[r][j],C(1))}rhs[r]=C(b.k=="V"?b.v:0)});
 const x=solve(A,rhs);if(!x){iss.push({lvl:"error",code:"SINGULAR",msg:"تعذر حل الدائرة (توصيل غير محدد)",comps:[]});return null}
 const V=Array.from({length:nN},(_,n)=>{const i=idxOf(n);return i<0?C(0):x[i]}),I=vb.map(b=>neg(x[nn+b.idx]));return{V,I}}
/* لماذا لا يمر تيار في عنصر: نبحث عن مسار مع اعتبار المفتوح مغلقًا */
function openWhy(c,BR,nN,comps,node,tKey){const own=BR.filter(b=>b.c==c.id),others=BR.filter(b=>b.c!=c.id&&b.k!="V");const srcB=BR.filter(b=>b.k=="V");if(!srcB.length)return{blocking:[],reach:false};
 const adj=Array.from({length:nN},()=>[]);others.forEach(b=>{adj[b.na].push([b.nb,b]);adj[b.nb].push([b.na,b])});
 const path=(s,t,ban)=>{if(s===ban)return null;const prev=new Map([[s,null]]),q=[s];while(q.length){const u=q.shift();if(u===t)break;for(const [v,b] of adj[u])if(v!==ban&&!prev.has(v)){prev.set(v,[u,b]);q.push(v)}}if(!prev.has(t))return null;const el=[];let v=t;while(prev.get(v)){const [u,b]=prev.get(v);el.push(b);v=u}return el};
 for(const ob of own)for(const s of srcB){for(const [x,y] of [[ob.na,ob.nb],[ob.nb,ob.na]]){if(x===y)continue;const p1=path(s.na,x,y),p2=p1&&path(y,s.nb,x);if(p1&&p2){const bl=[...new Set(p1.concat(p2).filter(b=>b.k=="open").map(b=>b.c))];return{blocking:bl,reach:true}}}}
 return{blocking:[],reach:false}}
/* ---- سيناريو زمني: تتابع حالات ---- */
function scenario(ckt,steps,opt){return(steps||[]).slice(0,20).map(st=>{const c2=JSON.parse(JSON.stringify(ckt));(st.set||[]).forEach(s=>{const c=c2.comps.find(x=>x.id==s.id);if(c){if(s.state)c.state={...(c.state||{}),...s.state};if(s.expect!==undefined)c.expect=s.expect}});return{name:st.name,note:st.note||"",result:analyze(c2,opt)}})}
/* ---- تحقق من ملف دائرة (استيراد/حفظ) ---- */
function validateCircuit(o){const e=[];if(!o||typeof o!="object")return["ليس ملف دائرة"];if(!Array.isArray(o.comps))e.push("comps مطلوبة");if(!Array.isArray(o.wires))e.push("wires مطلوبة");if(e.length)return e;
 const ids=new Set();o.comps.forEach((c,i)=>{if(!c||!T[c.type])e.push(`عنصر ${i+1}: نوع غير معروف`);else if(typeof c.id!="string"||!/^[\w-]{1,30}$/.test(c.id))e.push(`عنصر ${i+1}: معرف غير صالح`);else if(ids.has(c.id))e.push(`معرف مكرر ${c.id}`);else ids.add(c.id)});
 o.wires.forEach((w,i)=>{if(!w||!w.a||!w.b||!ids.has(w.a.c)||!ids.has(w.b.c))e.push(`سلك ${i+1}: طرف غير موجود`)});if(o.comps.length>300)e.push("أكثر من 300 عنصر");return e}
function cleanCircuit(o){const ck=x=>x&&typeof x=="object"&&!Array.isArray(x);return{id:String(o.id||"").replace(/[^\w-]/g,"").slice(0,40)||("ckt"+Date.now().toString(36)),name:String(o.name||"دائرة").slice(0,100),note:String(o.note||"").slice(0,600),edu:!!o.edu,
 comps:o.comps.map(c=>({id:c.id,type:c.type,name:String(c.name||"").slice(0,40),x:+c.x||0,y:+c.y||0,rot:[0,90,180,270].includes(+c.rot)?+c.rot:0,props:ck(c.props)?Object.fromEntries(Object.entries(c.props).filter(([k,v])=>k in T[c.type].props&&isNum(+v)).map(([k,v])=>[k,+v])):{},state:ck(c.state)?{...c.state}:undefined,expect:["on","off"].includes(c.expect)?c.expect:undefined})),
 wires:o.wires.map((w,i)=>({id:String(w.id||"w"+i).slice(0,30),a:{c:w.a.c,t:String(w.a.t)},b:{c:w.b.c,t:String(w.b.t)}})),steps:Array.isArray(o.steps)?o.steps.slice(0,20):undefined}}
const api={TYPES:T,ZERO_TYPES,branches,analyze,scenario,validateCircuit,cleanCircuit,label,_c:{C,add,sub,mul,div,abs}};
if(typeof module!="undefined")module.exports=api;else g.ECK=api})(typeof window!="undefined"?window:globalThis);

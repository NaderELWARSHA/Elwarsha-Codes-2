/* الأدوات الفنية ومحرك مسارات التشخيص — منطق نقي بلا DOM */
(function(g){"use strict";
const N=typeof require!="undefined"?require("./sync.js").normAr:g.SY.normAr;
const isNum=v=>typeof v=="number"&&isFinite(v),isObj=o=>o&&typeof o=="object"&&!Array.isArray(o),str=v=>typeof v=="string"&&v.trim()!=="";
/* ---- تحويل وحدات القدرة (إلى W): BTU/h(IT)=0.29307107 W، kcal/h(IT)=1.163 W، TR=12000 BTU/h ---- */
const FW={W:1,kW:1000,"BTU/h":0.29307107,"kcal/h":1.163,TR:3516.8528};
function convert(v,from,to){if(!isNum(v))return{err:"أدخل رقمًا صحيحًا"};if(!(from in FW)||!(to in FW))return{err:"وحدة غير معروفة"};if(v<0)return{err:"القدرة لا تكون سالبة"};
const w=v*FW[from];return{value:w/FW[to],w,formula:`${v} ${from} × ${FW[from]} = ${+w.toPrecision(10)} W ÷ ${FW[to]} = ${+(w/FW[to]).toPrecision(8)} ${to}`}}
const convertAll=(v,from)=>Object.keys(FW).map(u=>({u,...convert(v,from,u)}));
/* ---- قانون أوم: أدخل قيمتين من V وI وR ---- */
function ohm({V,I,R}){const k=[V,I,R].map(x=>x==null||x===""?null:x);if(k.filter(x=>x!==null).length!==2)return{err:"أدخل قيمتين فقط من الثلاث"};if(k.some(x=>x!==null&&!isNum(x)))return{err:"قيمة غير صالحة"};
let [v,i,r]=k;if(r!==null&&r<=0)return{err:"المقاومة يجب أن تكون أكبر من صفر"};if(i!==null&&i<0||v!==null&&v<0)return{err:"القيم السالبة غير مدعومة هنا"};
let f;if(v===null){v=i*r;f=`V = I × R = ${i} × ${r}`}else if(i===null){if(r===null)return{err:"غير ممكن"};i=v/r;f=`I = V ÷ R = ${v} ÷ ${r}`}else{if(i===0)return{err:"التيار لا يجوز أن يكون صفرًا لحساب R"};r=v/i;f=`R = V ÷ I = ${v} ÷ ${i}`}
return{V:v,I:i,R:r,P:v*i,formula:f+` ; P = V × I = ${+(v*i).toPrecision(8)} W`}}
/* ---- القدرة: dc / ac1 (طور واحد) / ac3 (ثلاثة أطوار، الجهد بين خطين) ---- */
function power({mode,V,I,pf}){if(![V,I].every(x=>isNum(x)&&x>=0))return{err:"الجهد والتيار يجب أن يكونا رقمين غير سالبين"};
if(mode=="dc")return{P:V*I,formula:"P = V × I",assume:"تيار مستمر: لا يوجد معامل قدرة"};
if(mode!="ac1"&&mode!="ac3")return{err:"نمط غير معروف"};if(!isNum(pf)||pf<=0||pf>1)return{err:"معامل القدرة بين 0 (غير شامل) و1"};
const S=(mode=="ac3"?Math.sqrt(3):1)*V*I,P=S*pf,Q=Math.sqrt(Math.max(0,S*S-P*P));
return{S,P,Q,formula:mode=="ac3"?"S = √3 × V(خط-خط) × I ; P = S × PF ; Q = √(S² − P²)":"S = V × I ; P = S × PF ; Q = √(S² − P²)",assume:`PF = ${pf} كما أدخلته؛ التيار والجهد قيم فعالة RMS وحمل متزن${mode=="ac3"?" (ثلاثة أطوار)":""}`}}
/* ---- نسبة الفرق ---- */
function pctDiff(ref,val){if(!isNum(ref)||!isNum(val))return{err:"أدخل رقمين"};if(ref===0)return{err:"لا يمكن حساب النسبة بالنسبة لمرجع صفري"};return{abs:val-ref,pct:(val-ref)/ref*100,formula:`(${val} − ${ref}) ÷ ${ref} × 100`}}
function pctDiffTol(a,ta,b,tb){if(![a,ta,b,tb].every(isNum)||ta<0||tb<0)return{err:"قيم غير صالحة"};if(a-ta<=0)return{err:"هامش الخطأ يجعل المرجع صفرًا أو سالبًا"};return{min:((b-tb)/(a+ta)-1)*100,max:((b+tb)/(a-ta)-1)*100,nominal:(b/a-1)*100}}
function compareValues(arr){if(!Array.isArray(arr)||arr.length<2||!arr.every(isNum))return{err:"أدخل قيمتين على الأقل"};return{ref:arr[0],rows:arr.slice(1).map(v=>({v,...pctDiff(arr[0],v)}))}}
/* ---- حساسات: لا منحنى افتراضي؛ المستخدم يدخل نقاط المنحنى الموثقة ---- */
function parsePoints(text){const pts=[];for(const [i,l] of String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).entries()){const m=l.split(/[\s,;،]+/).map(Number);if(m.length!==2||!m.every(isNum))return{err:`السطر ${i+1} غير صالح (المتوقع: درجة الحرارة، المقاومة)`};pts.push([m[0],m[1]])}
if(pts.length<2)return{err:"أدخل نقطتين على الأقل"};const byR=[...pts].sort((a,b)=>a[1]-b[1]);for(let k=1;k<byR.length;k++){if(byR[k][1]===byR[k-1][1])return{err:"مقاومة مكررة"};if((byR[k][0]-byR[k-1][0])*(byR[1][0]-byR[0][0])<=0)return{err:"المنحنى غير رتيب (تأكد من النقاط)"}}return{points:byR}}
function interp(points,R){if(!Array.isArray(points)||points.length<2)return{err:"المنحنى غير معرّف"};if(!isNum(R)||R<=0)return{err:"أدخل مقاومة موجبة"};const p=[...points].sort((a,b)=>a[1]-b[1]);if(R<p[0][1]||R>p[p.length-1][1])return{err:`خارج نطاق المنحنى (${p[0][1]} – ${p[p.length-1][1]})`};
for(let i=1;i<p.length;i++)if(R<=p[i][1]){const [t0,r0]=p[i-1],[t1,r1]=p[i];return{T:t0+(R-r0)*(t1-t0)/(r1-r0),note:"استيفاء خطي بين نقطتين من المنحنى المُدخل؛ الدقة تتوقف على تقارب النقاط"}}return{err:"غير ممكن"}}
/* ---- مسارات التشخيص: بيانات قابلة للتعديل ---- */
const cl=(v,n=400)=>String(v??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").trim().slice(0,n),okId=x=>typeof x=="string"&&/^[\w-]{1,40}$/.test(x);
function cleanFlow(f){if(!isObj(f))return null;const o={id:cl(f.id,40),title:cl(f.title,150),deviceType:cl(f.deviceType,60),brand:cl(f.brand,60),codes:Array.isArray(f.codes)?f.codes.map(x=>cl(x,40)).filter(Boolean).slice(0,50):[],safety:cl(f.safety,600),status:["draft","verified"].includes(f.status)?f.status:"draft",srcRef:cl(f.srcRef,300),start:cl(f.start,40),nodes:{}};
if(isObj(f.nodes))for(const [k,n] of Object.entries(f.nodes).slice(0,300)){if(!okId(k)||!isObj(n))continue;const c={text:cl(n.text,600)};for(const q of ["measure","expected","warn","result"])if(str(n[q]))c[q]=cl(n[q],500);if(Array.isArray(n.options))c.options=n.options.filter(isObj).slice(0,8).map(x=>({t:cl(x.t,150),next:cl(x.next,40)}));o.nodes[k]=c}return o}
function validateFlow(f){const e=[],w=[];if(!isObj(f))return{ok:false,errors:["ليس مسارًا"],warnings:[]};if(!okId(f.id))e.push("المعرّف id مطلوب (حروف/أرقام/شرطات)");if(!str(f.title))e.push("العنوان مطلوب");if(!str(f.safety))e.push("تحذير السلامة مطلوب");
const nd=isObj(f.nodes)?f.nodes:{};if(!Object.keys(nd).length)e.push("لا توجد خطوات");if(!nd[f.start])e.push("خطوة البداية غير موجودة");
for(const [k,n] of Object.entries(nd)){if(!str(n.text)){e.push(`الخطوة ${k}: النص مطلوب`);continue}if(Array.isArray(n.options)&&n.options.length){n.options.forEach((x,i)=>{if(!str(x.t))e.push(`الخطوة ${k} الخيار ${i+1}: النص مطلوب`);else if(!nd[x.next])e.push(`الخطوة ${k} الخيار ${i+1}: الوجهة «${x.next}» غير موجودة`)})}else if(!str(n.result))e.push(`الخطوة ${k}: يجب أن تحتوي خيارات أو نتيجة`)}
if(!e.length){const st={},stack=new Set();let cyc=false;const dfs=k=>{if(stack.has(k)){cyc=true;return}if(st[k])return;st[k]=1;stack.add(k);(nd[k].options||[]).forEach(x=>dfs(x.next));stack.delete(k)};dfs(f.start);if(cyc)e.push("المسار يحتوي دورة (حلقة لا تنتهي)");const un=Object.keys(nd).filter(k=>!st[k]);if(un.length)w.push("خطوات غير موصولة بالبداية: "+un.join("، "))}
if(!str(f.srcRef))w.push("لا يوجد مصدر مذكور للمسار");if(f.status!=="verified")w.push("المسار غير موسوم كموثّق");return{ok:!e.length,errors:e,warnings:w}}
const flowMatches=(f,q,strict)=>{const dev=!f.deviceType||!q.deviceType||N(f.deviceType)===N(q.deviceType),br=!f.brand||!q.brand||N(f.brand)===N(q.brand),cd=!f.codes.length||(q.code&&f.codes.some(c=>N(c)===N(q.code)));return dev&&br&&cd&&(!strict||f.codes.length>0)};
const flowsFor=(flows,q,strict)=>flows.filter(f=>flowMatches(f,q,strict));
const api={FW,convert,convertAll,ohm,power,pctDiff,pctDiffTol,compareValues,parsePoints,interp,cleanFlow,validateFlow,flowsFor};
if(typeof module!="undefined")module.exports=api;else g.TL=api})(typeof window!="undefined"?window:globalThis);

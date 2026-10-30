/* واجهة رسم الدوائر (SVG) — تستخدم ECK للتحليل فقط. لمس/ماوس عبر Pointer Events. */
(function(g){"use strict";
const U={},E=s=>MR.e(s),T=()=>ECK.TYPES,GR=20,snap=v=>Math.round(v/GR)*GR,st=()=>MR.makeStore(localStorage),ss=()=>MR.makeStore(sessionStorage);
/* أطراف كل نوع قبل الدوران */
const TP={vac:{L:[0,-40],N:[0,40]},vdc:{"+":[0,-40],"-":[0,40]},gnd:{g:[0,-20]},junction:{n:[0,0]},compressor:{C:[-40,0],R:[40,-20],S:[40,20]},relay:{c1:[-40,-20],c2:[-40,20],com:[40,0],no:[80,-20],nc:[80,20]},timer:{m1:[-40,-20],m2:[-40,20],com:[40,0],cool:[80,-20],defrost:[80,20]},spdt:{com:[-40,0],a:[40,-20],b:[40,20]}};
const tp=type=>TP[type]||{a:[-40,0],b:[40,0]};
const rot=([x,y],r)=>r==90?[-y,x]:r==180?[-x,-y]:r==270?[y,-x]:[x,y];
const tpos=(c,t)=>{const o=rot(tp(c.type)[t]||[0,0],c.rot||0);return[c.x+o[0],c.y+o[1]]};
const PAL=[["vac","~ مصدر AC"],["vdc","⎓ مصدر DC"],["gnd","⏚ أرضي"],["junction","• نقطة"],["switch","مفتاح"],["spdt","مفتاح تحويل"],["fuse","فيوز"],["thermalFuse","فيوز حراري"],["overload","أوفرلود"],["thermostat","ثرموستات"],["bimetal","بيمتال"],["res","مقاومة"],["sensor","حساس"],["cap","مكثف"],["coil","ملف"],["relay","ريليه"],["timer","تايمر"],["heater","سخان"],["lamp","لمبة"],["motor","موتور"],["pump","طلمبة"],["valve","صمام"],["compressor","كباس"]];
const PL={V:"الجهد V",f:"التردد Hz",rating:"تقنين A",tripC:"حرارة الفصل °C",tripA:"تيار الفصل A",R:"المقاومة Ω",uF:"السعة µF",L:"المحاثة H",P:"القدرة W",Vn:"الجهد المقنن V",pf:"معامل القدرة",Rrun:"مقاومة ملف التشغيل Ω",Rstart:"مقاومة ملف البدء Ω",Vcoil:"جهد الملف V",Rcoil:"مقاومة الملف Ω",pickup:"نسبة جهد الالتقاط (0–1)",dropout:"نسبة جهد الفصل (0–1)",Rm:"مقاومة موتور التايمر Ω"};
/* رسم جسم العنصر (قبل الدوران) */
function body(c){const s={...(T()[c.type].state||{}),...(c.state||{})},L='<path class="body" d="M-40 0H-24M24 0H40"/>';
 switch(c.type){
 case"vac":return'<path class="body" d="M0 -40V-18M0 18V40"/><circle class="body" r="18"/><path class="body" d="M-9 0Q-4.5 -9 0 0T9 0"/><text x="-4" y="-24" font-size="9">L</text><text x="-4" y="31" font-size="9">N</text>';
 case"vdc":return'<path class="body" d="M0 -40V-6M0 6V40M-14 -6H14M-7 6H7"/><text x="8" y="-12">+</text><text x="8" y="20">−</text>';
 case"gnd":return'<path class="body" d="M0 -20V0M-14 0H14M-9 6H9M-4 12H4"/>';
 case"junction":return'<circle r="5" fill="currentColor" class="body"/>';
 case"switch":case"thermostat":case"bimetal":return L+`<path class="body" d="M-24 0L${s.closed?"24 0":"20 -16"}"/><circle class="body" cx="-24" r="2.5"/><circle class="body" cx="24" r="2.5"/>${c.type=="thermostat"?'<circle class="body" cy="12" r="5"/>':c.type=="bimetal"?'<path class="body" d="M-16 10H16" stroke-dasharray="3 3"/>':""}`;
 case"fuse":case"thermalFuse":return L+`<rect class="body" x="-24" y="-8" width="48" height="16" rx="${c.type=="thermalFuse"?8:2}"/>${s.blown?'<path class="body" d="M-24 0H-4M4 0H24M-4 -6L4 6"/>':'<path class="body" d="M-24 0H24"/>'}`;
 case"overload":return L+`<path class="body" d="M-24 0C-16 -12 -8 -12 0 0C8 12 16 12 24 0"/>${s.tripped?'<path class="body" d="M-6 -12L6 12"/>':""}`;
 case"res":case"sensor":return L+'<path class="body" d="M-24 0L-20 -8L-12 8L-4 -8L4 8L12 -8L20 8L24 0"/>'+(c.type=="sensor"?'<path class="body" d="M-18 14L18 -14"/>':"");
 case"cap":return'<path class="body" d="M-40 0H-6M6 0H40M-6 -14V14M6 -14V14"/>';
 case"coil":case"valve":return L+'<path class="body" d="M-24 0C-24 -12 -12 -12 -12 0C-12 -12 0 -12 0 0C0 -12 12 -12 12 0C12 -12 24 -12 24 0"/>'+(c.type=="valve"?'<rect class="body" x="-10" y="4" width="20" height="10"/>':"");
 case"heater":return L+'<path class="body" d="M-24 0L-18 -8L-10 8L-2 -8L6 8L14 -8L20 8L24 0M-14 14Q-8 9 -2 14T10 14"/>';
 case"lamp":return L+'<circle class="body" r="14"/><path class="body" d="M-10 -10L10 10M-10 10L10 -10"/>';
 case"motor":case"pump":return L+`<circle class="body" r="16"/><text x="-5" y="5" font-size="13">${c.type=="motor"?"M":"P"}</text>`;
 case"compressor":return'<path class="body" d="M-40 0H-22M22 -10L40 -20M22 10L40 20"/><circle class="body" r="22"/><text x="-12" y="4" font-size="10">CMP</text><text x="-36" y="-5" font-size="9">C</text><text x="32" y="-26" font-size="9">R</text><text x="32" y="34" font-size="9">S</text>';
 case"relay":{const en=!!(c._en);return`<path class="body" d="M-40 -20H-20V-12M-40 20H-20V12"/><rect class="body" x="-30" y="-12" width="20" height="24"/><path class="body" d="M-10 0H8" stroke-dasharray="3 3"/><path class="body" d="M40 0H24M80 -20H64M80 20H64"/><path class="body" d="M24 0L${en?"62 -18":"62 18"}"/><text x="58" y="-26" font-size="9">NO</text><text x="58" y="36" font-size="9">NC</text><text x="28" y="-8" font-size="9">COM</text>`}
 case"timer":{const d=s.pos=="defrost";return`<path class="body" d="M-40 -20H-20M-40 20H-20"/><circle class="body" cx="-14" r="16"/><path class="body" d="M-14 0V-9M-14 0L-6 4"/><path class="body" d="M40 0H28M80 -20H64M80 20H64"/><path class="body" d="M28 0L${d?"62 18":"62 -18"}"/><text x="52" y="-26" font-size="9">تبريد</text><text x="48" y="36" font-size="9">ديفروست</text>`}
 case"spdt":return`<path class="body" d="M-40 0H-20M40 -20H24M40 20H24"/><path class="body" d="M-20 0L${s.pos=="b"?"22 18":"22 -18"}"/><text x="28" y="-26" font-size="9">a</text><text x="28" y="34" font-size="9">b</text>`}return L}
const bbox=c=>{const pts=Object.values(tp(c.type)).map(p=>rot(p,c.rot||0));const xs=pts.map(p=>p[0]).concat([-24,24]),ys=pts.map(p=>p[1]).concat([-20,20]);return[Math.min(...xs)-6,Math.min(...ys)-6,Math.max(...xs)-Math.min(...xs)+12,Math.max(...ys)-Math.min(...ys)+12]};
/* ---- الحالة ---- */
let CK=null,SEL=null,MODE="move",SIM=false,PEND=null,VB=[0,0,800,560],RES=null,DRAG=null,STEP=null;
const clone=o=>JSON.parse(JSON.stringify(o));
const keep=()=>ss().set("mw_ck_cur",CK);
const newId=p=>{let i=1;while(CK.comps.some(c=>c.id==p+i))i++;return p+i};
const PFX={vac:"AC",vdc:"DC",gnd:"G",junction:"J",switch:"S",spdt:"SW",fuse:"F",thermalFuse:"TF",overload:"OL",thermostat:"TH",bimetal:"BM",res:"R",sensor:"NTC",cap:"C",coil:"L",relay:"K",timer:"TM",heater:"H",lamp:"LP",motor:"M",pump:"P",valve:"VL",compressor:"CMP"};
function libCircuits(){return KIT.libGet("circuits").filter(c=>!ECK.validateCircuit(c).length)}
function allTemplates(){return KD.CIRCUITS.concat(libCircuits().map(c=>({...c,user:1})))}
U.mount=(el,rest)=>{const id=rest&&rest[0];if(id){const t=allTemplates().find(c=>c.id==id);if(t){CK=clone(t);SEL=null;SIM=true;STEP=null;keep()}}
 if(!CK)CK=ss().get("mw_ck_cur",null);if(!CK||ECK.validateCircuit(CK).length)CK={id:"new",name:"دائرة جديدة",comps:[],wires:[]};
 el.innerHTML=`<div class="notice" style="font-size:13px">⚠️ المحاكاة تعليمية وتحليلية: لا تثبت سلامة دائرة حقيقية ولا تغني عن اختبار العزل والتأريض والحماية. الدوائر الجاهزة مبسطة وليست مخططات شركات.</div>
 <div class="ck-tools"><select id="ckt" aria-label="الدوائر"><option value="">📂 دوائر جاهزة/محفوظة…</option>${allTemplates().map(c=>`<option value="${E(c.id)}">${c.edu?"📘 ":"💾 "}${E(c.name)}</option>`).join("")}</select><button class="secondary" id="cknew" type="button">🆕 جديدة</button><button class="secondary" id="cksave" type="button">💾 حفظ</button></div>
 <div class="ck-tools"><button class="secondary" data-md="move" type="button">✋ تحديد/تحريك</button><button class="secondary" data-md="wire" type="button">〰 توصيل</button><button class="primary" id="cksim" type="button">▶ المحاكاة</button></div>
 <div class="ck-pal" id="ckpal">${PAL.map(([t,l])=>`<button class="chip chip-btn" data-add="${t}" type="button">${E(l)}</button>`).join("")}</div>
 <div class="ck-wrap" id="ckw"><svg class="ck-svg" id="cks" xmlns="http://www.w3.org/2000/svg"></svg></div>
 <div class="ck-tools"><button class="secondary" id="zin" type="button" aria-label="تكبير">＋</button><button class="secondary" id="zout" type="button" aria-label="تصغير">－</button><button class="secondary" id="zfit" type="button">⤢ ملاءمة</button><button class="secondary" id="ckx" type="button">⬇️ تصدير</button><label class="secondary" style="margin:0;display:grid;place-items:center;min-height:42px;flex:1 1 auto;border-radius:10px;cursor:pointer">⬆️ استيراد<input type="file" id="cki" accept=".json" hidden></label></div>
 <div id="ckhint" class="ck-mode"></div><div id="ckprops"></div><div id="cksteps"></div><div id="ckres"></div>`;
 const sv=document.getElementById("cks");
 document.getElementById("ckt").onchange=ev=>{const t=allTemplates().find(c=>c.id==ev.target.value);if(!t)return;CK=clone(t);SEL=null;STEP=null;SIM=true;keep();fit();draw()};
 document.getElementById("cknew").onclick=()=>{if(CK.comps.length&&!confirm("بدء دائرة جديدة؟ التغييرات غير المحفوظة ستضيع."))return;CK={id:"new",name:"دائرة جديدة",comps:[],wires:[]};SEL=null;STEP=null;SIM=false;keep();VB=[0,0,800,560];draw()};
 document.getElementById("cksave").onclick=save;document.getElementById("cksim").onclick=()=>{SIM=!SIM;draw()};
 document.querySelectorAll("[data-md]").forEach(b=>b.onclick=()=>{MODE=b.dataset.md;PEND=null;draw()});
 document.getElementById("ckpal").onclick=ev=>{const b=ev.target.closest("[data-add]");if(b)addComp(b.dataset.add)};
 document.getElementById("zin").onclick=()=>zoom(0.8);document.getElementById("zout").onclick=()=>zoom(1.25);document.getElementById("zfit").onclick=()=>{fit();draw()};
 document.getElementById("ckx").onclick=()=>dl((CK.name||"دائرة")+".json",JSON.stringify(ECK.cleanCircuit(CK),null,1),"application/json");
 document.getElementById("cki").onchange=async ev=>{const t=await readFile(ev.target.files[0]);if(t==null)return;let j;try{j=JSON.parse(t)}catch{return alert("JSON غير صالح")}const e=ECK.validateCircuit(j);if(e.length)return alert("ملف دائرة غير صالح:\n"+e.slice(0,8).join("\n"));CK=ECK.cleanCircuit(j);SEL=null;STEP=null;keep();fit();draw()};
 wirePointer(sv);if(id||!ss().get("mw_ck_vb",null))fit();else VB=ss().get("mw_ck_vb",VB);draw()};
function save(){const df=CK.edu?CK.name+" (نسختي)":CK.name,nm0=prompt("اسم الدائرة:",df);if(nm0===null)return;const nm=nm0.trim()||df;const c=ECK.cleanCircuit({...CK,name:nm,edu:false,id:CK.edu||CK.id=="new"?"u"+Date.now().toString(36):CK.id});const L=KIT.libGet("circuits").filter(x=>x.id!=c.id);L.push(c);if(!KIT.libSet("circuits",L))return alert("تعذر الحفظ");CK=c;keep();toast("تم حفظ الدائرة ✓");U.mount(app.querySelector("#tb"),[])}
function addComp(type){const cx=snap(VB[0]+VB[2]/2),cy=snap(VB[1]+VB[3]/2);let x=cx,y=cy;while(CK.comps.some(c=>Math.abs(c.x-x)<40&&Math.abs(c.y-y)<40)){x+=GR*2;y+=GR}const c={id:newId(PFX[type]||"X"),type,x,y,rot:0,props:{},state:T()[type].state?{...T()[type].state}:undefined};CK.comps.push(c);SEL={k:"c",id:c.id};MODE="move";keep();draw()}
function zoom(f){const cx=VB[0]+VB[2]/2,cy=VB[1]+VB[3]/2;VB[2]=Math.min(3000,Math.max(200,VB[2]*f));VB[3]=VB[2]*0.7;VB[0]=cx-VB[2]/2;VB[1]=cy-VB[3]/2;ss().set("mw_ck_vb",VB);draw()}
function fit(){if(!CK||!CK.comps.length){VB=[0,0,800,560];return}const b=CK.comps.map(c=>{const r=bbox(c);return[c.x+r[0],c.y+r[1],c.x+r[0]+r[2],c.y+r[1]+r[3]]});const x0=Math.min(...b.map(v=>v[0]))-30,y0=Math.min(...b.map(v=>v[1]))-30,x1=Math.max(...b.map(v=>v[2]))+30,y1=Math.max(...b.map(v=>v[3]))+30;
 const w=Math.max(300,x1-x0),h=Math.max(220,y1-y0),el=document.getElementById("ckw"),ar=el?el.clientHeight/Math.max(1,el.clientWidth):0.7;let W=w,H=w*ar;if(H<h){H=h;W=h/ar}VB=[x0-(W-w)/2,y0-(H-h)/2,W,H];ss().set("mw_ck_vb",VB)}
const ptOf=(sv,ev)=>{const p=sv.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;const m=sv.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0}};
function wirePointer(sv){sv.onpointerdown=ev=>{const p=ptOf(sv,ev),tEl=ev.target.closest("[data-t]"),cEl=ev.target.closest("[data-c]"),wEl=ev.target.closest("[data-w]");
  if(MODE=="wire"){if(tEl){const [c,t]=tEl.dataset.t.split("|");if(!PEND)PEND={c,t};else{if(!(PEND.c==c&&PEND.t==t)&&!CK.wires.some(w=>w.a.c==PEND.c&&w.a.t==PEND.t&&w.b.c==c&&w.b.t==t||w.b.c==PEND.c&&w.b.t==PEND.t&&w.a.c==c&&w.a.t==t)){let i=CK.wires.length+1;while(CK.wires.some(w=>w.id=="w"+i))i++;CK.wires.push({id:"w"+i,a:PEND,b:{c,t}});keep()}PEND=null}draw();return}
   if(wEl){SEL={k:"w",id:wEl.dataset.w};PEND=null;draw();return}PEND=null;draw();return}
  if(SIM&&cEl){const c=CK.comps.find(x=>x.id==cEl.dataset.c);if(c&&toggle(c)){keep();draw();return}}
  if(cEl){const c=CK.comps.find(x=>x.id==cEl.dataset.c);SEL={k:"c",id:c.id};DRAG={id:c.id,dx:p.x-c.x,dy:p.y-c.y,moved:false};sv.setPointerCapture(ev.pointerId);draw();return}
  if(wEl){SEL={k:"w",id:wEl.dataset.w};draw();return}
  SEL=null;DRAG={pan:true,x:ev.clientX,y:ev.clientY,vb:VB.slice()};sv.setPointerCapture(ev.pointerId);draw()};
 sv.onpointermove=ev=>{if(!DRAG)return;if(DRAG.pan){const r=sv.getBoundingClientRect(),k=VB[2]/r.width;VB[0]=DRAG.vb[0]-(ev.clientX-DRAG.x)*k;VB[1]=DRAG.vb[1]-(ev.clientY-DRAG.y)*k;sv.setAttribute("viewBox",VB.join(" "));return}
  const p=ptOf(sv,ev),c=CK.comps.find(x=>x.id==DRAG.id);if(!c)return;const nx=snap(p.x-DRAG.dx),ny=snap(p.y-DRAG.dy);if(nx!==c.x||ny!==c.y){c.x=nx;c.y=ny;DRAG.moved=true;draw(true)}};
 sv.onpointerup=sv.onpointercancel=()=>{if(DRAG&&DRAG.pan)ss().set("mw_ck_vb",VB);if(DRAG&&DRAG.moved)keep();DRAG=null}}
function toggle(c){const s=c.state||(c.state={});switch(c.type){case"switch":case"thermostat":case"bimetal":s.closed=!s.closed;return true;case"fuse":case"thermalFuse":s.blown=!s.blown;return true;case"overload":s.tripped=!s.tripped;return true;case"timer":s.pos=s.pos=="defrost"?"cool":"defrost";return true;case"spdt":s.pos=s.pos=="b"?"a":"b";return true}return false}
/* ---- الرسم ---- */
function draw(fast){const sv=document.getElementById("cks");if(!sv)return;sv.setAttribute("viewBox",VB.join(" "));
 RES=SIM?ECK.analyze(CK):null;const R=RES,errC=new Set(R?R.issues.filter(i=>i.lvl=="error"||i.lvl=="warn").flatMap(i=>i.comps):[]);
 const deg={};CK.wires.forEach(w=>[w.a,w.b].forEach(x=>{const k=x.c+"|"+x.t;deg[k]=(deg[k]||0)+1}));
 let h=`<defs><pattern id="gp" width="${GR}" height="${GR}" patternUnits="userSpaceOnUse"><circle class="grid" cx="1" cy="1" r="1"/></pattern></defs><rect x="${VB[0]-2000}" y="${VB[1]-2000}" width="${VB[2]+4000}" height="${VB[3]+4000}" fill="url(#gp)"/>`;
 CK.wires.forEach(w=>{const ca=CK.comps.find(c=>c.id==w.a.c),cb=CK.comps.find(c=>c.id==w.b.c);if(!ca||!cb)return;const [x1,y1]=tpos(ca,w.a.t),[x2,y2]=tpos(cb,w.b.t),d=`M${x1} ${y1}H${x2}V${y2}`,on=R&&R.wires[w.id]&&R.wires[w.id].on,sel=SEL&&SEL.k=="w"&&SEL.id==w.id;
  h+=`<g data-w="${E(w.id)}"><path d="${d}" stroke="transparent" stroke-width="14" fill="none"/><path class="wire ${on?"on":""} ${sel?"sel":""}" d="${d}"/></g>`});
 CK.comps.forEach(c=>{const rc=R&&R.comps[c.id],on=rc&&rc.on,b=bbox(c),sel=SEL&&SEL.k=="c"&&SEL.id==c.id;if(c.type=="relay")c._en=!!(R&&R.relays&&R.relays[c.id]);
  h+=`<g class="comp ${on?"on":""} ${sel?"sel":""} ${errC.has(c.id)&&SIM?"err":""}" data-c="${E(c.id)}" transform="translate(${c.x} ${c.y})"><rect class="hl" x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" rx="6" fill="transparent" stroke="none"/><g transform="rotate(${c.rot||0})">${body(c)}</g></g>`;
  const lb=c.name||c.id;h+=`<text x="${c.x+b[0]}" y="${c.y+b[1]-4}">${E(lb.length>22?lb.slice(0,21)+"…":lb)}</text>`;
  if(rc&&rc.I>1e-6&&c.type!="junction")h+=`<text class="v" direction="ltr" x="${c.x+b[0]}" y="${c.y+b[1]+b[3]+12}">${fmtI(rc.I)}</text>`;
  Object.keys(tp(c.type)).forEach(t=>{const [x,y]=tpos(c,t),k=c.id+"|"+t,pend=PEND&&PEND.c==c.id&&PEND.t==t;h+=`<g data-t="${E(k)}"><circle cx="${x}" cy="${y}" r="${MODE=="wire"?14:9}" fill="transparent"/><circle class="term ${!deg[k]&&c.type!="junction"?"free":""} ${pend?"pend":""}" cx="${x}" cy="${y}" r="${MODE=="wire"?6:3.5}"/></g>`})});
 sv.innerHTML=h;if(fast)return;
 document.querySelectorAll("[data-md]").forEach(b=>b.className=b.dataset.md==MODE?"primary":"secondary");const sb=document.getElementById("cksim");sb.className=SIM?"primary":"secondary";sb.textContent=SIM?"⏸ إيقاف المحاكاة":"▶ تشغيل المحاكاة";
 document.getElementById("ckhint").textContent=MODE=="wire"?(PEND?"اضغط الطرف الثاني لإكمال السلك":"وضع التوصيل: اضغط طرفًا ثم طرفًا آخر. اضغط سلكًا لتحديده."):SIM?"المحاكاة تعمل: اضغط مفتاحًا/فيوزًا/تايمر لتغيير حالته وشاهد المسار. اسحب لتحريك العناصر.":"اختر عنصرًا من الشريط لإضافته، اسحبه لتحريكه، واضغطه لتعديل خصائصه.";
 props();steps();results()}
const fmtI=I=>I>=1?I.toFixed(2)+" A":I>=1e-3?(I*1000).toFixed(1)+" mA":(I*1e6).toFixed(0)+" µA";
function props(){const el=document.getElementById("ckprops");if(!SEL){el.innerHTML="";return}
 if(SEL.k=="w"){el.innerHTML=`<section class="sec ck-props"><b>سلك ${E(SEL.id)}</b><div class="row"><button class="danger-btn" id="pdw" type="button">🗑️ حذف السلك</button></div></section>`;document.getElementById("pdw").onclick=()=>{CK.wires=CK.wires.filter(w=>w.id!=SEL.id);SEL=null;keep();draw()};return}
 const c=CK.comps.find(x=>x.id==SEL.id);if(!c){SEL=null;el.innerHTML="";return}const TY=T()[c.type],P={...TY.props,...(c.props||{})},S={...(TY.state||{}),...(c.state||{})};
 let stH="";if("closed" in S)stH=`<label>الحالة<select id="pst"><option value="1" ${S.closed?"selected":""}>مغلق</option><option value="0" ${!S.closed?"selected":""}>مفتوح</option></select></label>`;
 else if("blown" in S)stH=`<label>الحالة<select id="pst"><option value="0" ${!S.blown?"selected":""}>سليم</option><option value="1" ${S.blown?"selected":""}>محروق/مفتوح</option></select></label>`;
 else if("tripped" in S)stH=`<label>الحالة<select id="pst"><option value="0" ${!S.tripped?"selected":""}>مغلق</option><option value="1" ${S.tripped?"selected":""}>فاصل</option></select></label>`;
 else if("pos" in S)stH=`<label>الوضع<select id="pst">${c.type=="timer"?`<option value="cool" ${S.pos!="defrost"?"selected":""}>تبريد</option><option value="defrost" ${S.pos=="defrost"?"selected":""}>ديفروست</option>`:`<option value="a" ${S.pos!="b"?"selected":""}>a</option><option value="b" ${S.pos=="b"?"selected":""}>b</option>`}</select></label>`;
 const rc=RES&&RES.comps[c.id];
 el.innerHTML=`<section class="sec ck-props"><b>${E(TY.t)} — ${E(c.id)}</b>${rc?`<div class="kvs"><div class="kv"><span>التيار</span><b dir="ltr">${fmtI(rc.I)}</b></div><div class="kv"><span>الجهد</span><b dir="ltr">${rc.V.toFixed(2)} V</b></div>${rc.P?`<div class="kv"><span>القدرة</span><b dir="ltr">${rc.P.toFixed(2)} W</b></div>`:""}</div>`:""}
 <div class="fgrid"><label>الاسم<input id="pnm" value="${E(c.name||"")}" maxlength="40"></label>${stH}${Object.keys(TY.props).map(k=>`<label>${E(PL[k]||k)}<input data-pp="${k}" inputmode="decimal" value="${E(P[k])}"></label>`).join("")}${c.type=="junction"||c.type=="gnd"||TY.src?"":`<label>المتوقع (للفحص)<select id="pex"><option value="">—</option><option value="on" ${c.expect=="on"?"selected":""}>يعمل</option><option value="off" ${c.expect=="off"?"selected":""}>متوقف</option></select></label>`}</div>
 <div class="row"><button class="secondary" id="prot" type="button">⟳ تدوير</button><button class="danger-btn" id="pdel" type="button">🗑️ حذف</button></div></section>`;
 document.getElementById("pnm").onchange=ev=>{c.name=ev.target.value.trim().slice(0,40);keep();draw()};
 const ps=document.getElementById("pst");if(ps)ps.onchange=()=>{const s=c.state||(c.state={}),v=ps.value;if("closed" in S)s.closed=v=="1";else if("blown" in S)s.blown=v=="1";else if("tripped" in S)s.tripped=v=="1";else s.pos=v;keep();draw()};
 document.querySelectorAll("[data-pp]").forEach(i=>i.onchange=()=>{const v=X2.num(i.value);if(!isFinite(v)){toast("قيمة غير صالحة");return}c.props=c.props||{};c.props[i.dataset.pp]=v;keep();draw()});
 const ex=document.getElementById("pex");if(ex)ex.onchange=()=>{c.expect=ex.value||undefined;keep();draw()};
 document.getElementById("prot").onclick=()=>{c.rot=((c.rot||0)+90)%360;keep();draw()};
 document.getElementById("pdel").onclick=()=>{CK.comps=CK.comps.filter(x=>x.id!=c.id);CK.wires=CK.wires.filter(w=>w.a.c!=c.id&&w.b.c!=c.id);SEL=null;keep();draw()}}
function steps(){const el=document.getElementById("cksteps");if(!CK.steps||!CK.steps.length){el.innerHTML="";return}
 el.innerHTML=`<section class="sec"><h3><i>⏱️</i>حالات التشغيل (سيناريو زمني)</h3><div class="chips">${CK.steps.map((s,i)=>`<button type="button" class="chip chip-btn ${STEP===i?"on":""}" data-st="${i}">${E(s.name)}</button>`).join("")}</div>${STEP!=null?`<p>${E(CK.steps[STEP].note||"")}</p>`:'<p class="mu">اختر حالة لتطبيقها على الدائرة.</p>'}<button class="secondary" id="strun" type="button">▶ فحص كل الحالات</button><div id="stout"></div></section>`;
 document.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{STEP=+b.dataset.st;(CK.steps[STEP].set||[]).forEach(s=>{const c=CK.comps.find(x=>x.id==s.id);if(c){if(s.state)c.state={...(c.state||{}),...s.state};if(s.expect!==undefined)c.expect=s.expect}});SIM=true;keep();draw()});
 document.getElementById("strun").onclick=()=>{const r=ECK.scenario(CK,CK.steps);document.getElementById("stout").innerHTML=r.map(x=>{const bad=x.result.issues.filter(i=>["UNINTENDED","NOT_RUNNING","SRC_SHORT","LOW_Z","RELAY_OSC"].includes(i.code));return`<div class="flag ${bad.length?"bad":"ok"}"><b>${E(x.name)}</b>: ${bad.length?bad.map(i=>E(i.msg)).join(" · "):"يعمل كما هو متوقع ✓"}<br><small>يعمل: ${E(Object.entries(x.result.comps).filter(([k,v])=>v.on&&!["junction","vac","vdc"].includes((CK.comps.find(c=>c.id==k)||{}).type)&&!ECK.ZERO_TYPES.has((CK.comps.find(c=>c.id==k)||{}).type)).map(([k])=>(CK.comps.find(c=>c.id==k)||{}).name||k).join("، ")||"لا شيء")}</small></div>`}).join("")}}
function results(){const el=document.getElementById("ckres");if(!SIM){el.innerHTML=CK.note?`<p class="mu">${E(CK.note)}</p>`:"";KIT._.setRep("");return}const R=RES;
 const lv={error:"bad",warn:"warn",info:"info"},iss=R.issues.slice().sort((a,b)=>["error","warn","info"].indexOf(a.lvl)-["error","warn","info"].indexOf(b.lvl));
 const act=Object.entries(R.comps).filter(([k,v])=>v.on).map(([k,v])=>{const c=CK.comps.find(x=>x.id==k);return c&&!["junction"].includes(c.type)?{c,v}:null}).filter(Boolean);
 el.innerHTML=`<section class="sec"><h3><i>🔬</i>نتيجة التحليل</h3><p class="ck-mode">النوع: ${R.mode=="dc"?"DC (حالة مستقرة)":R.mode=="ac"?"AC جيبي (متجهات)":"طوبولوجي فقط"} — ${E(R.scope||"")}</p>${CK.note?`<p class="mu">${E(CK.note)}</p>`:""}
 ${iss.length?iss.map(i=>`<div class="flag ${lv[i.lvl]}">${E(i.msg)}</div>`).join(""):'<div class="flag ok">لا توجد مشكلات مكتشفة في التوصيل.</div>'}
 ${act.length?`<div class="tw2"><table class="vt"><thead><tr><th>العنصر</th><th>التيار</th><th>الجهد</th><th>القدرة</th></tr></thead><tbody>${act.map(({c,v})=>`<tr><td class="l">${E(c.name||c.id)}</td><td dir="ltr">${fmtI(v.I)}</td><td dir="ltr">${v.V.toFixed(2)} V</td><td dir="ltr">${ECK.ZERO_TYPES.has(c.type)||T()[c.type].src?"—":v.P.toFixed(2)+" W"}</td></tr>`).join("")}</tbody></table></div>`:""}</section>`;
 KIT._.setRep(`دائرة: ${CK.name}\nالنوع: ${R.mode}\n`+(iss.map(i=>"• "+i.msg).join("\n")||"لا مشكلات")+"\n"+act.map(({c,v})=>`${c.name||c.id}: ${fmtI(v.I)} / ${v.V.toFixed(2)} V`).join("\n"))}
g.CKUI=U})(window);

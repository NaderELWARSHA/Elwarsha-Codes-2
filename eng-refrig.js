/* محرك حسابات التبريد والفريونات — منطق نقي بلا DOM.
   الجداول منقولة كما هي من مستندات منشورة (بوحداتها الأصلية) ويُحوَّل داخليًا إلى °C وkPa مطلق.
   الاستيفاء بين النقاط: خطي في ln(P) مقابل T (يطابق شكل منحنى التشبع أفضل من الخطي العادي). خارج نطاق الجدول = رفض. */
(function(g){"use strict";
const isNum=v=>typeof v=="number"&&isFinite(v);
const ARK="Arkema Forane® — Thermodynamic Properties (Saturation), بيانات مولدة بـ NIST REFPROP 9.0";
/* rows: [T, P] لمادة نقية، أو [T, P_bubble(liquid), P_dew(vapor)] لخليط. tU: C|F ، pU: kPa|bar|psia — كلها ضغط مطلق */
const SEED=[
{id:"R22",name:"R22",kind:"pure",cls:"HCFC",tU:"C",pU:"kPa",status:"manufacturer",src:ARK+" — Forane 22 SI",url:"https://www.Arkema.com/files/live/sites/shared_arkema/files/downloads/fluorochemicals/forane-22-thermodynamic-properties-si.pdf",
 rows:[[-50,64.5],[-45,82.9],[-40,105.2],[-35,132.0],[-30,163.9],[-25,201.4],[-20,245.3],[-15,296.2],[-10,354.8],[-5,421.8],[0,498.0],[5,584.1],[10,681.0],[15,789.3],[20,910.0],[25,1043.9],[30,1191.9],[35,1354.8],[40,1533.6],[45,1729.2],[50,1942.7],[55,2175.1],[60,2427.5],[65,2701.2],[70,2997.4]]},
{id:"R134a",name:"R134a",kind:"pure",cls:"HFC",tU:"C",pU:"kPa",status:"manufacturer",src:ARK+" — Forane 134a SI",url:"https://www.Arkema.com/files/live/sites/shared_arkema/files/downloads/fluorochemicals/forane-134a-thermodynamic-properties-si.pdf",
 rows:[[-50,29.5],[-45,39.1],[-40,51.2],[-35,66.1],[-30,84.4],[-25,106.4],[-20,132.7],[-15,163.9],[-10,200.6],[-5,243.3],[0,292.8],[5,349.7],[10,414.6],[15,488.4],[20,571.7],[25,665.4],[30,770.2],[35,887.0],[40,1016.6],[45,1159.9],[50,1317.9],[55,1491.5],[60,1681.8],[65,1889.8],[70,2116.8]]},
{id:"R404A",name:"R404A",kind:"blend",cls:"HFC (R125/R143a/R134a)",tU:"F",pU:"psia",status:"manufacturer",src:ARK+" — Forane 404A English (°F / psia)",url:"https://www.Arkema.com/files/live/sites/shared_arkema/files/downloads/products/fluorochemicals/Forane-404A-Thermodynamic-properties-English.pdf",
 rows:[[-60,11.56,11.10],[-50,15.17,14.64],[-40,19.62,19.00],[-30,25.03,24.31],[-20,31.53,30.70],[-10,39.26,38.32],[0,48.36,47.31],[10,58.98,57.81],[20,71.28,70.00],[30,85.44,84.03],[40,101.6,100.1],[50,120.0,118.3],[60,140.7,138.9],[70,164.0,162.1],[80,190.1,188.1],[90,219.2,217.1],[100,251.5,249.3],[110,287.2,285.1],[120,326.8,324.6],[130,370.3,368.2],[140,418.4,416.4],[150,471.5,469.8]]},
{id:"R407C",name:"R407C",kind:"blend",cls:"HFC (R32/R125/R134a 23/25/52)",tU:"C",pU:"kPa",status:"manufacturer",src:ARK+" — Forane 407C SI",url:"https://www.Arkema.com/files/live/sites/shared_arkema/files/downloads/products/fluorochemicals/Forane-407C-Thermodynamic-properties-Si.pdf",
 rows:[[-50,73.8,50.2],[-45,94.8,66.1],[-40,120.3,85.7],[-35,150.8,109.7],[-30,187.1,138.7],[-25,229.9,173.5],[-20,279.9,214.7],[-15,337.9,263.2],[-10,404.7,319.8],[-5,481.1,385.3],[0,567.9,460.7],[5,666.0,546.9],[10,776.4,644.9],[15,900.0,755.7],[20,1037.6,880.3],[25,1190.3,1020.0],[30,1359.1,1175.9],[35,1545.0,1349.2],[40,1749.0,1541.3],[45,1972.3,1753.6],[50,2216.0,1987.8],[55,2481.2,2245.4],[60,2769.2,2528.7],[65,3081.4,2840.0]]},
{id:"R410A",name:"R410A",kind:"blend",cls:"HFC (R32/R125 50/50)",tU:"C",pU:"kPa",status:"manufacturer",src:ARK+" — Forane 410A SI",url:"https://www.Arkema.com/files/live/sites/shared_arkema/files/downloads/fluorochemicals/forane-410a-thermodynamic-properties-si.pdf",
 rows:[[-50,109.0,108.6],[-45,139.1,138.6],[-40,175.5,174.9],[-35,218.9,218.1],[-30,270.3,269.4],[-25,330.6,329.4],[-20,400.7,399.3],[-15,481.7,480.0],[-10,574.6,572.7],[-5,680.6,678.3],[0,800.7,798.1],[5,936.2,933.2],[10,1088.4,1084.8],[15,1258.4,1254.3],[20,1447.6,1443.0],[25,1657.4,1652.2],[30,1889.3,1883.5],[35,2144.9,2138.5],[40,2425.6,2418.7],[45,2733.5,2726.1],[50,3070.6,3062.8],[55,3439.1,3431.3],[60,3841.8,3834.4],[65,4282.4,4276.0]]},
{id:"R32",name:"R32",kind:"pure",cls:"HFC",tU:"C",pU:"bar",status:"secondary",src:"Climalife — HFC R-32 product sheet (Sat. Pressure, bar abs)",url:"https://climalife.com/wp-content/uploads/2022/09/uploadsproductmediadocumenthfc-r-32-en.pdf",
 rows:[[-50,1.101],[-45,1.406],[-40,1.774],[-35,2.214],[-30,2.734],[-25,3.346],[-20,4.058],[-15,4.881],[-10,5.826],[-5,6.906],[0,8.131],[5,9.514],[10,11.069],[15,12.808],[20,14.746],[25,16.896],[30,19.275],[35,21.898],[40,24.783],[45,27.948],[50,31.412],[55,35.199],[60,39.332],[65,43.843],[70,48.768]]},
{id:"R600a",name:"R600a (أيزوبيوتان)",kind:"pure",cls:"HC",tU:"C",pU:"bar",status:"secondary",src:"Gas Servei — ficha técnica R-600a (bar abs، دقة جزئين من المئة)",url:"https://gas-servei.com/wp-content/uploads/2024/02/ficha-tecnica-r-600a-gas-servei.pdf",
 rows:[[-40,0.29],[-35,0.37],[-30,0.47],[-25,0.58],[-20,0.72],[-15,0.89],[-10,1.08],[-5,1.31],[0,1.57],[5,1.87],[10,2.21],[15,2.59],[20,3.02],[25,3.51],[30,4.05],[35,4.65],[40,5.31],[45,6.04],[50,6.85]]},
{id:"R290",name:"R290 (بروبان)",kind:"pure",cls:"HC",tU:"C",pU:"bar",status:"secondary",src:"Gas Servei — Technical data sheet R-290 (bar abs، دقة جزئين من المئة)",url:"https://gas-servei.com/wp-content/uploads/2024/06/Technical-data-sheet-R-290-Gas-Servei-1.pdf",
 rows:[[-50,0.70],[-45,0.89],[-40,1.11],[-35,1.37],[-30,1.68],[-25,2.03],[-20,2.44],[-15,2.92],[-10,3.45],[-5,4.06],[0,4.75],[5,5.51],[10,6.37],[15,7.32],[20,8.37],[25,9.52],[30,10.79],[35,12.18],[40,13.70],[45,15.34],[50,17.13]]}];
const PU={kPa:1,bar:100,psia:6.894757293168361,MPa:1000};
const toC=(t,u)=>u=="F"?(t-32)*5/9:t;
/* تجهيز الجدول: °C وkPa مطلق، مرتب تصاعديًا */
function prep(f){if(!f||!Array.isArray(f.rows)||f.rows.length<3)return null;const k=PU[f.pU];if(!k)return null;const blend=f.kind=="blend";
 const rows=f.rows.map(r=>[toC(+r[0],f.tU),+r[1]*k,(blend?+r[2]:+r[1])*k]).filter(r=>r.every(x=>isNum(x))&&r[1]>0&&r[2]>0).sort((a,b)=>a[0]-b[0]);
 if(rows.length<3)return null;for(let i=1;i<rows.length;i++)if(!(rows[i][0]>rows[i-1][0]&&rows[i][1]>rows[i-1][1]&&rows[i][2]>rows[i-1][2]))return null;
 return{...f,blend,T:rows.map(r=>r[0]),Pb:rows.map(r=>r[1]),Pd:rows.map(r=>r[2])}}
function validateFluid(f){const e=[];if(!f||typeof f!="object")return["ليس سجل فريون"];if(!/^[\w-]{1,20}$/.test(f.id||""))e.push("المعرف id مطلوب (مثل R454B)");if(!["pure","blend"].includes(f.kind))e.push("النوع: pure أو blend");if(!["C","F"].includes(f.tU))e.push("وحدة الحرارة C أو F");if(!PU[f.pU])e.push("وحدة الضغط kPa أو bar أو psia أو MPa (مطلق)");if(!String(f.src||"").trim())e.push("المصدر مطلوب لكل جدول");if(!e.length&&!prep(f))e.push("الجدول غير صالح: 3 صفوف على الأقل، والحرارة والضغط متزايدان معًا");return e}
const FL={};SEED.forEach(f=>{const p=prep(f);if(p)FL[f.id]=p});
const fluids=(extra)=>{const m={...FL};(extra||[]).forEach(f=>{if(!validateFluid(f).length){const p=prep(f);if(p)m[f.id]={...p,user:1}}});return m};
const which=(F,side)=>side=="bubble"?F.Pb:F.Pd;
/* T → P */
function pSat(F,T,side="dew"){if(!F)return{err:"فريون غير معروف"};if(!isNum(T))return{err:"أدخل درجة حرارة"};const X=F.T,Y=which(F,side);if(T<X[0]-1e-9||T>X[X.length-1]+1e-9)return{err:`خارج نطاق الجدول (${+X[0].toFixed(2)} إلى ${+X[X.length-1].toFixed(2)} °C)`};
 let i=1;while(i<X.length-1&&T>X[i])i++;const t=(T-X[i-1])/(X[i]-X[i-1]);return{P:Math.exp(Math.log(Y[i-1])+t*(Math.log(Y[i])-Math.log(Y[i-1]))),between:[X[i-1],X[i]]}}
/* P → T */
function tSat(F,P,side="dew"){if(!F)return{err:"فريون غير معروف"};if(!isNum(P)||P<=0)return{err:"أدخل ضغطًا مطلقًا موجبًا"};const X=F.T,Y=which(F,side);if(P<Y[0]*(1-1e-9)||P>Y[Y.length-1]*(1+1e-9)){return{err:`خارج نطاق الجدول (${+Y[0].toFixed(1)} إلى ${+Y[Y.length-1].toFixed(1)} kPa مطلق)`}}
 let i=1;while(i<Y.length-1&&P>Y[i])i++;const t=(Math.log(P)-Math.log(Y[i-1]))/(Math.log(Y[i])-Math.log(Y[i-1]));return{T:X[i-1]+t*(X[i]-X[i-1]),between:[X[i-1],X[i]]}}
const toAbs=(p,mode,atm)=>mode=="abs"?p:p+(isNum(atm)?atm:101.325);
const toGauge=(p,atm)=>p-(isNum(atm)?atm:101.325);
/* قراءة مانومتر → حرارة التشبع (dew وbubble للخليط) */
function satFromGauge(F,p,{mode="gauge",atm=101.325}={}){if(!isNum(p))return{err:"أدخل الضغط"};const pa=toAbs(p,mode,atm);if(pa<=0)return{err:"الضغط المطلق الناتج ≤ 0: راجع القراءة أو نوع الضغط"};
 const d=tSat(F,pa,"dew");if(d.err)return d;const b=F.blend?tSat(F,pa,"bubble"):d;if(b.err)return b;return{pAbs:pa,Tdew:d.T,Tbubble:b.T,glide:d.T-b.T,blend:F.blend}}
/* السوبرهيت: حرارة ماسورة السحب − حرارة التشبع عند ضغط السحب (Dew للخليط) */
function superheat(F,{p,mode,atm,tLine}){if(!isNum(tLine))return{err:"أدخل حرارة ماسورة السحب"};const s=satFromGauge(F,p,{mode,atm});if(s.err)return s;const SH=tLine-s.Tdew;
 const r={SH,Tsat:s.Tdew,pAbs:s.pAbs,glide:s.glide,formula:`SH = T(السحب) − T(تشبع Dew) = ${tLine} − ${+s.Tdew.toFixed(2)}`,assume:F.blend?"خليط زيوتروبي: استُخدمت حرارة Dew (بخار مشبع) عند ضغط السحب":"مادة نقية: Dew = Bubble"};
 if(SH<0)r.flag="سوبرهيت سالب: مستحيل فيزيائيًا لبخار جاف عند نقطة القياس — راجع مكان الحساس أو القراءة أو احتمال رجوع سائل";return r}
/* السابكولينج: حرارة التشبع عند ضغط الطرد (Bubble للخليط) − حرارة خط السائل */
function subcooling(F,{p,mode,atm,tLine}){if(!isNum(tLine))return{err:"أدخل حرارة خط السائل"};const s=satFromGauge(F,p,{mode,atm});if(s.err)return s;const SC=s.Tbubble-tLine;
 const r={SC,Tsat:s.Tbubble,pAbs:s.pAbs,glide:s.glide,formula:`SC = T(تشبع Bubble) − T(خط السائل) = ${+s.Tbubble.toFixed(2)} − ${tLine}`,assume:F.blend?"خليط زيوتروبي: استُخدمت حرارة Bubble (سائل مشبع) عند ضغط الطرد. ضغط الطرد المقاس عند الكباس أعلى قليلًا من ضغط خط السائل.":"مادة نقية: Dew = Bubble. ضغط الطرد عند الكباس أعلى قليلًا من ضغط خط السائل بسبب فقد الضغط."};
 if(SC<0)r.flag="سابكولينج سالب: السائل غير مبرد تحت التشبع عند نقطة القياس (احتمال فقاعات/فلاش) أو خطأ قياس";return r}
/* مساعد الدورة: يحسب ويعرض ملاحظات مشروطة بالقيم المرجعية التي يدخلها الفني فقط (لا قيم مستهدفة مخترعة) */
function cycle(F,o){const out={calc:[],notes:[],missing:[]};if(!F)return{err:"اختر الفريون"};const atm=isNum(o.atm)?o.atm:101.325,mode=o.mode||"gauge";
 let ev=null,cd=null;if(isNum(o.pSuc)){ev=satFromGauge(F,o.pSuc,{mode,atm});if(ev.err)return{err:"ضغط السحب: "+ev.err};out.calc.push(["حرارة التبخير (Dew)",ev.Tdew,"°C"]);if(F.blend)out.calc.push(["حرارة التبخير (Bubble)",ev.Tbubble,"°C"])}else out.missing.push("ضغط السحب");
 if(isNum(o.pDis)){cd=satFromGauge(F,o.pDis,{mode,atm});if(cd.err)return{err:"ضغط الطرد: "+cd.err};out.calc.push(["حرارة التكثيف (Bubble)",cd.Tbubble,"°C"]);if(F.blend)out.calc.push(["حرارة التكثيف (Dew)",cd.Tdew,"°C"])}else out.missing.push("ضغط الطرد");
 if(ev&&cd){const ra=cd.pAbs/ev.pAbs;out.calc.push(["نسبة الانضغاط (مطلق)",ra,""]);if(ra<=1)out.notes.push({lvl:"bad",t:"ضغط الطرد لا يزيد عن السحب: الكباس لا يضغط (متوقف، أو تسريب داخلي، أو القراءات معكوسة)"})}
 let SH=null,SC=null;if(ev&&isNum(o.tSuc)){SH=o.tSuc-ev.Tdew;out.calc.push(["السوبرهيت SH",SH,"K"])}else out.missing.push("حرارة ماسورة السحب");
 if(cd&&isNum(o.tLiq)){SC=cd.Tbubble-o.tLiq;out.calc.push(["السابكولينج SC",SC,"K"])}else out.missing.push("حرارة خط السائل");
 if(cd&&isNum(o.tOut)){const a=cd.Tbubble-o.tOut;out.calc.push(["فرق التكثيف عن الهواء الخارجي",a,"K"])}
 if(ev&&isNum(o.tIn)){const a=o.tIn-ev.Tdew;out.calc.push(["فرق الهواء الداخل عن التبخير",a,"K"])}
 const tgt=(v,lo,hi,name)=>{if(v==null||!isNum(lo)||!isNum(hi))return;if(v<lo)out.notes.push({lvl:"warn",t:`${name} (${v.toFixed(1)} K) أقل من المدى المرجعي الذي أدخلته (${lo}–${hi})`});else if(v>hi)out.notes.push({lvl:"warn",t:`${name} (${v.toFixed(1)} K) أعلى من المدى المرجعي الذي أدخلته (${lo}–${hi})`});else out.notes.push({lvl:"ok",t:`${name} داخل المدى المرجعي الذي أدخلته`})};
 tgt(SH,o.shLo,o.shHi,"السوبرهيت");tgt(SC,o.scLo,o.scHi,"السابكولينج");
 if(SH!=null&&SH<0)out.notes.push({lvl:"bad",t:"سوبرهيت سالب: راجع القياس — أو احتمال سائل راجع للكباس"});if(SC!=null&&SC<0)out.notes.push({lvl:"bad",t:"سابكولينج سالب: خط السائل غير مبرد تحت التشبع عند نقطة القياس"});
 if((SH!=null||SC!=null)&&!(isNum(o.shLo)&&isNum(o.shHi))&&!(isNum(o.scLo)&&isNum(o.scHi)))out.notes.push({lvl:"info",t:"لم تُدخل مدى مرجعيًا للسوبرهيت/السابكولينج. القيم المستهدفة تختلف حسب نوع جهاز التمدد (كابيلاري/TXV/EEV) والحمل وتعليمات الشركة — أدخلها من بيانات الجهاز للمقارنة."});
 const hints=[];if(SH!=null&&SC!=null&&isNum(o.shLo)&&isNum(o.shHi)&&isNum(o.scLo)&&isNum(o.scHi)){const hiSH=SH>o.shHi,loSH=SH<o.shLo,hiSC=SC>o.scHi,loSC=SC<o.scLo;
  if(hiSH&&loSC)hints.push("SH مرتفع + SC منخفض: نمط يتسق مع نقص شحنة أو نقص تغذية السائل (يحتاج تأكيد: كشف تسريب، فحص الفلتر)");
  if(hiSH&&hiSC)hints.push("SH مرتفع + SC مرتفع: نمط يتسق مع تقييد في خط السائل/جهاز التمدد (كابيلاري مسدود جزئيًا، فلتر، TXV)");
  if(loSH&&hiSC)hints.push("SH منخفض + SC مرتفع: نمط يتسق مع زيادة شحنة (يحتاج تأكيد بظروف الهواء ونظافة المكثف)");
  if(loSH&&loSC)hints.push("SH منخفض + SC منخفض: نمط يتسق مع حمل منخفض على المبخر أو جهاز تمدد يغذي أكثر من اللازم أو كباس ضعيف — يحتاج فحوص أخرى")}
 if(hints.length)out.hints=hints.map(t=>({t,confidence:"منخفضة إلى متوسطة — قراءة واحدة لا تكفي للجزم"}));
 out.disclaimer="الحسابات دقيقة بحدود دقة الجدول والقياس. الاحتمالات التشخيصية أنماط عامة، وليست تشخيصًا. تأكد بفحص الهواء/الماء ونظافة المبادلات وثبات التشغيل 10–15 دقيقة على الأقل.";return out}
function table(F,step=5){if(!F)return[];const a=[],lo=Math.ceil(F.T[0]/step)*step,hi=F.T[F.T.length-1];for(let t=lo;t<=hi+1e-9;t+=step){const d=pSat(F,t,"dew"),b=pSat(F,t,"bubble");a.push({T:t,Pdew:d.P,Pbub:b.P})}return a}
const api={SEED,PU,prep,validateFluid,fluids,pSat,tSat,toAbs,toGauge,satFromGauge,superheat,subcooling,cycle,table};
if(typeof module!="undefined")module.exports=api;else g.ER=api})(typeof window!="undefined"?window:globalThis);

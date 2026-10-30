/* محرك تحليل الكباسات والكابيلاري — منطق نقي بلا DOM */
(function(g){"use strict";
const isNum=v=>typeof v=="number"&&isFinite(v),OPEN=Infinity;
const ALPHA={cu:0.00393,al:0.00403};
/* تحويل قراءة نصية: "OL" أو "∞" أو "open" = مفتوح */
function reading(v){if(v===OPEN)return OPEN;if(isNum(v))return v<0?NaN:v;const s=String(v??"").trim().toUpperCase();if(!s)return null;if(/^(OL|O\.L\.?|OPEN|INF|∞|مفتوح)$/.test(s))return OPEN;const n=Number(s.replace(",","."));return isFinite(n)&&n>=0?n:NaN}
const fmtR=r=>r===OPEN?"مفتوح (OL)":(+r.toPrecision(4))+" Ω";
/* تصحيح المقاومة المرجعية لدرجة حرارة القياس: R(Tm) = R(Tref) × (1 + α(Tm − Tref)) */
function tempCorrect(Rref,Tref,Tm,mat="cu"){if(![Rref,Tref,Tm].every(isNum))return null;return Rref*(1+(ALPHA[mat]||ALPHA.cu)*(Tm-Tref))}
/* فاحص مقاومات ملفات الكباس.
   in: {a,b,c} قراءات بين أطراف 1-2 و1-3 و2-3 (أو C-R وC-S وR-S إذا كانت الأطراف معروفة) ، known: true إذا الأطراف معروفة
   opt: {phase:1|3, tol:نسبة السماحية لاختبار المجموع، res: دقة الجهاز Ω، ref:{CR,CS,RS,Tref,mat}, Tm, refTol} */
function windings(inp,opt={}){const L=inp.known?["C-R","C-S","R-S"]:["1-2","1-3","2-3"],pairs=inp.known?[["C","R"],["C","S"],["R","S"]]:[["1","2"],["1","3"],["2","3"]];
 const r=[reading(inp.a),reading(inp.b),reading(inp.c)];if(r.some(x=>x===null))return{err:"أدخل القراءات الثلاث (اكتب OL للقراءة المفتوحة)"};if(r.some(x=>Number.isNaN(x)))return{err:"قراءة غير صالحة"};
 const tol=isNum(opt.tol)?opt.tol:0.05,res=isNum(opt.res)?opt.res:0.1,out={readings:r.map((v,i)=>({pair:L[i],v,txt:fmtR(v)})),findings:[],warnings:[],confidence:"منخفضة"};
 out.warnings.push("اختبار المقاومة لا يثبت سلامة العزل (اختبر بالميجر بين كل طرف وجسم الكباس) ولا السلامة الميكانيكية (التيار والضغوط أثناء التشغيل).","المقاومة تتغير مع الحرارة (~0.4% لكل °C للنحاس). قس والكباس بارد ومفصول تمامًا عن الكهرباء والمكثف مفرَّغ.");
 const open=r.map(x=>x===OPEN),nOpen=open.filter(Boolean).length;
 if(nOpen===3){out.status="all-open";out.findings.push("القراءات الثلاث مفتوحة: احتمالات — أوفرلود داخلي مفصول (إن كان الكباس ساخنًا: انتظر حتى يبرد ثم أعد القياس)، أو قطع في الملفات، أو أطراف متآكلة/تلامس سيئ للمجسات.");out.confidence="منخفضة — يحتاج إعادة قياس بعد التبريد";return out}
 if(nOpen===2){const fin=r.findIndex(x=>x!==OPEN),[x,y]=pairs[fin],common=pairs[(fin+1)%3].find(t=>pairs[(fin+2)%3].includes(t));out.status="two-open";
  out.findings.push(`القراءة الوحيدة السليمة بين ${x} و${y} (${fmtR(r[fin])}). كل القراءات المتصلة بالطرف ${common} مفتوحة.`);
  out.findings.push(inp.known&&common=="C"?"إذا كان للكباس أوفرلود داخلي على الطرف المشترك C فهذا النمط يتسق مع أوفرلود داخلي مفصول (غالبًا لأن الكباس ساخن). انتظر ساعة أو أكثر حتى يبرد وأعد القياس. إذا استمر: قطع في المشترك الداخلي.":`احتمال قطع في الملف المتصل بالطرف ${common}${inp.known?"":" ، أو أوفرلود داخلي مفصول إذا كان هذا الطرف هو المشترك"}.`);out.confidence="متوسطة";return out}
 if(nOpen===1){const oi=r.findIndex(x=>x===OPEN);out.status="one-open";out.findings.push(`قراءة واحدة مفتوحة (${L[oi]}) واثنتان موصلتان: نمط غير معتاد لكباس أحادي سليم (الملفان متصلان داخليًا عند المشترك). احتمالات: تلامس سيئ للمجس أثناء هذه القراءة، أو طرف مكسور/متآكل، أو قطع عند وصلة داخلية. أعد القياس أولًا.`);out.confidence="منخفضة";return out}
 /* كل القراءات موصلة */
 if(opt.phase==3){const m=(r[0]+r[1]+r[2])/3,dev=Math.max(...r.map(x=>Math.abs(x-m)/m));out.status=dev<=tol?"3ph-balanced":"3ph-unbalanced";out.mean=m;out.maxDev=dev;
  out.findings.push(dev<=tol?`الملفات الثلاثة متزنة (أقصى انحراف ${(dev*100).toFixed(1)}% ≤ ${(tol*100).toFixed(0)}%).`:`عدم اتزان ${(dev*100).toFixed(1)}% > ${(tol*100).toFixed(0)}%: احتمال قصر بين اللفات في ملف، أو وصلة سيئة. قارن بالمرجع وأعد القياس على الأطراف مباشرة.`);
  out.confidence=dev<=tol?"متوسطة (المقاومة وحدها لا تكفي)":"متوسطة";out.warnings.push("نسبة الاتزان المسموحة هنا معيار عام أدخلته أنت، وليست من الشركة.");return refCheck(out,r,L,opt)}
 const idx=[0,1,2].sort((i,j)=>r[i]-r[j]),[iLo,iMid,iHi]=idx,sum=r[iLo]+r[iMid],diff=r[iHi]-sum,allow=Math.max(tol*r[iHi],2*res);
 out.sumCheck={max:r[iHi],sum,diff,allow,ok:Math.abs(diff)<=allow};
 if(r.every(x=>x<=2*res)){out.status="all-low";out.findings.push("كل القراءات قريبة من الصفر: إما قصر شديد، أو القراءات أقل من دقة جهازك (ملفات كباس كبير). استخدم جهازًا بدقة أعلى (0.01Ω) أو طريقة الأربعة أطراف، وصفّر أسلاك الجهاز.");return refCheck(out,r,L,opt)}
 if(Math.abs(r[0]-r[1])<=allow&&Math.abs(r[1]-r[2])<=allow){out.status="looks-3ph";out.findings.push("القراءات الثلاث متساوية تقريبًا: هذا نمط كباس ثلاثي الأطوار وليس أحادي. اختر «ثلاثي الأطوار» للتحليل.");return refCheck(out,r,L,opt)}
 const [a,b]=pairs[iHi],common=pairs[iLo].find(t=>pairs[iMid].includes(t));
 if(out.sumCheck.ok){out.status="consistent";out.common=common;
  if(inp.known){const ok=pairs[iHi].includes("R")&&pairs[iHi].includes("S");out.findings.push(ok?"العلاقة سليمة: R-S ≈ C-R + C-S (فرق "+(+diff.toPrecision(3))+" Ω ضمن السماحية).":`أكبر قراءة ليست بين R وS بل ${L[iHi]}: إما الأطراف معلَّمة خطأ، أو قراءات غير طبيعية. راجع تعليم الأطراف.`);if(!ok)out.status="label-mismatch"}
  else{const run=pairs[iLo].find(t=>t!==common),start=pairs[iMid].find(t=>t!==common);out.terminals={C:common,R:run,S:start};
   out.findings.push(`الطرف المشترك C المرجّح: ${common} (لأن أكبر قراءة ${fmtR(r[iHi])} بين ${a} و${b} ≈ مجموع القراءتين الأخريين ${fmtR(sum)}).`);
   out.findings.push(`ملف التشغيل R المرجّح: الطرف ${run} (${fmtR(r[iLo])})، وملف البدء S: الطرف ${start} (${fmtR(r[iMid])}).`);
   if(r[iMid]-r[iLo]<=allow)out.warnings.push("قراءتا C-R وC-S متقاربتان جدًا: التمييز بين R وS غير مؤكد. اعتمد على تعليم لوحة الأطراف أو الداتا شيت.")}
  out.confidence=r[iMid]-r[iLo]>allow?"متوسطة إلى عالية (للتعرف على الأطراف فقط)":"منخفضة إلى متوسطة"}
 else{out.status="inconsistent";out.findings.push(`القراءات لا تحقق العلاقة (أكبر قراءة ${fmtR(r[iHi])} ${diff>0?"أكبر":"أصغر"} من مجموع الأخريين ${fmtR(sum)} بفرق ${(+Math.abs(diff).toPrecision(3))} Ω > السماحية ${(+allow.toPrecision(3))} Ω).`);
  out.findings.push(diff<0?"احتمالات: قصر جزئي بين اللفات في أحد الملفين، أو قصر بين الملفين، أو تلامس سيئ أثناء القياس. أعد القياس على الأطراف مباشرة بعد تنظيفها.":"احتمالات: مقاومة تلامس عالية/طرف متآكل في قراءة R-S، أو قراءة خاطئة. أعد القياس.");out.confidence="منخفضة"}
 return refCheck(out,r,L,opt)}
/* مقارنة بقيم الموديل المرجعية (مع تصحيح الحرارة) */
function refCheck(out,r,L,opt){const ref=opt.ref;if(!ref){out.refNote="لا توجد قيم مرجعية لهذا الموديل: لا يمكن الحكم على أن المقاومة «طبيعية». المقارنة هنا داخلية بين القراءات فقط.";return out}
 const keys=["CR","CS","RS"],tolR=isNum(opt.refTol)?opt.refTol:0.07,rows=[];
 keys.forEach((k,i)=>{const v=ref[k];if(!isNum(v)||r[i]===OPEN)return;const exp=isNum(ref.Tref)&&isNum(opt.Tm)?tempCorrect(v,ref.Tref,opt.Tm,ref.mat):v,d=(r[i]-exp)/exp;rows.push({pair:L[i],ref:v,expected:exp,measured:r[i],dev:d,ok:Math.abs(d)<=tolR})});
 out.refRows=rows;out.refNote=rows.length?`السماحية المستخدمة ±${(tolR*100).toFixed(0)}% (${isNum(opt.refTol)?"أدخلتها أنت":"قيمة افتراضية — استبدلها بسماحية الشركة إن وُجدت"})${isNum(ref.Tref)&&isNum(opt.Tm)?` بعد تصحيح الحرارة من ${ref.Tref}°C إلى ${opt.Tm}°C`:" بدون تصحيح حرارة (أدخل حرارة المرجع والقياس)"}. مصدر المرجع: ${ref.src||"غير مذكور"}.`:"القيم المرجعية لا تطابق ترتيب القراءات.";
 if(rows.some(x=>!x.ok))out.findings.push("قراءة أو أكثر خارج سماحية المرجع: "+rows.filter(x=>!x.ok).map(x=>`${x.pair} ${x.dev>0?"+":""}${(x.dev*100).toFixed(1)}%`).join("، "));
 else if(rows.length)out.findings.push("القراءات ضمن سماحية القيم المرجعية للموديل.");return out}
/* ---- مقارنة توافق كباسين (تفصيلية) ---- */
const num=v=>isNum(v)?v:(typeof v=="string"&&/^\s*\d+(\.\d+)?\s*$/.test(v)?parseFloat(v):null);
const refN=v=>{const s=String(v??"").toUpperCase().replace(/[\s\-]/g,"");return /^R\d{2,4}[A-Z]?$/.test(s)?s:""};
const appN=v=>{const s=String(v??"").toUpperCase().replace(/\s/g,"");return /^[A-Z\/]{2,6}$/.test(s)?s:""};
const capKcal=r=>{const k=num(r.kcal);if(k)return k;const b=num(r.btu);return b?b/3.96832:null};
function tcPoint(r,te){if(!r||!r.temp_capacity||typeof r.temp_capacity!="object")return null;for(const [k,v] of Object.entries(r.temp_capacity))if(Math.abs(parseFloat(k)-te)<0.05&&num(v))return num(v);return null}
function compareComps(a,b,opt={}){const rows=[],risks=[],missing=[];const T=isNum(opt.capTol)?opt.capTol:0.1;
 const add=(label,va,vb,verdict,note)=>rows.push({label,a:va??"غير متاح",b:vb??"غير متاح",verdict,note});
 const ra=refN(a.refrigerant),rb=refN(b.refrigerant);if(!ra||!rb){add("وسيط التبريد",a.refrigerant,b.refrigerant,"unknown");missing.push("وسيط التبريد")}else if(ra!==rb){add("وسيط التبريد",ra,rb,"bad");risks.push(`وسيط تبريد مختلف (${ra} ≠ ${rb}): غير قابل للاستبدال بدون تغيير منظومة كاملة وموافقة الشركة`)}else add("وسيط التبريد",ra,rb,"ok");
 const aa=appN(a.application),ab=appN(b.application);if(!aa||!ab){add("التطبيق LBP/MBP/HBP",a.application,b.application,"unknown");missing.push("التطبيق")}else if(aa!==ab){add("التطبيق",aa,ab,"bad");risks.push(`تطبيق مختلف (${aa} ≠ ${ab}): مدى حرارة التبخير وعزم البدء مختلفان`)}else add("التطبيق",aa,ab,"ok");
 const fa=num(a.freq),fb=num(b.freq);if(!fa||!fb){add("التردد Hz",fa,fb,"unknown");missing.push("التردد")}else if(fa!==fb){add("التردد Hz",fa,fb,"bad");risks.push("تردد مختلف: السرعة والقدرة والتيار تتغير")}else add("التردد Hz",fa,fb,"ok");
 const va=a.voltage_frequency||null,vb=b.voltage_frequency||null;if(va&&vb)add("الجهد والتردد",va,vb,String(va).replace(/\s/g,"")==String(vb).replace(/\s/g,"")?"ok":"warn");else{add("الجهد والتردد",va,vb,"unknown");missing.push("الجهد")}
 const ca=capKcal(a),cb=capKcal(b);if(!ca||!cb){add("قدرة التبريد (kcal/h)",ca,cb,"unknown");missing.push("قدرة التبريد")}else{const d=(cb-ca)/ca;add("قدرة التبريد (kcal/h)",+ca.toFixed(1),+cb.toFixed(1),Math.abs(d)<=T?"ok":"warn",`${d>=0?"+":""}${(d*100).toFixed(1)}%`);if(Math.abs(d)>T)risks.push(`فرق قدرة التبريد ${(d*100).toFixed(1)}% (> ±${T*100}%): ${d>0?"قد يرتفع الضغط والتيار ويحتاج مراجعة الكابيلاري/المكثف":"تبريد أضعف وتشغيل أطول"}`);diffsCond(a,b,risks)}
 const common=a.temp_capacity&&b.temp_capacity?Object.keys(a.temp_capacity).filter(k=>tcPoint(b,parseFloat(k))!=null):[];common.slice(0,6).forEach(k=>{const x=tcPoint(a,parseFloat(k)),y=tcPoint(b,parseFloat(k));if(x&&y)add(`السعة عند تبخير ${k}°C (W)`,x,y,Math.abs(y/x-1)<=T?"ok":"warn",`${y>=x?"+":""}${((y/x-1)*100).toFixed(1)}%`)});
 const da=num(a.displacement),db=num(b.displacement);if(da&&db)add("الإزاحة cc",da,db,Math.abs(db/da-1)<=0.08?"ok":"warn",`${((db/da-1)*100).toFixed(1)}%`);else missing.push("الإزاحة");
 const ia=num(a.amp),ib=num(b.amp);if(ia&&ib){add("التيار A",ia,ib,Math.abs(ib/ia-1)<=0.15?"ok":"warn",`${((ib/ia-1)*100).toFixed(1)}%`);if(ib/ia>1.15)risks.push("تيار البديل أعلى بوضوح: راجع الأوفرلود والريليه/الـPTC والمكثف والكابل")}else missing.push("التيار");
 const ha=a.hp,hb=b.hp;add("القدرة الحصانية (للمعلومة فقط)",ha,hb,"info","لا يُعتمد عليها وحدها في الاختيار");
 if(a.oil_qty||b.oil_qty)add("كمية الزيت",a.oil_qty,b.oil_qty,"info");
 if(a.run_capacitor||b.run_capacitor)add("مكثف التشغيل",a.run_capacitor,b.run_capacitor,a.run_capacitor&&b.run_capacitor&&a.run_capacitor!==b.run_capacitor?"warn":"info");
 const bad=rows.some(r=>r.verdict=="bad"),core=["وسيط التبريد","التطبيق","التردد","قدرة التبريد"].filter(x=>missing.includes(x));
 const verdict=bad?"غير مناسب كبديل مباشر":core.length?"التوافق غير محسوم — بيانات أساسية ناقصة: "+core.join("، "):risks.length?"تشابه مع فروق تحتاج مراجعة":"تشابه في البيانات المتاحة — ليس ضمان توافق";
 return{rows,risks,missing,verdict,level:bad?"bad":core.length?"unknown":risks.length?"warn":"ok",note:"المقارنة من البيانات المسجلة فقط. اختيار البديل يحتاج ظروف التشغيل الفعلية ومواصفات الجهاز وموافقة الشركة عند الإمكان. الحصان وحده لا يكفي أبدًا."}}
function diffsCond(a,b,risks){if(a.cond&&b.cond&&a.cond!==b.cond)risks.push("ظروف قياس قدرة التبريد مختلفة بين المرجعين: المقارنة تقريبية")}
/* ---- الكابيلاري ---- */
const IN=25.4;
function capRecord(x){if(!x||typeof x!="object")return null;const id=+x.id_mm||(+x.id_in?+x.id_in*IN:NaN),L=+x.length_m;if(!(id>0&&id<5)||!(L>0&&L<20))return null;
 const s=(v,n=120)=>String(v??"").slice(0,n).trim();return{key:s(x.key,40)||("cap"+Math.random().toString(36).slice(2,8)),id_mm:+id.toFixed(4),od_mm:+x.od_mm>0?+x.od_mm:null,length_m:L,refrigerant:s(x.refrigerant,20),application:s(x.application,20),compModel:s(x.compModel),compCap:s(x.compCap,60),te:isNum(+x.te)&&x.te!==""&&x.te!=null?+x.te:null,tc:isNum(+x.tc)&&x.tc!==""&&x.tc!=null?+x.tc:null,device:s(x.device,80),brand:s(x.brand,60),model:s(x.model,80),conditions:s(x.conditions,300),status:s(x.srcClass||x.status,20)||"incomplete",src:s(x.srcRef||x.src,300),url:/^https?:\/\//.test(x.srcUrl||"")?s(x.srcUrl,500):"",date:s(x.srcDate||x.date,10),note:s(x.note,300)}}
/* مقارنة كابيلاري حالي بمرجع: فروق نسبية + اتجاه التأثير (نوعي). تقدير الطول المكافئ تقريبي فقط ومعروض كمدى */
function capCompare(cur,ref){if(![cur&&cur.id_mm,cur&&cur.length_m,ref&&ref.id_mm,ref&&ref.length_m].every(x=>isNum(x)&&x>0))return{err:"أدخل القطر الداخلي والطول للحالي والمرجع"};
 const dD=(cur.id_mm-ref.id_mm)/ref.id_mm,dL=(cur.length_m-ref.length_m)/ref.length_m,eff=[];
 if(Math.abs(dD)<0.005)eff.push("القطر مطابق للمرجع.");else eff.push(dD>0?`القطر أكبر من المرجع بنسبة ${(dD*100).toFixed(1)}%: مقاومة أقل للسريان ← تدفق أكبر، ضغط سحب أعلى، سوبرهيت أقل، واحتمال رجوع سائل/تبريد أضعف للفريزر.`:`القطر أصغر من المرجع بنسبة ${(-dD*100).toFixed(1)}%: مقاومة أعلى ← تدفق أقل، ضغط سحب أقل، سوبرهيت أعلى، ونقص تغذية المبخر.`);
 if(Math.abs(dL)<0.01)eff.push("الطول مطابق للمرجع.");else eff.push(dL>0?`الطول أطول بنسبة ${(dL*100).toFixed(1)}%: مقاومة أعلى ← تدفق أقل.`:`الطول أقصر بنسبة ${(-dL*100).toFixed(1)}%: مقاومة أقل ← تدفق أكبر.`);
 eff.push("تأثير القطر أقوى بكثير من تأثير الطول: فرق صغير في القطر يعادل فرقًا كبيرًا في الطول.");
 const eq=[4.6,5.2].map(n=>ref.length_m*Math.pow(cur.id_mm/ref.id_mm,n));
 return{dD,dL,effects:eff,equivLen:{min:Math.min(...eq),max:Math.max(...eq),note:"تقدير هندسي تقريبي جدًا: طول يعطي مقاومة مماثلة بالقطر الحالي، بافتراض أن التدفق يتناسب تقريبًا مع D^2.3–2.6 ÷ L^0.5 لنفس الضغوط. ليس توصية تركيب: التوصية تحتاج بيانات الكباس وظروف التشغيل والشحنة ومبادل السحب. ثقة منخفضة."},confidence:"الاتجاه النوعي: عالية · القيمة العددية للطول المكافئ: منخفضة"}}
function capSearch(list,q){const L=(list||[]).map(capRecord).filter(Boolean);return L.filter(r=>(!q.refrigerant||r.refrigerant.toUpperCase().replace(/[\s-]/g,"")==String(q.refrigerant).toUpperCase().replace(/[\s-]/g,""))&&(!q.application||r.application.toUpperCase().includes(String(q.application).toUpperCase()))&&(!isNum(q.id_mm)||Math.abs(r.id_mm-q.id_mm)<=0.03)&&(!q.text||(r.compModel+" "+r.brand+" "+r.model+" "+r.device).toLowerCase().includes(String(q.text).toLowerCase())))}
const api={reading,OPEN,tempCorrect,windings,compareComps,capRecord,capCompare,capSearch,IN,refN,appN,capKcal};
if(typeof module!="undefined")module.exports=api;else g.EC=api})(typeof window!="undefined"?window:globalThis);

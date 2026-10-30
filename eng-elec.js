/* محرك الحسابات الكهربائية — منطق نقي بلا DOM. كل دالة ترجع: القيم + المعادلة + الافتراضات + حدود الصلاحية، أو {err}. */
(function(g){"use strict";
const isNum=v=>typeof v=="number"&&isFinite(v),given=v=>v!==null&&v!==undefined&&v!=="";
const p=(v,n=6)=>+(+v).toPrecision(n);
/* ---- قانون أوم + القدرة: أي قيمتين من V, I, R, P (حمل مقاومي أو DC) ---- */
function ohm4(o){const k=["V","I","R","P"],h=k.filter(x=>given(o[x]));if(h.length!==2)return{err:"أدخل قيمتين فقط من الأربعة (V, I, R, P)"};
 for(const x of h)if(!isNum(o[x]))return{err:"قيمة غير صالحة في "+x};for(const x of h)if(o[x]<0)return{err:"القيم السالبة غير مدعومة"};
 if(given(o.R)&&o.R===0)return{err:"مقاومة صفر = قصر؛ لا يمكن الحساب"};
 let {V,I,R,P}=o,f;const H=h.join("");
 if(H=="VI"){R=I?V/I:null;P=V*I;f="R = V ÷ I ; P = V × I";if(!I)return{err:"التيار صفر: لا يمكن حساب R (دائرة مفتوحة)"}}
 else if(H=="VR"){I=V/R;P=V*V/R;f="I = V ÷ R ; P = V² ÷ R"}
 else if(H=="VP"){if(!V)return{err:"الجهد صفر"};I=P/V;R=V*V/P;if(!P)return{err:"القدرة صفر: المقاومة لا نهائية"};f="I = P ÷ V ; R = V² ÷ P"}
 else if(H=="IR"){V=I*R;P=I*I*R;f="V = I × R ; P = I² × R"}
 else if(H=="IP"){if(!I)return{err:"التيار صفر"};V=P/I;R=P/(I*I);f="V = P ÷ I ; R = P ÷ I²"}
 else if(H=="RP"){V=Math.sqrt(P*R);I=Math.sqrt(P/R);f="V = √(P × R) ; I = √(P ÷ R)"}
 return{V,I,R,P,formula:f,assume:"حمل مقاومي صرف أو تيار مستمر. في المتردد مع موتور أو ملف استخدم حاسبة القدرة بمعامل القدرة.",units:{V:"V",I:"A",R:"Ω",P:"W"}}}
/* ---- القدرة الظاهرة والحقيقية وغير الفعالة ---- */
function power({mode,V,I,pf}){if(![V,I].every(x=>isNum(x)&&x>=0))return{err:"الجهد والتيار يجب أن يكونا رقمين غير سالبين"};
 if(mode=="dc")return{P:V*I,formula:"P = V × I",assume:"تيار مستمر: لا يوجد معامل قدرة"};
 if(mode!="ac1"&&mode!="ac3")return{err:"نمط غير معروف"};if(!isNum(pf)||pf<=0||pf>1)return{err:"معامل القدرة بين 0 (غير شامل) و1"};
 const S=(mode=="ac3"?Math.sqrt(3):1)*V*I,P=S*pf,Q=Math.sqrt(Math.max(0,S*S-P*P));
 return{S,P,Q,phi:Math.acos(pf)*180/Math.PI,formula:mode=="ac3"?"S = √3 × V(خط-خط) × I ; P = S × PF ; Q = √(S² − P²)":"S = V × I ; P = S × PF ; Q = √(S² − P²)",assume:`PF = ${pf}؛ قيم RMS؛ موجة جيبية${mode=="ac3"?"؛ حمل ثلاثي متزن والجهد بين خطين":""}. لا يصلح للأحمال الإلكترونية ذات التوافقيات العالية (إنفرتر) بدون عداد قدرة حقيقي.`}}
/* ---- معامل القدرة من القياس (وات ميتر + أمبير + فولت) ---- */
function pfFromMeasure({P,V,I,phase}){if(![P,V,I].every(x=>isNum(x)&&x>0))return{err:"أدخل P وV وI موجبة"};const S=(phase==3?Math.sqrt(3):1)*V*I,pf=P/S;
 if(pf>1.02)return{err:`PF المحسوب ${p(pf,4)} > 1: القراءات غير متسقة (راجع الوحدات أو طريقة القياس)`};
 return{S,pf:Math.min(pf,1),Q:Math.sqrt(Math.max(0,S*S-P*P)),phi:Math.acos(Math.min(pf,1))*180/Math.PI,formula:`PF = P ÷ S = ${P} ÷ ${p(S)}`,assume:"PF هنا = معامل القدرة الكلي (يشمل التوافقيات إن وجدت)"}}
/* ---- توالي وتوازي ---- */
const listOk=a=>Array.isArray(a)&&a.length>=1&&a.every(x=>isNum(x)&&x>0);
function resSeries(a){if(!listOk(a))return{err:"أدخل قيمة مقاومة موجبة واحدة على الأقل"};return{value:a.reduce((s,x)=>s+x,0),formula:"R = R1 + R2 + …"}}
function resParallel(a){if(!listOk(a))return{err:"أدخل قيمة مقاومة موجبة واحدة على الأقل"};return{value:1/a.reduce((s,x)=>s+1/x,0),formula:"1/R = 1/R1 + 1/R2 + …"}}
function capParallel(a){if(!listOk(a))return{err:"أدخل سعة موجبة واحدة على الأقل"};return{value:a.reduce((s,x)=>s+x,0),formula:"C = C1 + C2 + … (التوازي يجمع السعة)",assume:"جهد التحمل للمجموعة = أقل جهد تحمل بين المكثفات"}}
function capSeries(a){if(!listOk(a))return{err:"أدخل سعة موجبة واحدة على الأقل"};return{value:1/a.reduce((s,x)=>s+1/x,0),formula:"1/C = 1/C1 + 1/C2 + …",assume:"توزيع الجهد على مكثفات التوالي غير متساوٍ إن اختلفت السعات أو التسريب؛ لا تعتمد على جمع جهود التحمل"}}
/* ---- مقسم الجهد ---- */
function divider({Vin,R1,R2,RL}){if(![Vin,R1,R2].every(isNum)||R1<=0||R2<=0)return{err:"أدخل Vin وR1 وR2 (R1 وR2 موجبة)"};let r2=R2,f="Vout = Vin × R2 ÷ (R1 + R2)";
 if(given(RL)){if(!isNum(RL)||RL<=0)return{err:"مقاومة الحمل يجب أن تكون موجبة"};r2=R2*RL/(R2+RL);f="R2' = R2 ∥ RL ; Vout = Vin × R2' ÷ (R1 + R2')"}
 const Vout=Vin*r2/(R1+r2),I=Vin/(R1+r2);return{Vout,I,P1:I*I*R1,P2:Vout*Vout/R2,formula:f,assume:"مقاومات ثابتة، مصدر جهد مثالي"}}
/* ---- الطاقة والاستهلاك ---- */
function energy({P,hours,days,duty,price}){if(!isNum(P)||P<0)return{err:"أدخل القدرة بالوات"};if(!isNum(hours)||hours<0||hours>24)return{err:"ساعات التشغيل يوميًا بين 0 و24"};
 const d=isNum(days)&&days>0?days:30,dt=isNum(duty)?duty:100;if(dt<0||dt>100)return{err:"نسبة التشغيل الفعلي بين 0 و100%"};
 const kwhDay=P*hours*dt/100/1000,kwh=kwhDay*d;return{kwhDay,kwh,cost:isNum(price)&&price>=0?kwh*price:null,formula:`kWh = P(W) × ساعات × نسبة التشغيل ÷ 1000 × ${d} يوم`,assume:"القدرة متوسطة ثابتة. الكباس يفصل ويشتغل؛ أدخل نسبة التشغيل الفعلية إن عرفتها. سعر الكيلووات المتدرج (الشرائح) غير محسوب هنا."}}
/* ---- التيار المتوقع لحمل ---- */
function expectedCurrent({P,V,pf,phase,eff}){if(![P,V].every(x=>isNum(x)&&x>0))return{err:"أدخل القدرة والجهد"};const PF=isNum(pf)?pf:1,EF=isNum(eff)?eff:1;if(PF<=0||PF>1||EF<=0||EF>1)return{err:"PF والكفاءة بين 0 و1"};
 const I=P/((phase==3?Math.sqrt(3):1)*V*PF*EF);return{I,formula:phase==3?"I = P ÷ (√3 × V × PF × η)":"I = P ÷ (V × PF × η)",assume:`P = ${eff?"القدرة الميكانيكية الخارجة (لذلك قُسمت على الكفاءة)":"القدرة الكهربائية الداخلة"}. تيار البدء للموتورات أكبر بكثير (عادة عدة أضعاف) ولا يُحسب هنا.`}}
/* ---- مقاومة الأحمال (سخان مثلًا) من القدرة المقننة ---- */
function loadResistance({P,V}){if(![P,V].every(x=>isNum(x)&&x>0))return{err:"أدخل القدرة والجهد المقننين"};const R=V*V/P;return{R,I:P/V,formula:"R = V² ÷ P",assume:"للأحمال المقاومية (سخانات) فقط. المقاومة المقاسة على البارد قد تختلف قليلًا عن قيمة التشغيل الساخن حسب نوع السلك. لا تنطبق على الموتورات."}}
/* ---- هبوط الجهد ومقطع الكابل ---- */
const COND={cu:{t:"نحاس",rho20:0.017241,alpha:0.00393,src:"IEC 60028: نحاس مُلدَّن 1/58 Ω·mm²/m عند 20°C"},al:{t:"ألومنيوم",rho20:0.028264,alpha:0.00403,src:"IEC 60889: ألومنيوم 61% IACS عند 20°C"}};
const STD=[1,1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300];
const rhoAt=(m,t)=>COND[m].rho20*(1+COND[m].alpha*(t-20));
function vdrop({mat,S,L,I,V,phase,pf,temp,xPerKm}){if(!COND[mat])return{err:"اختر مادة الموصل"};if(![S,L,I,V].every(x=>isNum(x)&&x>0))return{err:"أدخل المقطع والطول والتيار والجهد (موجبة)"};
 const T=isNum(temp)?temp:70,PF=isNum(pf)?pf:1;if(PF<=0||PF>1)return{err:"PF بين 0 و1"};if(T<-20||T>250)return{err:"درجة حرارة الموصل خارج النطاق"};
 const r=rhoAt(mat,T)/S,x=isNum(xPerKm)&&xPerKm>=0?xPerKm/1000:0,sin=Math.sqrt(1-PF*PF),k=phase==3?Math.sqrt(3):2;
 const dv=k*L*I*(r*PF+x*sin);return{dv,pct:dv/V*100,rPerM:r,formula:`ΔV = ${phase==3?"√3":"2"} × L × I × (R'×cosφ + X'×sinφ) ; R' = ρ(${T}°C) ÷ S`,assume:`ρ20 = ${COND[mat].rho20} Ω·mm²/m (${COND[mat].src})، معامل الحرارة ${COND[mat].alpha}/°C عند ${T}°C. ${x?"":"المفاعلة X مهملة (مقبول للمقاطع الصغيرة؛ أدخلها للمقاطع الكبيرة)."} L = طول المسار في اتجاه واحد. ${phase==3?"ΔV كنسبة من جهد الخط.":"المعامل 2 للذهاب والعودة."}`}}
/* المقطع الأدنى بشرط هبوط الجهد فقط */
function minSectionVD({mat,L,I,V,phase,pf,temp,maxPct}){if(!COND[mat])return{err:"اختر مادة الموصل"};if(![L,I,V,maxPct].every(x=>isNum(x)&&x>0))return{err:"أدخل الطول والتيار والجهد ونسبة الهبوط المسموحة"};
 const T=isNum(temp)?temp:70,PF=isNum(pf)?pf:1,k=phase==3?Math.sqrt(3):2,dvMax=V*maxPct/100,Smin=k*L*I*PF*rhoAt(mat,T)/dvMax;
 const std=STD.find(s=>s>=Smin-1e-9);return{Smin,std:std||null,formula:`S ≥ ${phase==3?"√3":"2"} × L × I × cosφ × ρ ÷ ΔVmax`,assume:"شرط هبوط الجهد فقط، بإهمال المفاعلة. هذا ليس المقطع النهائي."}}
/* اختيار مقطع: يجمع شرط هبوط الجهد + سعة التيار من جدول مُعتمد (إن وُجد) + معاملات التصحيح. بدون جدول = غير محسوم */
function cableSelect(o,table){const vd=minSectionVD(o);if(vd.err)return vd;const checks=[],kt=[o.kTemp,o.kGroup,o.kOther].map(x=>isNum(x)?x:null);
 if(kt.some(x=>x!==null&&(x<=0||x>1.5)))return{err:"معاملات التصحيح يجب أن تكون بين 0 و1.5"};const K=kt.reduce((a,b)=>a*(b===null?1:b),1),missingK=kt.map((x,i)=>x===null?["درجة الحرارة","تجميع الدوائر","أخرى"][i]:null).filter(Boolean);
 const rows=(table&&Array.isArray(table.rows)?table.rows:[]).filter(r=>isNum(r[0])&&isNum(r[1])&&r[0]>0&&r[1]>0).sort((a,b)=>a[0]-b[0]);
 let amp=null;if(rows.length){const need=o.I/K,r=rows.find(r=>r[1]>=need);amp=r?{S:r[0],Iz:r[1],need,K}:{none:true,need,K}}
 const cand=Math.max(vd.std||Infinity,amp&&amp.S?amp.S:0);
 checks.push({ok:true,t:`شرط هبوط الجهد ≤ ${o.maxPct}% يحتاج ${p(vd.Smin,3)} mm² ← أقرب مقطع قياسي ${vd.std??"خارج الجدول القياسي"} mm²`});
 if(!rows.length)checks.push({ok:null,t:"سعة التيار غير محسومة: لا يوجد جدول سعات معتمد لطريقة التمديد هذه. أضف جدولًا من الكود المصري أو كتالوج الكابل من «الإدارة»."});
 else if(amp.none)checks.push({ok:false,t:`لا يوجد مقطع في الجدول «${table.name||""}» يتحمل ${p(amp.need,4)} A بعد التصحيح`});
 else checks.push({ok:true,t:`سعة التيار من جدول «${table.name||""}»: ${amp.S} mm² يتحمل ${amp.Iz} A ≥ ${p(amp.need,4)} A (= ${o.I} ÷ ${p(K,4)})`});
 if(missingK.length)checks.push({ok:null,t:"معاملات تصحيح لم تُدخل (اعتُبرت 1): "+missingK.join("، ")});
 checks.push({ok:null,t:"لم يُتحقق منها هنا: تنسيق الحماية (Ib ≤ In ≤ Iz)، تحمل القصر، تيار البدء للموتورات، متطلبات الكود المحلي."});
 const decided=!!rows.length&&amp&&!amp.none&&!missingK.length&&isFinite(cand);
 return{vd,amp,candidate:isFinite(cand)?cand:null,decided:false,partial:decided,checks,note:"النتيجة «مقطع مرشح» وليست مقطعًا نهائيًا. القرار النهائي بعد مراجعة الحماية والكود المعمول به."}}
function cleanAmpTable(t){if(!t||typeof t!="object")return null;const rows=Array.isArray(t.rows)?t.rows.filter(r=>Array.isArray(r)&&isNum(+r[0])&&isNum(+r[1])&&+r[0]>0&&+r[1]>0).map(r=>[+r[0],+r[1]]).slice(0,40):[];if(!rows.length)return null;
 return{id:String(t.id||"").replace(/[^\w-]/g,"").slice(0,40)||("t"+Date.now().toString(36)),name:String(t.name||"").slice(0,120),mat:t.mat=="al"?"al":"cu",method:String(t.method||"").slice(0,60),insulation:String(t.insulation||"").slice(0,30),loaded:+t.loaded||null,ambient:+t.ambient||null,status:String(t.status||"manual").slice(0,20),src:String(t.src||"").slice(0,300),rows}}
const api={ohm4,power,pfFromMeasure,resSeries,resParallel,capSeries,capParallel,divider,energy,expectedCurrent,loadResistance,COND,STD,rhoAt,vdrop,minSectionVD,cableSelect,cleanAmpTable};
if(typeof module!="undefined")module.exports=api;else g.EE=api})(typeof window!="undefined"?window:globalThis);

/* محرك تحليل الضفائر (Harness Mapper) — منطق نقي بلا DOM.
   الفني يسجل نقاط الضفيرة (أطراف الكونكتورات وأطراف السلوك الحرة) وقياسات الاستمرارية بين أزواج منها،
   والمحرك يستنتج: المجموعات الموصلة (Nets)، العناصر بين المجموعات (مقاومة محددة)، التعارضات، العلاقات المعروفة ضمنيًا،
   القياس التالي الأكثر فائدة، ونسبة الاكتمال. لا يخمن توصيلًا لم يُقَس: كل علاقة إما مقاسة أو مستنتجة بالمنطق أو «غير معروفة». */
(function(g){"use strict";
const isNum=v=>typeof v=="number"&&isFinite(v);
const COLORS=["أحمر","أسود","أبيض","أزرق","بني","رمادي","أصفر","أخضر","أصفر/أخضر","برتقالي","بنفسجي","وردي","أزرق فاتح","أخرى"];
const CHEX={"أحمر":"#d32f2f","أسود":"#212121","أبيض":"#f5f5f5","أزرق":"#1565c0","بني":"#6d4c41","رمادي":"#9e9e9e","أصفر":"#fbc02d","أخضر":"#2e7d32","أصفر/أخضر":"#9ccc65","برتقالي":"#ef6c00","بنفسجي":"#7b1fa2","وردي":"#ec407a","أزرق فاتح":"#4fc3f7","أخرى":"#90a4ae"};
/* قراءة قياس: "0" أو "قصر" = موصل ، "OL" = مفتوح ، رقم = مقاومة */
function parseReading(v){if(v==="short"||v==="open")return v;if(isNum(v))return v<0?null:v;const s=String(v??"").trim().toUpperCase();if(!s)return null;if(/^(OL|O\.L\.?|OPEN|∞|مفتوح)$/.test(s))return"open";if(/^(SHORT|موصل|قصر|بيب|BEEP)$/.test(s))return"short";const n=Number(s.replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(",","."));return isFinite(n)&&n>=0?n:null}
function UF(ids){const p=new Map(ids.map(i=>[i,i]));const f=x=>{let r=x;while(p.get(r)!==r)r=p.get(r);while(p.get(x)!==r){const n=p.get(x);p.set(x,r);x=n}return r};return{f,u:(a,b)=>{a=f(a);b=f(b);if(a!==b)p.set(a,b);return a!==b}}}
/* التحليل الكامل. opt.shortMax = أعلى مقاومة تُعتبر سلكًا مباشرًا (افتراضي 1 Ω) */
function analyze(h,opt={}){const pts=(h&&Array.isArray(h.points)?h.points:[]).filter(p=>p&&typeof p.id=="string"),ids=pts.map(p=>p.id),idset=new Set(ids),smax=isNum(opt.shortMax)?opt.shortMax:1;
 const meas=(h&&Array.isArray(h.meas)?h.meas:[]).map((m,i)=>({...m,i,r:parseReading(m.v)})).filter(m=>idset.has(m.a)&&idset.has(m.b)&&m.a!==m.b&&m.r!==null);
 const kind=m=>m.r==="short"||isNum(m.r)&&m.r<=smax?"short":m.r==="open"?"open":"res";
 const uf=UF(ids);meas.filter(m=>kind(m)=="short").forEach(m=>uf.u(m.a,m.b));
 const netOf=new Map(),nets=[];ids.forEach(id=>{const r=uf.f(id);if(!netOf.has(r)){netOf.set(r,nets.length);nets.push({id:"N"+(nets.length+1),points:[]})}nets[netOf.get(r)].points.push(id)});
 const N=id=>netOf.get(uf.f(id)),conflicts=[],links=[],rel=new Map(),key=(x,y)=>x<y?x+"|"+y:y+"|"+x;
 meas.forEach(m=>{const a=N(m.a),b=N(m.b),k=kind(m);if(a===b){if(k!="short")conflicts.push({type:k=="open"?"open-in-net":"res-in-net",m,msg:`القياس بين ${lab(pts,m.a)} و${lab(pts,m.b)} = ${k=="open"?"مفتوح":m.r+" Ω"}، لكن قياسات أخرى تقول إنهما على نفس السلك. أعد القياس (تلامس سيئ أو خطأ تسجيل).`,chain:chain(meas,kind,m.a,m.b)})}
  else{const kk=key(a,b),cur=rel.get(kk);if(!cur)rel.set(kk,{a,b,k,vals:k=="res"?[m.r]:[],ms:[m]});else{cur.ms.push(m);if(cur.k!==k){if(cur.k=="open"&&k=="res"||cur.k=="res"&&k=="open")conflicts.push({type:"open-vs-res",m,msg:`بين المجموعتين ${nets[a].id} و${nets[b].id}: قياس «مفتوح» وقياس «${k=="res"?m.r:cur.vals[0]} Ω». قد تكون القراءة لعنصر يعتمد على الاتجاه (دايود) أو تلامس سيئ.`});if(k=="res")cur.vals.push(m.r)}else if(k=="res")cur.vals.push(m.r)}}});
 rel.forEach(r=>{if(r.k=="res"||r.vals.length){const vs=r.vals,mn=Math.min(...vs),mx=Math.max(...vs);if(vs.length>1&&mx>mn*1.1+0.5)conflicts.push({type:"res-spread",msg:`قراءات مقاومة مختلفة بين ${nets[r.a].id} و${nets[r.b].id}: ${vs.join(" ، ")} Ω`});links.push({a:r.a,b:r.b,R:vs.reduce((s,x)=>s+x,0)/vs.length,n:vs.length})}});
 const nN=nets.length,totalPairs=nN*(nN-1)/2,known=rel.size,unknown=[];for(let i=0;i<nN;i++)for(let j=i+1;j<nN;j++)if(!rel.has(key(i,j)))unknown.push([i,j]);
 /* المسافة المتبقية: لو كل الأزواج غير المعروفة مفتوحة فالخريطة مكتملة؛ نقترح الأهم أولًا */
 const P=id=>pts.find(p=>p.id==id),sug=[];unknown.forEach(([i,j])=>{const A=nets[i].points.map(P),B=nets[j].points.map(P);let best=null;
  for(const x of A)for(const y of B){let s=0,why=[];if(x.color&&y.color&&x.color==y.color&&x.color!="أخرى"){s+=3;why.push("نفس لون السلك")}if(x.conn&&y.conn&&x.conn!==y.conn){s+=1;why.push("كونكتوران مختلفان")}if(x.conn&&y.conn&&x.conn===y.conn)s-=1;if(!best||s>best.s)best={a:x.id,b:y.id,s,why}}
  sug.push({...best,nets:[nets[i].id,nets[j].id]})});sug.sort((x,y)=>y.s-x.s);
 nets.forEach((n,i)=>{n.size=n.points.length;n.colors=[...new Set(n.points.map(id=>P(id).color).filter(Boolean))];if(n.colors.length>1)n.colorNote="ألوان مختلفة على نفس المجموعة (طبيعي في الوصلات/الكونكتورات الوسيطة، أو خطأ قياس)"});
 const done=totalPairs?known/totalPairs:1;
 return{nets,links,conflicts,unknown:unknown.length,totalPairs,known,completion:done,suggestions:sug.slice(0,10),netOfPoint:Object.fromEntries(ids.map(id=>[id,nets[N(id)].id])),measured:meas.length,
  note:"المجموعة (Net) = نقاط بينها استمرارية ≤ "+smax+" Ω (سلك مباشر). «عنصر بين مجموعتين» = قراءة أكبر من ذلك (ملف/سخان/حساس...). الأزواج غير المقاسة تبقى «غير معروفة» ولا تُعتبر مفتوحة إلا بعد قياسها."}}
const lab=(pts,id)=>{const p=pts.find(x=>x.id==id);return p?p.label+(p.color?" ("+p.color+")":""):id};
/* سلسلة القياسات التي جعلت نقطتين في نفس المجموعة (لشرح التعارض) */
function chain(meas,kind,a,b){const adj=new Map();meas.filter(m=>kind(m)=="short").forEach(m=>{[[m.a,m.b],[m.b,m.a]].forEach(([x,y])=>{if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y)})});const prev=new Map([[a,null]]),q=[a];while(q.length){const u=q.shift();if(u===b)break;for(const v of adj.get(u)||[])if(!prev.has(v)){prev.set(v,u);q.push(v)}}if(!prev.has(b))return[];const L=[];let v=b;while(v!==null){L.unshift(v);v=prev.get(v)}return L}
/* إنشاء نقاط كونكتور */
function connPoints(name,n,start=1){const N=Math.max(1,Math.min(60,+n||1)),nm=String(name||"CN").trim().slice(0,20)||"CN";return Array.from({length:N},(_,i)=>({id:(nm+"-"+(start+i)).replace(/[^\w؀-ۿ-]/g,"_"),label:nm+"-"+(start+i),conn:nm,pin:start+i,color:""}))}
function validate(h){const e=[];if(!h||typeof h!="object")return["ليس ملف ضفيرة"];if(!Array.isArray(h.points))e.push("points مطلوبة");if(!Array.isArray(h.meas))e.push("meas مطلوبة");if(e.length)return e;const ids=new Set();h.points.forEach((p,i)=>{if(!p||typeof p.id!="string"||!p.id)e.push(`نقطة ${i+1}: معرف ناقص`);else if(ids.has(p.id))e.push("نقطة مكررة: "+p.id);else ids.add(p.id)});h.meas.forEach((m,i)=>{if(!m||!ids.has(m.a)||!ids.has(m.b))e.push(`قياس ${i+1}: نقطة غير موجودة`);else if(parseReading(m.v)===null)e.push(`قياس ${i+1}: قراءة غير صالحة`)});return e}
function clean(h){return{id:String(h.id||"").replace(/[^\w-]/g,"").slice(0,40)||("h"+Date.now().toString(36)),name:String(h.name||"ضفيرة").slice(0,100),device:String(h.device||"").slice(0,100),note:String(h.note||"").slice(0,600),shortMax:isNum(+h.shortMax)&&+h.shortMax>0?+h.shortMax:1,
 points:h.points.slice(0,400).map(p=>({id:String(p.id).slice(0,40),label:String(p.label||p.id).slice(0,40),conn:String(p.conn||"").slice(0,20),pin:isNum(+p.pin)?+p.pin:null,color:COLORS.includes(p.color)?p.color:"",side:String(p.side||"").slice(0,40),note:String(p.note||"").slice(0,120)})),
 meas:h.meas.slice(0,3000).map(m=>({a:String(m.a),b:String(m.b),v:parseReading(m.v),t:String(m.t||"").slice(0,30)})).filter(m=>m.v!==null),updated:new Date().toISOString()}}
/* تحويل الخريطة لدائرة في المحاكي: كل نقطة = نقطة توصيل باسمها ولونها، أسلاك داخل كل مجموعة، ومقاومة لكل عنصر بين مجموعتين */
function toCircuit(h,res){const r=res||analyze(h,{shortMax:h.shortMax}),comps=[],wires=[],conns=[...new Set(h.points.map(p=>p.conn||"أطراف حرة"))],colX={};conns.forEach((c,i)=>colX[c]=80+i*200);const rowY={};let wi=0;
 h.points.forEach(p=>{const c=p.conn||"أطراف حرة";rowY[c]=(rowY[c]||0)+1;comps.push({id:"P_"+p.id.replace(/[^\w-]/g,"_").slice(0,26),type:"junction",name:p.label+(p.color?" "+p.color:""),x:colX[c],y:60+rowY[c]*60})});
 const cid=id=>"P_"+id.replace(/[^\w-]/g,"_").slice(0,26);
 r.nets.forEach(n=>{for(let i=1;i<n.points.length;i++)wires.push({id:"w"+(++wi),a:{c:cid(n.points[i-1]),t:"n"},b:{c:cid(n.points[i]),t:"n"}})});
 r.links.forEach((l,i)=>{const A=r.nets[l.a].points[0],B=r.nets[l.b].points[0],ca=comps.find(c=>c.id==cid(A)),cb=comps.find(c=>c.id==cid(B));const id="RX"+(i+1);comps.push({id,type:"res",name:`عنصر ${+l.R.toPrecision(4)} Ω (غير معروف)`,x:Math.round((ca.x+cb.x)/2/20)*20+40,y:Math.round((ca.y+cb.y)/2/20)*20+20*((i%3)-1),props:{R:+l.R.toPrecision(6)}});wires.push({id:"w"+(++wi),a:{c:cid(A),t:"n"},b:{c:id,t:"a"}});wires.push({id:"w"+(++wi),a:{c:id,t:"b"},b:{c:cid(B),t:"n"}})});
 return{id:"hx"+Date.now().toString(36),name:"خريطة: "+(h.name||"ضفيرة"),desc:`ناتجة من قياسات الضفيرة (${r.measured} قياس، اكتمال ${Math.round(r.completion*100)}%). العناصر بين المجموعات ممثلة كمقاومات بقيمها المقاسة، ونوعها الحقيقي غير معروف.`,how:"أضف مصدرًا ووصّله بالنقاط المناسبة لاختبار المسارات، أو استخدم الأفوميتر الافتراضي.",comps,wires,edu:false}}
/* تقرير نصي */
function report(h,r){const P=id=>h.points.find(p=>p.id==id),L=[`خريطة الضفيرة: ${h.name}${h.device?" — "+h.device:""}`,`القياسات: ${r.measured} · المجموعات: ${r.nets.length} · الاكتمال: ${Math.round(r.completion*100)}% (${r.known}/${r.totalPairs} علاقة معروفة)`,""];
 r.nets.forEach(n=>L.push(`${n.id}: ${n.points.map(id=>{const p=P(id);return p.label+(p.color?" ("+p.color+")":"")}).join(" ═ ")}`));if(r.links.length){L.push("","العناصر بين المجموعات:");r.links.forEach(l=>L.push(`${r.nets[l.a].id} ↔ ${r.nets[l.b].id}: ≈ ${+l.R.toPrecision(4)} Ω`))}
 if(r.conflicts.length){L.push("","⚠️ تعارضات:");r.conflicts.forEach(c=>L.push("• "+c.msg))}if(r.unknown)L.push("",`علاقات غير مقاسة: ${r.unknown}`);return L.join("\n")}
const api={COLORS,CHEX,parseReading,analyze,connPoints,validate,clean,toCircuit,report};
if(typeof module!="undefined")module.exports=api;else g.EH=api})(typeof window!="undefined"?window:globalThis);

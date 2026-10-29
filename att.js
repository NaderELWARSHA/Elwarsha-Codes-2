/* المرفقات: صور ومخططات في IndexedDB (لا تُخزَّن في localStorage) مع ضغط وتحقق وإزالة تكرار */
(function(g){"use strict";
const DB="mw_att",ST="files",TYPES=["image/jpeg","image/png","image/webp"],MAXRAW=10*1024*1024,MAXDIM=1280,urls=new Map();let dbp=null;
const open=()=>dbp||(dbp=new Promise((ok,no)=>{if(!g.indexedDB)return no(new Error("تخزين المرفقات غير متاح في هذا المتصفح"));const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore(ST,{keyPath:"id"});s.createIndex("hash","hash")};r.onsuccess=()=>ok(r.result);r.onerror=()=>{dbp=null;no(new Error("تعذر فتح تخزين المرفقات"))}}));
const run=async(mode,f)=>{const db=await open();return new Promise((ok,no)=>{const t=db.transaction(ST,mode);let res;const q=f(t.objectStore(ST));if(q)q.onsuccess=()=>res=q.result;t.oncomplete=()=>ok(res);t.onerror=t.onabort=()=>no(new Error(t.error&&t.error.name=="QuotaExceededError"?"مساحة التخزين ممتلئة":"فشلت عملية المرفقات"))})};
const hex=async b=>{try{return [...new Uint8Array(await crypto.subtle.digest("SHA-256",await b.arrayBuffer()))].map(x=>x.toString(16).padStart(2,"0")).join("")}catch{return"s"+b.size+"-"+Date.now()}};
const check=f=>{if(!f||!TYPES.includes(f.type))return"نوع الملف غير مدعوم (JPEG أو PNG أو WebP فقط)";if(f.size>MAXRAW)return"حجم الصورة أكبر من 10 ميغابايت";return null};
async function compress(f){const bad=check(f);if(bad)throw new Error(bad);let bmp;try{bmp=await createImageBitmap(f)}catch{throw new Error("الملف ليس صورة صالحة")}
const k=Math.min(1,MAXDIM/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*k)),h=Math.max(1,Math.round(bmp.height*k)),c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(bmp,0,0,w,h);if(bmp.close)bmp.close();
const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.82));if(!blob)throw new Error("تعذر ضغط الصورة");return{blob,w,h}}
const ATT={check,TYPES,
async add(f,desc){const{blob,w,h}=await compress(f),hash=await hex(blob),ex=await run("readonly",s=>s.index("hash").get(hash));if(ex)return{id:ex.id,dup:true};
const id="a"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);await run("readwrite",s=>s.put({id,name:String(f.name||"image").slice(0,120),type:blob.type,w,h,size:blob.size,desc:String(desc||"").slice(0,300),hash,created:Date.now(),blob}));return{id}},
get:id=>run("readonly",s=>s.get(id)),
del:id=>run("readwrite",s=>s.delete(id)),
async url(id){if(urls.has(id))return urls.get(id);const r=await ATT.get(id);if(!r)return null;const u=URL.createObjectURL(r.blob);urls.set(id,u);return u},
revokeAll(){urls.forEach(u=>URL.revokeObjectURL(u));urls.clear()},
ids:()=>run("readonly",s=>s.getAllKeys()),
async sweep(keep){const all=await ATT.ids(),k=new Set(keep);let n=0;for(const id of all)if(!k.has(id)){await ATT.del(id);n++}return n},
async usage(){const all=await run("readonly",s=>s.getAll());return{count:all.length,bytes:all.reduce((a,r)=>a+(r.size||0),0)}},
async exportAll(ids){const out=[];for(const id of ids){const r=await ATT.get(id);if(!r)continue;const buf=new Uint8Array(await r.blob.arrayBuffer());let s="";for(let i=0;i<buf.length;i+=0x8000)s+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));out.push({id:r.id,type:r.type,name:r.name,desc:r.desc,hash:r.hash,data:btoa(s)})}return out},
async importAll(list){for(const a of list){const bin=atob(a.data),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const blob=new Blob([u],{type:a.type});await run("readwrite",s=>s.put({id:a.id,name:a.name||"image",type:a.type,size:blob.size,desc:a.desc||"",hash:a.hash||("i"+a.id),created:Date.now(),blob}))}return list.length}};
g.ATT=ATT})(window);

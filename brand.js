/* الهوية: الوضع الليلي/النهاري، تغيير الألوان، الشعار واسم المالك (نفس نظام الورشة الفنية) */
(function(g){"use strict";
const S=MR.makeStore(localStorage),K="mw_theme",HEX=/^#[0-9a-f]{6}$/i,e=MR.e;
let T=Object.assign({mode:"auto",c1:"",c2:"",primary:"",accent:"",owner:"م. نادر"},S.get(K,{}));
const dark=()=>T.mode=="dark"||(T.mode=="auto"&&!!(g.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches));
const keep=()=>{if(!S.set(K,T))alert("تعذر حفظ الإعدادات: التخزين غير متاح.")};
function apply(){const r=document.documentElement,d=dark();d?r.setAttribute("data-theme","dark"):r.removeAttribute("data-theme");r.style.colorScheme=d?"dark":"light";
let st=document.getElementById("wl");if(!st){st=document.createElement("style");st.id="wl";document.head.appendChild(st)}
const v=[["--header-grad-1",T.c1],["--header-grad-2",T.c2],["--wl-primary",T.primary],["--accent-text",T.accent]].filter(x=>HEX.test(x[1])).map(x=>x[0]+":"+x[1]);
st.textContent=v.length?":root,[data-theme=dark]{"+v.join(";")+"}":"";
document.querySelectorAll('[data-act="theme"]').forEach(b=>b.textContent=d?"☀️":"🌙");document.querySelectorAll(".owner-name").forEach(n=>n.textContent=T.owner)}
const acts=()=>`<button class="theme-toggle-btn no-print" type="button" data-act="search" aria-label="بحث عام" title="بحث عام">🔍</button><a class="theme-toggle-btn no-print" href="#/settings" aria-label="الإعدادات" title="الإعدادات والألوان" style="text-decoration:none">🎨</a><button class="theme-toggle-btn no-print" type="button" data-act="theme" aria-label="تبديل المظهر" title="الوضع الليلي">🌙</button>`;
const header=()=>`<header><div class="brand"><img class="brand-logo" src="app-icon.svg" alt="شعار الورشة الفنية"><div><h1>الورشة الفنية</h1><p class="owner-name">${e(T.owner)}</p></div></div><div style="display:flex;align-items:center;gap:8px">${acts()}</div></header>`;
const topbar=t=>`<div class="page-topbar"><a class="back" href="#/">← الرئيسية</a><div style="display:flex;gap:8px;align-items:center" class="wl-acts">${acts()}</div></div>${t?`<div class="page-head"><h1>${e(t)}</h1></div>`:""}`;
function settingsPage(el){const C=[["c1","بداية تدرج الهيدر","#17324d"],["c2","نهاية تدرج الهيدر","#245a7a"],["primary","لون الأزرار الأساسية","#17324d"],["accent","لون الروابط والعناوين",dark()?"#5fb0ff":"#17324d"]];
el.innerHTML=`<section class="panel"><h3>🌓 المظهر</h3><label>الوضع<select id="tm"><option value="auto">تلقائي (يتبع الهاتف)</option><option value="light">نهاري</option><option value="dark">ليلي</option></select></label>
<h3>🎨 الألوان</h3><div class="form-grid">${C.map(([k,l,d])=>`<label>${l}<input type="color" data-c="${k}" value="${HEX.test(T[k])?T[k]:d}" style="height:44px;padding:2px"></label>`).join("")}</div>
<h3>🏷️ الهوية</h3><label>الاسم تحت «الورشة الفنية»<input id="ow" maxlength="40" value="${e(T.owner)}"></label>
<div class="section-actions" style="margin-top:12px"><button class="secondary" id="rs" type="button">↩️ إرجاع الألوان الافتراضية</button></div><p class="hint">الإعدادات محفوظة على هذا الجهاز فقط.</p></section>`;
$s("#tm").value=T.mode;$s("#tm").onchange=ev=>{T.mode=ev.target.value;keep();apply()};
el.querySelectorAll("[data-c]").forEach(i=>i.oninput=()=>{T[i.dataset.c]=i.value;keep();apply()});
$s("#ow").oninput=ev=>{T.owner=ev.target.value.trim().slice(0,40);keep();apply()};
$s("#rs").onclick=()=>{T.c1=T.c2=T.primary=T.accent="";keep();apply();settingsPage(el)}}
const $s=s=>document.querySelector(s);
g.BR={apply,toggle(){T.mode=dark()?"light":"dark";keep();apply()},header,topbar,settingsPage};
apply();})(window);

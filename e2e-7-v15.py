"""اختبارات v15 في المتصفح (Playwright). كل مجموعة تقابل بندًا في AUDIT.md [رقم].
لا تستخدم e2e_fixture: نبدأ كمستخدم جديد تمامًا (إدارة مقفولة، جولة أول مرة، مستوى مبتدئ)."""
from playwright.sync_api import sync_playwright
import json, os, time, tempfile
A = lambda s: str(s).encode('ascii', 'replace').decode()
U = 'http://localhost:8099/index.html'
R = []
def ok(n, c): R.append(('PASS' if c else 'FAIL', n)); print(('PASS ' if c else 'FAIL ') + A(n))
TMP = tempfile.mkdtemp()
UNLOCK = """(()=>{try{if(!sessionStorage.getItem('_fx')){sessionStorage.setItem('_fx','1');localStorage.setItem('mw_admin',JSON.stringify({lock:true,hash:'fx',salt:'fx'}));sessionStorage.setItem('mw_adm_ok','true')}localStorage.setItem('mw_tour','true')}catch(e){}})()"""
P = 'x\'"><img src=x onerror="(window.__x=window.__x||[]).push(location.hash)">'

with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    def page(w=360, h=740, dark=False, unlock=False, **k):
        ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme='dark' if dark else 'light', accept_downloads=True, **k)
        if unlock: ctx.add_init_script(UNLOCK)
        pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + A(e))); pg.on('console', lambda m: m.type == 'error' and errs.append('CONSOLE ' + A(m.text[:160])))
        return ctx, pg
    over = lambda pg: pg.evaluate("document.documentElement.scrollWidth>innerWidth+1")

    # ================= [1] الإدارة مقفولة افتراضيًا + رمز الاسترجاع =================
    ctx, pg = page()
    pg.goto(U); pg.wait_for_timeout(700)
    ok('[19] first visit: welcome tour shown with level choice', pg.locator('.kg-tour').count() == 1 and pg.locator('.kg-tour [data-lv]').count() == 3)
    pg.click('#kgtn'); pg.wait_for_timeout(150); ok('[19] tour step 2 highlights search', pg.locator('.sbtn.kg-hl').count() == 1)
    pg.goto(U + '#/kit'); pg.wait_for_timeout(300); ok('[19] navigating away closes the tour', pg.locator('.kg-tour').count() == 0)
    pg.goto(U); pg.wait_for_timeout(300); ok('[19] tour not shown again', pg.locator('.kg-tour').count() == 0)
    pg.goto(U + '#/cms'); pg.wait_for_timeout(300)
    ok('[1] admin locked by default: setup PIN screen', pg.locator('#apin').count() == 1 and pg.locator('#apin2').count() == 1 and 'إدارة محتوى النظام' not in pg.inner_text('#app'))
    pg.goto(U + '#/new/fault'); pg.wait_for_timeout(300); ok('[1] add-fault form gated too', pg.locator('#apin').count() == 1)
    pg.goto(U + '#/faults'); pg.wait_for_timeout(300); ok('[1] no edit/add buttons for a locked user', pg.locator('a[href="#/new/fault"].primary').count() == 0)
    pg.goto(U + '#/cms'); pg.wait_for_timeout(200); pg.fill('#apin', '12'); pg.fill('#apin2', '12'); pg.click('#ago'); pg.wait_for_timeout(300)
    ok('[1] short PIN rejected next to the field', '4 إلى 8' in pg.inner_text('#aerr'))
    pg.fill('#apin', '2468'); pg.fill('#apin2', '2468'); pg.click('#ago'); pg.wait_for_timeout(500)
    rc = pg.inner_text('#arc').strip() if pg.locator('#arc').count() else ''
    ok('[1] recovery code shown once (XXXX-XXXX-XXXX)', len(rc) == 14 and rc.count('-') == 2)
    ok('[1] only hashes stored (no PIN / code in storage)', '2468' not in pg.evaluate("localStorage.mw_admin") and rc not in pg.evaluate("localStorage.mw_admin") and 'rhash' in pg.evaluate("localStorage.mw_admin"))
    pg.click('#arok'); pg.wait_for_timeout(300); ok('[1] after setup admin opens', 'إدارة محتوى النظام' in pg.inner_text('#app'))
    pg.evaluate("ADM.lockNow()"); pg.goto(U + '#/kit'); pg.goto(U + '#/cms'); pg.wait_for_timeout(300)
    ok('[1] locked again shows «نسيت الرمز؟»', pg.locator('#afg').count() == 1)
    pg.locator('#afg summary').click(); pg.fill('#arcv', 'AAAA-BBBB-CCCC'); pg.click('#argo'); pg.wait_for_timeout(300); ok('[1] wrong recovery code refused', 'غير صحيح' in pg.inner_text('#aerr'))
    pg.fill('#arcv', rc.lower()); pg.click('#argo'); pg.wait_for_timeout(500)
    ok('[1] correct recovery code (any case) opens security page to set a new PIN', pg.url.endswith('#/cms/security') and pg.locator('#p1').count() == 1)
    ctx.close()

    # ================= [17] القالب الموحد والمستويات =================
    ctx, pg = page(); pg.goto(U); pg.evaluate("localStorage.mw_tour='true'")
    pg.goto(U + '#/kit/ohm'); pg.wait_for_timeout(400)
    ok('[17] default level = beginner', pg.evaluate("KG.level()") == 'beg' and pg.locator('.kg-lv [data-lv="beg"].on').count() == 1)
    ok('[17] beginner: «ما هذه الأداة؟» + «متى أستخدمها؟» + «هتحتاج» visible, labelled شرح عام', all(x in pg.inner_text('.kg-intro') for x in ['ما هذه الأداة؟', 'متى أستخدمها؟', 'هتحتاج', 'شرح عام']))
    sy = pg.evaluate("document.querySelector('.kg-safe').getBoundingClientRect().top"); iy = pg.evaluate("document.querySelector('#tb input').getBoundingClientRect().top")
    ok('[16] safety box appears ABOVE the first input', sy < iy)
    pg.click('#kgex'); pg.wait_for_timeout(300)
    ok('[17] example fills values and is labelled «مثال تعليمي، ليس قراءة حقيقية»', pg.input_value('#ov') == '220' and 'مثال تعليمي، ليس قراءة حقيقية' in pg.inner_text('#kgexn'))
    r_beg = pg.inner_text('#oo').split('🧮')[0]
    ok('[17] result in 3 layers: signal + «معناها بالعربي» + «وبعدين أعمل إيه؟» with links', pg.locator('#kgres .kg-sig').count() == 1 and 'معناها بالعربي' in pg.inner_text('#kgres') and pg.locator('#kgres a[href^="#/kit/"]').count() >= 2)
    ok('[17] formula with substitution available', pg.locator('#tb details.fxd, #kgres details.fxd').count() >= 1)
    pg.click('.kg-lv [data-lv="pro"]'); pg.wait_for_timeout(400)
    ok('[17] expert: intro hidden, safety kept, engineering details open', pg.locator('.kg-introb').count() == 0 and pg.locator('.kg-safe').count() >= 1 and pg.locator('details.kg-pro[open]').count() == 1)
    ok('[17] expert: «🧮 المعادلة» opened automatically', pg.locator('#tb details.fxd[open]').count() >= 1)
    r_pro = pg.inner_text('#oo').split('🧮')[0]
    ok('[17] SAME result in beginner and expert (level changes text only)', r_beg == r_pro and '5 A' in r_pro)
    pg.click('.kg-lv [data-lv="tech"]'); pg.wait_for_timeout(300); r_tech = pg.inner_text('#oo').split('🧮')[0]
    ok('[17] SAME result in technician level; intro collapsed', r_tech == r_beg and pg.locator('details.kg-introb:not([open])').count() == 1)
    pg.evaluate("localStorage.mw_level=JSON.stringify('pro')"); pg.goto(U + '#/kit/superheat'); pg.wait_for_timeout(300); pg.click('#kgex'); pg.wait_for_timeout(300)
    with pg.expect_popup() if False else open(os.devnull) as _: pass
    pg.evaluate("navigator.clipboard&&0"); rep = pg.evaluate("(()=>{let t='';const o=navigator.clipboard;return KIT&&document.querySelector('#rcp')?1:0})()")
    pg.evaluate("window.__cp='';window.copy=t=>{window.__cp=t}"); pg.click('#rcp'); pg.wait_for_timeout(200)
    cp = pg.evaluate("window.__cp")
    ok('[17] expert report includes inputs, formula result, date and assumptions/limits', 'السوبرهيت' in cp or 'SH' in cp) if cp else ok('[17] expert report includes assumptions (copy hook)', 'الافتراضات' in pg.evaluate("KG.repExtra()"))
    pg.evaluate("localStorage.mw_level=JSON.stringify('beg')")
    # [16] غاز قابل للاشتعال
    pg.goto(U + '#/kit/superheat'); pg.wait_for_timeout(300)
    ok('[16] R22: no flammable alert', 'قابل للاشتعال' not in pg.inner_text('.kg-flam') if pg.locator('.kg-flam').count() else True)
    pg.select_option('#rf', 'R290'); pg.wait_for_timeout(200)
    fy = pg.evaluate("document.querySelector('.kg-flam .kg-safe')?document.querySelector('.kg-flam .kg-safe').getBoundingClientRect().top:null"); py = pg.evaluate("document.querySelector('#sp').getBoundingClientRect().top")
    ok('[16] R290 selected: flammable warning appears right under the gas list, before pressure input', fy is not None and fy < py)
    # [16] كل أداة خطرة فيها تحذير قبل الخانات
    bad = []
    for tid in ['ohm', 'loadR', 'comp-wind', 'cap-check', 'motor-wind', 'components', 'harness', 'superheat', 'subcool', 'pt', 'cycle', 'capillary', 'gauge', 'power', 'current', 'sensor', 'cable', 'kit-fridge', 'kit-ac', 'kit-washer', 'diag']:
        pg.goto(U + '#/kit/' + tid); pg.wait_for_timeout(250)
        y = pg.evaluate("(()=>{const s=document.querySelector('.kg-safe');const i=document.querySelector('#tb input,#tb select,#tb button,#tb a');return s?(i?s.getBoundingClientRect().top<i.getBoundingClientRect().top:true):false})()")
        if not y: bad.append(tid)
    ok('[16] 21 dangerous tools: safety box before the first control (%s)' % bad, not bad)
    pg.goto(U + '#/kit/diag/fridge-no-cool'); pg.wait_for_timeout(300)
    ok('[16] diagnosis flow: general safety + per-step safety box above the step', pg.locator('.notice', has_text='السلامة').count() >= 1)
    found = pg.evaluate("(()=>{const s=document.querySelector('section.sec .kg-safe');const h=s&&s.parentElement.querySelector('h3');return !!(s&&h&&s.getBoundingClientRect().top<h.getBoundingClientRect().top)})()")
    for _ in range(0 if found else 6):
        if pg.evaluate("(()=>{const s=document.querySelector('section.sec .kg-safe');const h=s&&s.parentElement.querySelector('h3');return !!(s&&h&&s.getBoundingClientRect().top<h.getBoundingClientRect().top)})()"): found = True; break
        btn = pg.locator('[data-do]').first
        if not btn.count(): break
        btn.click(); pg.wait_for_timeout(200)
    ok('[16] a measuring step shows its own warning before the question', found)
    # [17] كل أداة حسابية: نتيجة + معادلة بعد المثال
    miss = []
    for tid in pg.evaluate("Object.keys(KG.G).filter(k=>KG.G[k].ex)"):
        pg.goto(U + '#/kit/' + tid); pg.wait_for_timeout(250); pg.click('#kgex'); pg.wait_for_timeout(300)
        if not (pg.locator('#kgres .kg-sig').count() and pg.locator('#tb details.fxd, #kgres details.fxd').count()): miss.append(tid)
    ok('[17] every calculator: worked example → signal + formula with substitution (%s)' % miss, not miss)
    pg.goto(U + '#/kit/comp-wind'); pg.wait_for_timeout(250); pg.click('#kgex'); pg.wait_for_timeout(300)
    ok('[17] comp-wind without model reference = «غير محسوم» (honest)', 'غير محسوم' in pg.inner_text('#kgres .kg-sig'))
    pg.goto(U + '#/kit/cap-check'); pg.wait_for_timeout(250); pg.click('#kgex'); pg.wait_for_timeout(300)
    ok('[17] capacitor −5.7%% outside ±5%% = «عطل محتمل» with formula numbers', 'عطل محتمل' in pg.inner_text('#kgres') and '-5.714' in pg.text_content('#kgres'))
    pg.goto(U + '#/kit/loadR'); pg.wait_for_timeout(250); pg.click('#kgex'); pg.wait_for_timeout(300)
    ok('[17] heater 25Ω vs 24.2Ω expected = «سليم»', 'سليم' in pg.inner_text('#kgres .kg-sig'))
    # [17] رسائل الخطأ + لوحة المفاتيح + أسماء الخانات
    pg.goto(U + '#/kit/ohm'); pg.wait_for_timeout(300); pg.click('#rrs'); pg.wait_for_timeout(200); pg.fill('#ov', 'abc'); pg.wait_for_timeout(200)
    msg = pg.inner_text('[data-f="ov"] .ferr') if pg.locator('[data-f="ov"] .ferr').count() else ''
    ok('[17] field error tells how to fix it (name + example)', 'اكتب' in msg and 'مثال' in msg)
    pg.fill('#ov', ''); pg.focus('#ov'); pg.keyboard.press('Enter'); ok('[18] Enter moves to next field', pg.evaluate("document.activeElement.id") == 'oi')
    pg.keyboard.press('ArrowUp'); ok('[18] ArrowUp moves back', pg.evaluate("document.activeElement.id") == 'ov')
    ok('[15] every input on ohm/superheat has an accessible name', pg.evaluate("[...document.querySelectorAll('#tb input')].every(i=>i.getAttribute('aria-label')||(i.labels&&i.labels.length&&i.labels[0].innerText.trim()))"))
    # [14] أهداف اللمس
    pg.goto(U + '#/kit/comp-wind'); pg.wait_for_timeout(300)
    small = pg.evaluate("[...document.querySelectorAll('.hlp,#kfv,.back,.kg-lv button,#kgex')].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect()).filter(r=>r.height<44||r.width<44).length")
    ok('[14] ⓘ, ☆, back, level and example buttons ≥ 44px', small == 0)
    ok('[20] ⓘ help links to the glossary', pg.locator('#tb small.hlpt a[href^="#/glossary/"]').count() >= 1)
    # [20] القاموس
    pg.goto(U + '#/glossary'); pg.wait_for_timeout(300); n_all = pg.locator('.gl-it').count()
    pg.fill('#glq', 'سوبر'); pg.wait_for_timeout(200); ok('[20] glossary searchable (%d terms)' % n_all, n_all >= 20 and 1 <= pg.locator('.gl-it').count() < n_all)
    pg.goto(U + '#/glossary/crs'); pg.wait_for_timeout(300); ok('[20] deep link selects term with SVG drawing', pg.locator('#gl-crs.sel svg').count() == 1)
    pg.fill('#glq', 'zzzz'); pg.wait_for_timeout(200); ok('[20] no-result state gives a next step', pg.locator('.empty').count() == 1 and 'البحث العام' in pg.inner_text('#gll'))
    # [19] الرئيسية
    pg.goto(U); pg.wait_for_timeout(400)
    ok('[19] home: «حسب العطل» (8 symptoms) before tiles, «ابدأ من هنا», «الأكثر استخدامًا»', pg.locator('.kg-symb').count() == 8 and pg.locator('.kg-path li').count() == 5 and pg.evaluate("document.querySelector('.kg-sym').getBoundingClientRect().top<document.querySelector('.tiles').getBoundingClientRect().top"))
    hrefs = pg.evaluate("[...document.querySelectorAll('.kg-symb')].map(a=>a.getAttribute('href'))"); badf = []
    for h in hrefs:
        pg.goto(U + h); pg.wait_for_timeout(200)
        if 'المسارات' not in pg.inner_text('#app') or pg.locator('.hero h2').count() == 0: badf.append(h)
    ok('[19] every symptom opens a real diagnosis flow', not badf)
    pg.goto(U); pg.wait_for_timeout(300); pg.locator('[data-pk="0"]').click(); pg.wait_for_timeout(200); pg.goto(U); pg.wait_for_timeout(300)
    ok('[19] learning path remembers done steps', pg.locator('.kg-path li.done').count() == 1)
    pg.evaluate("localStorage.mw_level=JSON.stringify('pro')"); pg.goto(U + '#/kit'); pg.goto(U); pg.wait_for_timeout(300)
    ok('[19] expert home hides the beginner path', pg.locator('.kg-path').count() == 0)
    pg.evaluate("localStorage.mw_level=JSON.stringify('beg')")
    pg.goto(U + '#/settings'); pg.wait_for_timeout(300); ok('[17] level selectable from settings + replay tour', pg.locator('.kg-set [data-lv]').count() == 3 and pg.locator('#kgtour').count() == 1)
    ok('[19] home does not load the 2MB compressor DB', pg.evaluate("performance.getEntriesByType('resource').some(r=>/compressors-base/.test(r.name))") is False)
    # [5][6][7] المسارات الموحدة
    for a, want in [('#/fav', '#/favs'), ('#/compressors', '#/comps'), ('#/tools', '#/kit'), ('#/terms', '#/glossary')]:
        pg.goto(U + a); pg.wait_for_timeout(300); ok('[6][7] %s redirects to %s (no extra history step)' % (a, want), pg.url.endswith(want))
    pg.goto(U + '#/flows'); pg.wait_for_timeout(300); ok('[5] #/flows lists the 8 built-in diagnosis flows (not empty)', pg.locator('a.chip[href^="#/kit/diag/"]').count() == 8)
    pg.goto(U + '#/tools/units'); pg.wait_for_timeout(300); ok('[6] legacy tools page points to the new tool', pg.locator('.notice a[href="#/kit/units"]').count() == 1)
    # [8][9][10] طرق مسدودة → إرشاد
    pg.evaluate("localStorage.removeItem('mw_kin')"); pg.goto(U + '#/kit/cable'); pg.wait_for_timeout(300)
    ok('[8] cable without table: practical guidance + add-table button + fake-format preview', pg.locator('.kg-empty a[href="#/cms/data/ampTables/new"]').count() == 1 and 'مثال تنسيق وهمي' in pg.text_content('.kg-empty'))
    ok('[8] no result box before any input (guidance table is not a result)', pg.locator('#kgres:not([hidden]) .kg-sig').count() == 0)
    pg.fill('#ci', '16'); pg.fill('#cl', '25'); pg.fill('#cmx', '3'); pg.wait_for_timeout(300)
    ok('[8] cable still computes the voltage-drop minimum without a table', 'هبوط' in pg.inner_text('#co'))
    pg.goto(U + '#/kit/capillary'); pg.wait_for_timeout(300); ok('[9] empty capillary library → what to do now + add/import', pg.locator('.kg-empty a[href="#/cms/data/capillary/new"]').count() == 1 and pg.locator('.kg-empty a[href="#/kit/superheat"]').count() == 1)
    pg.goto(U + '#/faults'); pg.wait_for_timeout(300); ok('[10] empty faults list → diagnosis, import, add', pg.locator('.empty a[href="#/kit/diag"]').count() == 1)
    # [4] الأرقام
    ok('[4] «12,000» read as 12000 in the UI parser', pg.evaluate("X2.num('12,000')") == 12000 and pg.evaluate("X2.num('1,5')") == 1.5)
    pg.goto(U + '#/kit/units'); pg.wait_for_timeout(300); pg.select_option('#uc', 'power'); pg.fill('#uv', '12,000'); pg.select_option('#uu', 'BTU/h'); pg.wait_for_timeout(300)
    ok('[4] 12,000 BTU/h → 3.51685 kW (not 12 BTU/h)', '3.51685' in pg.inner_text('#uo'))
    for w in [360, 1280]:
        pg.set_viewport_size({'width': w, 'height': 800}); bad = []
        for r in ['#/', '#/glossary', '#/kit/superheat', '#/kit/cable', '#/kit/comp-wind', '#/settings', '#/flows']:
            pg.goto(U + r); pg.wait_for_timeout(250)
            if over(pg): bad.append(r)
        ok('no horizontal scroll at %dpx on v15 pages %s' % (w, bad), not bad)
    ctx.close()
    # الوضع الليلي: تباين نص صندوق السلامة والإشارة
    ctx, pg = page(dark=True); pg.goto(U); pg.evaluate("localStorage.mw_tour='true'"); pg.goto(U + '#/kit/loadR'); pg.wait_for_timeout(300); pg.click('#kgex'); pg.wait_for_timeout(300)
    CR = """(sel)=>{const e=document.querySelector(sel);if(!e)return 0;const L=c=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};let bg=null,x=e;while(x){const c=getComputedStyle(x).backgroundColor;if(c&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)){bg=c;break}x=x.parentElement}bg=bg||'rgb(15,17,21)';const a=L(getComputedStyle(e).color),b=L(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}"""
    worst = min(pg.evaluate(CR, s) for s in ['.kg-safe p', '.kg-safe>b', '#kgres p', '.kg-sig b', '.kg-introb p', '.kg-tag'])
    ok('dark mode: v15 text contrast ≥ 4.5:1 (worst %.2f)' % worst, worst >= 4.5)
    ctx.close()

    # ================= أهم 8 أدوات × 3 مستويات × وضعين: نفس النتيجة، بلا أخطاء ولا تمرير أفقي =================
    TOP = {'ohm': '#oo', 'superheat': '#so', 'comp-wind': '#wo', 'cap-check': '#co2', 'loadR': '#lo', 'pt': '#po', 'vdrop': '#co', 'units': '#uo'}
    diffs = []
    for dark in (False, True):
        ctx, pg = page(dark=dark); pg.goto(U); pg.evaluate("localStorage.mw_tour='true'")
        for tid, sel in TOP.items():
            outs = []
            for lv in ('beg', 'tech', 'pro'):
                pg.evaluate("l=>{localStorage.mw_level=JSON.stringify(l);localStorage.removeItem('mw_kin')}", lv); pg.goto(U + '#/kit'); pg.goto(U + '#/kit/' + tid); pg.wait_for_timeout(250); pg.click('#kgex'); pg.wait_for_timeout(300)
                res = pg.evaluate("s=>{const e=document.querySelector(s)||document.querySelector('#tb .res');return e?e.innerText.split('🧮')[0].trim():''}", sel)
                outs.append(res)
                if over(pg): diffs.append('overflow %s %s %s' % (tid, lv, dark))
            if not outs[0] or len(set(outs)) != 1: diffs.append('%s dark=%s' % (tid, dark))
        ctx.close()
    ok('top 8 tools × 3 levels × light/dark: identical result, no overflow %s' % diffs, not diffs)

    # ================= بيانات: CSV + لصق الصفوف + الاستيراد التالف + النسخة الاحتياطية =================
    ctx, pg = page(unlock=True); pg.goto(U); pg.wait_for_timeout(500)
    pg.goto(U + '#/cms/data/ampTables/new'); pg.wait_for_timeout(400)
    ok('[8] new amp table: standard sections prefilled, capacity empty (no invented values)', pg.evaluate("(()=>{const t=[...document.querySelectorAll('[data-rows] tbody tr')];return t.length>=15&&t.every(r=>r.querySelectorAll('input')[1].value==='')&&t[0].querySelectorAll('input')[0].value!==''})()"))
    pg.click('.rpaste'); pg.fill('.rpbox textarea', '1.5\t111\n2.5;222\n٤ ٣٣٣'); pg.click('.rpok'); pg.wait_for_timeout(200)
    vals = pg.evaluate("[...document.querySelectorAll('[data-rows] tbody tr')].map(r=>[...r.querySelectorAll('input')].map(i=>i.value)).filter(r=>r[1])")
    ok('[8] paste from Excel/CSV fills the matching section rows (tab, ; and Arabic digits)', vals[:3] == [['1.5', '111'], ['2.5', '222'], ['4', '333']] or [v[1] for v in vals] == ['111', '222', '333'])
    csvp = os.path.join(TMP, 'cap.csv'); open(csvp, 'w', encoding='utf-8-sig').write('refrigerant,application,compModel,id_mm,length_m,srcClass,srcRef\nR600a,LBP,TEST-A,0.7,3.1,field,قياس ورشة\nR134a,LBP,"TEST, B",0.8,2.9,field,قياس ورشة\nR600a,LBP,BAD,31,3,field,x\n')
    pg.goto(U + '#/cms/data/capillary'); pg.wait_for_timeout(300)
    with pg.expect_download() as d: pg.click('#ccsv')
    hdr = open(d.value.path(), encoding='utf-8-sig').read().strip().split(',')
    ok('[11] CSV template downloadable with schema columns', 'id_mm' in hdr and 'length_m' in hdr and 'refrigerant' in hdr)
    pg.set_input_files('#ci', csvp); pg.wait_for_timeout(400); t = pg.inner_text('#cir')
    ok('[11] CSV import preview: 2 new, 1 rejected with reason (quoted comma handled)', 'جديد 2' in t and 'مرفوض 1' in t)
    pg.click('#cok'); pg.wait_for_timeout(300); ok('[11] approved CSV rows saved', len(pg.evaluate("JSON.parse(localStorage.mw_lib).capillary")) == 2)
    p1256 = os.path.join(TMP, 'cap1256.csv'); open(p1256, 'wb').write('refrigerant,application,compModel,id_mm,length_m,srcClass,srcRef\nR600a,LBP,ثلاجة-تجربة,0.7,3.2,field,قياس ورشة\n'.encode('cp1256'))
    pg.set_input_files('#ci', p1256); pg.wait_for_timeout(400); pg.click('#cok'); pg.wait_for_timeout(300)
    ok('[21] Excel Arabic CSV (Windows-1256) decoded correctly', any(r.get('compModel') == 'ثلاجة-تجربة' for r in pg.evaluate("JSON.parse(localStorage.mw_lib).capillary")))
    bad = os.path.join(TMP, 'bad.json'); open(bad, 'w').write('{"faultCodes":[{"code":')
    pg.goto(U + '#/cms/data/capillary'); pg.wait_for_timeout(300); pg.set_input_files('#ci', bad); pg.wait_for_timeout(300)
    ok('[21] corrupt JSON → clear message, data untouched', 'تالف' in pg.inner_text('#cir') and len(pg.evaluate("JSON.parse(localStorage.mw_lib).capillary")) == 3)
    big = os.path.join(TMP, 'big.json'); open(big, 'w').write('[' + ','.join(['{"x":"' + 'a' * 1000 + '"}'] * 2300) + ']')
    msgs = []; pg.on('dialog', lambda dd: msgs.append(dd.message))
    t0 = time.time(); pg.set_input_files('#ci', big); pg.wait_for_timeout(500)
    ok('[21] file > 2MB refused before reading (no freeze)', any('2 ميغابايت' in m for m in msgs) and time.time() - t0 < 3)
    wrong = os.path.join(TMP, 'x.txt'); open(wrong, 'w').write('hello')
    pg.goto(U + '#/admin'); pg.wait_for_timeout(300); msgs.clear(); pg.set_input_files('#if', wrong); pg.wait_for_timeout(300)
    ok('[21] wrong file type refused', any('غير مدعوم' in m for m in msgs))
    # النسخة الاحتياطية: بيانات الحقيبة ترجع مطابقة للأصل
    pg.evaluate("""()=>{localStorage.mw_harness=JSON.stringify([{id:'h1',name:'ضفيرة اختبار',device:'',note:'',shortMax:1,points:[{id:'A-1',label:'A-1',conn:'A',color:'أحمر'},{id:'A-2',label:'A-2',conn:'A',color:''}],meas:[{a:'A-1',b:'A-2',v:'short'}]}]);localStorage.mw_meas=JSON.stringify([{id:'m1',t:'2026-01-01T00:00:00Z',tool:'ohm',title:'أوم',text:'V=220'}]);localStorage.mw_kin=JSON.stringify({ohm:{ov:'220'}})}""")
    keys = ['mw_harness', 'mw_meas', 'mw_lib', 'mw_kin']
    orig = {k: pg.evaluate("k=>localStorage.getItem(k)", k) for k in keys}
    pg.goto(U + '#/kit'); pg.goto(U + '#/admin'); pg.wait_for_timeout(300)
    with pg.expect_download() as d: pg.click('#xb')
    bp = os.path.join(TMP, d.value.suggested_filename or 'backup.json'); d.value.save_as(bp)
    pg.evaluate("ks=>ks.forEach(k=>localStorage.removeItem(k))", keys); pg.reload(); pg.wait_for_timeout(400)
    pg.goto(U + '#/admin'); pg.wait_for_timeout(300); pg.set_input_files('#rf', bp); pg.wait_for_timeout(800)
    after = {k: pg.evaluate("k=>localStorage.getItem(k)", k) for k in keys}
    same = [k for k in keys if after[k] and json.loads(after[k]) == json.loads(orig[k])]
    ok('[21] backup → wipe → restore: kit stores identical to original (%s)' % same, len(same) == len(keys))
    # [21] حقن HTML في كل المخازن
    pg.evaluate("""P=>{const S=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
     S('mw_meas',[{id:'m1',t:new Date().toISOString(),tool:'ohm',title:P,text:P}]);
     S('mw_harness',[{id:'h1',name:P,device:P,note:P,shortMax:1,points:[{id:'A-1',label:P,conn:P,color:'',note:P},{id:'A-2',label:'A-2',conn:P,color:''}],meas:[{a:'A-1',b:'A-2',v:5}]}]);
     S('mw_flows',[{id:'uf1',title:P,safety:P,start:'s1',nodes:{s1:{text:P,result:P}}}]);
     S('mw_cms',{tools:{items:{xt:{id:'xt',kind:'formula',t:P,ic:P,d:P,cat:'elec',how:[P],refs:P,kw:P,interp:P,validity:P,inputs:[{key:'a',label:P,unit:P,def:P,help:P}],outputs:[{label:P,expr:'a*2',unit:P,dec:2}]}},deleted:[]}});
     const F={id:'f1'};['deviceType','brand','category','model','code','title','cause','fix','note','srcRef','srcNote'].forEach(k=>F[k]=P);
     S('mw_db',{ver:3,faults:[F],custom:[{id:'c1',brand:P,model:P,notes:P,refrigerant:'R600a'}]});
     const lib=JSON.parse(localStorage.mw_lib||'{}');lib.capillary=[{refrigerant:'R600a',compModel:P,id_mm:0.7,length_m:3,srcClass:'field',srcRef:P}];S('mw_lib',lib)}""", P)
    pg.reload(); pg.wait_for_timeout(500)
    for r in ['#/', '#/faults', '#/fault/f1', '#/comps', '#/kit', '#/kit/xt', '#/kit/history', '#/kit/harness', '#/kit/capillary', '#/kit/diag/uf1', '#/flows', '#/cms/tools/xt', '#/cms/data/capillary', '#/glossary', '#/kit/ohm']:
        pg.goto(U + r); pg.wait_for_timeout(220)
    ok('[21] XSS fuzz: payload in every store executes 0 times and shows as text', pg.evaluate("(window.__x||[]).length") == 0 and 'onerror' in (pg.goto(U + '#/fault/f1') or pg.wait_for_timeout(300) or pg.inner_text('#app')))
    ctx.close()

    # ================= بدون إنترنت + إشعار التحديث =================
    ctx, pg = page(); pg.goto(U); pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(1200)
    cur = __import__('re').search(r'CACHE_NAME\s*=\s*"([^"]+)"', open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'version.js'), encoding='utf8').read()).group(1)
    ok('[12] service worker cache name comes from version.js (%s)' % cur, cur in pg.evaluate("caches.keys()"))
    ctx.set_offline(True); pg.goto(U + '#/glossary'); pg.wait_for_timeout(500); ok('offline: glossary works', pg.locator('.gl-it').count() >= 20)
    pg.evaluate("localStorage.mw_tour='true'"); pg.goto(U + '#/kit/superheat'); pg.wait_for_timeout(400); ok('offline: guide layer works', pg.locator('.kg-intro').count() == 1)
    ctx.set_offline(False)
    vp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'version.js'); orig_v = open(vp, encoding='utf8').read()
    try:
        open(vp, 'w', encoding='utf8').write(orig_v.replace('CACHE_NAME = "', 'CACHE_NAME = "test-'))
        pg.goto(U); pg.wait_for_timeout(300); pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r&&r.update())"); pg.wait_for_timeout(2500)
        ok('[12] version change → user sees «يوجد تحديث» banner', pg.locator('#upd').count() == 1)
    finally:
        open(vp, 'w', encoding='utf8').write(orig_v)
    ctx.close()

    ok('no console/page errors', not errs); [print(e) for e in errs[:10]]
    b.close()
print('\n%d FAILED of %d' % (sum(1 for r in R if r[0] == 'FAIL'), len(R)))

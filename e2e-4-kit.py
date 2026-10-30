from playwright.sync_api import sync_playwright
import json
A=lambda s:str(s).encode('ascii','replace').decode()
U='http://localhost:8099/index.html'
R=[]
def ok(n,c): R.append(('PASS' if c else 'FAIL',n)); print(('PASS ' if c else 'FAIL ')+A(n))
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':360,'height':740}); ctx.grant_permissions(['clipboard-read','clipboard-write']); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+A(e))); pg.on('console',lambda m:m.type=='error' and errs.append('CONSOLE '+A(m.text[:120]))); pg.on('dialog',lambda d:d.accept())
    pg.goto(U); pg.wait_for_timeout(500)
    ok('home: kit tile + diagnosis tile + shortcuts',pg.locator('a.tile[href="#/kit"]').count()==1 and pg.locator('a.tile[href="#/kit/diag"]').count()==1 and pg.locator('a[href="#/kit/circuit"]').count()>=1)
    ok('bottom nav has kit',pg.locator('#bn a[href="#/kit"]').count()==1)
    # ---- kit home
    pg.goto(U+'#/kit'); pg.wait_for_timeout(300); n=pg.locator('.kt').count(); ok('kit lists all tools (%d)'%n,n>=29)
    pg.fill('#kq','سوبر'); pg.wait_for_timeout(200); ok('kit search filters (superheat)',pg.locator('.kt').count()>=1 and 'السوبرهيت' in pg.inner_text('#kgrid'))
    pg.fill('#kq',''); pg.click('[data-kc="elec"]'); pg.wait_for_timeout(200); ok('category filter electrical',pg.locator('.kt[data-kt="cable"]').count()==1 and pg.locator('.kt[data-kt="pt"]').count()==0)
    pg.locator('.kt[data-kt="cable"] [data-fav]').click(); pg.wait_for_timeout(100); pg.click('[data-kc="fav"]'); pg.wait_for_timeout(200); ok('favorites persist',pg.locator('.kt').count()==1 and pg.evaluate("JSON.parse(localStorage.mw_kfav)[0]")=='cable')
    pg.click('[data-kc="all"]')
    # ---- units
    pg.goto(U+'#/kit/units'); pg.wait_for_timeout(300); pg.fill('#uv','١٢٠٠٠'); pg.select_option('#uu','BTU/h'); pg.wait_for_timeout(200); t=pg.inner_text('#uo'); ok('units: Arabic digits 12000 BTU/h = 3516.85 W = 1 TR',('3516.85' in t) and ('\n1\n' in t or '\t1\n' in t or 'TR\t1' in t))
    ok('result actions enabled after valid input',pg.locator('#rcp').is_enabled())
    pg.fill('#uv',''); pg.wait_for_timeout(150); ok('no misleading result when input empty',pg.locator('#uo .pend').count()==1 and pg.locator('#rcp').is_disabled())
    pg.goto(U+'#/kit/achp'); pg.wait_for_timeout(300); pg.select_option('#ahp','1.5'); pg.wait_for_timeout(150); ok('commercial AC HP 1.5 -> 12000 BTU/h, separate from mechanical HP',('12000 BTU/h' in pg.inner_text('#ao')) and ('≠' in pg.inner_text('#ao')))
    # ---- refrigeration
    pg.goto(U+'#/kit/pt'); pg.wait_for_timeout(300); pg.select_option('#rf','R134a'); pg.select_option('#pmode','t'); pg.fill('#pt','0'); pg.select_option('#pg2','abs'); pg.select_option('#pu2','kPa'); pg.wait_for_timeout(200); ok('PT: R134a 0°C = 292.8 kPa abs',('292.8' in pg.inner_text('#po')))
    ok('PT: source shown (Arkema/REFPROP)','Arkema' in pg.inner_text('#rsrc'))
    pg.select_option('#rf','R407C'); pg.wait_for_timeout(200); ok('PT blend shows Dew and Bubble',('Dew' in pg.inner_text('#po')) and ('Bubble' in pg.inner_text('#po')))
    pg.fill('#pt','99'); pg.wait_for_timeout(150); ok('PT out of range rejected',('خارج نطاق' in pg.inner_text('#po')))
    pg.goto(U+'#/kit/superheat'); pg.wait_for_timeout(300); pg.select_option('#rf','R22'); pg.fill('#sp','4.5'); pg.fill('#stl','10'); pg.wait_for_timeout(200); ok('superheat R22 4.5 bar(g), 10°C -> 6.81 K',('6.81' in pg.inner_text('#so')))
    pg.click('#rcp'); pg.wait_for_timeout(200); clip=pg.evaluate("navigator.clipboard.readText()"); ok('copy result report',('السوبرهيت' in clip) and ('6.81' in clip))
    pg.click('#rsv'); pg.wait_for_timeout(200); ok('save measurement',pg.evaluate("JSON.parse(localStorage.mw_meas).length")==1)
    pg.goto(U+'#/kit/cycle'); pg.wait_for_timeout(300); pg.select_option('#rf','R22'); pg.fill('#cps','4.5'); pg.wait_for_timeout(200); ok('cycle assistant lists missing data',('بيانات ناقصة' in pg.inner_text('#cyo')))
    # ---- compressors
    pg.goto(U+'#/kit/comp-wind'); pg.wait_for_timeout(300); pg.fill('#wa','3'); pg.fill('#wb','12'); pg.fill('#wc','15'); pg.wait_for_timeout(200); ok('winding analyzer finds common terminal',('C = 1' in pg.inner_text('#wo')) and ('العزل' in pg.inner_text('#wo')))
    pg.fill('#wb','OL'); pg.fill('#wa','OL'); pg.wait_for_timeout(200); ok('winding analyzer handles OL',('مفتوحة' in pg.inner_text('#wo')))
    pg.goto(U+'#/kit/comp-spec'); pg.wait_for_timeout(300); pg.fill('#csq','gl45aa'); pg.wait_for_timeout(1500); pg.locator('#csl button').first.click(); pg.wait_for_timeout(300); ok('compressor spec from DB with capacity table',('GL45AA' in pg.inner_text('#cso')) and ('تبخير' in pg.inner_text('#cso')))
    pg.goto(U+'#/kit/comp-compat'); pg.wait_for_timeout(300); pg.fill('#kaq','gl45aa'); pg.wait_for_timeout(600); pg.locator('#kal button').first.click(); pg.fill('#kbq','gl60aa'); pg.wait_for_timeout(600); pg.locator('#kbl button').first.click(); pg.wait_for_timeout(300); ok('compatibility comparison shows capacity risk',('قدرة التبريد' in pg.inner_text('#ko')))
    pg.goto(U+'#/kit/cable'); pg.wait_for_timeout(300); pg.fill('#ci','16'); pg.fill('#cl','30'); pg.fill('#cmx','3'); pg.wait_for_timeout(200); t=pg.inner_text('#co'); ok('cable: candidate 4 mm² and ampacity undecided (no invented table)',('4 mm²' in t) and ('غير محسومة' in t))
    pg.goto(U+'#/kit/capillary'); pg.wait_for_timeout(300); pg.fill('#ci','0.031'); pg.wait_for_timeout(150); ok('capillary inch->mm',pg.input_value('#cm')=='0.7874')
    pg.fill('#cd1','0.9'); pg.fill('#cl1','3'); pg.fill('#cd2','0.8'); pg.fill('#cl2','3'); pg.wait_for_timeout(200); ok('capillary comparison effect direction',('أكبر' in pg.inner_text('#cco')))
    # ---- components and kits
    pg.goto(U+'#/kit/components'); pg.wait_for_timeout(300); ok('component library 20',pg.locator('#cg .kt').count()==20)
    pg.goto(U+'#/kit/components/cap'); pg.wait_for_timeout(300); ok('component detail has 6 sections + warning',pg.locator('section.sec').count()==6 and pg.locator('.notice').count()>=1)
    pg.goto(U+'#/kit/kit-washer'); pg.wait_for_timeout(300); ok('washer kit 14 tests + design note',pg.locator('.rc').count()==14 and 'لا توجد مقاومة' in pg.inner_text('.notice'))
    # ---- diagnosis
    pg.goto(U+'#/kit/diag'); pg.wait_for_timeout(300); ok('diagnosis lists 8 builtin trees',pg.locator('.rc').count()>=8)
    pg.goto(U+'#/kit/diag/fridge-no-cool'); pg.wait_for_timeout(300); pg.locator('[data-do]').nth(1).click(); pg.wait_for_timeout(200); pg.locator('[data-do]').nth(0).click(); pg.wait_for_timeout(200)
    ok('diagnosis navigates with measurement + tool link',('الخطوة 3' in pg.inner_text('.hero')) and pg.locator('a[href="#/kit/comp-wind"]').count()>=1)
    pg.click('#rcp'); pg.wait_for_timeout(150); clip=pg.evaluate("navigator.clipboard.readText()"); ok('diagnosis report copies answers',('الإجابة' in clip) and ('تقدير هندسي' in clip))
    # ---- circuit simulator
    pg.goto(U+'#/kit/circuit/ckt-lamp'); pg.wait_for_timeout(500); pg.click('[data-tab="res"]'); pg.wait_for_timeout(150); ok('simulator: template lamp runs with 1.00 A',('1.00 A' in pg.inner_text('#ckpanel')))
    ok('simulator: current path highlighted',pg.locator('#cks .wire.on').count()>=4 and pg.locator('#cks .comp.on').count()>=3)
    pg.locator('#cks [data-c="S1"]').click(); pg.wait_for_timeout(250); pg.click('[data-tab="err"]'); pg.wait_for_timeout(150); ok('simulator: tap switch toggles -> open path detected with fix',('مقطوع' in pg.inner_text('#ckpanel')) and ('الإصلاح' in pg.inner_text('#ckpanel')) and pg.locator('#cks .wire.on').count()==0)
    pg.locator('#cks [data-c="S1"]').click(); pg.wait_for_timeout(200)
    nw0=pg.evaluate("JSON.parse(sessionStorage.mw_ck_cur).ck.wires.length")
    pg.click('#cksim'); pg.click('[data-tab="lib"]'); pg.click('[data-add="lamp"]'); pg.wait_for_timeout(200); ok('palette adds component + props panel',pg.locator('#cks [data-c="LP1"]').count()==1 and pg.locator('#ckpanel input[data-pp="P"]').count()==1)
    pg.click('[data-md="wire"]'); pg.wait_for_timeout(100)
    def tap(k):
        box=pg.locator('#cks [data-t="%s"] circle'%k).first.bounding_box(); pg.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2); pg.wait_for_timeout(120)
    tap('LP1|a'); tap('S1|b'); ok('wire mode creates wire by tapping two terminals',pg.evaluate("JSON.parse(sessionStorage.mw_ck_cur).ck.wires.length")==nw0+1)
    pg.click('#cksim'); pg.wait_for_timeout(250); pg.click('[data-tab="err"]'); ok('simulator warns missing connection point',('نقطة توصيل مفقودة' in pg.inner_text('#ckpanel')))
    pg.goto(U+'#/kit/circuit/ckt-nofrost'); pg.wait_for_timeout(500); pg.click('[data-tab="res"]'); pg.click('#strun'); pg.wait_for_timeout(300); ok('no-frost scenario: 4 states all as expected',pg.locator('#stout .flag.ok').count()==4)
    pg.locator('[data-st="1"]').click(); pg.wait_for_timeout(250); ok('no-frost defrost state: heater on, compressor off',pg.locator('#cks .comp.on[data-c="HT"]').count()==1 and pg.locator('#cks .comp.on[data-c="CMP"]').count()==0)
    pg.goto(U+'#/kit/circuit/ckt-lamp'); pg.wait_for_timeout(400); pg.click('#cksave'); pg.wait_for_timeout(400); ok('save circuit to library',len(pg.evaluate("JSON.parse(localStorage.mw_cms).circuits.items"))>=1)
    # ---- data admin (forms, no JSON) + quality
    def capform(model,idmm):
        pg.goto(U+'#/cms/data/capillary/new'); pg.wait_for_timeout(300)
        pg.select_option('#ff_refrigerant','R600a'); pg.select_option('#ff_application','LBP'); pg.fill('#ff_compModel',model); pg.fill('#ff_id_mm',idmm); pg.fill('#ff_length_m','3.2'); pg.select_option('#ff_srcClass','field'); pg.fill('#ff_srcRef','قياس ورشة اختبار'); pg.click('#rsv'); pg.wait_for_timeout(300)
    capform('TEST-1','0.7'); ok('admin adds capillary record via form',pg.evaluate("JSON.parse(localStorage.mw_lib).capillary.length")==1)
    capform('BAD','31'); ok('admin rejects inch-as-mm diameter with error next to field',pg.evaluate("JSON.parse(localStorage.mw_lib).capillary.length")==1 and pg.locator('[data-ff="id_mm"] .ferr').count()==1)
    pg.goto(U+'#/kit/capillary'); pg.wait_for_timeout(300); ok('capillary tool finds library record with source class',('TEST-1' in pg.inner_text('#clo')) and ('قياسات وتجارب' in pg.inner_text('#clo')))
    pg.goto(U+'#/cms/data'); pg.wait_for_timeout(300); ok('data overview lists 6 collections',pg.locator('.rc').count()==6)
    pg.goto(U+'#/kit/history'); pg.wait_for_timeout(300); ok('measurement history page',pg.locator('.hist-it').count()==1)
    # ---- legacy routes still work
    pg.goto(U+'#/tools/units'); pg.wait_for_timeout(300); ok('legacy #/tools still works',pg.locator('#uv').count()==1)
    for r in ['#/kit','#/kit/cycle','#/kit/circuit','#/kit/comp-compat','#/cms/data/capillary/new','#/kit/components/relay','#/kit/diag/ac-no-cool']:
        pg.goto(U+r); pg.wait_for_timeout(400); ok('no horizontal overflow 360px '+r,pg.evaluate("document.documentElement.scrollWidth")<=360)
    # ---- offline after fresh install
    ctx2=b.new_context(viewport={'width':360,'height':740}); o=ctx2.new_page(); o.on('pageerror',lambda e:errs.append('OFFLINE '+A(e)))
    o.goto(U); o.wait_for_function("navigator.serviceWorker.ready.then(()=>true)"); o.wait_for_timeout(1500)
    cached=o.evaluate("caches.keys().then(async k=>{const c=await caches.open(k[0]);return (await c.keys()).map(x=>x.url.split('/').pop())})")
    need={'eng-cms.js','cms.js','eng-units.js','eng-elec.js','eng-refrig.js','eng-comp.js','eng-circuit.js','eng-diag.js','eng-registry.js','kit-data.js','kit.js','kit2.js','circuit-ui.js','kit.css'}
    ok('SW precaches all new modules',need<=set(cached))
    ctx2.set_offline(True); o.reload(); o.wait_for_timeout(700)
    o.goto(U+'#/kit/pt'); o.wait_for_timeout(300); o.select_option('#rf','R22'); o.fill('#pp','4.5'); o.wait_for_timeout(200); ok('offline: PT tool works',('°C' in o.inner_text('#po')))
    o.goto(U+'#/kit/circuit/ckt-relay'); o.wait_for_timeout(400); o.click('[data-tab="res"]'); ok('offline: simulator works',('0.500 A' in o.inner_text('#ckpanel') or '500.0 mA' in o.inner_text('#ckpanel')))
    o.goto(U+'#/kit/comp-spec'); o.wait_for_timeout(300); o.fill('#csq','gl45'); o.wait_for_timeout(1500); ok('offline: compressor DB search in kit',o.locator('#csl button').count()>=1)
    print('console errors:',errs); b.close()
fails=[n for s,n in R if s=='FAIL']; print('\n%d FAILED of %d'%(len(fails),len(R)))

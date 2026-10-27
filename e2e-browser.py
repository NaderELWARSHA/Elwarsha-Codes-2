from playwright.sync_api import sync_playwright
import json
A=lambda s:str(s).encode('ascii','replace').decode()
U='http://localhost:8099/index.html'
json.dump({"faultCodes":[{"id":"x","deviceType":"غسالة","brand":"LG","code":"E7","title":"<img src=x onerror=window.PWN=1>","cause":"c","fix":"f","media":[]},{"kind":"test","deviceType":"غسالة","brand":"LG","title":"وضع الاختبار","enter":"اضغط","tests":"t","exit":"خروج"},{"code":""}]},open('/tmp/f.json','w'))
json.dump({"customCompressors":[{"brand":"سامسونج","model":"CD124H-L1Z2"},{"brand":"NEW","rec":{"model":"ZZ-1","hp":"1/5"}}]},open('/tmp/c.json','w'))
R=[]
def ok(n,c): R.append(('PASS' if c else 'FAIL',n))
SEED="""localStorage.mw_db=JSON.stringify({faults:[
{id:'a1',deviceType:'غسالة أوتوماتيك',brand:'LG',code:'E1',title:'عطل في الصرف',cause:'خرطوم مسدود\\nمضخة تالفة',fix:'افحص الخرطوم\\nافحص المضخة\\nاستبدل المضخة'},
{id:'a2',deviceType:'غسالة أوتوماتيك',brand:'سامسونج',code:'E12',title:'حساس مستوى الماء',cause:'الحساس معطل'},
{id:'a3',deviceType:'غسالة أوتوماتيك',brand:'سامسونج',code:'E1',title:'خطأ بابا',fix:'افحص القفل'},
{id:'a4',kind:'test',deviceType:'غسالة أوتوماتيك',brand:'LG',title:'وضع الاختبار',enter:'اضغط مع الاستمرار',exit:'افصل الكهرباء'}],custom:[]})"""
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':360,'height':740},accept_downloads=True); ctx.grant_permissions(['clipboard-read','clipboard-write']); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+A(e))); pg.on('console',lambda m:m.type=='error' and errs.append('CONSOLE '+A(m.text[:100]))); pg.on('requestfailed',lambda r:errs.append('NETFAIL '+A(r.url[-40:]))); pg.on('dialog',lambda d:d.accept())
    pg.goto(U); pg.wait_for_timeout(400); ok('home: 2 section tiles + bottom nav',pg.locator('.tile').count()==2 and pg.locator('#bn a').count()==4)
    pg.evaluate(SEED); pg.reload(); pg.wait_for_timeout(300)
    pg.goto(U+'#/faults'); pg.wait_for_timeout(300); ok('faults list cards',pg.locator('.rc').count()==3)
    pg.fill('#q','e1'); pg.wait_for_timeout(300); first=pg.locator('.rc .code').first.inner_text(); ok('ranking: exact code E1 before E12',first.strip()=='E1' and pg.locator('.rc .code').nth(2).inner_text().strip()=='E12')
    ok('highlight marks match',pg.locator('.rc mark').count()>=1); ok('match reason shown',pg.locator('.why').count()>=1)
    pg.fill('#q','e-1'); pg.wait_for_timeout(300); ok('dash/space-insensitive search',pg.locator('.rc').count()==3)
    pg.fill('#q','lg'); pg.wait_for_timeout(300); ok('search by brand',pg.locator('.rc').count()==1)
    pg.fill('#q','zzzz'); pg.wait_for_timeout(300); ok('empty state with suggestions',pg.locator('.empty').count()==1 and pg.locator('.empty .chip-btn').count()>=1)
    pg.click('#qx'); pg.wait_for_timeout(200); ok('clear search button',pg.input_value('#q')=='' and pg.locator('.rc').count()==3)
    pg.fill('#q','e1'); pg.select_option('#b','سامسونج'); pg.wait_for_timeout(300); ok('brand filter + reset button',pg.locator('.rc').count()==2 and pg.locator('#rf').is_visible())
    pg.locator('.rc').first.click(); pg.wait_for_timeout(300); ok('detail: sections + numbered steps',pg.locator('.sec').count()>=2)
    pg.click('.back'); pg.wait_for_timeout(300); ok('back keeps query and filter',pg.input_value('#q')=='e1' and pg.input_value('#b')=='سامسونج' and pg.locator('.rc').count()==2)
    pg.click('#rf'); pg.fill('#q',''); pg.locator('.rc').first.click(); pg.wait_for_timeout(300)
    pg.click('.cp.lbl'); pg.wait_for_timeout(300); ok('copy code toast + clipboard',pg.locator('#toast.on').count()==1 and pg.evaluate("navigator.clipboard.readText()").strip() in ('E1','E12'))
    pg.click('#fv'); pg.wait_for_timeout(200); pg.goto(U+'#/favs'); pg.wait_for_timeout(300); ok('favorites page shows item',pg.locator('.rc').count()>=1)
    pg.goto(U+'#/fault/a1'); pg.wait_for_timeout(200); ok('steps rendered as ordered list',pg.locator('ol.steps li').count()==3)
    pg.goto(U+'#/tests'); pg.wait_for_timeout(300); ok('test mode tab',pg.locator('.rc').count()==1); pg.locator('.rc').first.click(); pg.wait_for_timeout(300); ok('test detail has enter/exit sections',pg.locator('.sec').count()>=2)
    # admin flows
    pg.goto(U+'#/admin'); pg.wait_for_timeout(200); ok('admin open',pg.locator('#if').count()==1)
    pg.set_input_files('#if','/tmp/f.json'); pg.wait_for_timeout(300); ok('import preview',pg.locator('#ok').count()==1); pg.click('#ok'); pg.wait_for_timeout(300)
    n=lambda:pg.evaluate("JSON.parse(localStorage.mw_db).faults.length"); ok('imported 2 more',n()==6)
    pg.goto(U+'#/faults'); pg.fill('#q','e7'); pg.wait_for_timeout(300); ok('XSS not executed',pg.evaluate("window.PWN")is None and pg.locator('.rc').count()==1)
    pg.goto(U+'#/new/fault'); pg.fill('input[name=brand]','LG'); pg.fill('input[name=code]','E9'); pg.fill('input[name=title]','وصف'); pg.click('#f button'); pg.wait_for_timeout(300); ok('add fault',n()==7)
    pg.goto(U+'#/fault/'+pg.evaluate("JSON.parse(localStorage.mw_db).faults.slice(-1)[0].id")); pg.wait_for_timeout(200); pg.click('a[href^="#/edit"]'); pg.fill('input[name=title]','معدّل'); pg.click('#f button'); pg.wait_for_timeout(300); ok('edit',pg.evaluate("JSON.parse(localStorage.mw_db).faults.some(f=>f.title=='معدّل')"))
    pg.goto(U+'#/fault/'+pg.evaluate("JSON.parse(localStorage.mw_db).faults.slice(-1)[0].id")); pg.wait_for_timeout(200); pg.click('#del'); pg.wait_for_timeout(300); ok('delete',n()==6)
    # compressors
    pg.goto(U+'#/comps'); pg.wait_for_selector('#q',timeout=20000); pg.fill('#q','gl45'); pg.wait_for_timeout(500)
    ok('comp search + spec chips + units',pg.locator('.cc').count()>=1 and 'kcal/h' in pg.locator('.specs').first.inner_text())
    ok('alternatives box beside compressor',pg.locator('.cc .alt-box a').count()>=1)
    ok('exact model ranks first',pg.locator('.cc .code').first.inner_text().strip().upper().startswith('GL45'))
    pg.fill('#q',''); pg.wait_for_timeout(300); ok('capped at 100 + load more',pg.locator('.cc').count()==100 and pg.locator('#mb').count()==1)
    pg.click('#mb'); pg.wait_for_timeout(300); ok('load more adds 100',pg.locator('.cc').count()==200)
    pg.fill('#q','gl45'); pg.wait_for_timeout(300); c=pg.locator('.cmp'); c.nth(0).check(); c.nth(1).check(); ok('compare tray appears',pg.locator('#tray').count()==1)
    pg.click('#tray a'); pg.wait_for_timeout(500); ok('compare table with units',pg.locator('.cmpt').count()==1 and 'kcal/h' in pg.inner_text('.cmpt'))
    pg.click('#dif'); pg.wait_for_timeout(200); ok('diff-only toggle',pg.locator('#dif').count()==1)
    pg.goto(U+'#/comps'); pg.wait_for_timeout(600); pg.locator('a.cc-link').first.click(); pg.wait_for_timeout(500)
    ok('comp detail grouped sections',pg.locator('.sec').count()>=3); ok('alternatives collapsible in detail',pg.locator('.alt-box').count()==1)
    pg.click('.back'); pg.wait_for_timeout(600); ok('comp back keeps query',pg.input_value('#q')=='gl45')
    txt=pg.inner_text('#app'); ok('no source/trust wording',not any(w in txt for w in ['غير موثّق','مصدر المعلومة','بدون مصدر','مرجع النظام']))
    pg.goto(U+'#/comps'); pg.wait_for_selector('#q',timeout=20000); pg.fill('#q','GL45AA'); pg.wait_for_timeout(500); pg.locator('a.cc-link').first.click(); pg.wait_for_timeout(500)
    tot=int(pg.inner_text('#abn')); pg.click('.alt-more summary'); pg.wait_for_timeout(200); ok('detail shows ALL alternatives (%d)'%tot,pg.locator('.alt-box a[data-b]').count()==tot and tot>30)
    opts=pg.locator('#ab option'); ok('brand filter for alternatives',opts.count()>2); pg.select_option('#ab',index=1); pg.wait_for_timeout(200); vis=pg.locator('.alt-box a[data-b]:visible').count(); ok('filter narrows list and count',vis<tot and int(pg.inner_text('#abn'))==vis)
    pg.goto(U+'#/admin'); pg.wait_for_timeout(200); pg.set_input_files('#ic','/tmp/c.json'); pg.wait_for_timeout(1500); ok('comp import dup vs base',pg.locator('#ok').count()==1); pg.click('#ok'); pg.wait_for_timeout(300)
    with pg.expect_download() as d: pg.click('#xf')
    j=json.load(open(d.value.path(),encoding='utf8')); ok('export format',j['_meta']['kind']=='fault-codes-only')
    with pg.expect_download() as d: pg.click('#xb')
    bk=d.value.path(); pg.evaluate("localStorage.mw_db=JSON.stringify({faults:[],custom:[]})"); pg.reload(); pg.wait_for_timeout(300); pg.goto(U+'#/admin'); pg.wait_for_timeout(200)
    pg.set_input_files('#rf',{'name':'backup.json','mimeType':'application/json','buffer':open(bk,'rb').read()}); pg.wait_for_timeout(500); ok('restore from backup',n()==6)
    pg.set_input_files('#if',{'name':'bad.json','mimeType':'application/json','buffer':b'{x'}); pg.wait_for_timeout(300); ok('corrupt file rejected',n()==6)
    pg.reload(); pg.wait_for_timeout(300); ok('persist after reload',n()==6)
    pg.goto(U+'#/'); pg.click('[data-act=theme]'); d1=pg.evaluate("document.documentElement.getAttribute('data-theme')"); pg.reload(); pg.wait_for_timeout(300); ok('dark mode persists',d1=='dark' and pg.evaluate("document.documentElement.getAttribute('data-theme')")=='dark')
    pg.click('[data-act=search]'); pg.fill('#gsq','gl45'); pg.wait_for_timeout(1500); ok('global search both sections',pg.locator('#gsr .rc').count()>=1); pg.keyboard.press('Escape'); ok('search closes on Esc',pg.locator('#gs').count()==0)
    for r in ['#/','#/faults','#/comps','#/favs','#/settings','#/admin']:
        pg.goto(U+r); pg.wait_for_timeout(500); w=pg.evaluate("document.documentElement.scrollWidth")
        ok('no horizontal overflow 360px '+r,w<=360)
    ctx.set_offline(True); pg.wait_for_timeout(300); ok('offline banner',pg.locator('#net').count()==1); ctx.set_offline(False); pg.wait_for_timeout(300); ok('offline banner clears',pg.locator('#net').count()==0)
    ctx2=b.new_context(viewport={'width':1280,'height':800}); d2=ctx2.new_page(); d2.goto(U+'#/comps'); d2.wait_for_selector('#q',timeout=20000); d2.fill('#q','gl45'); d2.wait_for_timeout(500); ok('desktop layout 2 columns',d2.locator('.cards').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length")==2)
    # fresh-install offline test
    ctx3=b.new_context(viewport={'width':360,'height':740}); o=ctx3.new_page(); o.goto(U); o.evaluate("navigator.serviceWorker.ready.then(()=>1)"); 
    o.wait_for_function("navigator.serviceWorker.controller||true"); o.wait_for_timeout(500)
    cached=o.evaluate("caches.keys().then(async k=>{for(const n of k){const c=await caches.open(n);const r=await c.keys();return r.map(x=>x.url.split('/').pop())}return []})")
    ok('SW precached app + compressor DB on first install','compressors-base.js' in cached and 'app.js' in cached and 'ui.css' in cached)
    ctx3.set_offline(True); o.reload(); o.wait_for_timeout(800); ok('offline after fresh install: app opens',o.locator('.tile').count()==2)
    o.goto(U+'#/comps'); o.wait_for_selector('#q',timeout=15000); o.fill('#q','gl45'); o.wait_for_timeout(500); ok('offline after fresh install: compressor search works',o.locator('.cc').count()>=1)
    print('console/network errors:',errs); b.close()
for r in R: print(*r)
print(sum(1 for r in R if r[0]=='FAIL'),'FAILED of',len(R))

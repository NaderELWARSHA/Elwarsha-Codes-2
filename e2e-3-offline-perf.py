from playwright.sync_api import sync_playwright
import json,time,random
A=lambda s:str(s).encode('ascii','replace').decode()
U='http://localhost:8099/index.html'
R=[]
def ok(n,c): R.append(('PASS' if c else 'FAIL',n))
random.seed(1)
faults=[{"deviceType":"غسالة","brand":"LG" if i%3 else "سامسونج","code":"X%d"%i,"title":"سجل اختبار أداء رقم %d"%i,"cause":"c%d"%i,"fix":"f%d"%i} for i in range(7000)]
json.dump({"faultCodes":faults},open('/tmp/big_faults.json','w')); import os
size=os.path.getsize('/tmp/big_faults.json')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    # ---- offline after FRESH install: tools, flows, settings, favorites
    ctx=b.new_context(viewport={'width':360,'height':740}); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(A(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto(U); pg.wait_for_function("navigator.serviceWorker&&navigator.serviceWorker.controller||navigator.serviceWorker.ready.then(()=>true)"); pg.wait_for_timeout(1500)
    cached=pg.evaluate("caches.keys().then(async k=>{const c=await caches.open(k[0]);return (await c.keys()).map(x=>x.url.split('/').pop())})")
    need={'tools.js','att.js','app2.js','app.js','sync.js','core.js','ui.css','style.css','compressors-base.js','brand.js'}
    ok('SW precache has every runtime file (incl. new modules)',need<=set(cached))
    ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(700)
    ok('offline fresh install: home',pg.locator('.tile').count()==4)
    pg.goto(U+'#/tools/units'); pg.wait_for_timeout(300); pg.fill('#uv','1'); pg.select_option('#uu','kW'); pg.wait_for_timeout(200); ok('offline: unit converter works',('3412.142' in pg.inner_text('#uo')))
    pg.goto(U+'#/tools/elec'); pg.wait_for_timeout(300); pg.fill('#pv','12'); pg.fill('#pi','2'); pg.select_option('#pm','dc'); pg.wait_for_timeout(200); ok('offline: electrical tool works',('24' in pg.inner_text('#po')))
    pg.goto(U+'#/flows'); pg.wait_for_timeout(300); ok('offline: flows page',pg.locator('.empty').count()==1)
    pg.goto(U+'#/comps'); pg.wait_for_selector('#q',timeout=15000); pg.fill('#q','gl45'); pg.wait_for_timeout(500); ok('offline: compressor search + graded alternatives',pg.locator('.cc .alt-box').count()>=1)
    pg.locator('a.cc-link').first.click(); pg.wait_for_timeout(600); ok('offline: compressor detail with alternatives',pg.locator('.alt-g').count()>=1)
    ctx.set_offline(False)
    # ---- data survives clearing caches + unregistering SW (simulated app update)
    pg.goto(U+'#/new/fault'); pg.wait_for_timeout(500); pg.fill('input[name=code]','KEEP1'); pg.fill('input[name=title]','باقي'); pg.click('#f button.primary'); pg.wait_for_timeout(500)
    pg.evaluate("navigator.serviceWorker.getRegistrations().then(r=>Promise.all(r.map(x=>x.unregister())))"); pg.evaluate("caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x))))"); pg.reload(); pg.wait_for_timeout(800)
    ok('data survives SW unregister + cache wipe (update simulation)',pg.evaluate("JSON.parse(localStorage.mw_db).faults.some(f=>f.code=='KEEP1')"))
    # ---- big import performance (7000 faults)
    pg.goto(U+'#/admin'); pg.wait_for_timeout(300)
    t0=time.time(); pg.set_input_files('#if','/tmp/big_faults.json'); pg.wait_for_selector('#ok',timeout=30000); t_prev=time.time()-t0
    ok('import preview of 7000 records (%.1f MB) in <6s (%.2fs)'%(size/1048576,t_prev),t_prev<6 and 'سيُضاف 7000' in pg.inner_text('#rep') or '7000' in pg.inner_text('#rep'))
    t0=time.time(); pg.click('#ok'); pg.wait_for_function("JSON.parse(localStorage.mw_db).faults.length>=7001",timeout=30000); t_commit=time.time()-t0
    ok('import commit of 7000 records in <6s (%.2fs)'%t_commit,t_commit<6)
    pg.goto(U+'#/faults'); pg.wait_for_timeout(600)
    t0=time.time(); pg.fill('#q','x6999'); pg.wait_for_function("(()=>{const c=document.querySelector('.rc .code');return c&&c.textContent.trim()=='X6999'})()",timeout=5000); ts=time.time()-t0
    ok('search over 7000 faults returns exact match first in <1s (%.2fs)'%ts,ts<1 and 'X6999' in pg.locator('.rc .code').first.inner_text())
    pg.fill('#q','سجل اختبار'); pg.wait_for_timeout(800); ok('broad query renders only first 100 cards',pg.locator('.rc').count()==100 and pg.locator('#mb').count()==1)
    ok('state persisted without errors after big import',pg.evaluate("JSON.parse(localStorage.mw_db).faults.length")==7001)
    pg.goto(U+'#/admin'); pg.wait_for_timeout(300)
    with pg.expect_download() as d: pg.click('#xf')
    ok('export of 7001 faults',len(json.load(open(d.value.path(),encoding='utf8'))['faultCodes'])==7001)
    with pg.expect_download() as d: pg.click('#xb')
    bj=json.load(open(d.value.path(),encoding='utf8')); ok('full backup of large DB',len(bj['faults'])==7001 and bj['schema']==3)
    # quota exceeded: fill storage then try to add -> clear error, no false success, data intact
    pg.evaluate("(()=>{let k=0;for(const sz of [200000,20000,2000,200,20,2,1]){try{for(;k<100000;k++)localStorage.setItem('fill'+k,'y'.repeat(sz))}catch(e){}}})()")
    before=pg.evaluate("JSON.parse(localStorage.mw_db).faults.length"); msgs=[]; pg.on('dialog',lambda d:msgs.append(d.message))
    pg.goto(U+'#/new/fault'); pg.wait_for_timeout(500); pg.fill('input[name=code]','QUOTA'); pg.fill('input[name=title]','x'*200); pg.click('#f button.primary'); pg.wait_for_timeout(800)
    ok('storage full: clear error shown, no false success, existing data intact',any('تعذر الحفظ' in m for m in msgs) and pg.evaluate("JSON.parse(localStorage.mw_db).faults.length")==before and '#/new/fault' in pg.url)
    print('console errors:',errs); b.close()
for r in R: print(*r)
print(sum(1 for r in R if r[0]=='FAIL'),'FAILED of',len(R))

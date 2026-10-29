from playwright.sync_api import sync_playwright
import json,io
from PIL import Image
A=lambda s:str(s).encode('ascii','replace').decode()
U='http://localhost:8099/index.html'
R=[]
dl_msgs=[]
def ok(n,c): R.append(('PASS' if c else 'FAIL',n))
# test images: big PNG (needs compression), tiny jpg, and a fake "image"
im=Image.new('RGB',(2400,1800),(200,30,30)); 
for x in range(0,2400,40):
    for y in range(0,1800,40): im.putpixel((x,y),(x%255,y%255,100))
im.save('/tmp/big.png'); Image.new('RGB',(50,50),(0,100,200)).save('/tmp/small.jpg')
open('/tmp/fake.png','wb').write(b'not an image at all')
flow={"flows":[{"id":"w-e1","title":"مسار تجريبي E1","deviceType":"غسالة","brand":"LG","codes":["E1"],"safety":"افصل الكهرباء قبل أي فحص","status":"verified","srcRef":"DS-TEST","start":"s1","nodes":{"s1":{"text":"هل يعمل الجهاز؟","options":[{"t":"نعم","next":"s2"},{"t":"لا","next":"s3"}]},"s2":{"text":"قس الجهد","measure":"الجهد","expected":"حسب بيانات الجهاز","result":"انتهى المسار"},"s3":{"text":"افحص التغذية","result":"توقف"}}},{"id":"bad","title":"مسار تالف","safety":"","start":"zz","nodes":{}}]}
json.dump(flow,open('/tmp/flow.json','w'))
legacy={"faults":[{"code":"E5","title":"قديم","brand":"LG","extra":"keep"},{"id":"dup","code":"E6","title":"t"},{"id":"dup","code":"E7","title":"t"}],"custom":[{"brand":"B","rec":{"model":"LEG-1","weird":1}}]}
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':360,'height':740},accept_downloads=True); ctx.grant_permissions(['clipboard-read','clipboard-write']); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append('PAGEERR '+A(e))); pg.on('console',lambda m:m.type=='error' and errs.append('CONSOLE '+A(m.text[:100]))); pg.on('dialog',lambda d:(dl_msgs.append(d.message),d.accept()))
    # --- legacy migration (old DB without ver, missing/duplicate ids)
    pg.goto(U); pg.evaluate("localStorage.clear()"); pg.evaluate("localStorage.mw_db=JSON.stringify(%s)"%json.dumps(legacy)); pg.reload(); pg.wait_for_timeout(500)
    db=pg.evaluate("JSON.parse(localStorage.mw_db)"); ok('migration keeps all legacy records + unknown fields',len(db['faults'])==3 and db['faults'][0].get('extra')=='keep' and db['custom'][0]['rec'].get('weird')==1 and db['ver']==3)
    ok('migration unique ids + pre-migration snapshot saved',len({f['id'] for f in db['faults']})==3 and pg.evaluate("JSON.parse(localStorage.mw_bak).length")>=1)
    pg.evaluate("localStorage.removeItem('mw_db')"); pg.reload(); pg.wait_for_timeout(300)
    # --- tools
    pg.goto(U+'#/tools/units'); pg.wait_for_timeout(300); pg.fill('#uv','9000'); pg.select_option('#uu','BTU/h'); pg.wait_for_timeout(200); txt=pg.inner_text('#uo'); ok('unit converter 9000 BTU/h → 2.6376 kW and 2267.9 kcal/h',('2.6376' in txt) and ('2267.9' in txt))
    pg.fill('#uv','٩٠٠٠'); pg.wait_for_timeout(200); ok('Arabic-Indic digits accepted',('2.6376' in pg.inner_text('#uo')))
    pg.fill('#uv','-5'); pg.wait_for_timeout(200); ok('negative value rejected clearly',pg.locator('#uo .notice').count()==1); ok('HP not converted note shown','الحصان' in pg.inner_text('#tb'))
    pg.goto(U+'#/tools/elec'); pg.wait_for_timeout(300); pg.fill('#ov','230'); pg.fill('#or','46'); pg.wait_for_timeout(200); ok('Ohm: 230V/46Ω = 5 A',' 5 A' in pg.inner_text('#oo') or '5 A' in pg.inner_text('#oo'))
    pg.fill('#oi','1'); pg.wait_for_timeout(200); ok('Ohm: three values rejected',pg.locator('#oo .notice').count()==1)
    pg.fill('#pv','230'); pg.fill('#pi','5'); pg.fill('#pf','0.8'); pg.wait_for_timeout(200); t=pg.inner_text('#po'); ok('AC power: S=1150 P=920 Q=690 with formula+assumptions',all(x in t for x in ['1150','920','690','الافتراضات']))
    pg.fill('#pf','1.5'); pg.wait_for_timeout(200); ok('invalid PF rejected',pg.locator('#po .notice').count()==1)
    pg.goto(U+'#/tools/diff'); pg.wait_for_timeout(300); pg.fill('#dv','100\n110\n95'); pg.wait_for_timeout(200); t=pg.inner_text('#do'); ok('percent diff vs reference',('10' in t) and ('-5' in t))
    pg.goto(U+'#/tools/sensor'); pg.wait_for_timeout(300); ok('sensor tool: no default curve, explicit warning',pg.locator('#sn').count()==0 and 'لا يوجد منحنى افتراضي' in pg.inner_text('#tb'))
    pg.fill('#an','NTC-TEST'); pg.fill('#at','NTC'); pg.fill('#ap','0, 32000\n25, 10000\n50, 3600'); pg.click('#asv'); pg.wait_for_timeout(300); ok('user curve saved',pg.locator('#sn').count()==1)
    pg.fill('#sr','10000'); pg.wait_for_timeout(200); ok('sensor: 10000Ω → 25°C',pg.inner_text('#so').count('25')>=1); pg.fill('#sr','99999'); pg.wait_for_timeout(200); ok('sensor: out-of-range refused (no extrapolation)',pg.locator('#so .notice').count()==1)
    pg.fill('#ap','1 5\n2 3\n3 4'); pg.fill('#an','BAD'); pg.click('#asv'); pg.wait_for_timeout(200); ok('non-monotonic curve rejected',pg.locator('#ae .notice').count()==1)
    # --- flows
    pg.goto(U+'#/flows'); pg.wait_for_timeout(300); ok('no flows by default (nothing invented)',pg.locator('.empty').count()==1)
    with pg.expect_download() as d: pg.click('#ft')
    tj=json.load(open(d.value.path(),encoding='utf8')); ok('template downloadable and marked as example',tj['flows'][0]['title'].startswith('مثال'))
    pg.set_input_files('#ff','/tmp/flow.json'); pg.wait_for_timeout(300); ok('flow import preview: 1 valid, 1 rejected with reason','صالح 1' in pg.inner_text('#fr') and 'مرفوض 1' in pg.inner_text('#fr')); pg.click('#fok'); pg.wait_for_timeout(300)
    ok('valid flow imported, invalid not',pg.evaluate("JSON.parse(localStorage.mw_flows).length")==1)
    pg.evaluate("localStorage.mw_db=JSON.stringify({faults:[{id:'f1',deviceType:'غسالة',brand:'LG',code:'E1',title:'عطل'}],custom:[]})"); pg.reload(); pg.wait_for_timeout(400)
    pg.goto(U+'#/fault/f1'); pg.wait_for_timeout(300); ok('fault page offers matching flow',pg.locator('a[href^="#/flow/"]').count()==1)
    pg.click('a[href^="#/flow/"]'); pg.wait_for_timeout(300); ok('flow shows safety warning first','افصل الكهرباء' in pg.inner_text('.notice'))
    pg.click('[data-fo="0"]'); pg.wait_for_timeout(200); ok('flow: step with measure/expected',('الجهد' in pg.inner_text('#app')) and ('حسب بيانات الجهاز' in pg.inner_text('#app'))); pg.click('#fb'); pg.wait_for_timeout(200); ok('flow: back step works',pg.locator('[data-fo]').count()==2)
    pg.click('[data-fo="1"]'); pg.wait_for_timeout(200); ok('flow: terminal result',('توقف' in pg.inner_text('#app')) and pg.locator('[data-fo]').count()==0)
    # --- sources hidden by default, shown by setting; conflict flagged
    pg.goto(U+'#/edit/fault/f1'); pg.wait_for_timeout(500); pg.select_option('select[name=srcStatus]','conflict'); pg.fill('input[name=srcRef]','https://example.com/ds.pdf'); pg.fill('textarea[name=srcNote]','قيمتان مختلفتان'); pg.click('#f button.primary'); pg.wait_for_timeout(400)
    pg.goto(U+'#/fault/f1'); pg.wait_for_timeout(300); ok('sources hidden from users by default','المصدر والتحقق' not in pg.inner_text('#app'))
    pg.goto(U+'#/admin'); pg.wait_for_timeout(300); ok('quality report lists the conflict',pg.locator('details.sec summary',has_text='بيانات متعارضة').count()==1 and '(1)' in pg.locator('details.sec summary',has_text='بيانات متعارضة').inner_text())
    pg.goto(U+'#/settings'); pg.wait_for_timeout(300); pg.check('#o1'); pg.goto(U+'#/fault/f1'); pg.wait_for_timeout(300); t=pg.inner_text('#app'); ok('with setting ON: status + conflict note + source shown',('المصدر والتحقق' in t) and ('متعارضة' in t) and ('قيمتان مختلفتان' in t))
    pg.goto(U+'#/settings'); pg.uncheck('#o1')
    # --- change log + undo
    pg.goto(U+'#/new/fault'); pg.wait_for_timeout(500); pg.fill('input[name=code]','U1'); pg.fill('input[name=title]','للتراجع'); pg.click('#f button.primary'); pg.wait_for_timeout(400)
    n=lambda:pg.evaluate("JSON.parse(localStorage.mw_db).faults.length"); ok('added (2 faults)',n()==2)
    ok('change log recorded',pg.evaluate("JSON.parse(localStorage.mw_log)[0].a")=='إضافة'); pg.click('#und'); pg.wait_for_timeout(400); ok('undo restores previous state',n()==1)
    # --- attachments
    pg.goto(U+'#/edit/fault/f1'); pg.wait_for_timeout(500)
    open('/tmp/fake.txt','w').write('hello')
    pg.set_input_files('#atf','/tmp/fake.txt'); pg.wait_for_timeout(300); ok('wrong file type rejected at pick time',pg.locator('.att-it').count()==0)
    pg.set_input_files('#atf','/tmp/fake.png'); pg.wait_for_timeout(300); pg.click('#f button.primary'); pg.wait_for_timeout(800)
    ok('corrupt image (fake .png) blocks save with clear message, form + data intact',any('الملف ليس صورة صالحة' in m for m in dl_msgs) and ('#/edit/fault/f1' in pg.url) and pg.evaluate("JSON.parse(localStorage.mw_db).faults[0].imgs")is None and pg.locator('[data-ra]').count()==1)
    pg.click('[data-ra]'); pg.wait_for_timeout(200)
    pg.set_input_files('#atf',['/tmp/big.png','/tmp/small.jpg']); pg.wait_for_timeout(300); ok('two images queued',pg.locator('[data-ra]').count()==2)
    pg.locator('[data-ad="0"]').fill('مخطط التوصيل'); pg.click('#f button.primary'); pg.wait_for_timeout(1500)
    imgs=pg.evaluate("JSON.parse(localStorage.mw_db).faults[0].imgs"); ok('record references 2 attachment ids (not image data) in localStorage',imgs and len(imgs)==2 and pg.evaluate("localStorage.mw_db.length")<3000)
    info=pg.evaluate("""async()=>{const r=await ATT.get(%s);return {type:r.type,w:r.w,h:r.h,size:r.size,desc:r.desc}}"""%json.dumps(imgs[0])); ok('big PNG compressed to ≤1280px JPEG',info['type']=='image/jpeg' and max(info['w'],info['h'])<=1280 and info['size']<400000)
    pg.goto(U+'#/fault/f1'); pg.wait_for_selector('.gal img',timeout=5000); ok('gallery shows both thumbnails with description',pg.locator('.gal img').count()==2 and 'مخطط التوصيل' in pg.inner_text('.gal'))
    pg.click('.gal img >> nth=0'); pg.wait_for_timeout(200); ok('lightbox opens, zoom toggles, closes',pg.locator('#lb').count()==1); pg.click('#lb img'); ok('zoom class toggled',pg.locator('#lb img.zoom').count()==1); pg.click('.lbx'); ok('lightbox closed',pg.locator('#lb').count()==0)
    pg.set_input_files('#atf','/tmp/small.jpg') if False else None
    # duplicate image -> same id (dedupe)
    pg.goto(U+'#/edit/fault/f1'); pg.wait_for_timeout(500); pg.set_input_files('#atf','/tmp/small.jpg'); pg.wait_for_timeout(200); pg.click('#f button.primary'); pg.wait_for_timeout(1200)
    ok('same image not stored twice',pg.evaluate("ATT.usage().then(x=>x.count)")==2 and len(pg.evaluate("JSON.parse(localStorage.mw_db).faults[0].imgs"))==2)
    # backup with attachments -> wipe -> restore
    pg.goto(U+'#/admin'); pg.wait_for_timeout(300)
    with pg.expect_download() as dd: pg.click('#xb')
    bpath=dd.value.path(); bj=json.load(open(bpath,encoding='utf8')); ok('backup v3 includes 2 attachments',bj['schema']==3 and len(bj['attachments'])==2)
    pg.evaluate("indexedDB.deleteDatabase('mw_att')"); pg.evaluate("localStorage.mw_db=JSON.stringify({faults:[],custom:[]})"); pg.reload(); pg.wait_for_timeout(500); pg.goto(U+'#/admin'); pg.wait_for_timeout(300)
    pg.set_input_files('#rf',{'name':'b.json','mimeType':'application/json','buffer':open(bpath,'rb').read()}); pg.wait_for_timeout(2000)
    ok('restore brings records back',pg.evaluate("JSON.parse(localStorage.mw_db).faults.length")==1)
    pg.goto(U+'#/fault/f1'); pg.wait_for_selector('.gal img',timeout=5000); ok('restored attachments display after restore',pg.locator('.gal img').count()==2)
    # corrupt attachment in backup rejected, data intact
    bj['attachments'][0]['data']='<script>alert(1)</script>'; pg.goto(U+'#/admin'); pg.wait_for_timeout(300)
    pg.set_input_files('#rf',{'name':'b2.json','mimeType':'application/json','buffer':json.dumps(bj).encode()}); pg.wait_for_timeout(600); ok('corrupt attachment backup rejected, data intact',pg.evaluate("JSON.parse(localStorage.mw_db).faults.length")==1)
    # deleting record sweeps its attachments
    pg.goto(U+'#/fault/f1'); pg.wait_for_timeout(300); pg.click('#del'); pg.wait_for_timeout(1200); ok('deleting record removes orphan attachments',pg.evaluate("ATT.usage().then(x=>x.count)")==0)
    # --- compressors: graded alternatives, refrigerant filter, compare copy + compat row, debug timing
    pg.goto(U+'#/comps'); pg.wait_for_selector('#q',timeout=20000); pg.fill('#q','GL45AA'); pg.wait_for_timeout(500); pg.locator('a.cc-link').first.click(); pg.wait_for_timeout(600)
    ok('alternatives grouped by compatibility level',pg.locator('.alt-g summary').count()>=1 and any(x in pg.inner_text('.alt-box') for x in ['بديل محتمل','تشابه جزئي']))
    pg.locator('.alt-it summary').first.click(); pg.wait_for_timeout(200); ok('each alternative explains reasons/missing data',('✅' in pg.inner_text('.alt-why')) and ('❓' in pg.inner_text('.alt-why') or '⚠️' in pg.inner_text('.alt-why')))
    pg.goto(U+'#/comps'); pg.wait_for_selector('#g',timeout=15000); pg.fill('#q',''); pg.select_option('#g','R600A'); pg.wait_for_timeout(500); ok('refrigerant filter combines with search',pg.locator('.cc').count()>=1 and all('r600a' in t.lower().replace(' ','').replace('-','') for t in pg.locator('.cc .specs').all_inner_texts()[:8]))
    pg.fill('#q','gl45aa'); pg.wait_for_timeout(500); ok('filter + search combine: GL45AA (R134a) not shown under R600A, empty state offers help',pg.locator('.cc').count()==0 and pg.locator('.empty').count()==1)
    pg.click('#rf'); pg.goto(U+'#/settings'); pg.wait_for_timeout(300); pg.check('#o2'); pg.goto(U+'#/comps'); pg.wait_for_selector('#q',timeout=15000); pg.fill('#q','GL45'); pg.wait_for_timeout(400); ok('debug mode shows search time',' ms' in pg.inner_text('#meta') or 'ms' in pg.inner_text('#meta'))
    pg.goto(U+'#/settings'); pg.uncheck('#o2')
    pg.goto(U+'#/comps'); pg.wait_for_selector('#q',timeout=15000); pg.fill('#q','gl45'); pg.wait_for_timeout(300); c=pg.locator('.cmp'); c.nth(0).check(); c.nth(1).check(); pg.click('#tray a'); pg.wait_for_timeout(500)
    ok('compare has compatibility row',('التوافق مع الكباس الأول' in pg.inner_text('.cmpt'))); pg.click('#cpc'); pg.wait_for_timeout(200); clip=pg.evaluate("navigator.clipboard.readText()"); ok('compare copies a text report with note',('مقارنة الكباسات' in clip) and ('قرار الاستبدال' in clip))
    for r in ['#/tools','#/tools/elec','#/flows','#/admin','#/settings']:
        pg.goto(U+r); pg.wait_for_timeout(500); ok('no horizontal overflow 360px '+r,pg.evaluate("document.documentElement.scrollWidth")<=360)
    print('console errors:',errs); b.close()
for r in R: print(*r)
print(sum(1 for r in R if r[0]=='FAIL'),'FAILED of',len(R))

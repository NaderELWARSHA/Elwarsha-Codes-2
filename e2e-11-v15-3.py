"""اختبارات v15.3 في المتصفح: «📦 نشر المرجع للكل» — صاحب البرنامج ينزّل data-pack.json من الإدارة،
وأي جهاز تاني يفتح البرنامج ياخد المرجع لوحده (دمج ثلاثي: تعديلاته ومسحه محفوظين)، وجهاز صاحب
البرنامج نفسه ما يتكررش عنده حاجة. الملف بيتقدّم من خلال page.route عشان ما نلمسش ملف المشروع."""
from playwright.sync_api import sync_playwright
import e2e_fixture
import json, os, tempfile
A = lambda s: str(s).encode('ascii', 'replace').decode()
U = 'http://localhost:8099/index.html'
R = []
def ok(n, c): R.append(('PASS' if c else 'FAIL', n)); print(('PASS ' if c else 'FAIL ') + A(n))
TMP = tempfile.mkdtemp()
SEED = """()=>{localStorage.mw_db=JSON.stringify({ver:3,faults:[
  {id:'a1',deviceType:'غسالة',brand:'شارب (Sharp)',code:'E1',title:'عطل الصرف',fix:'افحص الطلمبة',source:'imported',srcRef:'دليل X، ص 3',imgs:['img_own']},
  {id:'a2',deviceType:'غسالة',brand:'شارب (Sharp)',code:'E2',title:'عطل الباب',source:'imported'},
  {id:'t1',kind:'test',deviceType:'غسالة',brand:'شارب (Sharp)',title:'تيست مود',enter:'اضغط',tests:'x'}],
  custom:[{id:'c1',brand:'باناسونيك',rec:{model:'QBTEST1',refrigerant:'R134a'}}]});
 localStorage.mw_meas=JSON.stringify([{id:'m1',tool:'ohm',text:'قياس سري'}]);localStorage.mw_fav=JSON.stringify([{h:'#/fault/a1',t:'E1'}]);
 localStorage.mw_flows=JSON.stringify([{id:'fl1',title:'مساري',start:'n1',nodes:{n1:{q:'?',opts:[]}}}])}"""

def serve(ctx, pack):
    ctx.unroute('**/data-pack.json')
    ctx.route('**/data-pack.json', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(pack, ensure_ascii=False)))

with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    def page(ctx):
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('PAGEERR ' + A(e))); pg.on('console', lambda m: m.type == 'error' and errs.append('CONSOLE ' + A(m.text[:160]))); pg.on('dialog', lambda d: d.accept()); return pg
    # ---------- صاحب البرنامج ----------
    oc = b.new_context(viewport={'width': 360, 'height': 760}, accept_downloads=True, service_workers='block'); op = page(oc)
    op.goto(U); op.wait_for_timeout(500); op.evaluate(SEED); op.reload(); op.wait_for_timeout(500)
    op.goto(U + '#/admin'); op.wait_for_timeout(800); t = op.inner_text('#app')
    ok('admin shows «📦 نشر المرجع للكل» with counts', '📦 نشر المرجع للكل' in t and 'أكواد الأعطال (2) والتيست مود (1)' in t and 'الكباسات المضافة (1)' in t)
    ok('admin says what is NOT published', 'القياسات' in t and 'قفل الإدارة' in t)
    op.fill('#pkn', 'نسخة تجربة')
    with op.expect_download() as d: op.click('#pkgo')
    path = os.path.join(TMP, 'data-pack.json'); d.value.save_as(path); P1 = json.load(open(path, encoding='utf-8'))
    ok('downloaded file is named data-pack.json', d.value.suggested_filename == 'data-pack.json')
    ok('pack has the data and the note', P1['format'] == 'mrf-pack' and len(P1['faults']) == 3 and len(P1['custom']) == 1 and P1['note'] == 'نسخة تجربة' and len(P1['flows']) == 1)
    raw = json.dumps(P1, ensure_ascii=False)
    ok('pack has nothing personal (measurements, favorites, photos, admin)', 'قياس سري' not in raw and 'img_own' not in raw and 'mw_fav' not in raw and 'hash' not in json.dumps(P1.get('lists', {})))
    # صاحب البرنامج يفتح البرنامج والحزمة منشورة: ولا تكرار
    serve(oc, P1); op.goto(U + '#/faults'); op.reload(); op.wait_for_timeout(1200)
    ok('owner device: own pack adds nothing (no duplicates)', op.evaluate("JSON.parse(localStorage.mw_db).faults.length") == 3 and op.evaluate("JSON.parse(localStorage.mw_pack).ver") == P1['ver'])
    ok('owner keeps his photos', op.evaluate("JSON.parse(localStorage.mw_db).faults.find(f=>f.id=='a1').imgs[0]") == 'img_own')
    # ---------- جهاز حد تاني ----------
    uc = b.new_context(viewport={'width': 360, 'height': 760}, service_workers='block'); serve(uc, P1); up = page(uc)
    up.goto(U); up.wait_for_timeout(1500)
    F = up.evaluate("JSON.parse(localStorage.mw_db).faults")
    ok('another device gets the reference automatically', len(F) == 3 and up.evaluate("JSON.parse(localStorage.mw_db).custom.length") == 1 and up.evaluate("JSON.parse(localStorage.mw_flows).length") == 1)
    ok('…without the owner personal data', up.evaluate("localStorage.mw_meas||'[]'") == '[]' and 'img_own' not in json.dumps(F, ensure_ascii=False))
    up.goto(U + '#/fault/a1'); up.wait_for_timeout(400); ok('record shows «📚 من المرجع»', '📚 من المرجع' in up.inner_text('#app'))
    # المستخدم: يعدّل a2، يمسح t1، ويضيف سجله
    up.evaluate("""()=>{const d=JSON.parse(localStorage.mw_db);d.faults=d.faults.filter(f=>f.id!='t1').map(f=>f.id=='a2'?{...f,fix:'تعديلي أنا'}:f);d.faults.push({id:'mine',deviceType:'غسالة',brand:'LG',code:'OE',title:'سجلي'});localStorage.mw_db=JSON.stringify(d)}""")
    up.reload(); up.wait_for_timeout(600)
    up.goto(U + '#/fault/a2'); up.wait_for_timeout(300); ok('edited record no longer marked as reference', '📚 من المرجع' not in up.inner_text('#app'))
    # صاحب البرنامج ينشر نسخة أحدث
    P2 = json.loads(raw); P2['ver'] = '2026-12-01T00:00:00.000Z'
    for f in P2['faults']:
        if f['id'] == 'a1': f['fix'] = 'حل أحدث من الشركة'
        if f['id'] == 'a2': f['fix'] = 'حل صاحب البرنامج'
    P2['faults'].append({'id': 'a3', 'deviceType': 'غسالة', 'brand': 'شارب (Sharp)', 'code': 'E3', 'title': 'جديد'}); P2['custom'] = []
    serve(uc, P2); up.goto(U + '#/faults'); up.reload(); up.wait_for_timeout(1500)
    G = {f['id']: f for f in up.evaluate("JSON.parse(localStorage.mw_db).faults")}
    ok('update: new record added, untouched record updated', 'a3' in G and G['a1']['fix'] == 'حل أحدث من الشركة')
    ok('update: user edit kept, user delete respected, user own record kept', G['a2']['fix'] == 'تعديلي أنا' and 't1' not in G and 'mine' in G)
    ok('update: compressor removed from the reference is removed', up.evaluate("JSON.parse(localStorage.mw_db).custom.length") == 0)
    ok('update logged and can be undone (snapshot)', 'تحديث المرجع' in (up.evaluate("localStorage.mw_log") or '') and len(json.loads(up.evaluate("localStorage.mw_bak") or '[]')) >= 1)
    n0 = len(G); up.reload(); up.wait_for_timeout(1200); ok('same pack again: nothing changes', len(up.evaluate("JSON.parse(localStorage.mw_db).faults")) == n0)
    # حزمة تالفة ما تلمسش حاجة
    serve(uc, {'format': 'x', 'ver': 'bad', 'faults': []}); up.reload(); up.wait_for_timeout(1000)
    ok('broken pack is ignored', len(up.evaluate("JSON.parse(localStorage.mw_db).faults")) == n0)
    ok('no console/page errors', not errs)
    for e in errs: print(e)
    b.close()
print(f"\n{sum(1 for r in R if r[0]=='PASS')} نجح، {sum(1 for r in R if r[0]=='FAIL')} فشل")

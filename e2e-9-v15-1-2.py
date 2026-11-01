"""اختبارات v15.1.2 في المتصفح: بيانات قديمة («تورنيدو» بالعربي، كود E2، موديل مكتوب بشكل تاني)
+ استيراد نسخة أحدث من نفس المصدر → الكاشف يلاقي التكرار، والاستيراد يقدر يعلّم كل الشبيه،
وشاشة «🧹 تنظيف بيانات قديمة» تشيل القديم وتخلي الجديد، وتنقل المفضلة والصور، وتتراجع."""
from playwright.sync_api import sync_playwright
import e2e_fixture
import json, os, tempfile
A = lambda s: str(s).encode('ascii', 'replace').decode()
U = 'http://localhost:8099/index.html'
R = []
def ok(n, c): R.append(('PASS' if c else 'FAIL', n)); print(('PASS ' if c else 'FAIL ') + A(n))
TMP = tempfile.mkdtemp()
REF = "ELARABY — دليل، ص "
NEW = {"faultCodes": [
  {"deviceType": "غسالة", "brand": "تورنيدو (Tornado)", "category": "تحميل علوي", "model": "TWT–TLD (DDM)", "code": "E1", "title": "عطل في عملية الصرف", "fix": "افحص الطلمبة", "srcStatus": "manufacturer", "srcRef": REF + "73"},
  {"deviceType": "غسالة", "brand": "توشيبا (Toshiba)", "category": "تحميل علوي", "model": "AEW–9770, 9790, 1190", "code": "E2 (E21, E23)", "title": "عطل الباب", "fix": "افحص الباب", "srcStatus": "manufacturer", "srcRef": REF + "54"},
  {"deviceType": "غسالة", "brand": "تورنيدو (Tornado)", "category": "تحميل أمامي", "model": "TWV (T1)", "kind": "test", "title": "Auto test (AU)", "enter": "اضغط", "tests": "x", "srcRef": REF + "108"},
  {"deviceType": "غسالة", "brand": "تورنيدو (Tornado)", "category": "تحميل أمامي", "model": "TWV (T2)", "kind": "test", "title": "Auto test (AU)", "enter": "اضغط", "tests": "y", "srcRef": REF + "109"}]}
NP = os.path.join(TMP, 'new.json'); json.dump(NEW, open(NP, 'w'), ensure_ascii=False)
SEED = """()=>{localStorage.mw_db=JSON.stringify({ver:3,faults:[
  {id:'o1',deviceType:'غسالة',brand:'تورنيدو',category:'فوق أوتوماتيك',model:'TWT-TLD',code:'E-1',title:'صرف',source:'imported',imgs:['img_o1']},
  {id:'o2',deviceType:'غسالة',brand:'توشيبا',model:'AEW-9790',code:'E2',title:'باب',source:'imported'},
  {id:'o3',deviceType:'غسالة',brand:'تورنيدو',code:'E77',title:'قديم من غير مقابل',source:'imported'},
  {id:'o4',deviceType:'غسالة',brand:'تورنيدو',code:'E88',title:'إضافة يدوية',source:'manual'},
  {id:'o5',deviceType:'غسالة',brand:'إل جي (LG)',code:'E1',title:'ماركة تانية'}],custom:[]});
 localStorage.mw_fav=JSON.stringify([{h:'#/fault/o1',t:'E1 تورنيدو'}])}"""

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 740}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + A(e))); pg.on('console', lambda m: m.type == 'error' and errs.append('CONSOLE ' + A(m.text[:160])))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(U); pg.wait_for_timeout(600); pg.evaluate(SEED); pg.reload(); pg.wait_for_timeout(500)
    # الاستيراد: النسخة الأحدث شبيهة بالقديم
    pg.goto(U + '#/import'); pg.wait_for_timeout(400); pg.click('[data-ik="fault"]'); pg.wait_for_timeout(200); pg.set_input_files('#imf', NP); pg.wait_for_timeout(1500)
    t = pg.inner_text('#imstep')
    ok('import: «تورنيدو» القديم = «تورنيدو (Tornado)» الجديد → شبيه (2)، والتيست مود لموديلين مختلفين جديد', 'شبيه: 2' in t and 'جديد: 2' in t)
    pg.click('#imnall'); pg.wait_for_timeout(200)
    ok('«علّم كل الشبيه» يعلّم كل الصفوف', pg.locator('[data-nr]:checked').count() == 2)
    pg.click('#imok'); pg.wait_for_timeout(800)
    F = pg.evaluate("JSON.parse(localStorage.mw_db).faults")
    ok('الأربعة اتضافوا', len(F) == 9)
    ok('رسالة النجاح فيها رابط التنظيف', pg.locator('#imstep a[href="#/clean"]').count() == 1)
    # الكاشف
    pg.goto(U + '#/dups'); pg.wait_for_timeout(1500); t = pg.inner_text('#app')
    ok('الكاشف يلاقي القديم والجديد (تورنيدو/E1 و توشيبا/E2)', pg.locator('.dup-g').count() >= 2 and 'E-1' in t and 'E2 (E21, E23)' in t)
    ok('صفحة الكاشف فيها رابط التنظيف', pg.locator('a[href="#/clean"]').count() >= 1)
    # التنظيف
    pg.goto(U + '#/clean'); pg.wait_for_timeout(800); t = pg.inner_text('#app')
    ok('التنظيف: هيفضل 4، قديم ليه نسخة 2، من غير مقابل 2', 'هيفضل: 4' in t and 'قديم ليه نسخة جديدة: 2' in t and 'من غير مقابل: 2' in t)
    ok('الإضافة اليدوية مش متعلّمة، والمستورد متعلّم', pg.locator('[data-cl="o4"]').is_checked() is False and pg.locator('[data-cl="o3"]').is_checked() and pg.locator('[data-cl="o1"]').is_checked())
    ok('عداد الحذف = 3', pg.inner_text('#cln') == '3')
    ok('ماركة تانية ما ظهرتش', pg.locator('[data-cl="o5"]').count() == 0)
    with pg.expect_download() as d: pg.click('#clx')
    ok('تصدير القائمة Excel', d.value.suggested_filename.endswith('.xlsx'))
    pg.click('#clgo'); pg.wait_for_timeout(800)
    F = {x['id']: x for x in pg.evaluate("JSON.parse(localStorage.mw_db).faults")}
    ok('اتحذف القديم (o1,o2,o3) وفضل اليدوي وLG والجديد', len(F) == 6 and not {'o1', 'o2', 'o3'} & set(F) and {'o4', 'o5'} <= set(F))
    n1 = [x for x in F.values() if x.get('code') == 'E1' and 'Tornado' in x.get('brand', '')][0]
    ok('صورة القديم اتنقلت للجديد', 'img_o1' in (n1.get('imgs') or []))
    ok('المفضلة اتحولت للسجل الجديد', json.loads(pg.evaluate("localStorage.mw_fav"))[0]['h'] == '#/fault/' + n1['id'])
    ok('بعد الحذف: يفضل بس اليدوي', 'من غير مقابل: 1' in pg.inner_text('#app') and 'قديم ليه نسخة جديدة: 0' in pg.inner_text('#app'))
    ok('اتسجل في سجل التغييرات', 'تنظيف بيانات قديمة' in (pg.evaluate("localStorage.mw_log") or ''))
    ok('فيه نسخة للتراجع', len(json.loads(pg.evaluate("localStorage.mw_bak") or '[]')) >= 1)
    sw = pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    ok('مفيش تمرير أفقي على 360px', sw)
    ok('مفيش أخطاء كونسول', not errs)
    for e in errs: print(e)
    b.close()
print(f"\n{sum(1 for r in R if r[0]=='PASS')} نجح، {sum(1 for r in R if r[0]=='FAIL')} فشل")

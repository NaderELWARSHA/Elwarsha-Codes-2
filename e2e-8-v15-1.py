"""اختبارات v15.1 في المتصفح: كاشف التكرار، الدمج، الاستيراد من Excel/CSV/JSON مع «كمّل الناقص»،
تصدير Excel وقوالبه، وتنبيه التكرار في نموذج الإضافة."""
from playwright.sync_api import sync_playwright
import e2e_fixture
import json, os, tempfile
import openpyxl
def X(d):
    path = os.path.join(TMP, d.value.suggested_filename or 'f.xlsx'); d.value.save_as(path); return openpyxl.load_workbook(path)
A = lambda s: str(s).encode('ascii', 'replace').decode()
U = 'http://localhost:8099/index.html'
R = []
def ok(n, c): R.append(('PASS' if c else 'FAIL', n)); print(('PASS ' if c else 'FAIL ') + A(n))
TMP = tempfile.mkdtemp()
SEED = """()=>{localStorage.mw_db=JSON.stringify({ver:3,faults:[
  {id:'f1',deviceType:'غسالة',brand:'إل جي (LG)',code:'E-1',title:'مشكلة مياه',cause:'محبس مقفول'},
  {id:'f2',deviceType:'غسالة',brand:'LG',code:'e1',title:'مشكلة مياه',fix:'افحص المحبس\\nافحص الفلتر',cause:'ضغط مياه ضعيف'},
  {id:'f3',deviceType:'غسالة',brand:'إل جي (LG)',code:'E01',title:'دخول مياه'},
  {id:'f4',deviceType:'ثلاجة',brand:'شارب',code:'H1',title:'حساس'}],
 custom:[{id:'c1',brand:'امبراكو',rec:{model:'ZZTEST1',refrigerant:'R600a'}},{id:'c2',brand:'امبراكو',rec:{model:'ZZ TEST 1',hp:'1/4'}},{id:'c3',brand:'باناسونيك',rec:{model:'QB51C74GAW5'}},{id:'c9',brand:'باناسونيك',rec:{model:'QB66C15GAX6',refrigerant:'R134a'}}]});
 localStorage.mw_fav=JSON.stringify([{h:'#/fault/f2',t:'E1 LG'}]);localStorage.mw_rv=JSON.stringify([{h:'#/fault/f2',t:'E1'}])}"""

# ملفات الاختبار
wb = openpyxl.Workbook(); ws = wb.active; ws.title = "QB"
for r in [["Panasonic Compressor R134a QB series"], ["Voltage", "Model", "Displacement cm3", "Capacity (W)", None, None, "C.O.P.", None, "Oil charge cm3"],
          [None, None, None, "-25°C", "-23.3°C", "-20°C", "NO", "YES", None],
          ["100V 50/60Hz", "QB57C88RA00", 5.65, 161, 178, 213, 1.27, 1.33, 250], [None, "QB66C12CA00", 6.55, 164, 185, 219, 1.19, "-", 250],
          ["220V 60Hz", "QB66C15GAX6", 6.55, 183, 200, 236, 1.24, "-", 250], [None, "QB51C74GAW5", 5.1, 116, 128, 153, 1.21, "-", 250],
          [None, "QB57C88RAOO", 5.65, 161, 178, 213, 1.27, 1.33, 250], [None, "QB66C12CA00", 6.55, 164, 185, 219, 1.19, "-", 250]]: ws.append(r)
ws2 = wb.create_sheet("تانية"); ws2.append(["x"])
CATX = os.path.join(TMP, 'catalog.xlsx'); wb.save(CATX)
wb = openpyxl.Workbook(); w = wb.active
for r in [["الماركة", "نوع الجهاز", "كود العطل", "الوصف", "الأسباب", "الحل"], ["سامسونج", "غسالة", "4C", "مشكلة مياه", "محبس مقفول", "افحص الفلتر"], [None, None, "LE", "تسريب", "", ""], ["شارب", "ثلاجة", "H1", "حساس", "", "قِس الحساس"], [None, None, "", "صف بدون كود", "", ""]]: w.append(r)
FX = os.path.join(TMP, 'faults.xlsx'); wb.save(FX)
CSVP = os.path.join(TMP, 'comps.csv'); open(CSVP, 'w', encoding='utf-8-sig').write('Brand;Model;Refrigerant;HP;Cooling capacity (kcal/h)\nكوبلاند;KCJ444HAE;R-22;1/2;"1,250"\n')
JSP = os.path.join(TMP, 'c.json'); json.dump({"customCompressors": [{"brand": "تست", "rec": {"model": "JSON-1", "refrigerant": "R134a"}}]}, open(JSP, 'w'), ensure_ascii=False)

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 740}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + A(e))); pg.on('console', lambda m: m.type == 'error' and errs.append('CONSOLE ' + A(m.text[:160])))
    dlg = {'accept': True, 'msgs': []}
    def on_dialog(d): dlg['msgs'].append(d.message); d.accept() if dlg['accept'] else d.dismiss()
    pg.on('dialog', on_dialog)
    over = lambda: pg.evaluate("document.documentElement.scrollWidth>innerWidth+1")
    pg.goto(U); pg.wait_for_timeout(600); pg.evaluate(SEED); pg.reload(); pg.wait_for_timeout(500)

    # ================= كاشف التكرار =================
    pg.goto(U + '#/admin'); pg.wait_for_timeout(500)
    ok('admin shows duplicates entry with a count + import + Excel export', pg.locator('#admdup .chip').count() == 1 and pg.locator('a[href="#/import"]').count() >= 1 and pg.locator('#xfx').count() == 1)
    ok('quality report links to the duplicate detector', pg.locator('details.sec a[href="#/dups"]').count() == 1)
    pg.goto(U + '#/dups'); pg.wait_for_timeout(2500); t = pg.inner_text('#app')
    ok('faults: «إل جي (LG) E-1» and «LG e1» = confirmed duplicate', pg.locator('.dup-g.exact', has_text='E-1').count() == 1 and 'e1 — LG' in pg.inner_text('.dup-g.exact >> nth=0'))
    ok('faults: E01 shown as «شبيه» with a reason', pg.locator('.dup-g.near', has_text='E01').count() == 1 and 'متقارب' in pg.inner_text('.dup-g.near >> nth=0'))
    ok('compressors: «ZZ TEST 1» = «ZZTEST1» confirmed; QB51C74GAW5 flagged as already in the base DB', pg.locator('.dup-g.exact', has_text='ZZTEST1').count() == 1 and pg.locator('.dup-g.base', has_text='QB51C74GAW5').count() == 1)
    ok('delete for base duplicates is tucked under «⋯ خيارات أكتر»', pg.locator('.dup-g.base details.more [data-delc]').count() >= 1 and not pg.locator('.dup-g.base [data-delc]').first.is_visible())
    ok('no horizontal scroll on duplicates page (360px)', not over())
    n0 = pg.locator('.dup-g').count(); pg.locator('.dup-g.near [data-ign]').first.click(); pg.wait_for_timeout(1800)
    ok('«مش مكرر — تجاهل» hides the group and can be restored', pg.locator('.dup-g').count() == n0 - 1 and pg.locator('#dpclr').count() == 1)
    pg.click('#dpclr'); pg.wait_for_timeout(1800); ok('restore ignored groups', pg.locator('.dup-g').count() == n0)

    # ================= الدمج =================
    pg.goto(U + '#/merge/f/f1/f2'); pg.wait_for_timeout(500)
    ok('merge screen: only differing fields, with smart defaults (cause = الاتنين, fix from (2))', pg.locator('.mg-row').count() == 3 and pg.locator('[name="m_cause"][value="both"]').is_checked() and pg.locator('[name="m_fix"][value="b"]').is_checked())
    ok('merge screen fits 360px', not over())
    pg.click('#mgok'); pg.wait_for_timeout(700)
    F = {x['id']: x for x in pg.evaluate("JSON.parse(localStorage.mw_db).faults")}
    ok('after merge: (2) removed, (1) kept with combined causes and fix', 'f2' not in F and F['f1']['cause'] == 'محبس مقفول\nضغط مياه ضعيف' and F['f1']['fix'].startswith('افحص المحبس'))
    ok('favorites and recent links moved to the kept record', json.loads(pg.evaluate("localStorage.mw_fav"))[0]['h'] == '#/fault/f1' and json.loads(pg.evaluate("localStorage.mw_rv"))[0]['h'] == '#/fault/f1')
    ok('merge logged and undo snapshot taken', 'دمج' in pg.evaluate("localStorage.mw_log") and len(json.loads(pg.evaluate("localStorage.mw_bak"))) >= 1)
    pg.goto(U + '#/merge/f/f1/f2'); pg.wait_for_timeout(300); ok('merging an already-removed record shows a clear message', 'مش موجود' in pg.inner_text('#app'))
    pg.goto(U + '#/comps'); pg.wait_for_timeout(2500)
    pg.goto(U + '#/merge/c/c1/c2'); pg.wait_for_timeout(1200); pg.click('#mgok'); pg.wait_for_timeout(800)
    C = pg.evaluate("JSON.parse(localStorage.mw_db).custom"); c1 = [c for c in C if c['id'] == 'c1']
    ok('compressor merge: one record left with both fields (R600a + 1/4 HP)', len([c for c in C if c['id'] in ('c1', 'c2')]) == 1 and c1 and c1[0]['rec'].get('hp') == '1/4' and c1[0]['rec'].get('refrigerant') == 'R600a')

    # ================= الاستيراد =================
    pg.goto(U + '#/import'); pg.wait_for_timeout(400); pg.set_input_files('#imf', CATX); pg.wait_for_timeout(2500)
    ok('Excel import: multi-sheet picker + header on two rows detected + capacity unit W recognized', pg.locator('#imsh option').count() == 2 and 'عنوان على صفين' in pg.inner_text('#imstep') and pg.locator('#imcu').input_value() == 'W')
    ok('temperature columns shown as fixed capacity columns', pg.locator('.im-col .chip.st-info').count() == 3)
    ok('mapping page fits 360px', not over())
    pg.fill('#imbr', 'باناسونيك'); pg.fill('#imrf', 'r 134 a'); pg.select_option('#imap', 'LBP'); pg.fill('#imsrc', 'Panasonic QB'); pg.select_option('#imst', 'manufacturer'); pg.click('#imgo'); pg.wait_for_timeout(2500)
    t = pg.inner_text('#imprev')
    ok('preview classes: 2 new, 1 fill-missing, 1 in base DB, 1 near (O vs 0), 1 duplicate inside file', all(x in t for x in ['جديد: 2', 'يكمّل الناقص: 1', 'موجود في القاعدة: 1', 'شبيه: 1', 'مكرر في الملف: 1']))
    with pg.expect_download() as d: pg.click('#imx')
    ok('preview report downloadable as Excel', X(d).worksheets[0].max_row == 7)
    pg.click('#imok'); pg.wait_for_timeout(700)
    C = {c['rec']['model']: c for c in pg.evaluate("JSON.parse(localStorage.mw_db).custom")}
    ok('approved: new added (near NOT added unless ticked)', 'QB57C88RA00' in C and 'QB66C12CA00' in C and 'QB57C88RAOO' not in C)
    q = C['QB57C88RA00']['rec']
    ok('imported record: capacity table, kcal from W, refrigerant normalized, COP in notes, source + status', q['temp_capacity'] == {'-25': 161, '-23.3': 178, '-20': 213} and abs(q['kcal'] - 178 * 0.859845) < 0.01 and q['refrigerant'] == 'R134a' and 'C.O.P. YES' in q['notes'] and q['srcStatus'] == 'manufacturer' and q['srcRef'] == 'Panasonic QB')
    ok('fill-missing completed the existing record without changing its values', C['QB66C15GAX6']['id'] == 'c9' and C['QB66C15GAX6']['rec']['refrigerant'] == 'R134a' and C['QB66C15GAX6']['rec'].get('displacement') == 6.55)
    ok('after success the old steps are replaced (no stale buttons)', pg.locator('#imgo').count() == 0 and pg.locator('#imok').count() == 0)
    pg.set_input_files('#imf', CATX); pg.wait_for_selector('#imgo'); pg.wait_for_timeout(500); pg.fill('#imbr', 'باناسونيك'); pg.click('#imgo'); pg.wait_for_selector('#imprev .chips'); pg.wait_for_timeout(300)
    ok('re-importing the same sheet: nothing new (already there)', 'جديد:' not in pg.inner_text('#imprev') and 'شبيه: 1' in pg.inner_text('#imprev'))
    # الأعطال من Excel
    pg.goto(U + '#/kit'); pg.goto(U + '#/import'); pg.wait_for_timeout(300); pg.click('[data-ik="fault"]'); pg.wait_for_timeout(200); pg.set_input_files('#imf', FX); pg.wait_for_timeout(1500)
    pg.click('#imgo'); pg.wait_for_timeout(1500); t = pg.inner_text('#imprev')
    ok('faults from Excel: 2 new + 1 fill-missing (H1 شارب gets «الحل») + 1 rejected row without code', 'جديد: 2' in t and 'يكمّل الناقص: 1' in t and 'مرفوض: 1' in t)
    pg.click('#imok'); pg.wait_for_timeout(600); F = pg.evaluate("JSON.parse(localStorage.mw_db).faults")
    ok('faults imported with fill-down brand and filled fix', any(x.get('code') == 'LE' and x.get('brand') == 'سامسونج' for x in F) and [x for x in F if x['id'] == 'f4'][0].get('fix') == 'قِس الحساس')
    # CSV + JSON
    pg.goto(U + '#/kit'); pg.goto(U + '#/import'); pg.wait_for_timeout(300); pg.click('[data-ik="comp"]'); pg.wait_for_timeout(200); pg.set_input_files('#imf', CSVP); pg.wait_for_timeout(1500); pg.click('#imgo'); pg.wait_for_timeout(1500)
    ok('CSV (; separated, quoted «1,250»): kcal 1250, R22 normalized', 'R22' in pg.inner_text('#imprev') and '1250 kcal/h' in pg.inner_text('#imprev'))
    pg.goto(U + '#/kit'); pg.goto(U + '#/import'); pg.wait_for_timeout(300); pg.click('[data-ik="comp"]'); pg.wait_for_timeout(200); pg.set_input_files('#imf', JSP); pg.wait_for_timeout(1500)
    ok('JSON in system format goes straight to preview', 'جديد: 1' in pg.inner_text('#imstep'))
    bad = os.path.join(TMP, 'x.xls'); open(bad, 'w').write('x'); dlg['msgs'].clear(); pg.set_input_files('#imf', bad); pg.wait_for_timeout(300)
    ok('old .xls refused with how-to-fix message', any('.xlsx' in m for m in dlg['msgs']))
    fake = os.path.join(TMP, 'fake.xlsx'); open(fake, 'w').write('not a zip at all'); dlg['msgs'].clear(); pg.set_input_files('#imf', fake); pg.wait_for_timeout(500)
    ok('corrupt .xlsx refused clearly', any('تعذر قراءة ملف Excel' in m for m in dlg['msgs']))
    # ================= تصدير Excel وقوالب =================
    pg.goto(U + '#/admin'); pg.wait_for_timeout(400)
    with pg.expect_download() as d: pg.click('#xcx')
    w = X(d).worksheets[0]
    ok('export compressors to Excel (opens in openpyxl, RTL, capacity columns)', w.sheet_view.rightToLeft and w.cell(1, 2).value == 'الموديل' and any('قدرة -23.3' in str(c.value) for c in w[1]))
    with pg.expect_download() as d: pg.click('#xfx')
    w = X(d).worksheets[0]; ok('export faults to Excel', w.cell(1, 6).value == 'كود العطل' and w.max_row >= 5)
    with pg.expect_download() as d: pg.click('#xtc')
    tp = os.path.join(TMP, 'tpl.xlsx'); d.value.save_as(tp); w = openpyxl.load_workbook(tp)
    ok('empty compressor template has 2 sheets (columns + how to fill)', len(w.worksheets) == 2 and w.worksheets[0].cell(1, 2).value == 'الموديل')
    pg.goto(U + '#/kit'); pg.goto(U + '#/import'); pg.wait_for_timeout(300); pg.click('[data-ik="comp"]'); pg.wait_for_timeout(200); pg.set_input_files('#imf', tp); pg.wait_for_timeout(1500)
    ok('the template itself is recognized column-by-column', pg.evaluate("[...document.querySelectorAll('[data-ci]')].filter(s=>s.value).length") >= 15)
    # ================= تنبيه النموذج =================
    pg.goto(U + '#/new/fault'); pg.wait_for_timeout(800)
    pg.fill('input[name="code"]', 'e-01'); pg.wait_for_timeout(500)
    ok('typing a near code shows «فيه سجل شبيه» with a link', 'شبيه' in pg.inner_text('#dupw') and pg.locator('#dupw a[href="#/fault/f1"]').count() == 1)
    pg.goto(U + '#/new/comp'); pg.wait_for_timeout(1500); pg.fill('input[name="model"]', 'qb57c88ra00'); pg.wait_for_timeout(600)
    ok('typing an existing compressor model shows «موجود بالفعل»', 'موجود بالفعل' in pg.inner_text('#dupw'))
    n_before = len(pg.evaluate("JSON.parse(localStorage.mw_db).custom"))
    sel = pg.locator('select[name="brand"]')
    if sel.count(): sel.select_option('__new__'); pg.fill('input[name="brand__new"]', 'باناسونيك')
    else: pg.fill('input[name="brand"]', 'باناسونيك')
    dlg['accept'] = False; dlg['msgs'].clear(); pg.locator('#f button.primary').click(); pg.wait_for_timeout(600); dlg['accept'] = True
    ok('saving an exact duplicate asks first; «لا» keeps it unsaved', any('موجود بالفعل' in m for m in dlg['msgs']) and len(pg.evaluate("JSON.parse(localStorage.mw_db).custom")) == n_before)
    # بدون إنترنت
    ctx2 = b.new_context(viewport={'width': 360, 'height': 740}); o = ctx2.new_page(); o.goto(U); o.wait_for_timeout(1500); o.reload(); o.wait_for_timeout(1200); ctx2.set_offline(True)
    o.goto(U + '#/import'); o.wait_for_timeout(600)
    ok('offline: new scripts cached (import page works)', o.evaluate("typeof XLSX=='object'&&typeof CMAP=='object'&&typeof DUP=='object'"))
    ctx2.close()
    ok('no console/page errors', not errs); [print(e) for e in errs[:8]]
    b.close()
print('\n%d FAILED of %d' % (sum(1 for r in R if r[0] == 'FAIL'), len(R)))

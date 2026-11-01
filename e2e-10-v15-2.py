"""اختبارات v15.2 في المتصفح: المحاكي للمبتدئ — التوصيل بالسحب (مغناطيس)، التحريك، شريط القطعة المختارة،
الأفوميتر فوق الرسم، الدروس التفاعلية (درس 1 و2)، التكبير، المكتبة المقسمة بأيقونات، وشرح «فكرتها ببساطة»
لكل الأدوات، والحذف المخبّى تحت «⋯»."""
from playwright.sync_api import sync_playwright
import e2e_fixture
import json
A = lambda s: str(s).encode('ascii', 'replace').decode()
U = 'http://localhost:8099/index.html'
R = []
def ok(n, c): R.append(('PASS' if c else 'FAIL', n)); print(('PASS ' if c else 'FAIL ') + A(n))

def ctr(pg, sel):
    pg.evaluate("()=>{const w=document.getElementById('ckw'),r=w.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)w.scrollIntoView({block:'center'})}")
    b = pg.locator(sel).first.bounding_box(); return b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
def drag_wire(pg, a, b, off=(6, 4)):
    x1, y1 = ctr(pg, '#cks [data-t="%s"] circle' % a); x2, y2 = ctr(pg, '#cks [data-t="%s"] circle' % b)
    pg.mouse.move(x1, y1); pg.mouse.down(); pg.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, steps=4); pg.mouse.move(x2 + off[0], y2 + off[1], steps=4); pg.mouse.up(); pg.wait_for_timeout(120)
def tap(pg, sel):
    x, y = ctr(pg, sel); pg.mouse.click(x, y); pg.wait_for_timeout(120)
CK = "JSON.parse(sessionStorage.mw_ck_cur).ck"
les = lambda pg: pg.inner_text('#cklesson')

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 760}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + A(e))); pg.on('console', lambda m: m.type == 'error' and errs.append('CONSOLE ' + A(m.text[:160])))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(U); pg.wait_for_timeout(500)
    # أول زيارة: عرض الدروس
    pg.goto(U + '#/kit/circuit'); pg.wait_for_timeout(800)
    ok('first visit offers the lessons', pg.locator('#cklesson [data-les="first"]').count() == 1 and pg.locator('#cklesson [data-les="fault"]').count() == 1)
    ok('beginner guide (how to use) is present', pg.locator('#ckguide .ck-gl li').count() >= 6)
    ok('no duplicate generic «how to use» list for the simulator', pg.locator('details.how').count() == 0)
    # المكتبة
    pg.click('[data-les="first"]'); pg.wait_for_timeout(300)
    ok('lesson 1 starts at step 1 of 10', 'خطوة 1 من 10' in les(pg))
    pg.click('[data-tab="lib"]'); pg.wait_for_timeout(100)
    ok('library grouped into 5 sections with icons and roles', pg.locator('#ckpanel .ck-gh').count() == 5 and pg.locator('#ckpanel .ck-pt svg.ck-ico').count() == 24 and pg.locator('#ckpanel .ck-pt small').count() == 24)
    pg.click('[data-add="vac"]'); pg.click('[data-add="lamp"]'); pg.click('[data-add="switch"]'); pg.wait_for_timeout(150)
    ok('adding parts keeps the library open and auto-advances the lesson', pg.locator('#ckpanel [data-add]').count() == 24 and 'خطوة 4 من 10' in les(pg))
    ok('selected part shows the selection bar (rotate/copy/properties, delete hidden under ⋯)', pg.locator('#cksel [data-sb="rot"]').is_visible() and pg.locator('#cksel [data-sb="del"]').is_visible() is False)
    tap(pg, '#cks [data-c="AC1"]')
    ok('selected part shows its terminal names on the drawing', pg.locator('#cks text.tlb').count() >= 2)
    pg.click('#zfit'); pg.wait_for_timeout(150)
    # التوصيل بالسحب
    drag_wire(pg, 'AC1|L', 'S1|a')
    ok('drag from point to point makes a wire (magnet snaps to the nearest point)', pg.evaluate(CK + ".wires.length") == 1 and 'خطوة 5 من 10' in les(pg))
    drag_wire(pg, 'S1|b', 'LP1|a', (14, -10)); drag_wire(pg, 'LP1|b', 'AC1|N')
    ok('three wires → closed loop → lesson step 7', pg.evaluate(CK + ".wires.length") == 3 and 'خطوة 7 من 10' in les(pg))
    # سحب لمكان فاضي ما يعملش سلك
    x1, y1 = ctr(pg, '#cks [data-t="LP1|a"] circle'); pg.mouse.move(x1, y1); pg.mouse.down(); pg.mouse.move(x1, y1 + 90, steps=5); pg.mouse.up(); pg.wait_for_timeout(120)
    ok('dropping a wire on empty space adds nothing', pg.evaluate(CK + ".wires.length") == 3)
    # الضغط على نقطتين برضه بيوصّل (في وضع التحريك)
    tap(pg, '#cks [data-t="LP1|a"] circle'); ok('tap a point → pending wire hint', 'النقطة التانية' in pg.inner_text('#ckhint'))
    tap(pg, '#cks [data-t="AC1|L"] circle'); ok('tap-tap in move mode also wires', pg.evaluate(CK + ".wires.length") == 4)
    pg.click('#ckund'); pg.wait_for_timeout(120); ok('undo removes the last wire', pg.evaluate(CK + ".wires.length") == 3)
    # الاختبار
    pg.click('#cksim'); pg.wait_for_timeout(150); ok('lesson: test pressed → step 8', 'خطوة 8 من 10' in les(pg))
    tap(pg, '#cks [data-c="S1"]'); ok('quick tap on the switch while testing toggles it → lamp on → step 9', pg.locator('#cks .comp.on[data-c="LP1"]').count() == 1 and 'خطوة 9 من 10' in les(pg))
    pg.click('[data-md="meter"]'); tap(pg, '#cks [data-t="LP1|a"] circle'); tap(pg, '#cks [data-t="LP1|b"] circle')
    ok('meter reading shows on top of the drawing', '220.00 V~' in pg.inner_text('#cksel') and 'خطوة 10 من 10' in les(pg))
    pg.click('#cksel [data-sb="mm"]'); pg.wait_for_timeout(120); ok('meter V/Ω switch on the bar', 'Ω' in pg.inner_text('#cksel'))
    pg.click('#cksel [data-sb="mm"]'); pg.click('[data-md="move"]'); tap(pg, '#cks [data-c="S1"]'); pg.click('[data-md="meter"]'); tap(pg, '#cks [data-t="S1|a"] circle'); tap(pg, '#cks [data-t="S1|b"] circle')
    ok('open switch reads full voltage → lesson 1 done', '220.00 V~' in pg.inner_text('#cksel') and 'برافو' in les(pg))
    # التحريك
    pg.click('[data-md="move"]'); c0 = pg.evaluate(CK + ".comps.find(c=>c.id=='LP1')"); x, y = ctr(pg, '#cks [data-c="LP1"]')
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 45, y + 45, steps=6); pg.mouse.up(); pg.wait_for_timeout(120)
    c1 = pg.evaluate(CK + ".comps.find(c=>c.id=='LP1')"); ok('dragging the body moves the part (snapped to grid) and keeps its wires', (c1['x'], c1['y']) != (c0['x'], c0['y']) and c1['x'] % 20 == 0 and pg.evaluate(CK + ".wires.length") == 3)
    pg.click('#cksel [data-sb="rot"]'); pg.wait_for_timeout(100); ok('rotate from the selection bar', pg.evaluate(CK + ".comps.find(c=>c.id=='LP1').rot") == 90)
    pg.click('#cksel [data-sb="dup"]'); pg.wait_for_timeout(100); ok('copy from the selection bar', pg.evaluate(CK + ".comps.length") == 4)
    pg.click('#cksel .sb-more summary'); pg.click('#cksel [data-sb="del"]'); pg.wait_for_timeout(120); ok('delete from ⋯ in the selection bar', pg.evaluate(CK + ".comps.length") == 3)
    # تكبير بالعجلة مع Ctrl
    vb0 = pg.get_attribute('#cks', 'viewBox'); x, y = ctr(pg, '#cks'); pg.mouse.move(x, y); pg.keyboard.down('Control'); pg.mouse.wheel(0, -300); pg.keyboard.up('Control'); pg.wait_for_timeout(350)
    ok('Ctrl + wheel (trackpad pinch) zooms', pg.get_attribute('#cks', 'viewBox') != vb0)
    # الدرس 2
    pg.click('[data-les="fault"]'); pg.wait_for_timeout(300)
    ok('lesson 2 loads the defrost circuit with a hidden fault', 'خطوة 1 من 4' in les(pg) and pg.evaluate(CK + ".comps.find(c=>c.type=='thermalFuse').state.blown") is True)
    pg.click('#cksim'); pg.click('[data-md="meter"]'); tap(pg, '#cks [data-t="HT|a"] circle'); tap(pg, '#cks [data-t="HT|b"] circle')
    ok('lesson 2: heater shows 0 V', '0.00 V~' in pg.inner_text('#cksel') and 'خطوة 3 من 4' in les(pg))
    tap(pg, '#cks [data-t="TF|a"] circle'); tap(pg, '#cks [data-t="TF|b"] circle')
    ok('lesson 2: the open thermal fuse shows the full voltage', '220.00 V~' in pg.inner_text('#cksel') and 'خطوة 4 من 4' in les(pg))
    pg.click('[data-md="move"]'); tap(pg, '#cks [data-c="TF"]'); ok('lesson 2 done after fixing the fuse (heater runs)', 'كده عرفت تتبّع العطل' in les(pg) and pg.locator('#cks .comp.on[data-c="HT"]').count() == 1)
    pg.click('#lesx'); pg.wait_for_timeout(100); ok('closing the lesson clears the box', les(pg).strip() == '')
    # قائمة التوصيلات: الحذف تحت ⋯
    pg.click('[data-tab="conn"]'); pg.wait_for_timeout(100); ok('wire delete in the list is tucked under ⋯', pg.locator('#ckpanel [data-wd]').first.is_visible() is False)
    # رابط الدرس من «ابدأ من هنا»
    pg.goto(U + '#/'); pg.wait_for_timeout(300); ok('home learning path links to the simulator lesson', pg.locator('a[href="#/kit/circuit/lesson-first"]').count() == 1)
    pg.goto(U + '#/kit/circuit/lesson-first'); pg.wait_for_timeout(600); ok('lesson link opens lesson 1 directly', 'خطوة 1 من 10' in les(pg))
    sw = pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"); ok('simulator: no horizontal scroll at 360px', sw)
    # «فكرتها ببساطة» في كل أداة
    tools = pg.evaluate("KIT.tools().filter(t=>!t.hidden).map(t=>t.id)"); miss = []
    for t in tools:
        pg.goto(U + '#/kit/' + t); pg.wait_for_timeout(250)
        if pg.locator('.kg-idea').count() != 1: miss.append(t)
    ok('every built-in tool explains «🧠 فكرتها ببساطة» (%d tools)' % len(tools), not [m for m in miss if pg.evaluate("!!KIT.tool('%s').builtin" % m)])
    pg.goto(U + '#/kit/ohm'); pg.wait_for_timeout(300)
    ok('copy/save/share hidden until there is a result', pg.locator('#rcp').is_visible() is False and pg.locator('#rrs').is_visible())
    pg.fill('#ov', '220'); pg.fill('#oi', '2'); pg.wait_for_timeout(300); ok('…and appear with a result', pg.locator('#rcp').is_visible())
    ok('no console/page errors', not errs)
    for e in errs: print(e)
    b.close()
print(f"\n{sum(1 for r in R if r[0]=='PASS')} نجح، {sum(1 for r in R if r[0]=='FAIL')} فشل")

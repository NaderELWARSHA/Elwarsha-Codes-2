"""تجهيز مشترك لاختبارات المتصفح القديمة (e2e-1..6).
من v15 الإدارة مقفولة افتراضيًا (ADMIN_DEV=false). الاختبارات القديمة مكتوبة على إدارة مفتوحة،
فهذا الملف يحاكي «فني فتح الإدارة برمزه مرة واحدة في الجلسة»: ينشئ قفلًا برمز اختبار 1234
ويفتح الجلسة مرة واحدة فقط (علامة _fx في sessionStorage)، فإذا قفل الاختبار الإدارة بعدها تبقى مقفولة.
وكذلك يعلّم الجولة التعريفية «تمت» حتى لا تغطي الأزرار.
اختبار القفل الافتراضي والجولة نفسهما في e2e-7-v15.py ولا يستخدم هذا الملف."""
from playwright.sync_api import Browser
INIT = """(()=>{try{
 if(!localStorage.getItem('mw_tour'))localStorage.setItem('mw_tour','true');
 if(!localStorage.getItem('mw_admin'))localStorage.setItem('mw_admin',JSON.stringify({lock:true,hash:'fixture',salt:'fixture'}));
 if(!sessionStorage.getItem('_fx')){sessionStorage.setItem('_fx','1');sessionStorage.setItem('mw_adm_ok','true')}
}catch(e){}})()"""
_nc = Browser.new_context
def _new_context(self, *a, **k):
    ctx = _nc(self, *a, **k); ctx.add_init_script(INIT); return ctx
Browser.new_context = _new_context
_np = Browser.new_page
def _new_page(self, *a, **k):
    ctx = self.new_context(*a, **k); pg = ctx.new_page(); return pg
Browser.new_page = _new_page

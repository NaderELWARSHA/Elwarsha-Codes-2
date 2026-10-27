const C="mrf-v6",F=["./","index.html","style.css","ui.css","core.js","sync.js","brand.js","app.js","compressors-base.js","manifest.webmanifest","app-icon.svg","icon-192-v13.png","icon-512-v13.png","apple-touch-icon-v13.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x))))));
self.addEventListener("fetch",e=>{if(e.request.method!="GET")return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c2=r.clone();caches.open(C).then(c=>c.put(e.request,c2))}return r}).catch(()=>caches.match(e.request)))});

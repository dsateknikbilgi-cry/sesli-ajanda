const C="sesli-ajanda-v2";
const FILES=["./","index.html","manifest.json","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true})));});

// Bildirime veya düğmelerine dokunulunca uygulamayı aç ve ne yapılacağını ilet
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const id=(e.notification.data&&e.notification.data.id)||e.notification.tag;
  const action=e.action||"open";
  if(id==="test")return;
  e.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const scope=self.registration.scope;
    const c=list.find(w=>w.url.startsWith(scope));
    if(c){ c.postMessage({type:"notif",action,id}); if(action==="open"||!c.focused){ try{await c.focus();}catch(_){} } return; }
    await self.clients.openWindow(scope+"?n="+encodeURIComponent(action)+"&id="+encodeURIComponent(id));
  })());
});

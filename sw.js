const C="sesli-ajanda-v3";
const FILES=["./","index.html","manifest.json","icon-192.png","icon-512.png"];
const SCHEDULE="__schedule__";
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

/* Uygulama kapalıyken de hatırlatma: sayfa programı buraya yazar,
   tarayıcı periyodik olarak (izin verirse) kontrol eder. */
const jsonRes=d=>new Response(JSON.stringify(d),{headers:{"Content-Type":"application/json"}});
async function readSchedule(cache){
  try{ const r=await cache.match(SCHEDULE); return r?await r.json():[]; }catch(_){ return []; }
}
async function saveSchedule(items){
  const cache=await caches.open(C);
  const old=await readSchedule(cache);
  const sent=new Set(old.filter(x=>x.sent).map(x=>x.id+"|"+x.ft));
  const next=items.map(x=>({id:x.id,title:x.title,ft:x.ft,body:x.body,sent:sent.has(x.id+"|"+x.ft)}));
  await cache.put(SCHEDULE,jsonRes(next));
}
async function checkSchedule(){
  const cache=await caches.open(C);
  const items=await readSchedule(cache), now=Date.now();
  let changed=false;
  for(const it of items){
    if(it.sent||!it.ft||it.ft>now||now-it.ft>12*3600000) continue;
    it.sent=true; changed=true;
    await self.registration.showNotification(it.title,{
      body:it.body, tag:it.id, icon:"icon-192.png", badge:"icon-192.png",
      vibrate:[250,120,250], renotify:true, requireInteraction:true, lang:"tr",
      data:{id:it.id}, actions:[{action:"done",title:"Tamamlandı"},{action:"snooze",title:"10 dk ertele"}]
    }).catch(()=>{});
  }
  if(changed) await cache.put(SCHEDULE,jsonRes(items));
}
self.addEventListener("message",e=>{
  if(e.data&&e.data.type==="schedule") e.waitUntil(saveSchedule(e.data.items||[]));
});
self.addEventListener("periodicsync",e=>{
  if(e.tag==="reminders") e.waitUntil(checkSchedule());
});

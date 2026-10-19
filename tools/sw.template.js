/* Parole service worker. GENERATED into sw.js by tools/make_site.py: edit this template, not sw.js.
   - shell cache is versioned per release; media cache only changes when the content version changes
   - install fetches with cache:'reload' so stale copies are never re-cached
   - a new worker waits; the page tells it to take over (SKIP) only when the person taps Update */
const VER='__VERSION__',MEDIA_VER='__MEDIA_VER__';
const SHELL_C='parole-shell-'+VER,MEDIA_C='parole-media-'+MEDIA_VER;
const SHELL=__SHELL__;
const MEDIA=__MEDIA__;
const put=async(c,u)=>{const r=await fetch(new Request(u,{cache:'reload'}));if(!r.ok)throw new Error('fetch '+u+' '+r.status);await c.put(u,r)};
const tell=(done,total)=>self.clients.matchAll({includeUncontrolled:true}).then(cs=>cs.forEach(c=>c.postMessage({type:'progress',done,total})));
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const sc=await caches.open(SHELL_C);
 await Promise.all(SHELL.map(u=>put(sc,u)));
 const mc=await caches.open(MEDIA_C),todo=[];
 for(const u of MEDIA)if(!(await mc.match(u)))todo.push(u);
 let done=MEDIA.length-todo.length;await tell(done,MEDIA.length);
 for(let i=0;i<todo.length;i+=16){await Promise.all(todo.slice(i,i+16).map(async u=>{await put(mc,u);done++}));await tell(done,MEDIA.length)}
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const k of await caches.keys())if(k.startsWith('parole-')&&k!==SHELL_C&&k!==MEDIA_C)await caches.delete(k);
 await self.clients.claim();
})()));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 if(new URL(r.url).origin!==self.location.origin)return;
 e.respondWith((async()=>{
  const m=await caches.match(r,{ignoreSearch:true});if(m)return m;
  try{return await fetch(r)}catch(x){
   if(r.mode==='navigate'){const i=await caches.match('./index.html');if(i)return i}
   throw x}})())});

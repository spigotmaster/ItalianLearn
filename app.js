/* Parole: offline flashcard PWA. Vanilla JS, no third-party code. */
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const AV='1.0.0',SV=1,KS='parole:s',KL='parole:l',KP='parole:p';
const STEPS=[1,10],RL=[10],GI=1,EI=4,SE=2.5,EMIN=1.3,HM=1.2,EB=1.3,MAXI=36500,LEECH=8,LA=20,ROLL=4,DAY=864e5;
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
const dayOf=t=>{t=t==null?Date.now():t;return Math.floor((t-new Date(t).getTimezoneOffset()*6e4-ROLL*36e5)/DAY)};
const isoDay=d=>new Date(d*DAY).toISOString().slice(0,10);
const rnd=x=>Math.round(x+1e-9),r2=x=>Math.round(x*100)/100;
const fm=m=>m<=1?'<1m':m<60?m+'m':Math.round(m/60)+'h',fd=d=>d<365?d+'d':(d/365).toFixed(1)+'y';
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const uid=()=>{try{return crypto.randomUUID()}catch(e){return Date.now().toString(36)+Math.random().toString(36).slice(2)}};
const DS=()=>({v:SV,cv:0,c:{},set:{n:10,r:200,th:'system',name:'',tts:1,lb:0,is:0,ob:0,bd:0},day:{d:0,n:0,r:0,x:0},seq:0,u:null,note:'',fr:[]});
/* scheduler: Anki v2-style SM-2, constants fixed. g: 0 Again, 1 Hard, 2 Good, 3 Easy. s: n new, l learning, r review, x relearning */
function ans(c,g,now){
 const T=dayOf(now),n=Object.assign({s:'n',p:0,e:SE,i:0,d:0,r:0,l:0,z:0},c);let lab;
 const lrn=(st,p)=>{n.p=p;n.d=now+st[p]*6e4;lab=fm(st[p])};
 const grad=i=>{n.s='r';n.i=Math.min(MAXI,Math.max(1,i));n.p=0;n.d=T+n.i;lab=fd(n.i)};
 if(n.s==='r'){
  const iv=n.i,hard=Math.max(1,rnd(iv*HM)),good=Math.max(hard+1,rnd(iv*n.e)),easy=Math.max(good+1,rnd(iv*n.e*EB));
  if(g==0){n.l++;n.e=Math.max(EMIN,r2(n.e-.2));n.i=Math.max(1,rnd(iv*0));n.s='x';lrn(RL,0);if(n.l>=LEECH){n.z=1;n.lc=1}}
  else if(g==1){n.e=Math.max(EMIN,r2(n.e-.15));grad(hard)}
  else if(g==2)grad(good);
  else{n.e=r2(n.e+.15);grad(easy)}
 }else{
  const rl=n.s==='x',st=rl?RL:STEPS,p=n.s==='n'?0:n.p,keep=rl?'x':'l';
  if(g==0){n.s=keep;lrn(st,0)}
  else if(g==1){n.s=keep;lrn(st,p)}
  else if(g==2){if(p+1<st.length){n.s=keep;lrn(st,p+1)}else grad(rl?n.i:GI)}
  else grad(rl?n.i:EI);
 }
 n.r++;n.t=now;
 return{n,lab};
}
const streakOf=(cnt,T)=>{let d=(cnt[T]||0)>=10?T:T-1,n=0;while((cnt[d]||0)>=10){n++;d--}return n};

/* ---- deck (converted from the .apkg by tools/make_site.py) ---- */
let DK=null,NT=[],MD={},C=[],byK={},MEDIA={},DECKS=[],QF={};
const dec=s=>{try{return decodeURIComponent(s)}catch(e){return s}};
const txt=h=>String(h==null?'':h).replace(/\[sound:[^\]]*\]/g,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
async function loadDeck(){
 const r=await fetch('data/deck.json');if(!r.ok)throw new Error('deck');
 DK=await r.json();NT=DK.notes;MD=DK.models;MEDIA=DK.media;DECKS=DK.decks;
 C=DK.cards.map((c,i)=>({k:NT[c[0]].g+'.'+c[1],x:c[0],o:c[1],d:String(c[2]),i}));C.forEach(c=>byK[c.k]=c);
 NT.forEach(n=>{n.s=norm(n.f.map(txt).join(' '))});
 for(const id in MD)QF[id]=MD[id].t.map(t=>{let i=0;for(const m of t.q.matchAll(/\{\{([^#^\/}][^}]*)\}\}/g)){const n=m[1].replace(/^[a-z]+:/i,'').trim();if(n!=='FrontSide'&&MD[id].f.indexOf(n)>=0){i=MD[id].f.indexOf(n);break}}return i});
 styleModels();
}
const lbl=c=>txt(NT[c.x].f[QF[NT[c.x].m][c.o]]);
const tplName=c=>MD[NT[c.x].m].t[c.o].n;
/* note-type CSS, scoped to the card; colour/background/size are left to the app (dark mode, text zoom) */
function scope(css,pre){const out=[];
 css=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@[^{;]*\{[^{}]*\}/g,'').replace(/@[^;{]*;/g,'');
 css.replace(/([^{}]+)\{([^{}]*)\}/g,(m,sel,body)=>{
  body=body.split(';').filter(d=>d.trim()&&!/^\s*(color|background[a-z-]*|font-size)\s*:/i.test(d)&&!/url\(|expression|behavior/i.test(d)).join(';');
  if(body.trim())out.push(sel.split(',').map(x=>{x=x.trim();return x==='.card'?pre:x.startsWith('.card')?pre+x.slice(5):pre+' '+x}).join(',')+'{'+body+'}');return''});
 return out}
function styleModels(){const st=document.createElement('style');document.head.appendChild(st);const sh=st.sheet;if(!sh)return;
 for(const id in MD)for(const r of scope(MD[id].css||'','.cc.m'+id)){try{sh.insertRule(r,sh.cssRules.length)}catch(e){}}}
/* card rendering: fields -> qfmt/afmt, FrontSide, <hr id=answer>, sanitised HTML, [sound:] -> button, images from cached media */
const ALLOW=new Set('b i u br div span img ul ol li ruby rt rp'.split(' ')),DROP=new Set('script style iframe object embed link meta a svg math form input button textarea select audio video noscript template'.split(' '));
function clean(html){
 const t=document.createElement('template');t.innerHTML=html;
 const walk=n=>{for(const c of [...n.childNodes]){
  if(c.nodeType===3)continue;
  if(c.nodeType!==1){c.remove();continue}
  const tg=c.localName;
  if(DROP.has(tg)){c.remove();continue}
  walk(c);
  if(!ALLOW.has(tg)){c.replaceWith(...[...c.childNodes]);continue}
  for(const a of [...c.attributes])if(!(tg==='img'&&a.name==='src'))c.removeAttribute(a.name);
  if(tg==='img'){const s=c.getAttribute('src')||'',p=MEDIA[s]||MEDIA[dec(s)];if(p)c.setAttribute('src',p);else c.remove()}
 }};
 walk(t.content);return t.innerHTML}
function tmpl(fmt,fl,front){
 let s=fmt;
 for(let i=0;i<6;i++){const r=s.replace(/\{\{([#^])([^}]+)\}\}([\s\S]*?)\{\{\/\2\}\}/g,(m,t,n,b)=>(fl[n.trim()]||'').trim()?(t==='#'?b:''):(t==='^'?b:''));if(r===s)break;s=r}
 return s.replace(/\{\{([^}]+)\}\}/g,(m,n)=>{n=n.trim();if(n==='FrontSide')return front||'';const k=n.replace(/^(?:text|hint|type):/i,'');return fl[k]!==undefined?fl[k]:''})}
const mpath=n=>MEDIA[n]||MEDIA[dec(n)];
const snds=h=>{const a=[];String(h).replace(/\[sound:([^\]]+)\]/g,(m,n)=>{const p=mpath(n);if(p)a.push(p);return m});return a};
const cl=h=>clean(h).replace(/\[sound:([^\]]+)\]/g,(m,n)=>{const p=mpath(n);return p?`<button class="snd" data-a="snd:${p}">🔊 Play</button>`:''});
function cview(c,sh){
 const nt=NT[c.x],md=MD[nt.m],tp=md.t[c.o],fl={};md.f.forEach((n,i)=>fl[n]=nt.f[i]||'');
 const q=tmpl(tp.q,fl,''),a=tmpl(tp.a,fl,q),pt=a.split(/<hr id=["']?answer["']?\s*\/?>/i);
 let html,sn;
 if(!sh){html=cl(q);sn=snds(q)}
 else if(pt.length>1){const b=pt.slice(1).join('');html=cl(pt[0])+'<hr><div class="ans">'+cl(b)+'</div>';sn=snds(b)}
 else{html=cl(a);sn=snds(a)}
 return{html,sn,none:snds(q+a).length===0,mid:nt.m};
}
/* ---- storage: IndexedDB (kv + log store), localStorage fallback ---- */
let S,L=[],SN=[],idb=null,wq=Promise.resolve(),serr=false;
const openDB=()=>new Promise(res=>{try{const r=indexedDB.open('parole',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');r.result.createObjectStore('log',{keyPath:'q'})};r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null)}catch(e){res(null)}});
const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=(st,f)=>new Promise((res,rej)=>{const t=idb.transaction(st,'readwrite');f(t);t.oncomplete=()=>res(true);t.onerror=t.onabort=()=>rej(t.error)});
/* save(): state always; log entries incrementally (put = changed/new entries, del = removed seqs, all = rewrite whole log) */
function save(put,del,all){
 if(!idb){serr=!(ls.set(KS,JSON.stringify(S))&&ls.set(KL,JSON.stringify(L)));return Promise.resolve()}
 wq=wq.then(()=>tx(['kv','log'],t=>{t.objectStore('kv').put(S,'s');const g=t.objectStore('log');
  if(all){g.clear();L.forEach(x=>g.put(x))}else{(del||[]).forEach(q=>g.delete(q));(put||[]).forEach(x=>g.put(x))}}))
  .then(()=>{if(serr){serr=false;render()}},()=>{serr=true;render()});
 return wq}
const snaps=()=>SN;
async function snap(){
 const n=[{at:Date.now(),s:JSON.parse(JSON.stringify(S)),l:JSON.parse(JSON.stringify(L))},...SN].slice(0,2);
 try{if(idb)await tx(['kv'],t=>t.objectStore('kv').put(n,'p'));else if(!ls.set(KP,JSON.stringify(n)))throw 0;SN=n;return true}catch(e){return false}}
async function loadAll(){
 idb=await openDB();let raw=null,lg=[];
 if(idb){try{const g=n=>idb.transaction(n).objectStore(n);raw=await req(g('kv').get('s'));SN=(await req(g('kv').get('p')))||[];lg=await req(g('log').getAll())}catch(e){idb=null;raw=null}}
 if(!idb){const t=ls.get(KS);
  if(t){try{raw=JSON.parse(t)}catch(e){fatal={raw:t};return}}
  try{lg=JSON.parse(ls.get(KL)||'[]')}catch(e){fatal={raw:(t||'')+'\n'+ls.get(KL)};return}
  try{SN=JSON.parse(ls.get(KP)||'[]')}catch(e){SN=[]}}
 if(raw){
  if(typeof raw!=='object'||!raw.c||!raw.set||!Array.isArray(lg)){fatal={raw:JSON.stringify({s:raw,l:lg})};return}
  if(raw.v>SV){fatal={newer:1};return}
  S=Object.assign(DS(),raw);S.set=Object.assign(DS().set,raw.set);S.note='';L=lg}
 else{S=DS();L=[]}
}
/* ---- queue, answering, undo ---- */
let view='home',show=false,cur=null,curSn=[],pin=null,ahead=false,dk=null,bq='',bf='all',iK=0,obs=0,exp='',imTxt='',imRes=null,fatal=null,V=[],au=null,msg='',er=0,rs=0,last='',swr=null,upd=null,updating=false,reloaded=false,offTxt='';
const cntDays=()=>{const c={};L.forEach(l=>c[l.d]=(c[l.d]||0)+1);return c};
function roll(){const T=dayOf();if(S.day.d!==T)S.day={d:T,n:0,r:0,x:0}}
function queue(did){
 const now=Date.now(),T=dayOf(now);roll();
 const lr=[],rv=[],nw=[],la=[];let ah=0,nt=0;
 for(const c of C){if(did&&c.d!==did)continue;const s=S.c[c.k];
  if(!s){nt++;nw.push(c);continue}
  if(s.z)continue;
  if(s.s==='r'){if(s.d===T+1)ah++;if(s.d<=T+(ahead?1:0))rv.push(c)}
  else if(s.d<=now)lr.push(c);else if(s.d<=now+LA*6e4)la.push(c)}
 const by=(a,b)=>S.c[a.k].d-S.c[b.k].d;lr.sort(by);rv.sort(by);la.sort(by);
 const nl=Math.max(0,S.set.n+S.day.x-S.day.n),rl=Math.max(0,S.set.r-S.day.r),R=rv.slice(0,rl),N=nw.slice(0,nl);
 return{lr,rv:R,nw:N,la,ah,newTot:nt,all:[...lr,...R,...N,...la]};
}
function grade(g){
 if(!cur||!show)return;
 const now=Date.now(),k=cur.k,prev=S.c[k]?Object.assign({},S.c[k]):null,wn=!prev,wr=!!prev&&prev.s==='r';
 const r=ans(prev,g,now),pl=L.length?L[L.length-1]:null;
 if(pl)delete pl.p;
 S.seq++;const e={id:uid(),k,r:g+1,t:now,d:dayOf(now),q:S.seq,p:prev};L.push(e);
 S.c[k]=r.n;if(wn)S.day.n++;if(wr)S.day.r++;
 S.u={id:e.id,wn,wr};
 S.note=r.n.lc&&r.n.z&&!(prev&&prev.lc)?'Leech: this card was missed 8 times, so it’s suspended. Find it under Browse > Suspended.':'';
 show=false;pin=null;last='';save(pl?[pl,e]:[e]);render();
}
function undo(){
 const l=L[L.length-1];if(!S.u||!l||l.id!==S.u.id)return;
 if(l.p)S.c[l.k]=l.p;else delete S.c[l.k];
 if(S.u.wn)S.day.n--;if(S.u.wr)S.day.r--;
 pin=l.k;L.pop();S.seq--;S.u=null;S.note='';show=false;last='';save(null,[l.q]);render();
}
/* ---- audio + speech ---- */
function stop(){try{speechSynthesis.cancel()}catch(e){}if(au){try{au.pause()}catch(e){}}}
function rv(){try{V=speechSynthesis.getVoices().filter(v=>/^it/i.test(v.lang.replace('_','-')))}catch(e){V=[]}}
try{speechSynthesis.onvoiceschanged=()=>{rv();if(view==='study'||view==='set')render()}}catch(e){}
rv();
function tts(t){if(!V.length||!S.set.tts)return;try{stop();const u=new SpeechSynthesisUtterance(t);u.lang='it-IT';u.rate=.9;u.voice=V.find(v=>/premium|enhanced|natural|google|alice|luca|elsa|isabella/i.test(v.name))||V[0];speechSynthesis.speak(u)}catch(e){}}
function play(p){stop();try{au=new Audio(p);const r=au.play();if(r&&r.catch)r.catch(()=>{})}catch(e){}}
function autoPlay(){const k=cur.k+show;if(k===last)return;last=k;if(curSn.length)play(curSn[0])}
/* ---- views ---- */
const mg=()=>msg?`<div class="bn" role="status">${esc(msg)}</div>`:'';
const counts=Q=>`<span>New <b>${Q.nw.length}</b></span><span>Learning <b>${Q.lr.length}</b></span><span>Due <b>${Q.rv.length}</b></span>`;
const over=()=>{const b=S.set.lb||S.set.is;return!!b&&Date.now()-b>6048e5};
const lastB=()=>S.set.lb?isoDay(dayOf(S.set.lb)):'never';
const stTxt=s=>!s||s.s==='n'?'New':s.z?'Suspended':s.s==='r'?(s.i>=21?'Mature':'Review'):'Learning';
const dName=id=>(DECKS.find(d=>d.id===id)||{name:''}).name;
const more=Q=>(Q.nw.length==0&&Q.newTot>0?'<button class="p" data-a="more">Study more (+5 new cards)</button>':'')+(!ahead&&Q.all.length==0&&Q.ah>0?'<button class="p" data-a="ahead">Review ahead (cards due tomorrow)</button>':'');
const offHtml=()=>`<div class="mut" id="off">${esc(offTxt)}</div>`;
function showOff(t){offTxt=t;const e=$('#off');if(e)e.textContent=t}
function bnr(){let h=mg();
 if(upd&&view==='home')h+='<div class="bn">Update ready. <button data-a="upd">Tap to update</button></div>';
 if(serr)h+='<div class="bn">⚠ Couldn’t save to this device. Export a backup now.</div>';
 if(over()&&Date.now()>S.set.bd+DAY)h+=`<div class="bn">Back up your progress. Last backup: ${lastB()}. <button data-a="go:set">Open Settings</button> <button data-a="bd">Dismiss for a day</button></div>`;
 return h}
function vOb(){const s=S.set,sa=navigator.standalone||(()=>{try{return matchMedia('(display-mode: standalone)').matches}catch(e){return false}})();
 if(obs==0)return`<h1>🇮🇹 Parole</h1><p>Flashcards for the first 1,000 Italian words. Everything stays on this device.</p>${sa?'':'<div class="bn">Install it: tap the Share button in Safari, then Add to Home Screen, then open Parole from the icon. It still works in this tab.</div>'}${offHtml()}<button class="p" data-a="obs:1">Start fresh</button><button class="p alt" data-a="go:imp">Restore from a backup</button>`;
 if(obs==1)return`<h2>About you</h2><label>Name (optional)<input data-i="name" maxlength="30" value="${esc(s.name)}"></label><label>New cards per day<select data-i="n">${[5,10,15,20,30].map(v=>`<option${v==s.n?' selected':''}>${v}</option>`).join('')}</select></label><button class="p" data-a="obs:2">Next</button>`;
 return`<h2>Protect your progress</h2><p>Your progress lives only on this device, and iOS can remove web data. Back up from Settings > Export backup whenever you like.</p><p class="mut">A reminder appears after 7 days without a backup.</p><button class="p" data-a="exp">Back up now</button>${mg()}<button class="p alt" data-a="obs:3">Continue to my decks</button>`}
function vHome(){return bnr()+'<h2>Decks</h2>'+DECKS.map(d=>{const Q=queue(d.id),p=d.name.split('::');return`<button class="deck d${Math.min(p.length-1,3)}" data-a="deck:${d.id}" aria-label="${esc(d.name)}"><b>${esc(p[p.length-1])}</b><div class="stats">${counts(Q)}</div></button>`}).join('')}
function vDeck(){const Q=queue(dk);return`<button class="lnk" data-a="go:home">‹ Decks</button><h2>${esc(dName(dk))}</h2><div class="stats">${counts(Q)}</div>`+(Q.all.length?'<button class="p" data-a="study">Study now</button>':'<div class="card done"><div class="big">🎉</div><div>Nothing due right now.</div></div>')+more(Q)}
function vStudy(){
 const Q=queue(dk);cur=(pin&&byK[pin])||Q.all[0]||null;
 const top=`<div class="top"><button data-a="close">✕ Close</button><button data-a="undo"${S.u?'':' disabled'}>↶ Undo</button></div><div class="stats">${counts(Q)}</div>`+(S.note?`<div class="bn">${esc(S.note)}</div>`:'');
 if(!cur){curSn=[];return top+'<div class="card done"><div class="big">🎉</div><div>All done for now.</div></div>'+more(Q)}
 const cv=cview(cur,show),now=Date.now();curSn=cv.sn;
 return top+`<div class="card"><span class="lab">${esc(tplName(cur))}</span><div class="cc m${cv.mid}">${cv.html}</div>${cv.none&&V.length&&S.set.tts?'<button class="snd" data-a="tts">🔊 Speak</button>':''}</div>`+
  (show?`<div class="g">${['Again','Hard','Good','Easy'].map((n,g)=>`<button data-a="grade:${g}">${n}<small>${esc(ans(S.c[cur.k],g,now).lab)}</small></button>`).join('')}</div>`:'<button class="p" data-a="flip">Show answer</button>')}
function brList(){
 const T=dayOf(),now=Date.now(),q=norm(bq.trim());let n=0,h='';
 for(const c of C){const s=S.c[c.k];
  if(q&&!NT[c.x].s.includes(q))continue;
  if(bf==='due'&&!(s&&!s.z&&s.s!=='n'&&(s.s==='r'?s.d<=T:s.d<=now)))continue;
  if(bf==='new'&&s)continue;
  if(bf==='suspended'&&!(s&&s.z))continue;
  if(bf==='leech'&&!(s&&s.lc))continue;
  if(++n>100)continue;
  h+=`<button class="rowb" data-a="info:${c.i}"><span>${esc(lbl(c))} <small>${esc(tplName(c))}</small></span><small>${stTxt(s)}</small></button>`}
 return`<div class="mut">${n} card${n==1?'':'s'}${n>100?' (showing 100)':''}</div>`+h}
const vBrowse=()=>`<h2>Browse</h2><input data-i="bq" type="search" placeholder="Search cards" aria-label="Search cards" value="${esc(bq)}"><select data-i="bf" aria-label="Filter">${[['all','All'],['due','Due'],['new','New'],['suspended','Suspended'],['leech','Leech']].map(([v,t])=>`<option value="${v}"${v==bf?' selected':''}>${t}</option>`).join('')}</select><div id="res">${brList()}</div>`;
const row=(a,b)=>`<div class="kv"><span>${a}</span><b>${b}</b></div>`;
function vInfo(){
 const c=C[iK],nt=NT[c.x],md=MD[nt.m],s=S.c[c.k],T=dayOf();
 const hist=L.filter(l=>l.k===c.k).map(l=>`${isoDay(l.d)}: ${['','Again','Hard','Good','Easy'][l.r]}`);
 const due=!s||s.s==='n'?'—':s.s==='r'?(s.d<T?'overdue by '+(T-s.d)+'d':s.d==T?'today':s.d==T+1?'tomorrow':'in '+(s.d-T)+'d ('+isoDay(s.d)+')'):new Date(s.d).toLocaleString();
 return`<button class="lnk" data-a="go:browse">‹ Browse</button><h2>Card info</h2>`+md.f.map((n,i)=>row(esc(n),esc(txt(nt.f[i])||'—'))).join('')+row('Card',esc(tplName(c)))+row('State',stTxt(s)+(s&&s.lc?' · leech':''))+row('Interval',s&&s.s==='r'?fd(s.i):'—')+row('Ease',s&&s.s!=='n'?s.e.toFixed(2):'—')+row('Due',due)+row('Reviews',s?s.r:0)+row('Lapses',s?s.l:0)+row('History',hist.length?hist.join('<br>'):'none yet')+(s?`<button data-a="susp">${s.z?'Unsuspend card':'Suspend card'}</button>`:'')}
const streakN=()=>streakOf(cntDays(),dayOf());
function myStats(){let l=0,m=0;for(const k in S.c){const s=S.c[k];if(s.s==='r'&&byK[k]){l++;if(s.i>=21)m++}}return{l,m,s:streakN()}}
function vStats(){
 const T=dayOf(),cnt=cntDays();let nn=0,lg=0,rvw=0,mat=0;const hard=[];
 for(const c of C){const s=S.c[c.k];if(!s||s.s==='n')nn++;else if(s.s==='r'){rvw++;if(s.i>=21)mat++}else lg++;if(s&&s.l>0)hard.push([c,s.l])}
 hard.sort((a,b)=>b[1]-a[1]);
 let cal='';for(let i=0;i<84;i++){const d=T-83+i,n=cnt[d]||0;cal+=`<div class="cal${n>=10?' ok':''}" title="${isoDay(d)}: ${n} reviews">${n>=10?'✓':n||''}</div>`}
 const st=streakN();
 return`<h2>Stats</h2>${mg()}`+row('Reviews today',cnt[T]||0)+row('New cards today',S.day.n)+row('Streak',st+' day'+(st==1?'':'s'))+
  '<h3>Cards by state</h3>'+row('New',nn)+row('Learning',lg)+row('Review',rvw)+row('Mature (of Review)',mat)+
  `<h3>Last 12 weeks</h3><div class="calw">${cal}</div><div class="mut">✓ = a day that counts for your streak (10+ reviews). Numbers are reviews that day.</div>`+
  '<h3>Hardest cards</h3>'+(hard.length?hard.slice(0,10).map(([c,l])=>row(esc(lbl(c))+' <small>'+esc(tplName(c))+'</small>',l+' lapse'+(l==1?'':'s'))).join(''):'<div class="mut">None yet.</div>')+
  '<button data-a="share">Share my progress</button><button data-a="go:fr">Friends board</button><button data-a="csv">Export reviews (CSV)</button>'}
function parseFr(t){const o=[];for(const ln of String(t).split(/\n/)){const m=ln.trim().match(/^(?:(.{1,30}?):\s*)?I know (\d+) cards?, (\d+) mature, (\d+) day streak/i);if(m)o.push({n:(m[1]||'Unnamed').trim(),k:+m[2],m:+m[3],s:+m[4],at:Date.now()})}return o}
function vFr(){
 const me=myStats(),rows=[{n:(S.set.name||'Me')+' (you)',k:me.l,m:me.m,s:me.s,me:1}].concat(S.fr.map((f,i)=>Object.assign({i},f))).sort((a,b)=>b.k-a.k);
 return`<button class="lnk" data-a="go:stats">‹ Stats</button><h2>Friends</h2>${mg()}<label>Paste friends’ snippets, one per line<textarea id="frt" placeholder="Anna: I know 120 cards, 30 mature, 5 day streak"></textarea></label><button class="p" data-a="fradd">Add to board</button><h3>Board (stays on this device)</h3>`+
  rows.map((r,j)=>row((j+1)+'. '+esc(r.n),r.k+' cards · '+r.m+' mature · '+r.s+'-day streak')+(r.me?'':`<button data-a="frd:${r.i}">Remove ${esc(r.n)}</button>`)).join('')+
  (S.fr.length?'':'<div class="mut">No friends yet. Ask a friend to tap Share my progress on their Stats screen and send you the text.</div>')}
function vSet(){
 const s=S.set,sn=snaps();
 return`<h2>Settings</h2>${mg()}<label>Name (optional)<input data-i="name" maxlength="30" value="${esc(s.name)}"></label>
<label>New cards per day<select data-i="n">${[5,10,15,20,30].map(v=>`<option${v==s.n?' selected':''}>${v}</option>`).join('')}</select></label>
<label>Max reviews per day<input data-i="r" type="number" inputmode="numeric" min="1" max="9999" value="${s.r}"></label>
<label>Theme<select data-i="th">${['system','light','dark'].map(v=>`<option${v==s.th?' selected':''}>${v}</option>`).join('')}</select></label>
<label>Speak cards without audio (Italian voice)<select data-i="tts"><option value="1"${s.tts?' selected':''}>On</option><option value="0"${s.tts?'':' selected'}>Off</option></select></label>
${V.length?'':'<div class="mut">No Italian voice found, so the speak button is hidden. On iPhone: Settings > Accessibility > Spoken Content > Voices.</div>'}
<h3>Data</h3><div class="mut">Last backed up: ${lastB()}${over()?' ⚠ overdue':''}</div><div class="mut" id="stg"></div>
<button data-a="exp">Export backup (JSON)</button><button data-a="go:imp">Import backup</button>
${rs==1?`<div class="bn">Replace your current progress with the snapshot from ${new Date(sn[0].at).toLocaleString()}? <button data-a="rs2">Yes, restore snapshot</button> <button data-a="rs0">Cancel</button></div>`:`<button data-a="rs1"${sn.length?'':' disabled'}>Restore latest snapshot</button>`}
${er==0?'<button class="danger" data-a="er1">Erase all data</button>':er==1?'<div class="bn">Erase all progress, history and snapshots from this device? <button data-a="er2">Continue</button> <button data-a="er0">Cancel</button></div>':'<div class="bn">Last check: everything is deleted and can’t be undone. <button class="danger" data-a="er3">Erase all data now</button> <button data-a="er0">Cancel</button></div>'}
${exp?`<h3>Copy your backup</h3><div class="mut">Sharing and downloading aren’t available here, so copy this text and keep it somewhere safe.</div><textarea id="expt" readonly>${esc(exp)}</textarea><button data-a="copy">Copy backup text</button>`:''}
<h3>Update</h3><div class="mut">Version ${AV}, content ${DK?DK.content_version:'?'}.</div>${offHtml()}<button data-a="chkupd">Check for update</button>
<h3>Install</h3><div class="mut">iPhone: open this page in Safari, tap Share, then Add to Home Screen, and open Parole from the icon. Deleting the icon or clearing website data deletes your progress, so export backups.</div>`}
const rng=a=>{if(!a.length)return'no reviews';let lo=a[0],hi=a[0];for(const d of a){if(d<lo)lo=d;if(d>hi)hi=d}return isoDay(lo)+' to '+isoDay(hi)};
function vImp(){
 let h=`<button class="lnk" data-a="go:${S.set.ob?'set':'ob'}">‹ Back</button><h2>Import a backup</h2>${mg()}`;
 if(imRes&&imRes.err)h+=`<div class="bn">${esc(imRes.err)}</div>`;
 if(imRes&&imRes.o){const o=imRes.o,nc=Object.keys(o.cards).length,mc=Object.keys(S.c).length;
  return h+`<div class="kv"><span>Backup</span><b>${nc} cards with progress, ${o.log.length} reviews (${rng(o.log.map(l=>l.d))})</b></div><div class="kv"><span>This device</span><b>${mc} cards with progress, ${L.length} reviews (${rng(L.map(l=>l.d))})</b></div><div class="bn">Importing permanently replaces the ${mc} cards’ progress, ${L.length} reviews and settings on this device. A safety snapshot is saved first.</div><button class="p danger" data-a="impgo">Replace everything on this device</button><button data-a="impx">Cancel</button>`}
 return h+`<label>Backup file<input type="file" data-f accept=".json,application/json"></label><label>Or paste the backup text<textarea id="imt">${esc(imTxt)}</textarea></label><button class="p" data-a="chk">Check backup</button>`}
function vFatal(){return fatal.deck?'<h2>Couldn’t load the flashcards</h2><p>Connect to the internet once so they can be saved on this device, then reload.</p><button class="p" data-a="reload">Reload</button>':fatal.newer?'<h2>Update needed</h2><p>This data was saved by a newer version of the app. Reload to get the latest version. Nothing was changed.</p><button class="p" data-a="reload">Reload</button>':`<h2>Couldn’t read saved data</h2><p>Nothing was changed. Your raw data is below: copy it somewhere safe.</p><textarea id="expt" readonly>${esc(fatal.raw)}</textarea><button class="p" data-a="copyraw">Copy raw data</button>`}
const navH=()=>{const t={home:'home',deck:'home',browse:'browse',info:'browse',stats:'stats',fr:'stats',set:'set',imp:'set'}[view];return[['home','Decks'],['browse','Browse'],['stats','Stats'],['set','Settings'+(over()?' ⚠':'')]].map(([k,n])=>`<button data-a="go:${k}"${k===t?' aria-current="page"':''}>${n}</button>`).join('')};
async function stgInfo(){const el=$('#stg');if(!el)return;try{const p=await navigator.storage.persisted(),e=await navigator.storage.estimate();el.textContent='Storage: '+(p?'protected':'not protected')+' · '+(e.usage/1e6).toFixed(1)+' MB used'}catch(x){el.textContent='Storage status unavailable.'}}
function render(){
 const a=$('#app'),nv=$('#nav');
 if(fatal){a.innerHTML=vFatal();nv.hidden=true;return}
 roll();
 a.innerHTML={ob:vOb,home:vHome,deck:vDeck,study:vStudy,browse:vBrowse,info:vInfo,stats:vStats,fr:vFr,set:vSet,imp:vImp}[view]();
 const hide=view==='study'||view==='ob'||(view==='imp'&&!S.set.ob);
 nv.hidden=hide;if(!hide)nv.innerHTML=navH();
 if(view==='study'&&cur)autoPlay();
 if(view==='set'){stgInfo();offCheck()}
}
const go=(v,m)=>{stop();view=v;show=false;pin=null;if(v!=='study')ahead=false;er=0;rs=0;msg=m||'';last='';render();try{window.scrollTo(0,0)}catch(e){}};
function applyTheme(){const r=document.documentElement;if(S.set.th==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',S.set.th)}
/* ---- backup: export, validate, import (Replace only), delivery ---- */
async function sha(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function buildExport(){const o={schema_version:SV,app_version:AV,exported_at:new Date().toISOString(),cards:S.c,log:L,settings:S.set};return JSON.stringify(Object.assign({},o,{checksum:await sha(JSON.stringify(o))}))}
const MIG={};
async function chk(t){
 let o;try{o=JSON.parse(t)}catch(e){return{err:'That isn’t valid backup text. Nothing was changed.'}}
 if(!o||typeof o!=='object'||!o.checksum)return{err:'That isn’t a Parole backup. Nothing was changed.'};
 const cs=o.checksum;delete o.checksum;
 let h;try{h=await sha(JSON.stringify(o))}catch(e){return{err:'This browser can’t verify backups here. Nothing was changed.'}}
 if(h!==cs)return{err:'The checksum doesn’t match: the file is damaged or was edited. Nothing was changed.'};
 if(typeof o.schema_version!=='number'||o.schema_version>SV)return{err:'This backup is from a newer version of the app. Reload to update first. Nothing was changed.'};
 while(o.schema_version<SV){const m=MIG[o.schema_version];if(!m)return{err:'This backup version can’t be upgraded. Nothing was changed.'};o=m(o)}
 if(!o.cards||typeof o.cards!=='object'||!Array.isArray(o.log)||!o.settings||typeof o.settings!=='object')return{err:'The backup is missing data. Nothing was changed.'};
 return{o}}
/* Web Share with file -> download link -> copy box */
async function deliver(fn,text,mime){
 try{const f=new File([text],fn,{type:mime});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:fn});return'done'}}catch(e){if(e&&e.name==='AbortError')return'cancel'}
 try{const u=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement('a');a.href=u;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6e4);return'done'}catch(e){}
 return'copy'}
async function doExport(){
 let text;try{text=await buildExport()}catch(e){msg='This browser can’t create a verified backup here.';return render()}
 const r=await deliver('parole-backup-'+isoDay(dayOf())+'.json',text,'application/json');
 if(r==='done'){S.set.lb=Date.now();exp='';save();msg='Backup saved.';return render()}
 if(r==='cancel'){msg='Backup cancelled.';return render()}
 exp=text;msg='Saving isn’t available here, so copy your backup text below.';if(view==='ob'){S.set.ob=1;save();go('set',msg)}else render()}
async function doCsv(){
 const q=s=>'"'+String(s).replace(/"/g,'""')+'"',rows=['date,time_utc,card_key,card,template,rating'];
 for(const l of L){const c=byK[l.k];rows.push([isoDay(l.d),new Date(l.t).toISOString(),q(l.k),c?q(lbl(c)):'""',c?q(tplName(c)):'""',['','Again','Hard','Good','Easy'][l.r]].join(','))}
 const r=await deliver('parole-reviews-'+isoDay(dayOf())+'.csv',rows.join('\n'),'text/csv');
 msg=r==='done'?'Reviews exported.':r==='cancel'?'Export cancelled.':'Saving isn’t available here.';render()}
/* ---- offline + updates ---- */
async function offCheck(){try{const ks=(await caches.keys()).filter(k=>k.startsWith('parole-media-'));if(!ks.length)return showOff(swr?'Downloading for offline use…':'');const n=(await(await caches.open(ks[0])).keys()).length,tot=Object.keys(MEDIA).length;showOff(n>=tot?'Ready offline ✓':'Downloading for offline use… '+Math.round(n*100/tot)+'%')}catch(e){}}
function regSW(){
 if(!('serviceWorker' in navigator))return;
 navigator.serviceWorker.addEventListener('message',e=>{const d=e.data;if(d&&d.type==='progress'){d.done>=d.total?offCheck():showOff('Downloading for offline use… '+Math.round(d.done*100/d.total)+'%')}});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating&&!reloaded){reloaded=true;location.reload()}});
 navigator.serviceWorker.register('sw.js').then(r=>{swr=r;
  if(r.waiting&&navigator.serviceWorker.controller)upd=r.waiting;
  r.addEventListener('updatefound',()=>{const w=r.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){upd=w;if(view==='home')render()}})});
  setInterval(()=>{r.update().catch(()=>{})},DAY);offCheck();if(upd&&view==='home')render()}).catch(()=>{})}
async function chkUpd(){
 if(!swr){msg='Updates can’t be checked in this browser.';return render()}
 try{await swr.update()}catch(e){msg='Couldn’t check for updates. Are you offline?';return render()}
 await new Promise(r=>setTimeout(r,1500));
 msg=upd||swr.waiting?'Update ready. Go to Decks and tap Update.':swr.installing?'An update is downloading. Check again in a minute.':'You’re up to date (version '+AV+').';
 if(!upd&&swr.waiting)upd=swr.waiting;render()}
/* ---- actions ---- */
async function act(a){
 const i=a.indexOf(':'),k=i<0?a:a.slice(0,i),v=i<0?'':a.slice(i+1);
 switch(k){
  case'go':return go(v);
  case'deck':dk=v;return go('deck');
  case'obs':if(v==='3'){S.set.ob=1;save();return go('home')}obs=+v;if(obs==2){S.set.is=Date.now();try{navigator.storage.persist()}catch(e){}save()}return render();
  case'study':view='study';show=false;pin=null;last='';return render();
  case'more':S.day.x+=5;save();view='study';show=false;last='';return render();
  case'ahead':ahead=true;view='study';show=false;last='';return render();
  case'close':return go('deck');
  case'flip':show=true;return render();
  case'grade':return grade(+v);
  case'undo':return undo();
  case'snd':return play(v);
  case'tts':return cur&&tts(txt(NT[cur.x].f[0]));
  case'info':iK=+v;view='info';return render();
  case'susp':{const c=C[iK],s=S.c[c.k];if(s){s.z=s.z?0:1;save()}return render()}
  case'bd':S.set.bd=Date.now();save();return render();
  case'exp':return doExport();
  case'csv':return doCsv();
  case'copy':case'copyraw':try{await navigator.clipboard.writeText(k==='copy'?exp:fatal.raw);if(k==='copy'){S.set.lb=Date.now();exp='';save();msg='Copied. Backup time updated.'}else msg='Copied.'}catch(e){const t=$('#expt');if(t){t.select();msg='Select all and copy the text manually.'}}return render();
  case'chk':imTxt=($('#imt')||{}).value||'';imRes=await chk(imTxt);return render();
  case'impx':imRes=null;imTxt='';return render();
  case'impgo':{const o=imRes&&imRes.o;if(!o)return;if(!(await snap())){msg='Couldn’t save a safety snapshot (storage full), so nothing was changed. Export a backup first.';return render()}
   S.c=o.cards;L=o.log;S.set=Object.assign(DS().set,o.settings,{ob:1,is:Date.now(),lb:Date.parse(o.exported_at)||0,bd:0});S.seq=L.reduce((m,l)=>Math.max(m,l.q||0),0);S.day={d:0,n:0,r:0,x:0};S.u=null;S.note='';await save(null,null,true);applyTheme();imRes=null;imTxt='';return go('home','Backup restored.')}
  case'rs0':case'er0':rs=er=0;return render();
  case'rs1':rs=1;return render();
  case'rs2':{const s=snaps();if(!s.length)return;try{const x=s[0].s;L=s[0].l;S=Object.assign(DS(),x);S.set=Object.assign(DS().set,x.set);await save(null,null,true);applyTheme();return go('home','Snapshot restored.')}catch(e){rs=0;msg='That snapshot couldn’t be read. Nothing was changed.';return render()}}
  case'er1':er=1;return render();
  case'er2':er=2;return render();
  case'er3':{ls.del(KS);ls.del(KL);ls.del(KP);S=DS();L=[];SN=[];obs=0;if(idb){try{await tx(['kv','log'],t=>{t.objectStore('kv').clear();t.objectStore('log').clear()})}catch(e){}}applyTheme();return go('ob')}
  case'share':{const m=myStats(),t=(S.set.name?S.set.name+': ':'')+'I know '+m.l+' cards, '+m.m+' mature, '+m.s+' day streak';
   try{if(navigator.share){await navigator.share({text:t});return}}catch(e){if(e&&e.name==='AbortError')return}
   try{await navigator.clipboard.writeText(t);msg='Copied: '+t}catch(e){msg=t}return render()}
  case'fradd':{const n=parseFr(($('#frt')||{}).value||'');if(!n.length){msg='No snippets found. Each line should look like: Anna: I know 120 cards, 30 mature, 5 day streak';return render()}
   for(const f of n){const j=S.fr.findIndex(x=>x.n.toLowerCase()===f.n.toLowerCase());if(j>=0)S.fr[j]=f;else S.fr.push(f)}save();msg='Added '+n.length+'.';return render()}
  case'frd':S.fr.splice(+v,1);save();return render();
  case'chkupd':return chkUpd();
  case'upd':{const w=upd||(swr&&swr.waiting);if(!w)return;updating=true;w.postMessage({type:'SKIP'});return}
  case'reload':return location.reload();
 }
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a]');if(b&&!b.disabled)act(b.dataset.a)});
const onIn=e=>{const t=e.target;if(t.dataset.f!==undefined){const f=t.files&&t.files[0];if(f)f.text().then(x=>{imTxt=x;const z=$('#imt');if(z)z.value=x});return}
 const k=t.dataset.i;if(!k)return;let v=t.value;
 if(k==='bq'||k==='bf'){if(k==='bq')bq=v;else bf=v;const r=$('#res');if(r)r.innerHTML=brList();return}
 if(k==='n'||k==='tts')v=+v;if(k==='r')v=Math.max(1,Math.min(9999,Math.round(+v)||200));
 S.set[k]=v;if(k==='th')applyTheme();save();if(k==='tts')render()};
document.addEventListener('input',onIn);document.addEventListener('change',onIn);
document.addEventListener('keydown',e=>{
 if(view!=='study'||!cur||(e.target.matches&&e.target.matches('input,textarea,select')))return;
 if(!show&&(e.key===' '||e.key==='Enter')){e.preventDefault();show=true;render()}
 else if(show&&'1234'.includes(e.key)&&e.key)grade(+e.key-1)});
/* ---- boot ---- */
(async()=>{
 try{await loadDeck()}catch(e){fatal={deck:1}}
 if(!fatal)await loadAll();
 if(!fatal){S.cv=DK.content_version;applyTheme();view=S.set.ob?'home':'ob';if(DECKS.length)dk=DECKS[0].id}
 render();regSW();
})();

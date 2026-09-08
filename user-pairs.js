/* Fantasy Bugg – användarförslag på nya parkonstellationer med admin-godkännande */
(function(){
  const TABLE='fantasy_pair_requests';
  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('sv-SE');
  const clean=s=>String(s||'').trim().replace(/\s+/g,' ');

  function getPairs(){
    try{if(typeof pairs!=='undefined'&&Array.isArray(pairs))return pairs}catch(e){}
    return [];
  }
  function splitNames(pair){return String(pair?.name||'').split(/\s+&\s+/).map(clean).filter(Boolean)}
  function knownPrice(name){
    const n=norm(name);let best=0;
    getPairs().forEach(p=>{if(splitNames(p).some(x=>norm(x)===n))best=Math.max(best,Number(p.price)||0)});
    return best;
  }
  function exactPairExists(a,b){
    const wanted=[norm(a),norm(b)].sort().join('|');
    return getPairs().some(p=>splitNames(p).map(norm).sort().join('|')===wanted);
  }
  function isAdmin(){return typeof currentUser!=='undefined'&&currentUser&&typeof ADMIN_UID!=='undefined'&&currentUser.id===ADMIN_UID}
  function nextPairIndex(){return getPairs().reduce((m,p)=>Math.max(m,Number(p.index)||0),-1)+1}

  function appendApproved(row){
    if(!row||row.pair_index==null||exactPairExists(row.dancer_a,row.dancer_b))return;
    const arr=getPairs();
    arr.push({
      index:Number(row.pair_index),
      cls:String(row.age_class||'Vuxen'),
      name:`${clean(row.dancer_a)} & ${clean(row.dancer_b)}`,
      club:'',rank:9999,price:Number(row.price)||6,form:0,recentPoints:[],priceChange:0,userAdded:true
    });
  }

  async function loadApproved(){
    if(typeof sb==='undefined')return;
    const {data,error}=await sb.from(TABLE).select('id,dancer_a,dancer_b,age_class,price,pair_index,status').eq('status','approved').order('pair_index',{ascending:true});
    if(error){console.warn('Kunde inte läsa godkända parkonstellationer:',error.message);return}
    (data||[]).forEach(appendApproved);
    try{renderMarket()}catch(e){}
  }

  function evaluate(){
    const a=clean(document.getElementById('newPairA')?.value),b=clean(document.getElementById('newPairB')?.value);
    const age=document.getElementById('newPairAge')?.value||'Vuxen';
    const out=document.getElementById('newPairMatch'),save=document.getElementById('newPairSave');
    if(!out||!save)return;
    save.disabled=true;
    if(!a||!b){out.innerHTML='<span class="meta">Skriv båda namnen så söker systemet efter individerna.</span>';return}
    if(norm(a)===norm(b)){out.innerHTML='<span class="err">Dansarna måste vara två olika personer.</span>';return}
    if(exactPairExists(a,b)){out.innerHTML='<span class="err">Den här parkonstellationen finns redan på marknaden.</span>';return}
    const pa=knownPrice(a),pb=knownPrice(b);
    const rows=[
      `<div><b>${esc(a)}</b><br><span class="meta">${pa?`Hittad i marknaden · högsta kända värde ${money(pa)}`:'Ny individ · ingen tidigare träff'}</span></div>`,
      `<div><b>${esc(b)}</b><br><span class="meta">${pb?`Hittad i marknaden · högsta kända värde ${money(pb)}`:'Ny individ · ingen tidigare träff'}</span></div>`
    ].join('');
    if(!pa&&!pb){out.innerHTML=`${rows}<div class="err">Ingen av dansarna finns på marknaden. Pris kan därför inte sättas automatiskt.</div>`;return}
    const price=Math.max(pa,pb);
    out.innerHTML=`${rows}<div class="newPairPrice"><span>Föreslaget pris</span><strong>${money(price)}</strong><small>Förslaget skickas till admin för godkännande innan paret syns för alla.</small></div>`;
    save.dataset.a=a;save.dataset.b=b;save.dataset.age=age;save.dataset.price=String(price);save.disabled=false;
  }

  async function submitRequest(button){
    if(!currentUser){alert('Du måste vara inloggad för att föreslå ett nytt par.');return}
    const a=clean(button.dataset.a),b=clean(button.dataset.b),age=button.dataset.age||'Vuxen';
    const livePrice=Math.max(knownPrice(a),knownPrice(b));
    if(!livePrice){alert('Ingen av dansarna finns längre i marknaden.');return}
    if(exactPairExists(a,b)){alert('Den här parkonstellationen finns redan på marknaden.');return}
    button.disabled=true;
    const {error}=await sb.from(TABLE).insert({
      dancer_a:a,dancer_b:b,age_class:age,proposed_price:livePrice,status:'pending',submitted_by:currentUser.id
    });
    if(error){
      console.error(error);
      alert(error.message.includes('fantasy_pair_requests')?'Funktionen behöver aktiveras i databasen först.':'Förslaget kunde inte skickas: '+error.message);
      button.disabled=false;return;
    }
    document.getElementById('newPairModal')?.classList.remove('show');
    alert('Förslaget är skickat till admin för godkännande.');
    if(isAdmin())loadPendingAdmin();
  }

  function installModal(){
    const section=document.getElementById('pairs');if(!section||document.getElementById('newPairOpen'))return;
    const btn=document.createElement('button');btn.id='newPairOpen';btn.className='btn gold';btn.type='button';btn.textContent='+ Föreslå nytt par';
    const row=document.createElement('div');row.className='newPairActionRow';row.appendChild(btn);
    const market=document.getElementById('pairMarket');if(market)section.insertBefore(row,market);else section.appendChild(row);
    const modal=document.createElement('div');modal.className='modalBackdrop';modal.id='newPairModal';modal.innerHTML=`<div class="modal"><div class="modalHead"><div><small class="meta">NY PARKONSTELLATION</small><h2 style="margin:2px 0 0">Föreslå nytt par</h2></div><button type="button" class="modalClose" id="newPairClose">×</button></div><p class="meta">Skriv dansarnas fullständiga namn. Systemet letar efter personerna i marknaden och räknar fram priset från det högsta kända individvärdet.</p><div class="newPairGrid"><label>Dansare 1<input class="search" id="newPairA" placeholder="Förnamn Efternamn"></label><label>Dansare 2<input class="search" id="newPairB" placeholder="Förnamn Efternamn"></label><label>Åldersklass<select class="search" id="newPairAge"><option>Junior</option><option selected>Vuxen</option><option>Senior</option></select></label></div><div id="newPairMatch" class="newPairMatch"></div><button type="button" class="btn gold" id="newPairSave" style="width:100%;margin-top:14px" disabled>Skicka för godkännande</button></div>`;
    document.body.appendChild(modal);
    btn.addEventListener('click',()=>{modal.classList.add('show');evaluate()});
    document.getElementById('newPairClose').addEventListener('click',()=>modal.classList.remove('show'));
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
    ['newPairA','newPairB'].forEach(id=>document.getElementById(id).addEventListener('input',evaluate));
    document.getElementById('newPairAge').addEventListener('change',evaluate);
    document.getElementById('newPairSave').addEventListener('click',function(e){e.preventDefault();submitRequest(this)});
  }

  function installAdminPanel(){
    const admin=document.getElementById('admin');if(!admin||document.getElementById('pairRequestAdminPanel'))return;
    const panel=document.createElement('div');panel.className='panel';panel.id='pairRequestAdminPanel';panel.style.marginTop='16px';
    panel.innerHTML='<div class="sectionTitle"><div><h2>Nya parkonstellationer</h2><p>Godkänn eller neka användarnas förslag.</p></div><button class="btn soft" id="refreshPairRequests">Uppdatera</button></div><div id="pairRequestAdminList"><div class="empty">Laddas...</div></div>';
    admin.appendChild(panel);
    document.getElementById('refreshPairRequests').addEventListener('click',loadPendingAdmin);
  }

  async function loadPendingAdmin(){
    if(!isAdmin())return;
    installAdminPanel();
    const list=document.getElementById('pairRequestAdminList');if(!list)return;
    const {data,error}=await sb.from(TABLE).select('*').eq('status','pending').order('created_at',{ascending:true});
    if(error){list.innerHTML=`<div class="err">${esc(error.message)}</div>`;return}
    if(!(data||[]).length){list.innerHTML='<div class="empty">Inga förslag väntar på godkännande.</div>';return}
    list.innerHTML=data.map(r=>`<div class="pairRequestCard"><b>${esc(r.dancer_a)} & ${esc(r.dancer_b)}</b><div class="meta">Bugg ${esc(r.age_class)} · föreslaget ${money(r.proposed_price)}</div><div class="pairRequestActions"><button class="btn gold" data-pair-approve="${esc(r.id)}">Godkänn</button><button class="btn red" data-pair-reject="${esc(r.id)}">Neka</button></div></div>`).join('');
    list.querySelectorAll('[data-pair-approve]').forEach(b=>b.addEventListener('click',()=>approveRequest(b.dataset.pairApprove)));
    list.querySelectorAll('[data-pair-reject]').forEach(b=>b.addEventListener('click',()=>rejectRequest(b.dataset.pairReject)));
  }

  async function approveRequest(id){
    if(!isAdmin())return;
    const {data:req,error:readError}=await sb.from(TABLE).select('*').eq('id',id).maybeSingle();
    if(readError||!req){alert('Kunde inte läsa förslaget.');return}
    if(exactPairExists(req.dancer_a,req.dancer_b)){
      await sb.from(TABLE).update({status:'rejected',reviewed_at:new Date().toISOString(),reviewed_by:currentUser.id}).eq('id',id);
      alert('Paret finns redan på marknaden. Förslaget markerades som nekat.');loadPendingAdmin();return;
    }
    const price=Math.max(knownPrice(req.dancer_a),knownPrice(req.dancer_b));
    if(!price){alert('Ingen av dansarna finns längre på marknaden. Kan inte godkänna automatiskt.');return}
    const pairIndex=nextPairIndex();
    const {data,error}=await sb.from(TABLE).update({status:'approved',price,pair_index:pairIndex,reviewed_at:new Date().toISOString(),reviewed_by:currentUser.id}).eq('id',id).eq('status','pending').select().maybeSingle();
    if(error||!data){alert('Godkännandet misslyckades: '+(error?.message||'okänt fel'));return}
    appendApproved(data);try{renderMarket()}catch(e){};loadPendingAdmin();
  }

  async function rejectRequest(id){
    if(!isAdmin())return;
    const {error}=await sb.from(TABLE).update({status:'rejected',reviewed_at:new Date().toISOString(),reviewed_by:currentUser.id}).eq('id',id).eq('status','pending');
    if(error){alert('Kunde inte neka förslaget: '+error.message);return}
    loadPendingAdmin();
  }

  async function start(){
    if(typeof sb==='undefined'||!getPairs().length)return;
    installModal();
    await loadApproved();
    if(isAdmin()){installAdminPanel();loadPendingAdmin()}
    if(sb.auth?.onAuthStateChange){sb.auth.onAuthStateChange(()=>setTimeout(()=>{if(isAdmin()){installAdminPanel();loadPendingAdmin()}},0))}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
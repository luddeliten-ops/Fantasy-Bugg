/* Fantasy Bugg – TEST: låt användare skapa nya parkonstellationer lokalt */
(function(){
  const STORAGE_KEY='fantasybugg_test_user_pairs_v1';
  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('sv-SE');
  const clean=s=>String(s||'').trim().replace(/\s+/g,' ');

  function splitNames(pair){
    return String(pair?.name||'').split(/\s+&\s+/).map(clean).filter(Boolean);
  }
  function knownPrice(name){
    const n=norm(name); let best=0;
    (window.pairs||pairs||[]).forEach(p=>{
      if(splitNames(p).some(x=>norm(x)===n)) best=Math.max(best,Number(p.price)||0);
    });
    return best;
  }
  function exactPairExists(a,b){
    const wanted=[norm(a),norm(b)].sort().join('|');
    return (window.pairs||pairs||[]).some(p=>splitNames(p).map(norm).sort().join('|')===wanted);
  }
  function fallbackPrice(cls){
    try{return priceFromRank((classRanks[cls]||0)+1,cls)}catch(e){return 6}
  }
  function loadSaved(){
    let saved=[]; try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch(e){}
    saved.forEach(item=>addToMarket(item,false));
  }
  function addToMarket(item,persist=true){
    if(exactPairExists(item.a,item.b)) return false;
    const arr=window.pairs||pairs;
    const idx=arr.reduce((m,p)=>Math.max(m,Number(p.index)||0),-1)+1;
    arr.push({index:idx,cls:item.age,name:`${item.a} & ${item.b}`,club:'',rank:(classRanks[item.age]||0)+1,price:Number(item.price)||6,form:0,recentPoints:[],priceChange:0,userAdded:true});
    classRanks[item.age]=(classRanks[item.age]||0)+1;
    if(persist){
      let saved=[]; try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch(e){}
      saved.push(item); localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
    }
    try{renderMarket()}catch(e){}
    return true;
  }
  function evaluate(){
    const a=clean(document.getElementById('newPairA')?.value), b=clean(document.getElementById('newPairB')?.value);
    const age=document.getElementById('newPairAge')?.value||'Vuxen';
    const out=document.getElementById('newPairMatch');
    const save=document.getElementById('newPairSave');
    if(!a||!b){out.innerHTML='<span class="meta">Skriv båda namnen så söker systemet efter individerna.</span>';save.disabled=true;return;}
    if(norm(a)===norm(b)){out.innerHTML='<span class="err">Dansarna måste vara två olika personer.</span>';save.disabled=true;return;}
    if(exactPairExists(a,b)){out.innerHTML='<span class="err">Den här parkonstellationen finns redan på marknaden.</span>';save.disabled=true;return;}
    const pa=knownPrice(a),pb=knownPrice(b); const price=Math.max(pa,pb,fallbackPrice(age));
    const rows=[
      `<div><b>${esc(a)}</b><br><span class="meta">${pa?`Hittad i marknaden · högsta kända värde ${money(pa)}`:'Ny individ · ingen tidigare träff'}</span></div>`,
      `<div><b>${esc(b)}</b><br><span class="meta">${pb?`Hittad i marknaden · högsta kända värde ${money(pb)}`:'Ny individ · ingen tidigare träff'}</span></div>`
    ].join('');
    out.innerHTML=`${rows}<div class="newPairPrice"><span>Föreslaget pris</span><strong>${money(price)}</strong><small>Högsta kända individvärdet${!pa&&!pb?' (grundpris används när båda är nya)':''}</small></div>`;
    save.disabled=false; save.dataset.price=price; save.dataset.a=a;save.dataset.b=b;save.dataset.age=age;
  }
  function open(){document.getElementById('newPairModal')?.classList.add('show');evaluate()}
  function close(){document.getElementById('newPairModal')?.classList.remove('show')}
  function install(){
    if(typeof pairs==='undefined') return;
    loadSaved();
    const section=document.getElementById('pairs');
    if(!section||document.getElementById('newPairOpen')) return;

    const btn=document.createElement('button');
    btn.id='newPairOpen';
    btn.className='btn gold';
    btn.textContent='+ Lägg till nytt par';

    const actionRow=document.createElement('div');
    actionRow.className='newPairActionRow';
    actionRow.appendChild(btn);
    const market=document.getElementById('pairMarket');
    if(market) section.insertBefore(actionRow,market); else section.appendChild(actionRow);

    const modal=document.createElement('div');modal.className='modalBackdrop';modal.id='newPairModal';modal.innerHTML=`<div class="modal"><div class="modalHead"><div><small class="meta">TESTFUNKTION</small><h2 style="margin:2px 0 0">Lägg till nytt par</h2></div><button class="modalClose" id="newPairClose">×</button></div><p class="meta">Skriv dansarnas fullständiga namn. Systemet söker efter samma individer i befintliga parkonstellationer och använder det högsta kända värdet.</p><div class="newPairGrid"><label>Dansare 1<input class="search" id="newPairA" placeholder="Förnamn Efternamn"></label><label>Dansare 2<input class="search" id="newPairB" placeholder="Förnamn Efternamn"></label><label>Åldersklass<select class="search" id="newPairAge"><option>Junior</option><option selected>Vuxen</option><option>Senior</option></select></label></div><div id="newPairMatch" class="newPairMatch"></div><button class="btn gold" id="newPairSave" style="width:100%;margin-top:14px" disabled>Lägg till paret på marknaden</button><p class="meta" style="margin-bottom:0">I den här testversionen sparas nya par bara i din webbläsare. Inget skickas till den riktiga databasen.</p></div>`;
    document.body.appendChild(modal);
    btn.onclick=open;document.getElementById('newPairClose').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
    ['newPairA','newPairB','newPairAge'].forEach(id=>document.getElementById(id).addEventListener(id.includes('PairA')||id.includes('PairB')?'input':'change',evaluate));
    document.getElementById('newPairSave').onclick=function(){const item={a:this.dataset.a,b:this.dataset.b,age:this.dataset.age,price:Number(this.dataset.price)};if(addToMarket(item,true)){close();alert(`${item.a} & ${item.b} lades till i testmarknaden för ${money(item.price)}.`)}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
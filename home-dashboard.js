/* Fantasy Bugg – dynamisk startsida utan dubbla globala klicksystem */
(function(){
  const $ = id => document.getElementById(id);

  function ensureTeamArenaAssets(){
    let link=document.querySelector('link[data-team-arena]');
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      link.dataset.teamArena='1';
      document.head.appendChild(link);
    }
    link.href='team-arena.css?v=10';
  }

  function ensureModalTheme(){
    if(document.getElementById('fb-modal-fix')) return;
    const style=document.createElement('style');
    style.id='fb-modal-fix';
    style.textContent=`
      .modalBackdrop{background:rgba(1,4,12,.82)!important;backdrop-filter:blur(8px)!important}
      .modalBackdrop .modal{background:linear-gradient(145deg,#0d1324,#070c18)!important;color:#f7f8fc!important;border:1px solid rgba(255,76,177,.28)!important;box-shadow:0 28px 80px rgba(0,0,0,.62)!important}
      .modalBackdrop .modal h1,.modalBackdrop .modal h2,.modalBackdrop .modal h3,.modalBackdrop .modal b,.modalBackdrop .modal strong{color:#fff!important}
      .modalBackdrop .modal .meta,.modalBackdrop .modal .empty,.modalBackdrop .modal small{color:#a8afbf!important}
      .modalBackdrop .modal .kpi,.modalBackdrop .modal .teamCard{background:linear-gradient(145deg,#11182b,#090f1d)!important;color:#fff!important;border:1px solid rgba(255,255,255,.09)!important}
      .modalBackdrop .modal .scoreRow{color:#eef1f7!important;border-color:rgba(255,255,255,.09)!important}
      .modalBackdrop .modalClose{background:#171e30!important;color:#fff!important;border:1px solid rgba(255,255,255,.12)!important}
      #pairModalBody,#publicTeamBody,#resultModalBody{color:#eef1f7!important}
    `;
    document.head.appendChild(style);
  }

  function esc(value){
    return String(value ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  /* Endast startsidans dynamiskt skapade sidlänkar delegeras här.
     Info/lag/ligor hanteras enbart av interaction-fix.js. */
  function ensureDynamicPageJumps(){
    if(document.documentElement.dataset.fbHomePageJumps==='1') return;
    document.documentElement.dataset.fbHomePageJumps='1';
    document.addEventListener('click',event=>{
      const target=event.target instanceof Element ? event.target.closest('#home [data-page-jump]') : null;
      if(!target) return;
      event.preventDefault();
      if(typeof showPage==='function') showPage(target.dataset.pageJump);
    });
  }

  function getDate(c){
    const raw = c?.deadline || c?.date || c?.competition_date || c?.starts_at || c?.start_date;
    if(!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function dateText(d){
    if(!d) return 'Datum ej satt';
    return new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',year:'numeric'}).format(d);
  }

  function nameOf(c){ return c?.name || c?.title || c?.competition_name || 'Tävling'; }
  function levelOf(c){ return c?.level || c?.competition_level || c?.type || ''; }

  function ensureDashboard(){
    const feed = document.querySelector('#home .homeFeed');
    if(!feed) return null;
    feed.innerHTML = `
      <section class="panel homeCompetitionPanel">
        <div class="homePanelHead"><div><span class="homePanelKicker">NÄSTA PÅ TUR</span><h2>Kommande tävlingar</h2></div><button class="homeTextButton" data-page-jump="competitions">Visa alla →</button></div>
        <div id="homeUpcomingCompetitions" class="homeCompetitionCards"><div class="empty">Hämtar tävlingar…</div></div>
      </section>
      <section class="panel homeResultsPanel">
        <div class="homePanelHead"><div><span class="homePanelKicker">SENAST AVGJORT</span><h2>Senaste resultat</h2></div><button class="homeTextButton" data-page-jump="competitions">Resultat →</button></div>
        <div id="homeRecentResults" class="homeResultCards"><div class="empty">Hämtar resultat…</div></div>
      </section>`;
    return feed;
  }

  function renderUpcoming(items){
    const box = $('homeUpcomingCompetitions');
    if(!box) return;
    if(!items.length){ box.innerHTML = '<div class="empty">Ingen kommande tävling publicerad ännu.</div>'; return; }
    box.innerHTML = items.slice(0,3).map((c,i)=>{
      const d=getDate(c), level=levelOf(c);
      return `<article class="homeCompCard ${i===0?'featured':''}"><div class="homeCompDate"><strong>${d ? d.getDate() : '–'}</strong><span>${d ? new Intl.DateTimeFormat('sv-SE',{month:'short'}).format(d) : ''}</span></div><div class="homeCompInfo"><div class="homeCompBadges">${level?`<span>${esc(level)}</span>`:''}${i===0?'<b>NÄSTA</b>':''}</div><h3>${esc(nameOf(c))}</h3><p>${esc(dateText(d))}</p></div><button class="homeCompArrow" data-page-jump="competitions" aria-label="Öppna tävling">›</button></article>`;
    }).join('');
  }

  function renderResults(items){
    const box = $('homeRecentResults');
    if(!box) return;
    if(!items.length){ box.innerHTML = '<div class="empty">Inga färdiga tävlingar ännu.</div>'; return; }
    box.innerHTML = items.slice(0,3).map(c=>{
      const d=getDate(c), level=levelOf(c);
      return `<article class="homeResultCard"><div><div class="homeCompBadges">${level?`<span>${esc(level)}</span>`:''}<b>RESULTAT</b></div><h3>${esc(nameOf(c))}</h3><p>${esc(dateText(d))}</p></div><button class="homeResultButton" data-page-jump="competitions">Visa</button></article>`;
    }).join('');
  }

  async function load(){
    ensureTeamArenaAssets();
    ensureModalTheme();
    ensureDynamicPageJumps();
    if(!ensureDashboard() || typeof sb==='undefined') return;
    try{
      const response = await sb.from('competitions').select('*');
      if(response.error) throw response.error;
      const all = Array.isArray(response.data) ? response.data : [];
      const now = new Date();
      const upcoming = all.filter(c=>{ const d=getDate(c); return d && d>=now && !c.results_imported_at; }).sort((a,b)=>getDate(a)-getDate(b));
      const completed = all.filter(c=>c.results_imported_at).sort((a,b)=>{ const da=getDate(a), db=getDate(b); return (db?.getTime()||0)-(da?.getTime()||0); });
      renderUpcoming(upcoming);
      renderResults(completed);
    }catch(error){
      console.error('Kunde inte hämta startsidans tävlingar:',error);
      const up=$('homeUpcomingCompetitions'), res=$('homeRecentResults');
      if(up) up.innerHTML='<div class="empty">Kunde inte hämta kommande tävlingar.</div>';
      if(res) res.innerHTML='<div class="empty">Kunde inte hämta senaste resultat.</div>';
    }
  }

  ensureTeamArenaAssets();
  ensureModalTheme();
  ensureDynamicPageJumps();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();

/* Fantasy Bugg – live statistik på startsidan */
(async function(){
  async function loadPublicHomeStats(){
    const stats = document.querySelector('#home .homeStats');
    if(!stats || typeof sb === 'undefined') return;

    stats.innerHTML = `
      <div class="homeStat"><small>Skapade lag</small><strong id="homeTeamCount">–</strong></div>
      <div class="homeStat"><small>Danspar</small><strong id="homePairCount">–</strong></div>
      <div class="homeStat"><small>Tävlingar</small><strong id="homeCompetitionCount">–</strong></div>
      <div class="homeStat"><small>Managers</small><strong id="homeManagerCount">–</strong></div>
      <span id="homePoints" hidden>0</span><span id="homeValue" hidden>100 M</span><span id="homeRank" hidden>–</span>`;

    const pairEl=document.getElementById('homePairCount');
    if(pairEl) pairEl.textContent=Array.isArray(window.FANTASY_MARKET)?window.FANTASY_MARKET.length.toLocaleString('sv-SE'):'0';
    const teamEl=document.getElementById('homeTeamCount');
    const competitionEl=document.getElementById('homeCompetitionCount');
    const managerEl=document.getElementById('homeManagerCount');
    try{
      const response=await sb.rpc('get_public_fantasy_stats');
      if(response.error) throw response.error;
      const data=response.data||{};
      if(teamEl) teamEl.textContent=Number(data.teams||0).toLocaleString('sv-SE');
      if(competitionEl) competitionEl.textContent=Number(data.competitions||0).toLocaleString('sv-SE');
      if(managerEl) managerEl.textContent=Number(data.managers||0).toLocaleString('sv-SE');
    }catch(error){
      console.error('Kunde inte hämta publik Fantasy Bugg-statistik:',error);
      if(teamEl) teamEl.textContent='–';if(competitionEl) competitionEl.textContent='–';if(managerEl) managerEl.textContent='–';
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadPublicHomeStats,{once:true});
  else await loadPublicHomeStats();

  if(!document.querySelector('script[data-home-dashboard]')){
    const script=document.createElement('script');
    script.src='home-dashboard.js';
    script.defer=true;
    script.dataset.homeDashboard='1';
    document.head.appendChild(script);
  }
})();

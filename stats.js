/* Fantasy Bugg – live statistik på startsidan */
(async function(){
  async function loadPublicHomeStats(){
    const stats = document.querySelector('#home .homeStats');
    if(!stats || typeof sb === 'undefined') return;
    stats.innerHTML = `<div class="homeStat"><small>Skapade lag</small><strong id="homeTeamCount">–</strong></div><div class="homeStat"><small>Danspar</small><strong id="homePairCount">–</strong></div><div class="homeStat"><small>Tävlingar</small><strong id="homeCompetitionCount">–</strong></div><div class="homeStat"><small>Managers</small><strong id="homeManagerCount">–</strong></div><span id="homePoints" hidden>0</span><span id="homeValue" hidden>100 M</span><span id="homeRank" hidden>–</span>`;
    const pairEl=document.getElementById('homePairCount');if(pairEl) pairEl.textContent=Array.isArray(window.FANTASY_MARKET)?window.FANTASY_MARKET.length.toLocaleString('sv-SE'):'0';
    const teamEl=document.getElementById('homeTeamCount'),competitionEl=document.getElementById('homeCompetitionCount'),managerEl=document.getElementById('homeManagerCount');
    try{const response=await sb.rpc('get_public_fantasy_stats');if(response.error) throw response.error;const data=response.data||{};if(teamEl) teamEl.textContent=Number(data.teams||0).toLocaleString('sv-SE');if(competitionEl) competitionEl.textContent=Number(data.competitions||0).toLocaleString('sv-SE');if(managerEl) managerEl.textContent=Number(data.managers||0).toLocaleString('sv-SE');}catch(error){console.error('Kunde inte hämta publik Fantasy Bugg-statistik:',error);if(teamEl) teamEl.textContent='–';if(competitionEl) competitionEl.textContent='–';if(managerEl) managerEl.textContent='–';}
  }
  if(!document.querySelector('link[data-page-heroes]')){const style=document.createElement('link');style.rel='stylesheet';style.href='page-heroes.css?v=2';style.dataset.pageHeroes='1';document.head.appendChild(style);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadPublicHomeStats,{once:true});else await loadPublicHomeStats();
  const scripts=[['head-cleanup.js?v=1','headCleanup'],['profile-fix.js?v=3','profileFix'],['home-dashboard.js?v=8','homeDashboard'],['interaction-fix.js?v=2','interactionFix'],['competition-fix.js?v=1','competitionFix'],['league-sponsor.js?v=1','leagueSponsor']];
  scripts.forEach(([src,key])=>{const attr='data-'+key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase());if(document.querySelector('script['+attr+']')) return;const script=document.createElement('script');script.src=src;script.defer=true;script.setAttribute(attr,'1');document.head.appendChild(script);});
})();

/* Fantasy Bugg – live statistik på startsidan */
(async function(){
  async function loadPublicHomeStats(){
    const stats = document.querySelector('#home .homeStats');
    if(!stats || typeof sb === 'undefined') return;

    stats.innerHTML = `
      <div class="homeStat">
        <small>Skapade lag</small>
        <strong id="homeTeamCount">–</strong>
      </div>
      <div class="homeStat">
        <small>Danspar</small>
        <strong id="homePairCount">–</strong>
      </div>
      <div class="homeStat">
        <small>Tävlingar</small>
        <strong id="homeCompetitionCount">–</strong>
      </div>
      <div class="homeStat">
        <small>Managers</small>
        <strong id="homeManagerCount">–</strong>
      </div>
    `;

    const pairEl = document.getElementById('homePairCount');
    if(pairEl){
      pairEl.textContent = Array.isArray(window.FANTASY_MARKET)
        ? window.FANTASY_MARKET.length.toLocaleString('sv-SE')
        : '0';
    }

    const [teamsResponse, competitionsResponse, managersResponse] = await Promise.all([
      sb.from('fantasy_teams').select('user_id',{count:'exact',head:true}),
      sb.from('competitions').select('id',{count:'exact',head:true}),
      sb.from('profiles').select('id',{count:'exact',head:true})
    ]);

    const teamEl = document.getElementById('homeTeamCount');
    const competitionEl = document.getElementById('homeCompetitionCount');
    const managerEl = document.getElementById('homeManagerCount');

    if(teamEl){
      teamEl.textContent = teamsResponse.error
        ? '–'
        : Number(teamsResponse.count || 0).toLocaleString('sv-SE');
    }

    if(competitionEl){
      competitionEl.textContent = competitionsResponse.error
        ? '–'
        : Number(competitionsResponse.count || 0).toLocaleString('sv-SE');
    }

    if(managerEl){
      managerEl.textContent = managersResponse.error
        ? '–'
        : Number(managersResponse.count || 0).toLocaleString('sv-SE');
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',loadPublicHomeStats,{once:true});
  }else{
    await loadPublicHomeStats();
  }
})();

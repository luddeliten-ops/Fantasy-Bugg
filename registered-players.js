/* Fantasy Bugg – visa alla registrerade managers, även utan valt lag */
(function(){
  const esc3=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let leaderboardExpanded=false;
  let cachedRows=[];

  async function getProfiles(){
    const response=await sb.from('profiles').select('user_id,fantasy_name');
    if(response.error) throw response.error;
    return Array.isArray(response.data)?response.data:[];
  }

  function renderRegisteredLeaderboard(){
    const box=document.getElementById('globalLeaderboard');
    if(!box) return;

    if(!cachedRows.length){
      box.innerHTML='<div class="empty">Topplistan är tom.</div>';
      return;
    }

    if(typeof globalRank!=='undefined') globalRank='–';

    cachedRows.forEach((row,index)=>{
      if(typeof currentUser!=='undefined' && currentUser && String(row.user_id)===String(currentUser.id)){
        try{ globalRank=index+1; }catch(e){}
      }
    });

    const visibleRows=leaderboardExpanded ? cachedRows : cachedRows.slice(0,5);

    const rowsHtml=visibleRows.map((row,index)=>{
      const points=Number(row.total_points||0).toFixed(1).replace('.0','');
      return `<div class="leagueRow">
        <div class="rank">${index+1}</div>
        <div><b>${esc3(row.fantasy_name)}</b></div>
        <button class="btn soft" data-public-team="${esc3(row.user_id||'')}">${points} p</button>
      </div>`;
    }).join('');

    const toggleHtml=cachedRows.length>5
      ? `<button class="btn soft" id="toggleGlobalLeaderboard" style="width:100%;margin-top:12px">${leaderboardExpanded?'Visa topp 5':'Visa hela topplistan'}</button>`
      : '';

    box.innerHTML=rowsHtml+toggleHtml;

    box.querySelectorAll('[data-public-team]').forEach(button=>{
      button.onclick=()=>{
        if(typeof openPublicTeam==='function') openPublicTeam(button.dataset.publicTeam);
      };
    });

    const toggle=box.querySelector('#toggleGlobalLeaderboard');
    if(toggle){
      toggle.onclick=()=>{
        leaderboardExpanded=!leaderboardExpanded;
        renderRegisteredLeaderboard();
      };
    }

    if(typeof renderStats==='function') renderStats();
  }

  async function loadAllRegisteredLeaderboard(){
    const box=document.getElementById('globalLeaderboard');
    if(!box || typeof sb==='undefined') return;

    try{
      const [profiles,leaderboardResponse]=await Promise.all([
        getProfiles(),
        sb.rpc('get_global_leaderboard')
      ]);

      const scoreRows=leaderboardResponse.error?[]:(leaderboardResponse.data||[]);
      const scores=new Map();
      scoreRows.forEach(row=>{
        const id=String(row?.user_id??row?.id??'');
        if(!id) return;
        scores.set(id,Number(row?.total_points??row?.points??0));
      });

      cachedRows=profiles.map(profile=>({
        user_id:profile.user_id,
        fantasy_name:profile.fantasy_name||'Fantasyspelare',
        total_points:scores.get(String(profile.user_id))||0
      })).sort((a,b)=>{
        const pointDiff=b.total_points-a.total_points;
        if(pointDiff) return pointDiff;
        return String(a.fantasy_name).localeCompare(String(b.fantasy_name),'sv');
      });

      leaderboardExpanded=false;
      renderRegisteredLeaderboard();
    }catch(error){
      console.error('Kunde inte visa alla registrerade managers:',error);
      if(typeof window.__originalLoadGlobalLeaderboard==='function'){
        return window.__originalLoadGlobalLeaderboard();
      }
    }
  }

  async function refreshRegisteredCounts(){
    if(typeof sb==='undefined') return;
    try{
      const profiles=await getProfiles();
      const count=profiles.length;
      const managerEl=document.getElementById('homeManagerCount');
      const teamEl=document.getElementById('homeTeamCount');
      if(managerEl) managerEl.textContent=count.toLocaleString('sv-SE');
      if(teamEl) teamEl.textContent=count.toLocaleString('sv-SE');
    }catch(error){
      console.error('Kunde inte räkna registrerade managers:',error);
    }
  }

  if(typeof window.loadGlobalLeaderboard==='function'){
    window.__originalLoadGlobalLeaderboard=window.loadGlobalLeaderboard;
  }
  window.loadGlobalLeaderboard=loadAllRegisteredLeaderboard;

  async function run(){
    await refreshRegisteredCounts();
    await loadAllRegisteredLeaderboard();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();

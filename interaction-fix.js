/* Fantasy Bugg – robusta info- och ligaklick v1 */
(function(){
  function num(v){ return Number(v); }

  // Delegation gör att knapparna fungerar även efter att listorna renderats om.
  document.addEventListener('click', async function(event){
    const teamInfo = event.target.closest('[data-team-info]');
    if(teamInfo){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(typeof openTeamPairInfo === 'function') await openTeamPairInfo(num(teamInfo.dataset.teamInfo));
      return;
    }

    const marketInfo = event.target.closest('[data-info]');
    if(marketInfo){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(typeof openPairModal === 'function') openPairModal(num(marketInfo.dataset.info));
      return;
    }

    const leagueButton = event.target.closest('[data-league]');
    if(leagueButton){
      event.preventDefault();
      event.stopImmediatePropagation();
      await openLeagueWithTeams(leagueButton.dataset.league);
      return;
    }

    const leagueTeam = event.target.closest('[data-league-public-team]');
    if(leagueTeam){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(typeof openPublicTeam === 'function') await openPublicTeam(leagueTeam.dataset.leaguePublicTeam);
    }
  }, true);

  async function openLeagueWithTeams(id){
    if(typeof sb === 'undefined') return;
    const panel=document.getElementById('leagueStandingPanel');
    const title=document.getElementById('leagueStandingTitle');
    const box=document.getElementById('leagueStanding');
    if(panel) panel.style.display='block';
    if(title) title.textContent='Ligatabell';
    if(!box) return;
    box.innerHTML='<div class="empty">Hämtar ligan…</div>';

    const response=await sb.rpc('get_league_standings',{p_league_id:id});
    if(response.error){
      box.innerHTML='<div class="err">'+escapeHtml(response.error.message)+'</div>';
      return;
    }
    const rows=response.data||[];
    box.innerHTML=rows.map(function(row,index){
      const userId=row.user_id ?? row.id ?? row.member_user_id ?? row.profile_user_id ?? '';
      const name=row.fantasy_name ?? row.name ?? 'Fantasyspelare';
      const points=Number(row.total_points ?? row.points ?? 0).toFixed(1).replace('.0','');
      return '<div class="leagueRow">'+
        '<div class="rank">'+(index+1)+'</div>'+
        '<div><b>'+escapeHtml(name)+'</b></div>'+
        (userId
          ? '<button class="btn soft" data-league-public-team="'+escapeHtml(userId)+'">'+points+' p · Visa lag</button>'
          : '<div><b>'+points+' p</b></div>')+
        '</div>';
    }).join('') || '<div class="empty">Ligan är tom.</div>';
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }
})();

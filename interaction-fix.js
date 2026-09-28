/* Fantasy Bugg – robusta info-, toppliste- och ligaklick v2 */
(function(){
  function num(v){ return Number(v); }
  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function identityHtml(name,url){
    if(typeof memberIdentityHtml==='function') return memberIdentityHtml(name,url);
    const initials=String(name||'FB').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'FB';
    let safe='';
    try{const parsed=new URL(url);if(parsed.protocol==='https:')safe=parsed.href;}catch(e){}
    return '<span class="memberIdentity"><span class="memberAvatar" aria-hidden="true">'+escapeHtml(initials)+
      (safe?'<img src="'+escapeHtml(safe)+'" alt="" loading="lazy" onerror="this.remove()">':'')+
      '</span><b>'+escapeHtml(name)+'</b></span>';
  }

  async function avatarMap(rows){
    const ids=[...new Set(rows.map(row=>row.user_id??row.id??row.member_user_id??row.profile_user_id).filter(Boolean))];
    if(!ids.length) return new Map();
    const response=await sb.from('profiles').select('user_id,avatar_url').in('user_id',ids);
    if(response.error){console.warn('Profilbilder kunde inte hämtas:',response.error.message);return new Map();}
    return new Map((response.data||[]).map(row=>[String(row.user_id),row.avatar_url]));
  }

  function formatPoints(value){
    return Number(value || 0).toFixed(1).replace('.0','') + ' p';
  }

  function upgradeLeaderboardButtons(root){
    (root || document).querySelectorAll('[data-public-team]').forEach(function(button){
      if(button.dataset.visaLagReady === '1') return;
      const userId=button.getAttribute('data-public-team') || '';
      if(!userId) return;

      const row=button.closest('.leagueRow');
      if(!row) return;

      const pointsText=(button.textContent || '').trim();
      const actions=document.createElement('div');
      actions.className='publicTeamActions';
      actions.style.cssText='display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap';
      actions.innerHTML='<b class="publicTeamPoints">'+escapeHtml(pointsText)+'</b><button class="btn soft" data-public-team="'+escapeHtml(userId)+'" data-visa-lag-ready="1">Visa lag</button>';
      button.replaceWith(actions);
    });
  }

  async function renderPublicTeamRecent(body, indices){
    const section=document.createElement('section');
    section.className='publicTeamRecent';
    section.style.cssText='margin-top:18px';
    section.innerHTML='<h3 style="margin:0 0 12px">Parens 3 senaste tävlingar</h3><div class="empty">Hämtar tävlingsresultat…</div>';
    body.appendChild(section);
    if(!indices.length) return;

    const results=await sb.from('competition_results')
      .select('pair_index,competition_id,placement,fantasy_points,created_at')
      .eq('matched',true).in('pair_index',indices).limit(1000);
    if(results.error){
      section.innerHTML='<h3>Parens 3 senaste tävlingar</h3><div class="err">Kunde inte hämta tävlingsresultat.</div>';
      return;
    }

    const rows=results.data||[];
    const ids=[...new Set(rows.map(row=>row.competition_id).filter(Boolean))];
    const competitions=ids.length
      ? await sb.from('competitions').select('id,name,date').in('id',ids)
      : {data:[],error:null};
    if(competitions.error){
      section.innerHTML='<h3>Parens 3 senaste tävlingar</h3><div class="err">Kunde inte hämta tävlingarnas datum.</div>';
      return;
    }
    // Only published competition results are available here. Sort by the
    // actual competition date, since classes can be imported later.
    const byId=new Map((competitions.data||[]).map(row=>[String(row.id),row]));
    const grouped=new Map();
    rows.forEach(row=>{
      const index=Number(row.pair_index);
      if(!grouped.has(index)) grouped.set(index,[]);
      grouped.get(index).push(row);
    });
    const history=indices.map(index=>{
      const pair=typeof getPair==='function'?getPair(index):null;
      if(!pair) return '';
      const latest=(grouped.get(index)||[]).sort((a,b)=>{
        const dateA=byId.get(String(a.competition_id))?.date||'';
        const dateB=byId.get(String(b.competition_id))?.date||'';
        return dateB.localeCompare(dateA) || String(b.created_at||'').localeCompare(String(a.created_at||''));
      }).slice(0,3);
      const list=latest.length?latest.map(row=>{
        const competition=byId.get(String(row.competition_id));
        const date=competition?.date?new Date(competition.date+'T12:00:00').toLocaleDateString('sv-SE'):'';
        return '<div class="scoreRow"><div><b>'+escapeHtml(competition?.name||row.competition_id)+'</b>'+
          (date?'<br><small class="meta">'+escapeHtml(date)+'</small>':'')+
          '</div><div>Plats '+escapeHtml(row.placement??'–')+'</div><b>'+formatPoints(row.fantasy_points)+'</b></div>';
      }).join(''):'<div class="meta">Inga publicerade tävlingsresultat ännu.</div>';
      return '<div style="margin:0 0 16px"><h4 style="margin:0 0 8px">'+escapeHtml(pair.name)+'</h4>'+list+'</div>';
    }).join('');
    if(body.contains(section)) section.innerHTML='<h3 style="margin:0 0 12px">Parens 3 senaste tävlingar</h3>'+history;
  }

  async function openPublicTeamArena(userId){
    if(!userId || typeof sb === 'undefined') return;

    const title=document.getElementById('publicTeamTitle');
    const body=document.getElementById('publicTeamBody');
    const owner=document.getElementById('publicTeamOwner');
    if(!body) return;
    if(owner) owner.innerHTML='';

    if(title) title.textContent='Fantasylag';
    body.innerHTML='<div class="empty">Hämtar lag…</div>';
    if(typeof openModal === 'function') openModal('publicTeamModal');

    const response=await sb.rpc('get_public_team',{p_user_id:userId});
    if(response.error){
      body.innerHTML='<div class="err">'+escapeHtml(response.error.message)+'</div>';
      return;
    }

    const team=Array.isArray(response.data) ? response.data[0] : response.data;
    const indices=(team?.pair_indices || []).map(Number);
    const captain=team?.captain_pair_index == null ? null : Number(team.captain_pair_index);

    if(title) title.textContent=team?.fantasy_name || 'Fantasylag';
    if(owner && team) owner.innerHTML=identityHtml(team.fantasy_name||'Fantasyspelare',team.avatar_url);

    const cards=indices.map(function(index){
      const pair=typeof getPair === 'function' ? getPair(index) : null;
      if(!pair) return '';
      const price=typeof money === 'function' ? money(pair.price) : String(pair.price ?? '');
      return '<div class="teamCard">'+
        '<div class="teamTop"><b>'+
          (captain === index ? '<span class="captainBadge">C</span>' : '')+
          escapeHtml(pair.name)+
        '</b><div class="meta">Bugg '+escapeHtml(pair.cls)+' · '+escapeHtml(price)+'</div></div>'+
      '</div>';
    }).join('');

    /* Samma #team/#teamList-struktur gör att exakt samma arena- och siluett-CSS används som på Mitt lag. */
    body.innerHTML=cards
      ? '<div id="team" class="publicTeamArenaScope"><div class="pitch"><div id="teamList">'+cards+'</div></div></div>'
      : '<div class="empty">Inget lag.</div>';
    if(cards) await renderPublicTeamRecent(body,indices);
  }

  window.openPublicTeamArena=openPublicTeamArena;

  document.addEventListener('click', async function(event){
    const target=event.target instanceof Element ? event.target : event.target?.parentElement;
    if(!target) return;

    const teamInfo=target.closest('[data-team-info]');
    if(teamInfo){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(typeof openTeamPairInfo === 'function') await openTeamPairInfo(num(teamInfo.dataset.teamInfo));
      return;
    }

    const marketInfo=target.closest('[data-info]');
    if(marketInfo){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(typeof openPairModal === 'function') openPairModal(num(marketInfo.dataset.info));
      return;
    }

    const publicTeam=target.closest('[data-public-team],[data-league-public-team]');
    if(publicTeam){
      event.preventDefault();
      event.stopImmediatePropagation();
      const userId=publicTeam.getAttribute('data-public-team') || publicTeam.getAttribute('data-league-public-team');
      await openPublicTeamArena(userId);
      return;
    }

    const leagueButton=target.closest('[data-league]');
    if(leagueButton){
      event.preventDefault();
      event.stopImmediatePropagation();
      await openLeagueWithTeams(leagueButton.dataset.league);
    }
  },true);

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

    const rows=response.data || [];
    const avatars=await avatarMap(rows);
    box.innerHTML=rows.map(function(row,index){
      const userId=row.user_id ?? row.id ?? row.member_user_id ?? row.profile_user_id ?? '';
      const name=row.fantasy_name ?? row.name ?? 'Fantasyspelare';
      const points=formatPoints(row.total_points ?? row.points ?? 0);
      return '<div class="leagueRow">'+
        '<div class="rank">'+(index+1)+'</div>'+
        '<div>'+identityHtml(name,avatars.get(String(userId)))+'</div>'+
        '<div class="publicTeamActions" style="display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap">'+
          '<b>'+escapeHtml(points)+'</b>'+
          (userId ? '<button class="btn soft" data-league-public-team="'+escapeHtml(userId)+'">Visa lag</button>' : '')+
        '</div>'+
      '</div>';
    }).join('') || '<div class="empty">Ligan är tom.</div>';
  }

  function runUpgrade(){ upgradeLeaderboardButtons(document); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',runUpgrade,{once:true});
  else runUpgrade();

  const observer=new MutationObserver(function(){ runUpgrade(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();

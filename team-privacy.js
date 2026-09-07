/* Fantasy Bugg – dölj andra managers lag fram till första deadline */
(function(){
  if(typeof openPublicTeam!=='function') return;

  const originalOpenPublicTeam=openPublicTeam;

  openPublicTeam=async function(userId){
    if(!userId) return;

    const isOwnTeam = currentUser && String(userId)===String(currentUser.id);
    const first = typeof firstFantasyDeadline==='function' ? firstFantasyDeadline() : null;
    const beforeFirstDeadline = !first || Date.now() < new Date(first.deadline).getTime();

    if(!isOwnTeam && beforeFirstDeadline){
      const title=document.getElementById('publicTeamTitle');
      const body=document.getElementById('publicTeamBody');
      if(title) title.textContent='Fantasylag';
      if(body) body.innerHTML='<div class="empty"><b>Gömt lag innan deadline</b><br><span class="meta">Andra managers lag blir synliga efter första deadline.</span></div>';
      if(typeof openModal==='function') openModal('publicTeamModal');
      return;
    }

    return originalOpenPublicTeam.apply(this,arguments);
  };
})();

/* Fantasy Bugg – dölj andra managers lag fram till första deadline */
(function(){
  function beforeFirstDeadline(){
    const first = typeof firstFantasyDeadline==='function' ? firstFantasyDeadline() : null;
    return !first || Date.now() < new Date(first.deadline).getTime();
  }

  function isOwnUser(userId){
    return !!(currentUser && userId && String(userId)===String(currentUser.id));
  }

  function showHiddenMessage(){
    const title=document.getElementById('publicTeamTitle');
    const body=document.getElementById('publicTeamBody');
    if(title) title.textContent='Fantasylag';
    if(body) body.innerHTML='<div class="empty"><b>Lag dolt innan deadline</b><br><span class="meta">Andra managers lag blir synliga först efter första deadline.</span></div>';
    if(typeof openModal==='function') openModal('publicTeamModal');
  }

  if(typeof openPublicTeam==='function'){
    const originalOpenPublicTeam=openPublicTeam;
    openPublicTeam=async function(userId){
      if(!userId) return;
      if(!isOwnUser(userId) && beforeFirstDeadline()){
        showHiddenMessage();
        return;
      }
      return originalOpenPublicTeam.apply(this,arguments);
    };
  }

  function hideLeagueTeamButtons(){
    const leagues=document.getElementById('leagues');
    if(!leagues) return;
    const hidden=beforeFirstDeadline();

    leagues.querySelectorAll('button,a').forEach(el=>{
      const text=(el.textContent||'').trim().toLocaleLowerCase('sv-SE');
      const looksLikeTeamButton = /^(visa|se|öppna)\s+(lag|laget)$/.test(text) || /^lag$/.test(text);
      if(!looksLikeTeamButton) return;

      if(hidden){
        el.style.display='none';
        el.setAttribute('aria-hidden','true');
      }else{
        el.style.removeProperty('display');
        el.removeAttribute('aria-hidden');
      }
    });
  }

  document.addEventListener('click',event=>{
    if(!beforeFirstDeadline()) return;
    const target=event.target instanceof Element ? event.target.closest('#leagues button,#leagues a') : null;
    if(!target) return;
    const text=(target.textContent||'').trim().toLocaleLowerCase('sv-SE');
    if(!(/^(visa|se|öppna)\s+(lag|laget)$/.test(text) || /^lag$/.test(text))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showHiddenMessage();
  },true);

  function installObserver(){
    const leagues=document.getElementById('leagues');
    if(!leagues) return;
    hideLeagueTeamButtons();
    const observer=new MutationObserver(hideLeagueTeamButtons);
    observer.observe(leagues,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installObserver,{once:true});
  else installObserver();
})();

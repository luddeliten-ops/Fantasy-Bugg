/* Fantasy Bugg – återställ startsekvens om index hann starta innan hjälpfilerna laddades. */
(async function(){
  function ensureTarget(id){
    if(document.getElementById(id)) return;
    const el=document.createElement('div');
    el.id=id;
    el.hidden=true;
    el.setAttribute('aria-hidden','true');
    document.body.appendChild(el);
  }

  async function recover(){
    if(typeof sb==='undefined' || !sb.auth) return;
    ensureTarget('competitionList');
    ensureTarget('homeLatestCompetition');

    /* Hjälpfilerna i stats.js laddas dynamiskt. Ge dem ett ögonblick att installera sina overrides. */
    await new Promise(resolve=>setTimeout(resolve,250));

    try{
      const sessionResponse=await sb.auth.getSession();
      const session=sessionResponse?.data?.session||null;

      if(typeof handleSession==='function'){
        await handleSession(session);
      }else if(session?.user){
        try{ currentUser=session.user; }catch(e){}
      }

      const jobs=[];
      if(typeof loadCompetitions==='function') jobs.push(loadCompetitions());
      if(typeof loadStreams==='function') jobs.push(loadStreams());
      if(typeof loadHomeContent==='function') jobs.push(loadHomeContent());
      if(typeof loadPairHistory==='function') jobs.push(loadPairHistory());
      await Promise.allSettled(jobs);

      if(session?.user){
        if(typeof loadProfile==='function') await loadProfile();
        if(typeof loadTeam==='function') await loadTeam();
        if(typeof loadFantasyTotal==='function') await loadFantasyTotal();
        if(typeof loadGlobalLeaderboard==='function') await loadGlobalLeaderboard();
      }

      if(typeof renderStats==='function') renderStats();
      if(typeof renderTeam==='function') renderTeam();
      if(typeof renderMarket==='function') renderMarket();
    }catch(error){
      console.error('Fantasy Bugg återställningsfel:',error);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',recover,{once:true});
  else recover();
})();

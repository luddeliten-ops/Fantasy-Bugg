/* Fantasy Bugg – skydd för tävlingsrendering.
   Vissa äldre render-funktioner förutsätter element som inte längre finns i DOM.
   Skapa dolda kompatibilitetsmål så att loadCompetitions() kan fortsätta till admin-dropdownen. */
(function(){
  function ensureTarget(id){
    if(document.getElementById(id)) return;
    const el=document.createElement('div');
    el.id=id;
    el.hidden=true;
    el.setAttribute('aria-hidden','true');
    document.body.appendChild(el);
  }

  function shortenNationalLevel(){
    const section=document.getElementById('competitions');
    if(!section) return;

    section.querySelectorAll('.badge').forEach(badge=>{
      if(badge.textContent.trim()==='Nationell') badge.textContent='N';
    });
  }

  function install(){
    ensureTarget('competitionList');
    ensureTarget('homeLatestCompetition');
    shortenNationalLevel();

    const section=document.getElementById('competitions');
    if(section){
      new MutationObserver(shortenNationalLevel).observe(section,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();

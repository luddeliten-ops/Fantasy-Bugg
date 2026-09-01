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

  function install(){
    ensureTarget('competitionList');
    ensureTarget('homeLatestCompetition');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();

/* Fantasy Bugg – lagets bank räknas från budget och lagvärde; ingen separat wallet-tabell behövs. */
(function(){
  function install(){
    if(typeof saveTeam!=='function' || typeof loadTeam!=='function') return;

    saveTeam=async function(){
      try{
        localStorage.setItem('fb_team',JSON.stringify({selectedPairs,captainIndex,bank}));
      }catch(e){}

      if(!currentUser) return true;

      const response=await sb.from('fantasy_teams').upsert({
        user_id:currentUser.id,
        pair_indices:selectedPairs,
        captain_index:captainIndex,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id'});

      if(response.error){
        console.error('Kunde inte spara lag:',response.error.message);
        return false;
      }
      return true;
    };

    loadTeam=async function(){
      const loadLocal=()=>{
        try{
          const local=JSON.parse(localStorage.getItem('fb_team')||'null');
          if(!local) return;
          selectedPairs=(local.selectedPairs||[]).map(Number).filter(index=>getPair(index));
          captainIndex=local.captainIndex==null?null:Number(local.captainIndex);
          bank=START_BUDGET-teamCurrentValue();
        }catch(e){}
      };

      if(!currentUser){
        selectedPairs=[];
        captainIndex=null;
        bank=START_BUDGET;
        renderTeam();
        renderMarket();
        return;
      }

      const response=await sb.from('fantasy_teams')
        .select('pair_indices,captain_index')
        .eq('user_id',currentUser.id)
        .maybeSingle();

      if(response.error){
        console.warn('Kunde inte läsa lag:',response.error.message);
        loadLocal();
      }else if(response.data){
        selectedPairs=(response.data.pair_indices||[]).map(Number).filter(index=>getPair(index));
        captainIndex=response.data.captain_index==null?null:Number(response.data.captain_index);
      }else{
        loadLocal();
      }

      bank=START_BUDGET-teamCurrentValue();
      renderTeam();
      renderMarket();
    };
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();

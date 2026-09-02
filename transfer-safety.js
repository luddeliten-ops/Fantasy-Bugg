/* Fantasy Bugg – säkrare transfer: lag och transferlogg måste båda lyckas */
(function(){
  let stagedTransfer=null;

  if(typeof registerTransfer!=='function' || typeof saveTeam!=='function') return;

  const originalRegisterTransfer=registerTransfer;
  const originalSaveTeam=saveTeam;

  registerTransfer=async function(fromIndex,toIndex,penalty){
    if(!currentUser || !transferRulesActive()) return true;

    const fromPair=getPair(fromIndex);
    const toPair=getPair(toIndex);
    const previousBank=bank - (fromPair?.price||0) + (toPair?.price||0);
    const previousPairs=selectedPairs.map(value=>value===Number(toIndex)?Number(fromIndex):value);
    const previousCaptain=(captainIndex===Number(toIndex))?Number(fromIndex):captainIndex;

    stagedTransfer={
      payload:{
        user_id:currentUser.id,
        term_key:currentHalfYearKey(),
        from_pair_index:Number(fromIndex),
        to_pair_index:Number(toIndex),
        penalty_points:Number(penalty||0)
      },
      previousPairs,
      previousCaptain,
      previousBank
    };
    return true;
  };

  saveTeam=async function(){
    if(!stagedTransfer){
      return originalSaveTeam.apply(this,arguments);
    }

    const stage=stagedTransfer;
    stagedTransfer=null;

    try{
      localStorage.setItem('fb_team',JSON.stringify({selectedPairs,captainIndex,bank}));
    }catch(e){}

    if(!currentUser) return;

    const teamWrite=await sb.from('fantasy_teams').upsert({
      user_id:currentUser.id,
      pair_indices:selectedPairs,
      captain_index:captainIndex,
      updated_at:new Date().toISOString()
    },{onConflict:'user_id'});

    if(teamWrite.error){
      selectedPairs=[...stage.previousPairs];
      captainIndex=stage.previousCaptain;
      bank=stage.previousBank;
      try{ localStorage.setItem('fb_team',JSON.stringify({selectedPairs,captainIndex,bank})); }catch(e){}
      alert('Bytet kunde inte sparas. Inga ändringar genomfördes.');
      if(typeof renderTeam==='function') renderTeam();
      if(typeof renderMarket==='function') renderMarket();
      return false;
    }

    const logWrite=await sb.from('fantasy_transfer_log').insert(stage.payload);
    if(logWrite.error){
      await sb.from('fantasy_teams').upsert({
        user_id:currentUser.id,
        pair_indices:stage.previousPairs,
        captain_index:stage.previousCaptain,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id'});

      selectedPairs=[...stage.previousPairs];
      captainIndex=stage.previousCaptain;
      bank=stage.previousBank;
      try{ localStorage.setItem('fb_team',JSON.stringify({selectedPairs,captainIndex,bank})); }catch(e){}
      alert('Bytet kunde inte registreras och har återställts. Försök igen.');
      if(typeof renderTeam==='function') renderTeam();
      if(typeof renderMarket==='function') renderMarket();
      return false;
    }

    try{
      await sb.from('fantasy_wallets').upsert({user_id:currentUser.id,bank},{onConflict:'user_id'});
    }catch(e){}

    return true;
  };
})();

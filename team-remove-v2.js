/* Fantasy Bugg – fri borttagning ur startlaget före första deadline */
(function(){
  if(typeof renderTeam!=='function') return;

  const originalRenderTeam=renderTeam;

  async function removeFromStartTeam(index){
    index=Number(index);

    if(typeof isTeamLocked==='function' && isTeamLocked()){
      alert(typeof deadlineMessage==='function' ? deadlineMessage() : 'Laget är låst.');
      return;
    }

    /* Efter första deadline behåller vi vanliga bytesregler. */
    if(typeof transferRulesActive==='function' && transferRulesActive()){
      pendingTransferOut=index;
      if(typeof showPage==='function') showPage('pairs');
      return;
    }

    const pair=typeof getPair==='function' ? getPair(index) : null;
    if(!pair || !Array.isArray(selectedPairs) || !selectedPairs.includes(index)) return;

    selectedPairs=selectedPairs.filter(value=>Number(value)!==index);
    bank=Number(bank||0)+Number(pair.price||0);
    pendingTransferOut=null;

    if(Number(captainIndex)===index){
      captainIndex=selectedPairs.length ? Number(selectedPairs[0]) : null;
    }

    const saved=await saveTeam();
    if(saved===false) return;

    originalRenderTeam();
    applyRemoveButtons();
    if(typeof renderMarket==='function') renderMarket();
  }

  function applyRemoveButtons(){
    const freeStartTeam=!(typeof transferRulesActive==='function' && transferRulesActive());

    document.querySelectorAll('#teamList [data-remove]').forEach(button=>{
      const index=Number(button.dataset.remove);

      if(freeStartTeam){
        button.textContent='Ta bort';
        button.onclick=async event=>{
          event.preventDefault();
          event.stopPropagation();
          await removeFromStartTeam(index);
        };
      }
    });
  }

  renderTeam=function(){
    const result=originalRenderTeam.apply(this,arguments);
    applyRemoveButtons();
    return result;
  };

  applyRemoveButtons();
})();

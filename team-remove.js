/* Fantasy Bugg – tillåt att ta bort ett danspar ur laget utan att starta ett byte */
(function(){
  function pairFromIndex(index){
    return typeof getPair==='function' ? getPair(Number(index)) : null;
  }

  async function removePair(index){
    index=Number(index);
    if(typeof isTeamLocked==='function' && isTeamLocked()){
      alert(typeof deadlineMessage==='function' ? deadlineMessage() : 'Laget är låst just nu.');
      return;
    }

    const pair=pairFromIndex(index);
    if(!pair || !Array.isArray(selectedPairs) || !selectedPairs.includes(index)) return;

    selectedPairs=selectedPairs.filter(value=>Number(value)!==index);
    bank=Number(bank||0)+Number(pair.price||0);
    pendingTransferOut=null;

    if(Number(captainIndex)===index){
      captainIndex=selectedPairs.length ? Number(selectedPairs[0]) : null;
    }

    const saved=await saveTeam();
    if(saved===false) return;
    if(typeof renderTeam==='function') renderTeam();
    if(typeof renderMarket==='function') renderMarket();
  }

  function enhance(){
    const teamList=document.getElementById('teamList');
    if(!teamList) return;

    teamList.querySelectorAll('[data-remove]').forEach(button=>{
      const index=Number(button.dataset.remove);
      button.textContent='Ta bort';
      button.onclick=async event=>{
        event.preventDefault();
        event.stopPropagation();
        await removePair(index);
      };
    });
  }

  function install(){
    enhance();
    const teamList=document.getElementById('teamList');
    if(!teamList) return;
    new MutationObserver(enhance).observe(teamList,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

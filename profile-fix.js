/* Fantasy Bugg – stabil profilfix utan ändringar i stora index.html */
(function(){
  function escLocal(value){
    return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function fixedLoadProfile(){
    if(typeof currentUser==='undefined' || !currentUser){
      try{ profile=null; }catch(e){}
      if(typeof renderProfile==='function') renderProfile();
      return;
    }

    const {data,error}=await sb
      .from('profiles')
      .select('*')
      .eq('user_id',currentUser.id)
      .maybeSingle();

    if(error){
      console.warn('Kunde inte läsa profil:',error.message);
      return;
    }

    try{ profile=data||null; }catch(e){}
    if(typeof renderProfile==='function') renderProfile();
  }

  async function fixedSaveAvatar(){
    if(typeof currentUser==='undefined' || !currentUser){
      if(typeof showAuth==='function') showAuth();
      return;
    }

    const input=document.getElementById('avatarUrl');
    const status=document.getElementById('avatarStatus');
    const avatarUrl=(input?.value||'').trim();

    const {error}=await sb
      .from('profiles')
      .upsert({user_id:currentUser.id,avatar_url:avatarUrl},{onConflict:'user_id'});

    if(error){
      if(status) status.innerHTML='<span class="err">'+escLocal(error.message)+'</span>';
      return;
    }

    if(status) status.innerHTML='<span class="ok">Sparat.</span>';
    await fixedLoadProfile();
  }

  function install(){
    /* Ersätt de gamla profilfunktionerna som frågar på profiles.id. */
    try{ window.loadProfile=fixedLoadProfile; }catch(e){}
    try{ window.saveAvatar=fixedSaveAvatar; }catch(e){}

    const save=document.getElementById('saveAvatarBtn');
    if(save) save.onclick=fixedSaveAvatar;

    /* fantasy_wallets är ett gammalt/ej tillgängligt endpoint-anrop.
       Dölj bara wallet-visningen om den gamla koden inte kan läsa den;
       lagbudget och lagvärde fortsätter hanteras av ordinarie lagkod. */
    const wallet=document.querySelector('.wallet');
    if(wallet && /undefined|null|NaN/i.test(wallet.textContent)) wallet.style.display='none';
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

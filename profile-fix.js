/* Fantasy Bugg – stabil profilfix utan ändringar i stora index.html */
(function(){
  function escLocal(value){
    return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  }

  async function fixedLoadProfile(){
    if(typeof currentUser==='undefined' || !currentUser){ try{ profile=null; }catch(e){} if(typeof renderProfile==='function') renderProfile(); return; }
    const {data,error}=await sb.from('profiles').select('*').eq('user_id',currentUser.id).maybeSingle();
    if(error){ console.warn('Kunde inte läsa profil:',error.message); return; }
    try{ profile=data||null; }catch(e){}
    if(typeof renderProfile==='function') renderProfile();
  }

  async function fixedSaveAvatar(){
    if(typeof currentUser==='undefined' || !currentUser){ if(typeof showAuth==='function') showAuth(); return; }
    const input=document.getElementById('avatarUrl');
    const status=document.getElementById('avatarStatus');
    const avatarUrl=(input?.value||'').trim();
    const {error}=await sb.from('profiles').upsert({user_id:currentUser.id,avatar_url:avatarUrl},{onConflict:'user_id'});
    if(error){ if(status) status.innerHTML='<span class="err">'+escLocal(error.message)+'</span>'; return; }
    if(status) status.innerHTML='<span class="ok">Sparat.</span>';
    await fixedLoadProfile();
  }

  async function loginFromButton(){
    const email=document.getElementById('authEmail')?.value?.trim() || document.querySelector('.authOverlay input[type="email"]')?.value?.trim() || '';
    const password=document.getElementById('authPassword')?.value || document.querySelector('.authOverlay input[type="password"]')?.value || '';
    const status=document.getElementById('authStatus');
    if(!email || !password){ if(status) status.innerHTML='<span class="err">Fyll i e-post och lösenord.</span>'; return; }
    if(typeof sb==='undefined' || !sb.auth){ if(status) status.innerHTML='<span class="err">Inloggningen kunde inte startas.</span>'; return; }
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error){ if(status) status.innerHTML='<span class="err">'+escLocal(error.message)+'</span>'; return; }
    if(status) status.innerHTML='<span class="ok">Inloggad.</span>';
    if(typeof hideAuth==='function') hideAuth(); else document.querySelector('.authOverlay')?.classList.remove('show');
    location.reload();
  }

  function paintButton(button){
    button.style.setProperty('background','#1264d8','important');
    button.style.setProperty('background-color','#1264d8','important');
    button.style.setProperty('background-image','none','important');
    button.style.setProperty('color','#fff','important');
    button.style.setProperty('opacity','1','important');
    button.style.setProperty('border','0','important');
    button.style.setProperty('width','100%','important');
    button.style.setProperty('margin-top','8px','important');
    button.style.setProperty('padding','12px 14px','important');
    button.style.setProperty('border-radius','12px','important');
    button.style.setProperty('font-weight','900','important');
  }

  function ensureLoginButton(){
    const overlay=document.querySelector('.authOverlay');
    if(!overlay) return;
    const forms=overlay.querySelectorAll('.authForm');
    if(!forms.length) return;
    const loginForm=forms[0];
    let button=loginForm.querySelector('[data-login-submit]');
    if(!button) button=[...loginForm.querySelectorAll('button')].find(btn=>/logga\s*in/i.test(btn.textContent));
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.textContent='Logga in';
      button.addEventListener('click',loginFromButton);
      loginForm.appendChild(button);
    }
    button.dataset.loginSubmit='1';
    paintButton(button);
  }

  function clearLoggedOutTeam(){
    try{ currentUser=null; }catch(e){}
    try{ profile=null; }catch(e){}
    try{ team=[]; }catch(e){}
    try{ captain=null; }catch(e){}
    try{ selectedPairs=[]; }catch(e){}
    try{ if(typeof renderTeam==='function') renderTeam(); }catch(e){}
    try{ if(typeof renderProfile==='function') renderProfile(); }catch(e){}
  }

  function install(){
    try{ window.loadProfile=fixedLoadProfile; }catch(e){}
    try{ window.saveAvatar=fixedSaveAvatar; }catch(e){}
    const save=document.getElementById('saveAvatarBtn');
    if(save) save.onclick=fixedSaveAvatar;
    ensureLoginButton();
    const overlay=document.querySelector('.authOverlay');
    if(overlay) new MutationObserver(ensureLoginButton).observe(overlay,{childList:true,subtree:true});
    const wallet=document.querySelector('.wallet');
    if(wallet && /undefined|null|NaN/i.test(wallet.textContent)) wallet.style.display='none';

    /* Supabase berättar när användaren loggar ut. Töm då den gamla privata lagvyn. */
    if(typeof sb!=='undefined' && sb.auth && typeof sb.auth.onAuthStateChange==='function'){
      sb.auth.onAuthStateChange((event,session)=>{
        if(event==='SIGNED_OUT' || !session){
          clearLoggedOutTeam();
          setTimeout(()=>location.reload(),0);
        }
      });
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();

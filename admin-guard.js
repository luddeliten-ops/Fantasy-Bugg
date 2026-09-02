/* Fantasy Bugg – extra klientsidespärr för adminknappar. Server-RLS ska fortfarande vara sista skyddet. */
(function(){
  const ADMIN_ACTION_IDS=new Set([
    'saveHomeBtn','saveCompetitionBtn','addStreamBtn','importResultsBtn'
  ]);

  function isAdmin(){
    return typeof currentUser!=='undefined' && currentUser && typeof ADMIN_UID!=='undefined' && currentUser.id===ADMIN_UID;
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element ? event.target.closest('button') : null;
    if(!target) return;
    const adminAction=ADMIN_ACTION_IDS.has(target.id) || target.matches('[data-clear-results],[data-delete-competition]');
    if(!adminAction) return;
    if(isAdmin()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    alert('Endast administratören kan göra den här ändringen.');
  },true);

  function protectAdminPage(){
    const adminNav=document.getElementById('adminNav');
    const adminPage=document.getElementById('admin');
    if(adminNav && !isAdmin()) adminNav.style.display='none';
    if(adminPage && adminPage.classList.contains('active') && !isAdmin()){
      if(typeof showPage==='function') showPage('home');
    }
  }

  if(typeof sb!=='undefined' && sb.auth?.onAuthStateChange){
    sb.auth.onAuthStateChange(()=>setTimeout(protectAdminPage,0));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',protectAdminPage,{once:true}); else protectAdminPage();
})();

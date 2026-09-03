/* Fantasy Bugg – lanseringssäkerhet: auth, laglås, transfers och resultatimport */
(function(){
  const byId=id=>document.getElementById(id);
  const esc2=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function clearPrivateLocalTeam(){
    try{ localStorage.removeItem('fb_team'); }catch(e){}
    try{ selectedPairs=[]; }catch(e){}
    try{ captainIndex=null; }catch(e){}
    try{ bank=START_BUDGET; }catch(e){}
    try{ pendingTransferOut=null; }catch(e){}
  }

  /* 1–2: privat lagdata ska inte ligga kvar efter utloggning och ingen omladdningsloop vid tom session. */
  function installLogoutSafety(){
    if(typeof sb==='undefined' || !sb.auth || typeof sb.auth.onAuthStateChange!=='function') return;
    sb.auth.onAuthStateChange((event)=>{
      if(event!=='SIGNED_OUT') return;
      clearPrivateLocalTeam();
      try{ profile=null; currentUser=null; }catch(e){}
      setTimeout(()=>location.reload(),0);
    });
  }

  /* 6–7: rätt transfertext och lås även kapten/borttagning vid deadline. */
  function enforceTeamLockUi(){
    const team=document.getElementById('team');
    if(!team) return;
    const locked=typeof isTeamLocked==='function' && isTeamLocked();
    team.querySelectorAll('[data-captain],[data-remove]').forEach(button=>{
      if(locked){
        button.disabled=true;
        button.title=typeof deadlineMessage==='function' ? deadlineMessage() : 'Laget är låst.';
      }
    });
    const transferStatus=byId('transferStatus');
    if(transferStatus && !locked && transferStatus.textContent.includes('−35')){
      transferStatus.innerHTML=transferStatus.innerHTML.replace(/−35/g,'−100');
    }
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element ? event.target.closest('[data-captain],[data-remove]') : null;
    if(!target) return;
    if(typeof isTeamLocked==='function' && isTeamLocked()){
      event.preventDefault();
      event.stopImmediatePropagation();
      alert(typeof deadlineMessage==='function' ? deadlineMessage() : 'Laget är låst.');
    }
  },true);

  function installTeamRenderSafety(){
    if(typeof renderTeam!=='function') return;
    const original=renderTeam;
    renderTeam=function(){
      const result=original.apply(this,arguments);
      enforceTeamLockUi();
      return result;
    };
    enforceTeamLockUi();
  }

  /* Registrering: Auth skapar användaren och DB-triggern skapar profilen. */
  function installRegistrationFix(){
    const form=byId('authForm');
    if(!form || typeof sb==='undefined') return;
    form.addEventListener('submit',async event=>{
      const mode=form.dataset.mode||'login';
      if(mode!=='register') return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const email=(byId('authEmail')?.value||'').trim();
      const password=byId('authPassword')?.value||'';
      const fantasyName=(byId('authFantasyName')?.value||'').trim();
      const button=byId('authSubmitBtn');
      const errorBox=byId('authError');
      if(button) button.disabled=true;
      if(errorBox) errorBox.textContent='';

      const response=await sb.auth.signUp({email,password,options:{data:{fantasy_name:fantasyName}}});
      if(response.error){
        if(errorBox) errorBox.textContent=response.error.message;
        if(button) button.disabled=false;
        return;
      }

      if(button) button.disabled=false;
      if(errorBox){
        errorBox.textContent='Kontot är skapat – du är nu inloggad';
        errorBox.classList.add('ok');
      }
      setTimeout(()=>{
        if(typeof hideAuth==='function') hideAuth();
        location.reload();
      },1200);
    },true);
  }

  function norm(value){
    return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function tokens(value){ return norm(value).split(' ').filter(Boolean); }
  function personMatches(candidateName,personName){
    const candidate=norm(candidateName), t=tokens(personName);
    if(!t.length) return false;
    if(t.every(x=>candidate.includes(x))) return true;
    if(t.length>=2) return candidate.includes(t[0]) && candidate.includes(t[t.length-1]);
    return false;
  }
  function pick2(object,...keys){ for(const key of keys){ if(object[key]) return object[key]; } return ''; }

  async function restorePreviousResults(competitionId,previousRows){
    try{
      await sb.from('competition_results').delete().eq('competition_id',competitionId);
      if(previousRows.length){
        const clean=previousRows.map(row=>{
          const copy={...row};
          delete copy.id;
          return copy;
        });
        await sb.from('competition_results').insert(clean);
      }
    }catch(e){ console.error('Rollback av resultat misslyckades:',e); }
  }

  /* 3–5: stoppa delmatchning, kontrollera score-RPC och återställ gamla resultat om importen går sönder. */
  async function safeImportResults(){
    const file=byId('resultCsvFile')?.files?.[0];
    const competitionId=byId('resultCompetitionSelect')?.value||'';
    const competition=competitions.find(item=>String(item.id)===String(competitionId));
    const status=byId('resultAdminStatus');
    const preview=byId('resultPreview');

    if(!file || !competition){ if(status) status.innerHTML='<span class="err">Välj tävling och CSV-fil.</span>'; return; }

    let rows=[];
    try{ rows=parseCSV(await file.text()); }
    catch(error){ if(status) status.innerHTML='<span class="err">'+esc2(error?.message||'CSV-filen kunde inte läsas.')+'</span>'; return; }

    const parsed=[];
    for(const row of rows){
      const className=pick2(row,'klass','class','grenklass','competitionclass','tävlingsklass');
      const cls=fantasyClass(className);
      if(!cls) continue;
      const name1=pick2(row,'namn1','namn 1');
      const name2=pick2(row,'namn2','namn 2');
      const placement=parseInt(pick2(row,'plac','placering','place','placement','rank'),10);
      if(!name1||!name2||!Number.isFinite(placement)||placement<=0) continue;
      const pairName=`${name1.trim()} & ${name2.trim()}`;
      const reversePairName=`${name2.trim()} & ${name1.trim()}`;
      let pair=pairs.find(candidate=>candidate.cls===cls && norm(candidate.name)===norm(pairName));
      if(!pair) pair=pairs.find(candidate=>candidate.cls===cls && norm(candidate.name)===norm(reversePairName));
      if(!pair) pair=pairs.find(candidate=>candidate.cls===cls && personMatches(candidate.name,name1) && personMatches(candidate.name,name2));
      parsed.push({pairName,className,cls,placement,pair});
    }

    if(!parsed.length){ if(status) status.innerHTML='<span class="err">CSV-filen lästes, men inga Bugg-resultat hittades.</span>'; return; }
    const unmatched=parsed.filter(result=>!result.pair);
    if(unmatched.length){
      if(status) status.innerHTML='<span class="err">Import stoppad: '+unmatched.length+' av '+parsed.length+' resultat kunde inte matchas.</span>';
      if(preview) preview.innerHTML='<div class="notice">Alla relevanta resultat måste matchas innan import.</div>'+unmatched.slice(0,100).map(result=>'<div class="scoreRow"><div><b>'+esc2(result.pairName)+'</b><div class="meta">Bugg '+esc2(result.cls)+'</div></div><div>'+result.placement+'</div><div><span class="err">Ej match</span></div></div>').join('');
      return;
    }

    const entrantsByClass={};
    parsed.forEach(result=>{ entrantsByClass[result.cls]=(entrantsByClass[result.cls]||0)+1; });
    const matched=parsed.map(result=>({
      competition_id:competition.id,
      pair_index:result.pair.index,
      pair_name:result.pair.name,
      placement:result.placement,
      matched:true,
      fantasy_points:calculateFantasyPoints(result.placement,entrantsByClass[result.cls],competition.level,result.pair.price)
    }));

    if(status) status.innerHTML='<span class="warn">Importerar och kontrollerar poängen…</span>';

    const previous=await sb.from('competition_results').select('*').eq('competition_id',competition.id);
    if(previous.error){ if(status) status.innerHTML='<span class="err">Kunde inte säkerhetskopiera tidigare resultat: '+esc2(previous.error.message)+'</span>'; return; }
    const previousRows=previous.data||[];

    const del=await sb.from('competition_results').delete().eq('competition_id',competition.id);
    if(del.error){ if(status) status.innerHTML='<span class="err">'+esc2(del.error.message)+'</span>'; return; }

    const inserted=await sb.from('competition_results').insert(matched);
    if(inserted.error){
      await restorePreviousResults(competition.id,previousRows);
      if(status) status.innerHTML='<span class="err">Importen misslyckades och tidigare resultat återställdes: '+esc2(inserted.error.message)+'</span>';
      return;
    }

    const scoreResponse=await sb.rpc('calculate_competition_scores',{p_competition_id:competition.id});
    if(scoreResponse.error){
      await restorePreviousResults(competition.id,previousRows);
      if(status) status.innerHTML='<span class="err">Poängberäkningen misslyckades. Tidigare resultat återställdes: '+esc2(scoreResponse.error.message)+'</span>';
      return;
    }

    const importedAt=new Date().toISOString();
    const statusUpdate=await sb.from('competitions').update({results_imported_at:importedAt}).eq('id',competition.id);
    if(statusUpdate.error){
      await restorePreviousResults(competition.id,previousRows);
      if(status) status.innerHTML='<span class="err">Tävlingsstatus kunde inte sparas. Tidigare resultat återställdes: '+esc2(statusUpdate.error.message)+'</span>';
      return;
    }

    competition.results_imported_at=importedAt;
    await Promise.all([
      typeof loadPairHistory==='function'?loadPairHistory():Promise.resolve(),
      typeof loadFantasyTotal==='function'?loadFantasyTotal():Promise.resolve(),
      typeof loadGlobalLeaderboard==='function'?loadGlobalLeaderboard():Promise.resolve()
    ]);
    if(status) status.innerHTML='<span class="ok">Importerade '+matched.length+' resultat och poängberäkningen är klar.</span>';
    if(preview) preview.innerHTML='<div class="notice">Matchade <b>'+matched.length+'</b> av '+parsed.length+'. Alla resultat godkända.</div>';
  }

  function installSafeImport(){
    const button=byId('importResultsBtn');
    if(!button) return;
    button.addEventListener('click',async event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      button.disabled=true;
      try{ await safeImportResults(); }
      finally{ button.disabled=false; }
    },true);
  }

  function install(){
    installLogoutSafety();
    installTeamRenderSafety();
    installRegistrationFix();
    installSafeImport();
    enforceTeamLockUi();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();

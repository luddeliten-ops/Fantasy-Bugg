/* Fantasy Bugg – skydd och visningsfixar för tävlingar */
(function(){
  function ensureTarget(id){
    if(document.getElementById(id)) return;
    const el=document.createElement('div');
    el.id=id;
    el.hidden=true;
    el.setAttribute('aria-hidden','true');
    document.body.appendChild(el);
  }

  function formatDeadline(value){
    if(!value) return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE',{
      day:'numeric',
      month:'short',
      hour:'2-digit',
      minute:'2-digit'
    }).format(date).replace(',', '');
  }

  function enhanceCompetitions(){
    const section=document.getElementById('competitions');
    if(!section || typeof competitions==='undefined' || !Array.isArray(competitions)) return;

    section.querySelectorAll('.competition').forEach(card=>{
      const badge=card.querySelector('.badge');
      if(badge && badge.textContent.trim()==='Nationell') badge.textContent='N';

      const button=card.querySelector('[data-results]');
      if(!button) return;

      const competition=competitions.find(item=>String(item.id)===String(button.dataset.results));
      if(!competition || !competition.deadline) return;

      const text=formatDeadline(competition.deadline);
      if(!text) return;

      let deadline=card.querySelector('.competition-deadline');
      if(!deadline){
        deadline=document.createElement('div');
        deadline.className='competition-deadline';
        deadline.style.cssText='margin-top:5px;color:#ff4d67;font-size:13px;font-weight:800;letter-spacing:.1px;';
        const info=card.children[1];
        if(info) info.appendChild(deadline);
      }
      deadline.textContent='Deadline: '+text;
    });
  }

  function install(){
    ensureTarget('competitionList');
    ensureTarget('homeLatestCompetition');
    enhanceCompetitions();

    const section=document.getElementById('competitions');
    if(section){
      let scheduled=false;
      new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          enhanceCompetitions();
        });
      }).observe(section,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();

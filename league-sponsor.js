/* Fantasy Bugg – sponsor och priser på Ligor */
(function(){
  function installSponsor(){
    const section=document.getElementById('leagues');
    if(!section || section.querySelector('[data-league-sponsor]')) return;

    const hero=section.querySelector(':scope > .sectionTitle');
    const card=document.createElement('section');
    card.dataset.leagueSponsor='1';
    card.className='leagueSponsorCard';
    card.innerHTML=`
      <div class="leagueSponsorTop">
        <div>
          <div class="leagueSponsorEyebrow">PRISER I FANTASY BUGG</div>
          <h2>Vinn presentkort från <a href="https://dansskor.se/" target="_blank" rel="noopener">Dansskor.se</a></h2>
          <p>De tre bästa i Fantasy Bugg belönas med presentkort hos vår sponsor Dansskor.se.</p>
        </div>
        <a class="leagueSponsorLogo" href="https://dansskor.se/" target="_blank" rel="noopener" aria-label="Besök Dansskor.se">
          <img src="AF3B7A49-6737-4379-9D56-70449F9CFBA5.png" alt="Dansskor.se" style="display:block;max-width:220px;width:100%;height:auto;object-fit:contain;">
        </a>
      </div>
      <div class="leagueSponsorPrizes">
        <div class="leaguePrize first"><span>🥇 1:a pris</span><strong>500 kr</strong><small>Presentkort på Dansskor.se</small></div>
        <div class="leaguePrize second"><span>🥈 2:a pris</span><strong>350 kr</strong><small>Presentkort på Dansskor.se</small></div>
        <div class="leaguePrize third"><span>🥉 3:e pris</span><strong>150 kr</strong><small>Presentkort på Dansskor.se</small></div>
      </div>
      <a class="leagueSponsorVisit" href="https://dansskor.se/" target="_blank" rel="noopener">Besök Dansskor.se →</a>`;

    if(hero) hero.insertAdjacentElement('afterend',card); else section.prepend(card);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installSponsor,{once:true}); else installSponsor();
})();

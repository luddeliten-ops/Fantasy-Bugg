/* Fantasy Bugg: approved Peppelinos image cards. Load after the main application script. */
(() => {
  'use strict';
  const mappingUrl = './data/peppelinos-image-mappings.review.json';
  const style = document.createElement('style');
  style.textContent = `
    #pairMarket.market{grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px}
    #pairMarket .pair.fb-photo-card{padding:0;overflow:hidden;border:1px solid #dbe4f0;border-radius:13px;background:#fff;box-shadow:0 5px 15px rgba(7,27,59,.1)}
    #pairMarket .fb-photo-card .pairHead{position:relative;display:block;min-height:205px;background:#10284e;isolation:isolate;color:#fff}
    #pairMarket .fb-photo-card .pairHead::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,27,59,.06) 20%,rgba(7,27,59,.45) 55%,#071b3b 100%);z-index:-1}
    #pairMarket .fb-photo-card .fb-card-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;z-index:-2}
    #pairMarket .fb-photo-card .fb-card-info{position:absolute;bottom:10px;left:10px;right:10px;z-index:1}
    #pairMarket .fb-photo-card .fb-card-info b{display:block;font-size:13px;line-height:1.22;overflow-wrap:anywhere;text-shadow:0 1px 3px #000}
    #pairMarket .fb-photo-card .fb-card-info .meta{font-size:10px;color:#dce8ff;margin-top:4px}
    #pairMarket .fb-photo-card .price{position:absolute;right:7px;top:7px;background:#f5c542;color:#071b3b;border-radius:7px;padding:5px 7px;font-size:12px;z-index:1;box-shadow:0 2px 6px #0004}
    #pairMarket .fb-photo-card .pairFoot{margin:0;padding:8px;gap:5px}
    #pairMarket .fb-photo-card .pairFoot .btn{padding:8px 3px;font-size:12px;border-radius:8px;min-width:0}
    @media(max-width:620px){#pairMarket.market{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
  const market = document.getElementById('pairMarket');
  if (!market) return;
  fetch(mappingUrl).then(response => {
    if (!response.ok) throw new Error('Image mapping unavailable');
    return response.json();
  }).then(data => {
    const approved = new Map((data.mappings || []).filter(item => item.primaryImageUrl && Number.isInteger(item.repositoryIndex)).map(item => [item.repositoryIndex, item]));
    const decorate = () => {
      market.querySelectorAll('article.pair').forEach(card => {
        const button = card.querySelector('[data-info]');
        if (!button) return;
        const item = approved.get(Number(button.dataset.info));
        if (!item || card.classList.contains('fb-photo-card')) return;
        const head = card.querySelector('.pairHead');
        if (!head) return;
        const name = head.querySelector('b');
        if (!name || name.textContent.trim() !== item.repositoryName) return;
        const info = name.parentElement;
        if (!info) return;
        info.classList.add('fb-card-info');
        const image = document.createElement('img');
        image.className = 'fb-card-photo';
        image.src = item.primaryImageUrl;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.onerror = () => { card.classList.remove('fb-photo-card'); image.remove(); };
        head.prepend(image);
        card.classList.add('fb-photo-card');
      });
    };
    decorate();
    const observer = new MutationObserver(decorate);
    observer.observe(market, {childList:true});
  }).catch(error => console.warn('Fantasy Bugg image cards:', error));
})();

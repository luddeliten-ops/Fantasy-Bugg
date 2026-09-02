/* Fantasy Bugg – säker städning av duplicerad head-metadata och felaktig style-start. */
(function(){
  function cleanupHead(){
    const titles=document.head.querySelectorAll('title');
    titles.forEach((el,index)=>{ if(index>0) el.remove(); });

    const descriptions=document.head.querySelectorAll('meta[name="description"]');
    descriptions.forEach((el,index)=>{ if(index>0) el.remove(); });

    document.head.querySelectorAll('style').forEach(style=>{
      const text=style.textContent||'';
      if(/^\s*<style>\s*/i.test(text)){
        style.textContent=text.replace(/^\s*<style>\s*/i,'');
      }
    });
  }

  cleanupHead();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',cleanupHead,{once:true});
  }
})();

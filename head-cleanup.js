/* Fantasy Bugg – säker städning av duplicerad head-metadata.
   Görs separat så vi inte behöver skriva om den stora index.html-filen. */
(function(){
  function cleanupHead(){
    const titles=document.head.querySelectorAll('title');
    titles.forEach((el,index)=>{ if(index>0) el.remove(); });

    const descriptions=document.head.querySelectorAll('meta[name="description"]');
    descriptions.forEach((el,index)=>{ if(index>0) el.remove(); });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',cleanupHead,{once:true});
  }else{
    cleanupHead();
  }
})();

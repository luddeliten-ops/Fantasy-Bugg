/*
  Fantasy Bugg – Vote4Dance debug-endpoint avstängd inför lansering.
  Resultat importeras via den validerade CSV-importen i adminsidan.
  Endpointen var tidigare ett tungt Puppeteer/debugverktyg och ska inte vara publik i produktion.
*/
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  return res.status(404).json({
    ok:false,
    error:'Endpointen används inte. Importera Vote4Dance-resultat via Fantasy Bugg Admin.'
  });
}

// Proxy mínimo para Vercel: guárdalo como api/rt.js en un repositorio de GitHub.
// Sirve tus feeds de tiempo real por https y con CORS, para que la app pueda leerlos.
const UP = {
  vehicleposition: 'http://212.170.201.204:50080/GTFSRTapi/api/vehicleposition',
  tripupdate: 'http://212.170.201.204:50080/GTFSRTapi/api/tripupdate',
  alert: 'http://212.170.201.204:50080/GTFSRTapi/api/alert'
};
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = UP[req.query.f];
  if (!url) return res.status(404).send('Usa ?f=vehicleposition, tripupdate o alert');
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.status(r.status).send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(502).send('Error: ' + e.message); }
};

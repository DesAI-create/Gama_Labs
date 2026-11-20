// GAMA_LABS — Proxy Vercel sans réglage dans le tableau de bord.
// L'URL Apps Script existante est conservée.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnIR8MhurRBfpJwwXa1ezXYXjDa3TonoqyjuCuwajEeRAMVZUjma1CR5_ROAUGtWAS/exec';
const EVENT_ID = 'notebooklm-2026-11-28';
const ALLOWED = new Set(['request_otp', 'verify_otp', 'waitlist']);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ok:false,code:'method_not_allowed'});
  try {
    let payload = null;
    if (req.method === 'POST') {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!data || typeof data !== 'object' || Array.isArray(data) || JSON.stringify(data).length > 3000)
        return res.status(400).json({ok:false,code:'invalid_data'});
      const action = String(data.action || '');
      const email = String(data.email || '').trim().toLowerCase();
      if (!ALLOWED.has(action) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ok:false,code:'invalid_data'});
      payload = {action, event: EVENT_ID, email};
      if (action === 'verify_otp') {
        if (typeof data.code !== 'string' || !/^\d{4}$/.test(data.code))
          return res.status(400).json({ok:false,code:'invalid_code_format'});
        payload.code = data.code;
      } else {
        const nom = String(data.nom || '').trim();
        const telephone = String(data.telephone || '').trim();
        if (!nom || nom.length > 120 || telephone.length > 35)
          return res.status(400).json({ok:false,code:'invalid_data'});
        payload.nom = nom;
        payload.telephone = telephone;
        if (action === 'waitlist') {
          payload.profession = String(data.profession || '').slice(0,150);
          payload.interets = String(data.interets || '').slice(0,500);
        }
      }
    }
    const options = req.method === 'POST'
      ? {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow',signal:AbortSignal.timeout(25000)}
      : {method:'GET',redirect:'follow',signal:AbortSignal.timeout(25000)};
    const reply = await fetch(APPS_SCRIPT_URL, options);
    if (!reply.ok) throw new Error('Apps Script HTTP '+reply.status);
    const result = await reply.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('GAMA_LABS API:',error && error.message);
    return res.status(502).json({ok:false,code:'upstream_error'});
  }
};

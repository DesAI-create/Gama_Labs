// Fonction Vercel déployée automatiquement par GitHub, sans réglage dans le dashboard.
// Remplacer uniquement l'URL ci-dessous par celle du déploiement Google Apps Script.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnIR8MhurRBfpJwwXa1ezXYXjDa3TonoqyjuCuwajEeRAMVZUjma1CR5_ROAUGtWAS/exec';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false });
  if (!APPS_SCRIPT_URL.startsWith('https://script.google.com/')) {
    return res.status(503).json({ ok: false, message: 'Configurer APPS_SCRIPT_URL' });
  }
  try {
    if (req.method === 'POST') {
      const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const action = String(data.action || '');
      const name = String(data.nom || '');
      const email = String(data.email || '');
      const phone = String(data.telephone || '');
      if (!['ticket', 'waitlist'].includes(action) || !name.trim() || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length > 35 || JSON.stringify(data).length > 3000) {
        return res.status(400).json({ ok: false, code: 'invalid_data' });
      }
    }
    const payload = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})) : null;
    const reply = await fetch(APPS_SCRIPT_URL, req.method === 'POST'
      ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' }
      : { method: 'GET', redirect: 'follow' });
    if (!reply.ok) throw new Error('Google Apps Script: ' + reply.status);
    const result = await reply.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(502).json({ ok: false, code: 'upstream_error' });
  }
}

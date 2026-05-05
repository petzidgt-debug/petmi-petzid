const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwstZON6G4wqmRQ_jqwUo00EttxTkE6G0aUUian08G2PKUbcGcak1DnY5bhS9uxYc1L/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const action = req.query.action || '';
  try {
    if (req.method === 'GET') {
      const response = await fetch(SCRIPT_URL + '?action=' + action);
      const text = await response.text();
      try {
        return res.status(200).json(JSON.parse(text));
      } catch(e) {
        return res.status(200).json({ ok: true });
      }
    }
    if (req.method === 'POST') {
      let body = {};
      try { body = req.body || {}; } catch(e) {}
      const response = await fetch(SCRIPT_URL + '?action=' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body)
      });
      const text = await response.text();
      try {
        return res.status(200).json(JSON.parse(text));
      } catch(e) {
        return res.status(200).json({ ok: true });
      }
    }
  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

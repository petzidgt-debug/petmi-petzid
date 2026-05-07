const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzqhIJrdYFuP61Q49Qu2X4yveMCNR1s7feOXumcN3xaWbC9hrghYrf-yAZyFr4PfcGt/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let response;
    if (req.method === 'POST') {
      response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
    } else {
      const params = new URLSearchParams(req.query).toString();
      response = await fetch(SCRIPT_URL + (params ? '?' + params : ''));
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

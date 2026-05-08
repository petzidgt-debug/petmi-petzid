const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxT3XtHHPVXh-kT4qx4I2gEr1uq2HN3NgxCqMunB2jLIyhfinUqmEAvY7jPSB3a4hcj/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let response;
    if (req.method === 'POST') {
      response = await fetch(SCRIPT_URL, {
        method:   'POST',
        headers:  { 'Content-Type': 'application/json' },
        body:     JSON.stringify(req.body),
        redirect: 'follow'
      });
    } else {
      const params = new URLSearchParams(req.query).toString();
      response = await fetch(SCRIPT_URL + (params ? '?' + params : ''), {
        redirect: 'follow'
      });
    }

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { ok: true, raw: text }; }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

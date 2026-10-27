const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3nn6M61a1Jcsx9FofnWfVBiuGMI6IhSvXHih0kDxIoh2cvh1xveWVEipMlARRW5l2/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let response;
    if (req.method === 'POST') {
      // Si el action viene en la URL (?action=algo) y no en el body, lo agregamos —
      // de lo contrario Code.gs recibe action vacío y cae al flujo equivocado.
      var bodyConAction = Object.assign({}, req.body || {});
      if (!bodyConAction.action && req.query && req.query.action) {
        bodyConAction.action = req.query.action;
      }
      response = await fetch(SCRIPT_URL, {
        method:   'POST',
        headers:  { 'Content-Type': 'application/json' },
        body:     JSON.stringify(bodyConAction),
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

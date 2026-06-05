const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwPVrldqIj4_EBY17ZwtPewIe2F0n6X7D7Rad63JAMor--LKSB5f4jAnkjXfPSKgufM/exec';

export const config = { api: { bodyParser: true } };

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

    // Log para debugging en Vercel Functions
    console.log('Apps Script status:', response.status);
    console.log('Apps Script response:', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      // Si no es JSON, devolver el texto crudo para poder ver el error
      return res.status(200).json({ ok: false, raw: text, status: response.status });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Submit handler error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

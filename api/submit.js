const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1L74bM4Rh6JYHXzFv1Vh_Cmr-nDjtog-1mzqR_oOm9xeK1rAkujFfE6JqjW4YKnT9/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  try {
    // Leer el body como texto para evitar truncamiento
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const body = JSON.parse(rawBody);

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { ok: true }; }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb'
  }
};

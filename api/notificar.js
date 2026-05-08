// api/notificar.js
// Proxy hacia Google Apps Script para envío de emails
// Vercel → GAS (que ya tiene los templates y GmailApp)

var GAS_URL = 'https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec';
// ↑ Reemplaza con tu URL de despliegue del GAS (Implementar > Nueva implementación > URL)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    var body = req.body;
    var tipo = body.tipo || '';

    // Mapear tipo → action del GAS
    var action = '';
    var payload = {};

    if (tipo === 'mensaje') {
      action = 'notificarMensaje';
      payload = {
        action:         'notificarMensaje',
        emailReceptor:  body.para_email      || '',
        nombreEmisor:   body.de_nombre       || '',
        nombreReceptor: body.mascota_nombre  || '',
        preview:        body.mensaje_preview || ''
      };
    } else if (tipo === 'solicitud_amistad') {
      action = 'notificarSolicitud';
      payload = {
        action:          'notificarSolicitud',
        emailReceptor:   body.para_email     || '',
        nombreReceptor:  body.para_nombre    || '',
        nombreSolicit:   body.de_nombre      || '',
        uidReceptor:     body.uid_receptor   || ''
      };
    } else if (tipo === 'amistad_aceptada') {
      action = 'notificarAceptado';
      payload = {
        action:         'notificarAceptado',
        emailSolicit:   body.para_email      || '',
        nombreSolicit:  body.para_nombre     || '',
        nombreAceptor:  body.de_nombre       || ''
      };
    } else {
      return res.status(400).json({ error: 'tipo no reconocido: ' + tipo });
    }

    // Enviar al GAS
    var gasRes = await fetch(GAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    var gasData = await gasRes.json().catch(function() { return { ok: true }; });
    return res.status(200).json({ ok: true, gas: gasData });

  } catch (err) {
    console.error('notificar error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

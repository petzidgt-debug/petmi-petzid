// /api/webhook-premium.js
// Recibe webhooks de Recurrente (vía Svix) y activa Premium en Supabase.
//
// v4 (26 ago 2026) — blindado para que SIEMPRE quede un registro en
// webhook_logs, incluso si algo truena de forma inesperada (por eso el
// try/catch envuelve TODO el handler, no solo partes). Esto es clave
// para poder diagnosticar sin depender de los logs de Vercel (que en el
// plan gratis solo guardan los últimos 30 minutos).

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwNTc1MiwiZXhwIjoyMDkzNTgxNzUyfQ.heD60j_eM5MBjIhoZotR7G5nzQZu7kYv9aVvypbfE8A';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzuBevjWzfX021aM7n29nB2feFAk3s3gbSW4MmstS0VPaaK24UcYitHcaEDtZzUDcWh/exec';
const SVIX_SECRET = 'whsec_XECG6MKLlkD7eTynodhQ098IW68sF9oF';

const PRODUCTOS = {
  PREMIUM: '', // llenar con el product.id real en cuanto se confirme via webhook_logs
};

async function guardarLog(datos) {
  try {
    await fetch(SUPABASE_URL + '/rest/v1/webhook_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
      body: JSON.stringify(datos)
    });
  } catch(e) { console.error('No se pudo guardar en webhook_logs:', e && e.message); }
}

function leerCuerpoCrudo(req) {
  return new Promise(function(resolve, reject) {
    try {
      var data = '';
      req.on('data', function(chunk) { data += chunk; });
      req.on('end', function() { resolve(data); });
      req.on('error', reject);
    } catch(e) { reject(e); }
  });
}

function safeParse(str) {
  try { return JSON.parse(str); } catch(e) { return null; }
}

async function activarPremium(email) {
  if (!email) return { ok: false, motivo: 'sin_email' };

  const hasta = new Date();
  hasta.setFullYear(hasta.getFullYear() + 1);

  const r = await fetch(
    SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent(email.toLowerCase()),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ premium: true, premium_hasta: hasta.toISOString() })
    }
  );

  if (r.ok) {
    try {
      const uRes = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent(email.toLowerCase()) + '&select=nombre,dueno&limit=1',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const uData = await uRes.json();
      const u = (uData && uData[0]) || {};
      const hastaStr = hasta.toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' });
      await fetch(GAS_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notificarPremiumActivado', emailDueno: email, nombreDueno: u.dueno || '', nombreMasc: u.nombre || '', hastaStr })
      }).catch(function(){});
    } catch(e) { console.error('Fetch usuario / email bienvenida:', e.message); }
  }

  return { ok: r.ok, motivo: r.ok ? 'activado' : ('supabase_status_' + r.status) };
}

export default async function handler(req, res) {
  // TODO el cuerpo del handler va dentro de un solo try/catch — cualquier
  // cosa inesperada que truene, cae aquí y se guarda un log con el error
  // real en vez de morir en silencio sin dejar rastro.
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Paso 1: leer el cuerpo. Si esto falla (por ejemplo porque el runtime
    // ya consumió el stream y req.on no sirve aquí), caemos a usar
    // req.body ya parseado por Vercel como respaldo — la firma podría no
    // verificar en ese caso, pero al menos queda registrado qué pasó.
    let payload;
    let metodoLectura = 'raw_stream';
    try {
      payload = await leerCuerpoCrudo(req);
      if (!payload) throw new Error('cuerpo crudo vacío');
    } catch(errLectura) {
      metodoLectura = 'fallback_req_body (' + errLectura.message + ')';
      try { payload = JSON.stringify(req.body || {}); } catch(e2) { payload = ''; }
    }

    const svixId        = req.headers['svix-id'];
    const svixTimestamp = req.headers['svix-timestamp'];
    const svixSignature = req.headers['svix-signature'];

    let firmaValida = false;
    let errorFirma = null;
    try {
      const { Webhook } = await import('svix');
      const wh = new Webhook(SVIX_SECRET);
      wh.verify(payload, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature });
      firmaValida = true;
    } catch(err) {
      errorFirma = err && err.message;
    }

    const event      = safeParse(payload) || {};
    const tipoEvento = event.event_type || '';
    const email      = (event.customer && event.customer.email) || '';
    const productId  = (event.product && event.product.id) || '';

    const logBase = {
      fuente: 'recurrente',
      event_type: tipoEvento || null,
      email: email || null,
      product_id: productId || null,
      payload_completo: Object.keys(event).length ? event : { _sin_parsear: true, metodo_lectura: metodoLectura, muestra: String(payload).substring(0, 300) },
      firma_valida: firmaValida
    };

    if (!firmaValida) {
      await guardarLog({ ...logBase, procesado: false, resultado: 'firma_invalida: ' + errorFirma });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const esDePremium = !PRODUCTOS.PREMIUM || productId === PRODUCTOS.PREMIUM;
    if (!esDePremium) {
      await guardarLog({ ...logBase, procesado: false, resultado: 'ignorado_otro_producto' });
      return res.status(200).json({ ok: true, action: 'ignored_other_product', productId });
    }

    const EVENTOS_QUE_ACTIVAN = ['bank_transfer_intent.succeeded', 'payment_intent.succeeded', 'balance_intent.succeeded'];
    const EVENTOS_SIN_COMPLETAR = ['bank_transfer_intent.failed', 'bank_transfer_intent.pending', 'bank_transfer_intent.create', 'bank_transfer_intent.update'];

    if (EVENTOS_QUE_ACTIVAN.includes(tipoEvento)) {
      const resultado = await activarPremium(email);
      await guardarLog({ ...logBase, procesado: true, resultado: JSON.stringify(resultado) });
      return res.status(200).json({ ok: resultado.ok, action: resultado.motivo, email });
    }

    if (EVENTOS_SIN_COMPLETAR.includes(tipoEvento)) {
      await guardarLog({ ...logBase, procesado: true, resultado: 'sin_completar_aun' });
      return res.status(200).json({ ok: true, action: 'not_completed', evento: tipoEvento });
    }

    await guardarLog({ ...logBase, procesado: false, resultado: 'evento_no_manejado (tipo="' + tipoEvento + '")' });
    return res.status(200).json({ ok: true, action: 'ignored', type: tipoEvento });

  } catch(errFatal) {
    // Red de seguridad final — si algo truena en cualquier punto de arriba
    // que no haya sido atrapado, esto SIEMPRE deja un rastro.
    await guardarLog({
      fuente: 'recurrente',
      payload_completo: { _error_fatal: true },
      firma_valida: false,
      procesado: false,
      resultado: 'ERROR FATAL: ' + (errFatal && errFatal.stack ? errFatal.stack.substring(0, 800) : String(errFatal))
    });
    return res.status(500).json({ ok: false, error: (errFatal && errFatal.message) || 'error desconocido' });
  }
}

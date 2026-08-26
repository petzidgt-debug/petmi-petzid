// /api/webhook-premium.js
// Recibe webhooks de Recurrente (vía Svix) y activa Premium en Supabase.
//
// v3 (26 ago 2026) — reescrito desde cero después de encontrar varios
// bugs acumulados en la versión anterior:
//   1. El archivo nunca se había desplegado con el nombre/ruta correctos.
//   2. El código asumía un formato de payload tipo Stripe (event.type +
//      event.data.customer_email) que Recurrente NO usa — todo viene
//      plano en la raíz: event_type, customer.email, product.id.
//   3. La verificación de firma reconstruía el cuerpo con JSON.stringify
//      en vez de leer el cuerpo crudo — eso hacía que la firma SIEMPRE
//      fallara, sin importar si el secreto estaba bien puesto.
//   4. El endpoint se había desactivado solo en Svix por tantos fallos.
//
// Diseño nuevo:
//   - Guarda TODO evento recibido en la tabla "webhook_logs" de Supabase
//     (pasó o no la verificación, se haya procesado o no) — así se puede
//     depurar sin depender de los logs de Vercel, que en el plan gratis
//     solo guardan los últimos 30 minutos.
//   - Enrutado por product.id: cada producto de Recurrente (Premium, y
//     más adelante la Carrera) tiene su propio manejador. Si llega un
//     product.id que no está en PRODUCTOS, se registra pero se ignora
//     sin romper nada.

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwNTc1MiwiZXhwIjoyMDkzNTgxNzUyfQ.heD60j_eM5MBjIhoZotR7G5nzQZu7kYv9aVvypbfE8A';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzuBevjWzfX021aM7n29nB2feFAk3s3gbSW4MmstS0VPaaK24UcYitHcaEDtZzUDcWh/exec';
const SVIX_SECRET = 'whsec_XECG6MKLlkD7eTynodhQ098IW68sF9oF';

// ── Mapa de productos conocidos ──────────────────────────────────
// IMPORTANTE: llenar PREMIUM con el product.id real en cuanto se
// confirme (se puede ver consultando webhook_logs después de un
// primer intento — ver instrucciones al final del archivo).
const PRODUCTOS = {
  PREMIUM: '', // ej: 'pr_ab12cd34' — mientras esté vacío, CUALQUIER
               // evento de bank_transfer_intent.succeeded activa Premium
               // (correcto solo mientras este endpoint reciba únicamente
               // pagos de Premium)
};

function leerCuerpoCrudo(req) {
  return new Promise(function(resolve, reject) {
    var data = '';
    req.on('data', function(chunk) { data += chunk; });
    req.on('end', function() { resolve(data); });
    req.on('error', reject);
  });
}

async function guardarLog(datos) {
  try {
    await fetch(SUPABASE_URL + '/rest/v1/webhook_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
      body: JSON.stringify(datos)
    });
  } catch(e) { console.error('No se pudo guardar en webhook_logs:', e.message); }
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = await leerCuerpoCrudo(req);
  const svixId        = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  let firmaValida = false;
  try {
    const { Webhook } = await import('svix');
    const wh = new Webhook(SVIX_SECRET);
    wh.verify(payload, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature });
    firmaValida = true;
  } catch(err) {
    await guardarLog({ fuente: 'recurrente', payload_completo: safeParse(payload), firma_valida: false, procesado: false, resultado: 'firma_invalida: ' + err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event      = safeParse(payload) || {};
  const tipoEvento = event.event_type || '';
  const email      = (event.customer && event.customer.email) || '';
  const productId  = (event.product && event.product.id) || '';

  // Guardar SIEMPRE, pase lo que pase después — esto es lo que permite
  // depurar sin depender de los logs de Vercel.
  const logBase = { fuente: 'recurrente', event_type: tipoEvento, email, product_id: productId, payload_completo: event, firma_valida: true };

  // Si ya se configuró el product.id de Premium, filtrar por él.
  // Si está vacío todavía (no confirmado), procesar cualquier evento —
  // así el primer intento real sirve para descubrir el product.id en
  // la tabla webhook_logs.
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

  await guardarLog({ ...logBase, procesado: false, resultado: 'evento_no_manejado' });
  return res.status(200).json({ ok: true, action: 'ignored', type: tipoEvento });
}

function safeParse(str) {
  try { return JSON.parse(str); } catch(e) { return { _no_parseable: true, raw: String(str).substring(0, 500) }; }
}

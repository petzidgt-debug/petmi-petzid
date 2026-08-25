// /api/webhook-premium.js
// Recibe webhooks de Recurrente via Svix y activa Premium en Supabase.
//
// v2 (25 ago 2026) — reescrito con la estructura REAL del payload de
// Recurrente, confirmada en su Event Catalog (Svix). El codigo anterior
// asumia un formato tipo Stripe (event.type + event.data.customer_email)
// que NUNCA coincide con lo que Recurrente manda de verdad:
//
//   {
//     "event_type": "bank_transfer_intent.succeeded",   <- NO "type"
//     "customer": { "email": "...", "full_name": "..." },  <- NO "data.customer_email"
//     "product": { "id": "pr_..." },
//     "amount_in_cents": 2500,
//     ...
//   }
//
// Todo viene en la RAIZ del payload, no dentro de un objeto "data".
// Ademas el bloque de payment_intent estaba anidado DENTRO del bloque de
// subscription, asi que nunca se podia ejecutar — codigo muerto.

const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const GAS_URL     = 'https://script.google.com/macros/s/AKfycbzuBevjWzfX021aM7n29nB2feFAk3s3gbSW4MmstS0VPaaK24UcYitHcaEDtZzUDcWh/exec';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';

// Token de verificacion de Svix — el de tu dashboard de Svix
const SVIX_SECRET = 'whsec_XECG6MKLlkD7eTynodhQ098IW68sF9oF';

// IMPORTANTE: pon aqui el product.id real de tu link de Premium en Recurrente.
// Lo ves en el JSON de cualquier webhook de Premium ya recibido (campo "product.id"),
// o en el panel de Recurrente al abrir el producto. Mientras esto quede vacio,
// el codigo activa Premium para CUALQUIER bank_transfer_intent.succeeded que
// llegue a este endpoint — lo cual esta bien SOLO SI este endpoint únicamente
// recibe eventos de Premium. En cuanto conectes otro producto (ej. la carrera)
// a este mismo endpoint, hay que llenar este valor para no activar Premium
// por error con el pago de otra cosa.
const PRODUCT_ID_PREMIUM = ''; // ej: 'pr_ab12cd34'

// ── Email de bienvenida Premium ───────────────────────────────
async function enviarBienvenidaPremium(email, nombre, dueno, hasta) {
  try {
    const hastaStr = hasta
      ? new Date(hasta).toLocaleDateString('es-GT', {day:'2-digit', month:'long', year:'numeric'})
      : 'un año completo';

    await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:      'notificarPremiumActivado',
        emailDueno:  email,
        nombreDueno: dueno  || '',
        nombreMasc:  nombre || '',
        hastaStr:    hastaStr
      }),
      redirect: 'follow'
    });
    console.log('Email bienvenida premium enviado a:', email);
  } catch(err) {
    console.error('Error email premium:', err.message);
  }
}

async function activarPremium(email, res, tipoEvento) {
  if (!email) {
    console.error('activarPremium: sin email en el payload. Evento:', tipoEvento);
    return res.status(200).json({ ok: false, error: 'No email found' });
  }

  const hasta = new Date();
  hasta.setFullYear(hasta.getFullYear() + 1);

  const r = await fetch(
    SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent(email.toLowerCase()),
    {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer':        'return=minimal'
      },
      body: JSON.stringify({ premium: true, premium_hasta: hasta.toISOString() })
    }
  );

  console.log('Supabase PATCH status:', r.status, 'email:', email, 'evento:', tipoEvento);

  if (r.ok) {
    try {
      const uRes = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent(email.toLowerCase()) + '&select=nombre,dueno&limit=1',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const uData = await uRes.json();
      const u = uData && uData[0] ? uData[0] : {};
      await enviarBienvenidaPremium(email, u.nombre || '', u.dueno || '', hasta.toISOString());
    } catch(e) { console.error('Fetch usuario:', e.message); }
  }

  return res.status(200).json({ ok: r.ok, action: 'activated', email, evento: tipoEvento });
}

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = JSON.stringify(req.body);
  const svixId        = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  console.log('Webhook recibido:', svixId);
  console.log('Payload:', payload.substring(0, 400));

  try {
    const { Webhook } = await import('svix');
    const wh = new Webhook(SVIX_SECRET);
    wh.verify(payload, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature
    });
  } catch(err) {
    console.error('Firma invalida:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event      = req.body;
  const tipoEvento = event.event_type || event.type || ''; // event_type es el real; type queda de respaldo
  const email      = (event.customer && event.customer.email) || event.customer_email || '';
  const productId  = (event.product && event.product.id) || '';

  console.log('event_type:', tipoEvento, '| email:', email, '| product.id:', productId);

  // Si ya se configuro el product.id de Premium, solo procesar eventos de ESE producto.
  // Si se dejo vacio (todavia no se sabe cual es), procesa cualquier evento — util
  // mientras se confirma el product.id real viendo estos logs.
  if (PRODUCT_ID_PREMIUM && productId && productId !== PRODUCT_ID_PREMIUM) {
    console.log('Evento de otro producto, ignorado para Premium. product.id:', productId);
    return res.status(200).json({ ok: true, action: 'ignored_other_product', productId });
  }

  // ── Pago por transferencia bancaria completado ──────────────
  if (tipoEvento === 'bank_transfer_intent.succeeded') {
    return activarPremium(email, res, tipoEvento);
  }

  // ── Pago con tarjeta / balance completado (nombres probables,
  // aun no confirmados con un ejemplo real — mismo formato plano que
  // bank_transfer_intent, por consistencia con el resto de la API) ──
  if (tipoEvento === 'payment_intent.succeeded' || tipoEvento === 'balance_intent.succeeded') {
    return activarPremium(email, res, tipoEvento);
  }

  // Eventos de transferencia que fallo o quedo pendiente — no hacer nada,
  // pero registrar para poder revisar despues si hace falta.
  if (tipoEvento === 'bank_transfer_intent.failed' || tipoEvento === 'bank_transfer_intent.pending') {
    console.log('Transferencia sin completar (' + tipoEvento + '), no se activa Premium. email:', email);
    return res.status(200).json({ ok: true, action: 'not_completed', evento: tipoEvento });
  }

  console.log('Evento no manejado:', tipoEvento);
  return res.status(200).json({ ok: true, action: 'ignored', type: tipoEvento });
}

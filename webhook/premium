// /api/webhook-premium.js
// Recibe webhooks de Recurrente (vía Svix) y activa Premium en Supabase.
//
// v5 (9 sep 2026) — ahora TAMBIÉN maneja pagos de la tienda (carrito):
// cuando el producto pagado es un pedido de tienda (identificado por
// metadata.pedido_id, no por PRODUCTOS.PREMIUM), marca el pedido como
// pagado y resta el stock vendido. Todo lo de Premium sigue exactamente
// igual que antes.
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
  PREMIUM: 'pay_bjshuwfn', // confirmado el 26 ago 2026 via webhook_logs (pago real de cesar.combox@gmail.com)
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

// ── Tienda: marca el pedido como pagado y resta stock ──────────
async function procesarPagoTienda(pedidoId) {
  if (!pedidoId) return { ok: false, motivo: 'sin_pedido_id' };

  // Trae el pedido (para no procesarlo 2 veces si Recurrente reintenta
  // el webhook, y para saber qué items/cantidades restar del stock)
  const rGet = await fetch(
    SUPABASE_URL + '/rest/v1/pedidos_tienda?id=eq.' + encodeURIComponent(pedidoId) + '&select=*',
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
  );
  const rows = await rGet.json();
  const pedido = rows && rows[0];
  if (!pedido) return { ok: false, motivo: 'pedido_no_encontrado' };
  if (pedido.estado === 'pagado') return { ok: true, motivo: 'ya_estaba_pagado' }; // evita restar stock 2 veces

  // Restar stock de cada producto (solo si el producto controla stock —
  // si stock es NULL, es inventario ilimitado, no se toca)
  for (const item of (pedido.items || [])) {
    try {
      const rProd = await fetch(
        SUPABASE_URL + '/rest/v1/tienda_productos?id=eq.' + item.producto_id + '&select=stock',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const prodRows = await rProd.json();
      const stockActual = prodRows && prodRows[0] ? prodRows[0].stock : null;
      if (stockActual != null) {
        const nuevoStock = Math.max(0, stockActual - item.cantidad);
        await fetch(SUPABASE_URL + '/rest/v1/tienda_productos?id=eq.' + item.producto_id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ stock: nuevoStock })
        });
      }
    } catch(e) { console.error('Error restando stock de ' + item.producto_id + ':', e.message); }
  }

  // Marca el pedido como pagado
  const rPatch = await fetch(SUPABASE_URL + '/rest/v1/pedidos_tienda?id=eq.' + pedidoId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ estado: 'pagado', pagado_at: new Date().toISOString() })
  });

  // Avisa al dueño de la tienda (mensaje simple por ahora vía GAS/Gmail-Wix)
  try {
    const itemsTexto = (pedido.items || []).map(i => i.cantidad + 'x ' + i.nombre).join(', ');
    await fetch(GAS_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notificarPedidoTiendaPagado', email: pedido.email, items: itemsTexto, total: (pedido.total_centavos/100).toFixed(2) })
    }).catch(function(){});
  } catch(e) { console.error('Aviso pedido tienda:', e.message); }

  return { ok: rPatch.ok, motivo: rPatch.ok ? 'pedido_pagado' : ('supabase_status_' + rPatch.status) };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

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
    const pedidoId   = (event.metadata && event.metadata.pedido_id) || '';

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

    const EVENTOS_QUE_ACTIVAN = ['bank_transfer_intent.succeeded', 'payment_intent.succeeded', 'balance_intent.succeeded'];
    const EVENTOS_SIN_COMPLETAR = ['bank_transfer_intent.failed', 'bank_transfer_intent.pending', 'bank_transfer_intent.create', 'bank_transfer_intent.update'];

    // ── Pedido de tienda (identificado por metadata.pedido_id) ──────
    // Se revisa ANTES que el flujo de Premium, ya que un pedido de
    // tienda no tiene product.id === PRODUCTOS.PREMIUM.
    if (pedidoId && EVENTOS_QUE_ACTIVAN.includes(tipoEvento)) {
      const resultado = await procesarPagoTienda(pedidoId);
      await guardarLog({ ...logBase, procesado: true, resultado: 'tienda: ' + JSON.stringify(resultado) });
      return res.status(200).json({ ok: resultado.ok, action: resultado.motivo, pedidoId });
    }
    if (pedidoId && EVENTOS_SIN_COMPLETAR.includes(tipoEvento)) {
      await guardarLog({ ...logBase, procesado: true, resultado: 'tienda: sin_completar_aun' });
      return res.status(200).json({ ok: true, action: 'not_completed', evento: tipoEvento });
    }

    // ── Flujo de Premium (sin cambios respecto a v4) ────────────────
    const esDePremium = !PRODUCTOS.PREMIUM || productId === PRODUCTOS.PREMIUM;
    if (!esDePremium) {
      await guardarLog({ ...logBase, procesado: false, resultado: 'ignorado_otro_producto' });
      return res.status(200).json({ ok: true, action: 'ignored_other_product', productId });
    }

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

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

// ── Correos de pedidos de la tienda (directo por Wix, igual que los códigos de verificación) ──
// Se limpia por si en Vercel se pegó con comillas, espacios o "Bearer" (Wix la rechaza con 403 si no es la llave sola).
const WIX_API_KEY = String(process.env.WIX_API_KEY || '').trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^Bearer\s+/i, '').trim();
const WIX_SITE_ID = '25b3d584-29fb-4861-b757-d9640d37c01f';
const WIX_SENDER_NAME = 'PETmi';
const WIX_SENDER_EMAIL = 'revistapetmi@gmail.com'; // remitente ya verificado en Wix
// A quién le llega el aviso de "pedido nuevo pagado". Cámbialo en Vercel con la variable EMAIL_AVISOS_PEDIDOS.
const EMAIL_AVISOS_PEDIDOS = process.env.EMAIL_AVISOS_PEDIDOS || 'revistapetmi@gmail.com';

const PRODUCTOS = {
  PREMIUM: 'pay_bjshuwfn', // confirmado el 26 ago 2026 via webhook_logs (pago real de cesar.combox@gmail.com)
};

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function enviarCorreoWix(email, asunto, html) {
  if (!WIX_API_KEY) return { ok: false, error: 'WIX_API_KEY no configurada' };
  if (!email) return { ok: false, error: 'sin destinatario' };
  try {
    const r = await fetch('https://www.wixapis.com/email-transmissions/v1/email-transmissions/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': WIX_API_KEY, 'wix-site-id': WIX_SITE_ID },
      body: JSON.stringify({
        emailTransmission: {
          emailSubject: asunto, emailHtmlContent: html,
          senderName: WIX_SENDER_NAME, senderEmailAddress: WIX_SENDER_EMAIL,
          toRecipients: [{ emailAddress: email }], type: 'TRANSACTIONAL'
        },
        idempotencyKey: crypto.randomUUID()
      })
    });
    if (!r.ok) return { ok: false, error: 'Wix ' + r.status + ': ' + String(await r.text().catch(() => '')).slice(0, 120) };
    return { ok: true };
  } catch (e) { return { ok: false, error: 'Wix: ' + e.message }; }
}

function layoutCorreo(cuerpo) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">'
    + '<div style="background:#00B4B4;padding:28px;text-align:center;border-radius:12px 12px 0 0"><div style="display:inline-block;background:#fff;border-radius:12px;padding:8px 18px"><img src="https://app.revistapetmi.com/logopetmi.png" alt="PetMi" style="height:36px;width:auto;display:block"></div></div>'
    + '<div style="background:#fff;padding:28px;border:1px solid #eee">' + cuerpo + '</div>'
    + '<div style="background:#F5C842;padding:12px;text-align:center;border-radius:0 0 12px 12px"><p style="margin:0;font-size:12px;color:#555">PetMi Guatemala</p></div></div></body></html>';
}

function telefonoLindo(t) {
  const d = String(t || '').replace(/\D/g, '');
  return d.length === 11 && d.indexOf('502') === 0 ? d.slice(3, 7) + '-' + d.slice(7) : String(t || '');
}
function itemsComoTexto(pedido) {
  return (pedido.items || []).map(i => i.cantidad + 'x ' + i.nombre).join(', ');
}

// Correo al cliente: confirma el pago y avisa que lo llevará nuestro mensajero.
function htmlPedidoCliente(pedido, total) {
  const conEntrega = pedido.direccion && pedido.telefono;
  const entrega = conEntrega
    ? '<p style="color:#555;line-height:1.7;font-size:13px;text-align:center">Lo llevará nuestro mensajero a:<br><b style="color:#1a1a2e">' + escHtml(pedido.direccion) + '</b><br><br>'
      + 'Te escribiremos por WhatsApp al <b style="color:#1a1a2e">' + escHtml(telefonoLindo(pedido.telefono)) + '</b> para confirmar el día y el horario.</p>'
    : '<p style="color:#555;line-height:1.7;font-size:13px;text-align:center">Nos pondremos en contacto por WhatsApp para coordinar la entrega.</p>';
  return layoutCorreo('<h2 style="color:#1a1a2e;margin-top:0;text-align:center">¡Gracias por tu compra! &#128062;</h2>'
    + '<p style="color:#555;line-height:1.7;font-size:14px;text-align:center">Tu pago se confirmó y tu pedido ya está en proceso:</p>'
    + '<div style="background:#f8f8f8;border-radius:12px;padding:16px 18px;margin:16px 0;text-align:center"><div style="font-size:14px;color:#333;font-weight:700">' + escHtml(itemsComoTexto(pedido)) + '</div>'
    + '<div style="font-size:20px;color:#00B4B4;font-weight:900;margin-top:8px">Q' + total + '</div></div>' + entrega);
}

// Correo a ti: pedido nuevo pagado, con todo lo necesario para coordinar y un botón de WhatsApp ya escrito.
function htmlPedidoDueno(pedido, total) {
  const primer = String(pedido.nombre || '').trim().split(' ')[0] || '';
  const mensaje = '¡Hola' + (primer ? ' ' + primer : '') + '! 🐾 Soy de PetMi. Recibimos tu pago de Q' + total + ' por: ' + itemsComoTexto(pedido)
    + '.\n\nPara coordinar tu entrega, ¿me confirmas esta dirección? 📍 ' + (pedido.direccion || '') + '\n\n¿Qué día y horario te queda mejor?';
  const wa = pedido.telefono ? 'https://wa.me/' + String(pedido.telefono).replace(/\D/g, '') + '?text=' + encodeURIComponent(mensaje) : '';
  const fila = (k, v) => '<tr><td style="padding:6px 10px;color:#888;font-size:12px;white-space:nowrap;vertical-align:top">' + k + '</td><td style="padding:6px 10px;color:#1a1a2e;font-size:14px;font-weight:700">' + v + '</td></tr>';
  return layoutCorreo('<h2 style="color:#1a1a2e;margin-top:0;text-align:center">&#128722; Pedido nuevo pagado</h2>'
    + '<table style="width:100%;border-collapse:collapse;background:#f8f8f8;border-radius:12px;margin:14px 0">'
    + fila('Productos', escHtml(itemsComoTexto(pedido))) + fila('Total', 'Q' + total)
    + fila('Cliente', escHtml(pedido.nombre || '(sin nombre)')) + fila('Correo', escHtml(pedido.email))
    + fila('WhatsApp', pedido.telefono ? escHtml(telefonoLindo(pedido.telefono)) : '(no dejó)')
    + fila('Dirección', escHtml(pedido.direccion || '(no dejó)'))
    + (pedido.notas_cliente ? fila('Notas', escHtml(pedido.notas_cliente)) : '') + '</table>'
    + (wa ? '<div style="text-align:center;margin:18px 0"><a href="' + wa.replace(/&/g, '&amp;') + '" style="background:#25D366;color:#fff;padding:13px 26px;border-radius:24px;text-decoration:none;font-weight:900;font-size:14px">&#128172; Confirmar entrega por WhatsApp</a></div>' : '')
    + '<p style="text-align:center;font-size:12px;color:#999">Gestiona el pedido (confirmar, en camino, entregado) en el <a href="https://app.revistapetmi.com/admin.html" style="color:#00838f">Admin &rarr; Pedidos</a>.</p>');
}

async function enviarAvisosPedidoPagado(pedido) {
  const out = { correo_cliente: 'no_enviado', correo_dueno: 'no_enviado' };
  const total = (pedido.total_centavos / 100).toFixed(2);
  try {
    const r = await enviarCorreoWix(pedido.email, 'Confirmación de tu pedido en PetMi', htmlPedidoCliente(pedido, total));
    if (r.ok) out.correo_cliente = 'wix';
    else {
      // Respaldo: el correo de siempre por Apps Script
      try {
        await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'notificarPedidoTiendaPagado', email: pedido.email, items: itemsComoTexto(pedido), total: total }) });
        out.correo_cliente = 'apps_script (Wix falló: ' + r.error + ')';
      } catch (e2) { out.correo_cliente = 'error: ' + r.error; }
    }
  } catch (e) { out.correo_cliente = 'error: ' + e.message; }
  try {
    const asunto = '🛒 Pedido nuevo pagado — Q' + total + (pedido.nombre ? ' · ' + pedido.nombre : '');
    const r2 = await enviarCorreoWix(EMAIL_AVISOS_PEDIDOS, asunto, htmlPedidoDueno(pedido, total));
    out.correo_dueno = r2.ok ? 'ok' : 'error: ' + r2.error;
  } catch (e) { out.correo_dueno = 'error: ' + e.message; }
  return out;
}

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

  // Carritos abandonados: este carrito ya no está abandonado, compró. (Si la tabla no existe todavía, no pasa nada.)
  if (rPatch.ok) {
    try {
      await fetch(SUPABASE_URL + '/rest/v1/carritos_tienda?pedido_id=eq.' + encodeURIComponent(pedidoId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ estado: 'comprado', actualizado_at: new Date().toISOString() })
      });
    } catch (e) { console.error('No se pudo marcar el carrito como comprado:', e.message); }
  }

  // Avisos: correo al cliente (con sus datos de entrega) y correo a ti. Nunca detienen el proceso.
  let avisos = {};
  if (rPatch.ok) {
    try { avisos = await enviarAvisosPedidoPagado(pedido); } catch (e) { avisos = { aviso_error: e.message }; }
  }

  return { ok: rPatch.ok, motivo: rPatch.ok ? 'pedido_pagado' : ('supabase_status_' + rPatch.status), ...avisos };
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

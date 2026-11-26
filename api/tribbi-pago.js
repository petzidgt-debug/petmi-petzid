// /api/tribbi-pago.js — cobro del envío de Tribbi (intercambios con envío y BookPal) con Recurrente.
//
// POST /api/tribbi-pago                      → abre el cobro en Recurrente y devuelve { url } para mandar a pagar.
//      { tipo:'donacion', slug } → donación que pidió tu amigo secreto (el monto y la organización salen de Supabase).
// GET  /api/tribbi-pago?accion=volver&r=...  → a donde regresa Recurrente después de pagar: confirma y regresa a la página.
// POST /api/tribbi-pago?accion=webhook       → aviso de Recurrente (por si la persona cerró la página antes de regresar).
// POST /api/tribbi-pago?accion=aviso_sorteo  → { slug }: correo "¡Ya se hizo el sorteo!" a quienes faltan (solo el panel de PetMi).
//      Manda hasta 20 por llamada y responde { enviados, fallidos, quedan }: la página repite hasta que quedan = 0.
// GET  /api/tribbi-pago                      → solo muestra la versión, para comprobar que el despliegue está en línea.
//
// Seguridad:
//   · El monto SIEMPRE sale de Supabase, nunca de lo que mande la página.
//   · Un pago solo se marca cuando la API de Recurrente dice que ESE cobro está pagado ("paid"). El aviso del webhook
//     y el regreso del navegador solo disparan esa revisión; nunca se cree en lo que traen.
//   · Las llaves viven en Vercel (Settings → Environment Variables), nunca en este archivo:
//       RECURRENTE_SECRET_KEY    (obligatoria, empieza con sk_live_ o sk_test_)
//       RECURRENTE_PUBLIC_KEY    (opcional; cuentas viejas de Recurrente la piden además de la secreta)
//       RECURRENTE_WEBHOOK_SECRET(opcional pero recomendada; empieza con whsec_)
//       SUPABASE_SERVICE_KEY     (la misma que ya usa /api/galeria)
//       WIX_API_KEY              (la misma que ya usa /api/galeria para los correos de PetMi)

import crypto from 'crypto';

export const config = { api: { bodyParser: false } };   // el webhook necesita el cuerpo tal cual llega para revisar la firma

const VERSION = '2026-11-25-c';   // + aviso por correo del sorteo
const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
// Llave PÚBLICA (anon) de Supabase: es la misma que va en todas las páginas, no es un secreto.
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';
const RECURRENTE = 'https://app.recurrente.com/api';
const ORIGEN = (process.env.TRIBBI_ORIGEN || 'https://app.revistapetmi.com').replace(/\/+$/, '');

const limpio = v => String(process.env[v] || '').trim().replace(/^["'`]+|["'`]+$/g, '').trim();
const SERVICE = () => limpio('SUPABASE_SERVICE_KEY');
const SK = () => limpio('RECURRENTE_SECRET_KEY');
const PK = () => limpio('RECURRENTE_PUBLIC_KEY');
const WHSEC = () => limpio('RECURRENTE_WEBHOOK_SECRET');

// ── Utilidades ──────────────────────────────────────────────────────────────
function leerCuerpo(req) {
  return new Promise(resolve => {
    if (typeof req.body === 'string') return resolve(req.body);
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return resolve(JSON.stringify(req.body));
    const partes = [];
    req.on('data', c => partes.push(c));
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}
const json = (res, status, obj) => { res.setHeader('Cache-Control', 'no-store'); return res.status(status).json(obj); };

async function rpc(fn, args) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE(), Authorization: 'Bearer ' + SERVICE() },
    body: JSON.stringify(args || {})
  });
  let d = null; try { d = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error('Supabase ' + fn + ' ' + r.status + ' ' + JSON.stringify(d).slice(0, 200));
  return d;
}

async function usuarioDeToken(token) {
  if (!token) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? u : null;
}

// ── Correos con Wix (igual que /api/galeria: Email Transmissions, remitente ya verificado) ──
const WIX_SITE_ID = '25b3d584-29fb-4861-b757-d9640d37c01f';
const WIX_SENDER_NAME = 'PETmi';
const WIX_SENDER_EMAIL = 'revistapetmi@gmail.com';
const WIX = () => limpio('WIX_API_KEY').replace(/^Bearer\s+/i, '').trim();
async function enviarPorWix(email, asunto, html) {
  if (!WIX()) return { ok: false, error: 'WIX_API_KEY no configurada' };
  try {
    const r = await fetch('https://www.wixapis.com/email-transmissions/v1/email-transmissions/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: WIX(), 'wix-site-id': WIX_SITE_ID },
      body: JSON.stringify({
        emailTransmission: { emailSubject: asunto, emailHtmlContent: html, senderName: WIX_SENDER_NAME, senderEmailAddress: WIX_SENDER_EMAIL,
          toRecipients: [{ emailAddress: email }], type: 'TRANSACTIONAL' },
        idempotencyKey: crypto.randomUUID()
      })
    });
    if (!r.ok) { const t = await r.text().catch(() => ''); console.error('aviso sorteo -> Wix', r.status, t.slice(0, 200)); return { ok: false, error: 'Wix ' + r.status }; }
    return { ok: true };
  } catch (e) { console.error('aviso sorteo -> Wix error', e.message); return { ok: false, error: 'Wix: conexión' }; }
}
const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function htmlAvisoSorteo(nombre, edicion, link) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;background:#FDF6EA">'
    + '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:16px">'
    + '<div style="background:#1F6B4F;padding:26px;text-align:center;border-radius:16px 16px 0 0">'
    + '<div style="display:inline-block;background:#fff;border-radius:12px;padding:8px 18px"><img src="https://app.revistapetmi.com/logopetmi.png" alt="PetMi" style="height:36px;width:auto;display:block"></div>'
    + '<div style="font-size:34px;margin-top:12px">&#127873;</div></div>'
    + '<div style="background:#fff;padding:28px;border:1px solid #eee;text-align:center">'
    + '<h2 style="color:#D7263D;margin:0 0 10px">&iexcl;Ya se hizo el sorteo!</h2>'
    + '<p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 6px">Hola' + (nombre ? ' ' + escH(nombre) : '') + ', ya puedes descubrir a qui&eacute;n le regalas en <b>' + escH(edicion) + '</b>.</p>'
    + '<p style="color:#666;line-height:1.6;font-size:14px;margin:0 0 20px">Entra con tu correo, raspa tu tarjeta y mira las ideas de regalo de tu amigo secreto y su mascota.</p>'
    + '<a href="' + escH(link) + '" style="background:#D7263D;color:#fff;padding:14px 30px;border-radius:24px;text-decoration:none;font-weight:900;font-size:15px;display:inline-block">Descubrir a mi amigo secreto &rarr;</a>'
    + '<p style="color:#999;font-size:12px;margin:22px 0 0">Shh&hellip; no le cuentes a nadie. &#129323;</p>'
    + '</div>'
    + '<div style="background:#F5C842;padding:12px;text-align:center;border-radius:0 0 16px 16px"><p style="margin:0;font-size:12px;color:#555">Amigo secreto PetMi &#128062; &middot; PetMi Guatemala</p></div>'
    + '</div></body></html>';
}

function cabecerasRecurrente() {
  const h = { 'Content-Type': 'application/json', 'X-SECRET-KEY': SK() };
  if (PK()) h['X-PUBLIC-KEY'] = PK();
  return h;
}
async function checkoutRecurrente(id) {
  if (!/^ch_[A-Za-z0-9]+$/.test(id || '')) return null;
  const r = await fetch(RECURRENTE + '/checkouts/' + encodeURIComponent(id), { headers: cabecerasRecurrente() });
  if (!r.ok) { console.error('Recurrente GET checkout', id, r.status); return null; }
  return r.json().catch(() => null);
}

// Revisa un cobro en Recurrente y, si está pagado, lo marca en Supabase. Devuelve el resultado o null si aún no está pagado.
async function confirmarSiPagado(checkoutId) {
  const ch = await checkoutRecurrente(checkoutId);
  if (!ch || ch.status !== 'paid') return null;
  const monto = Number(ch.total_in_cents) / 100;
  if (!(monto > 0)) return null;
  const datos = { checkout_id: ch.id, pago_id: ch.payment && ch.payment.id || null, moneda: ch.currency || null, live_mode: ch.live_mode };
  const r = await rpc('tribbi_cobro_cerrar', { p_checkout: ch.id, p_monto_pagado: monto, p_datos: datos });
  if (!r || r.ok === false) console.error('tribbi_cobro_cerrar', ch.id, JSON.stringify(r));
  return r;
}

function paginaDe(tipo, slug, estado) {
  const base = tipo === 'bookpal' ? ORIGEN + '/tribbi/bookpal.html?' : ORIGEN + '/tribbi/tribbi.html?e=' + encodeURIComponent(slug || '') + '&';
  return base + (tipo === 'donacion' ? 'dona=' : 'pago=') + estado;
}

// Firma de los webhooks (Svix / Standard Webhooks): HMAC-SHA256 de "id.timestamp.cuerpo" con el secreto whsec_...
function firmaValida(req, cuerpo) {
  const secreto = WHSEC();
  if (!secreto) return true;   // sin secreto configurado no se puede revisar; igual nada se confirma sin preguntarle a Recurrente
  const id = req.headers['svix-id'] || req.headers['webhook-id'];
  const ts = req.headers['svix-timestamp'] || req.headers['webhook-timestamp'];
  const firmas = String(req.headers['svix-signature'] || req.headers['webhook-signature'] || '');
  if (!id || !ts || !firmas) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 600) return false;   // más de 10 minutos de diferencia: se descarta
  let llave;
  try { llave = Buffer.from(secreto.replace(/^whsec_/, ''), 'base64'); } catch (e) { return false; }
  const esperada = crypto.createHmac('sha256', llave).update(`${id}.${ts}.${cuerpo}`).digest();
  return firmas.split(' ').some(f => {
    const [ver, sig] = f.split(',');
    if (ver !== 'v1' || !sig) return false;
    const b = Buffer.from(sig, 'base64');
    return b.length === esperada.length && crypto.timingSafeEqual(b, esperada);
  });
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const accion = String((req.query && req.query.accion) || '');
  try {
    // 1. Regreso desde Recurrente después de pagar
    if (req.method === 'GET' && accion === 'volver') {
      const ref = String(req.query.r || '');
      if (!/^[0-9a-f-]{36}$/i.test(ref)) { res.writeHead(302, { Location: ORIGEN + '/tribbi/' }); return res.end(); }
      const t = String(req.query.t || '');   // tipo de cobro: la donación usa la misma inscripción que el envío de quien recibe
      const cobros = await rpc('tribbi_cobros_de_ref', { p_ref: ref });
      let tipo = /^(intercambio|bookpal|donacion)$/.test(t) ? t : 'intercambio', slug = '', estado = 'pendiente';
      for (const c of (Array.isArray(cobros) ? cobros : []).filter(c => !t || c.tipo === t)) {
        tipo = c.tipo; slug = c.slug || slug;
        if (c.confirmado_en) { estado = c.resultado && c.resultado.ok === false ? 'revisar' : 'ok'; break; }
        const r = await confirmarSiPagado(c.checkout_id);
        if (r) { estado = r.ok === false ? 'revisar' : 'ok'; break; }
      }
      res.writeHead(302, { Location: paginaDe(tipo, slug, estado) });
      return res.end();
    }

    // 2. Aviso de Recurrente (webhook)
    if (req.method === 'POST' && accion === 'webhook') {
      const cuerpo = await leerCuerpo(req);
      if (!firmaValida(req, cuerpo)) return json(res, 401, { ok: false, error: 'firma' });
      // El aviso solo sirve para saber QUÉ cobro revisar: se busca cualquier id de cobro (ch_...) y se le pregunta a Recurrente.
      const ids = [...new Set(String(cuerpo).match(/\bch_[A-Za-z0-9]+\b/g) || [])].slice(0, 5);
      for (const id of ids) {
        const c = await rpc('tribbi_cobro_de', { p_checkout: id });
        if (c && c.checkout_id) await confirmarSiPagado(id);
      }
      return json(res, 200, { ok: true });
    }

    // 3. Aviso por correo del sorteo (solo quien administra el intercambio en el panel de PetMi)
    if (req.method === 'POST' && accion === 'aviso_sorteo') {
      if (!SERVICE() || !WIX()) return json(res, 503, { ok: false, mensaje: 'Faltan variables en Vercel: ' + [!SERVICE() && 'SUPABASE_SERVICE_KEY', !WIX() && 'WIX_API_KEY'].filter(Boolean).join(', ') });
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      let b = {}; try { b = JSON.parse(await leerCuerpo(req) || '{}') || {}; } catch (e) { b = {}; }
      const slug = String(b.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
      if (!token || !slug) return json(res, 400, { ok: false, mensaje: 'Falta el intercambio o la sesión.' });
      // ¿Administra este intercambio? Se pregunta con SU sesión, con la misma revisión que usa el panel
      const ra = await fetch(SUPABASE_URL + '/rest/v1/rpc/tribbi_admin_resumen', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token },
        body: JSON.stringify({ p_slug: slug })
      });
      const adm = await ra.json().catch(() => null);
      if (!ra.ok || !adm || adm.ok === false) return json(res, 403, { ok: false, mensaje: 'Solo quien administra este intercambio puede mandar el aviso.' });
      const p = await rpc('tribbi_aviso_sorteo_pendientes', { p_slug: slug, p_limite: 20 });
      const lista = (p && Array.isArray(p.lista)) ? p.lista : [];
      const edicion = (p && p.edicion && p.edicion.nombre) || 'el amigo secreto';
      const link = ORIGEN + '/tribbi/tribbi.html?e=' + encodeURIComponent(slug);
      const listos = [], fallidos = [];
      for (let k = 0; k < lista.length; k += 4) {   // de 4 en 4 para no pasar el tiempo límite de Vercel
        const tanda = lista.slice(k, k + 4);
        const r = await Promise.all(tanda.map(x => enviarPorWix(x.email, '🎁 ¡Ya se hizo el sorteo de ' + edicion + '!', htmlAvisoSorteo(x.nombre, edicion, link))));
        r.forEach((x, j) => (x.ok ? listos : fallidos).push(tanda[j]));
      }
      if (listos.length) await rpc('tribbi_aviso_sorteo_marcar', { p_ids: listos.map(x => x.id) });
      const quedan = Math.max(0, Number((p && p.quedan) || 0) - listos.length);
      return json(res, 200, { ok: true, enviados: listos.length, fallidos: fallidos.map(x => x.email), quedan });
    }

    // 4. Abrir un cobro nuevo
    if (req.method === 'POST') {
      if (!SK() || !SERVICE()) {
        console.error('Faltan variables en Vercel:', !SK() ? 'RECURRENTE_SECRET_KEY' : '', !SERVICE() ? 'SUPABASE_SERVICE_KEY' : '');
        return json(res, 503, { ok: false, mensaje: 'El pago en línea todavía no está activado. Tu lugar quedó guardado: vuelve pronto para pagar.' });
      }
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const user = await usuarioDeToken(token);
      if (!user) return json(res, 401, { ok: false, mensaje: 'Tu sesión venció. Vuelve a entrar.' });
      let b = {}; try { b = JSON.parse(await leerCuerpo(req) || '{}') || {}; } catch (e) { b = {}; }
      const esBookpal = /bookpal|^bp$/i.test(String(b.tipo || b.programa || '')) || !!b.participacion_id || !!b.participacion;
      const esDonacion = /^donaci[oó]n$/i.test(String(b.tipo || ''));
      const clave = esDonacion ? String(b.slug || b.edicion || b.e || '').slice(0, 80)
        : String(b.inscripcion_id || b.inscripcion || b.id || b.codigo || b.slug || b.edicion || b.e || '').slice(0, 80);
      const p = await rpc('tribbi_cobro_preparar', { p_user: user.id, p_tipo: esBookpal ? 'bookpal' : esDonacion ? 'donacion' : 'intercambio', p_clave: clave || null });
      if (!p || p.ok === false) return json(res, 409, { ok: false, mensaje: (p && p.mensaje) || 'No se pudo preparar el pago.' });
      const centavos = Math.round(Number(p.monto_q) * 100);
      if (!(centavos >= 500)) return json(res, 409, { ok: false, mensaje: p.tipo === 'donacion' ? 'Este intercambio no tiene monto de donación.' : 'El envío de este intercambio no tiene costo: no hay nada que pagar.' });

      const rc = await fetch(RECURRENTE + '/checkouts', {
        method: 'POST',
        headers: cabecerasRecurrente(),
        body: JSON.stringify({
          items: [{ name: String(p.nombre || 'Envío Tribbi').slice(0, 120), amount_in_cents: centavos, currency: 'GTQ', quantity: 1 }],
          success_url: ORIGEN + '/api/tribbi-pago?accion=volver&r=' + p.ref_id + '&t=' + encodeURIComponent(p.tipo),
          cancel_url: paginaDe(p.tipo, p.slug, 'cancelado'),
          metadata: 'tribbi:' + p.tipo + ':' + p.ref_id
        })
      });
      const ch = await rc.json().catch(() => null);
      if (!rc.ok || !ch || !ch.id || !ch.checkout_url) {
        console.error('Recurrente crear checkout', rc.status, JSON.stringify(ch).slice(0, 300));
        return json(res, 502, { ok: false, mensaje: 'No se pudo abrir el pago. Intenta de nuevo en un momento.' });
      }
      await rpc('tribbi_cobro_guardar', { p_checkout: ch.id, p_tipo: p.tipo, p_ref: p.ref_id, p_user: user.id, p_monto: p.monto_q, p_slug: p.slug || null });
      return json(res, 200, { ok: true, url: ch.checkout_url });
    }

    return json(res, 200, { ok: true, servicio: 'tribbi-pago', version: VERSION,
      recurrente: !!SK(), webhook_firma: !!WHSEC(), supabase: !!SERVICE(), correos_wix: !!WIX() });
  } catch (e) {
    console.error('tribbi-pago', accion, e && e.message);
    if (req.method === 'GET' && accion === 'volver') { res.writeHead(302, { Location: ORIGEN + '/tribbi/' }); return res.end(); }
    // Aviso del sorteo: solo llega aquí quien ya pasó la revisión de administración, así que se le muestra el motivo para poder arreglarlo
    if (accion === 'aviso_sorteo') {
      const m = String((e && e.message) || '');
      const falta = /404|PGRST202|Could not find the function/i.test(m) ? ' Falta correr 20_aviso_sorteo.sql (y antes 16_donaciones.sql) en Supabase.' : '';
      return json(res, 500, { ok: false, mensaje: 'No se pudo mandar el aviso.' + falta + ' Detalle: ' + m.slice(0, 220) });
    }
    return json(res, 500, { ok: false, mensaje: 'Algo salió mal con el pago. Intenta de nuevo.' });
  }
}

// /api/tribbi-pago.js — cobro del envío de Tribbi (intercambios con envío y BookPal) con Recurrente.
//
// POST /api/tribbi-pago                      → abre el cobro en Recurrente y devuelve { url } para mandar a pagar.
// GET  /api/tribbi-pago?accion=volver&r=...  → a donde regresa Recurrente después de pagar: confirma y regresa a la página.
// POST /api/tribbi-pago?accion=webhook       → aviso de Recurrente (por si la persona cerró la página antes de regresar).
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

import crypto from 'crypto';

export const config = { api: { bodyParser: false } };   // el webhook necesita el cuerpo tal cual llega para revisar la firma

const VERSION = '2026-11-24-a';
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
  return base + 'pago=' + estado;
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
      const cobros = await rpc('tribbi_cobros_de_ref', { p_ref: ref });
      let tipo = 'intercambio', slug = '', estado = 'pendiente';
      for (const c of (Array.isArray(cobros) ? cobros : [])) {
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

    // 3. Abrir un cobro nuevo
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
      const clave = String(b.inscripcion_id || b.inscripcion || b.id || b.codigo || b.slug || b.edicion || b.e || '').slice(0, 80);
      const p = await rpc('tribbi_cobro_preparar', { p_user: user.id, p_tipo: esBookpal ? 'bookpal' : 'intercambio', p_clave: clave || null });
      if (!p || p.ok === false) return json(res, 409, { ok: false, mensaje: (p && p.mensaje) || 'No se pudo preparar el pago.' });
      const centavos = Math.round(Number(p.monto_q) * 100);
      if (!(centavos >= 500)) return json(res, 409, { ok: false, mensaje: 'El envío de este intercambio no tiene costo: no hay nada que pagar.' });

      const rc = await fetch(RECURRENTE + '/checkouts', {
        method: 'POST',
        headers: cabecerasRecurrente(),
        body: JSON.stringify({
          items: [{ name: String(p.nombre || 'Envío Tribbi').slice(0, 120), amount_in_cents: centavos, currency: 'GTQ', quantity: 1 }],
          success_url: ORIGEN + '/api/tribbi-pago?accion=volver&r=' + p.ref_id,
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
      recurrente: !!SK(), webhook_firma: !!WHSEC(), supabase: !!SERVICE() });
  } catch (e) {
    console.error('tribbi-pago', accion, e && e.message);
    if (req.method === 'GET' && accion === 'volver') { res.writeHead(302, { Location: ORIGEN + '/tribbi/' }); return res.end(); }
    return json(res, 500, { ok: false, mensaje: 'Algo salió mal con el pago. Intenta de nuevo.' });
  }
}

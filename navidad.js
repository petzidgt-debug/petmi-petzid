// ══════════════════════════════════════════════════════════════════════════════
// Convivio Familiar Moralitos — intercambio de regalos (amigo secreto)
// Una sola función de Vercel: /api/navidad?action=…  (la página es navidad.html)
//
// REGLAS QUE ESTE ARCHIVO NO PUEDE ROMPER
//  1. Ninguna clave vive en el código. Todo sale de variables de Vercel (ver faltantes()).
//  2. Solo el servidor conoce quién le toca a quién. En la base de datos cada asignación se guarda CIFRADA
//     (AES-256-GCM, con una clave que solo existe en Vercel): quien lea la tabla, o tenga la llave de Supabase, no ve nada.
//  3. Ninguna respuesta incluye el amigo secreto de alguien, salvo "yo" y "raspar", y solo para la persona que inició sesión
//     y solo cuando su tarjeta ya tiene fecha de raspado.
//  4. Cada ruta con sesión verifica la cookie firmada en el servidor. Las ideas solo se crean o borran para el id de la cookie.
// ══════════════════════════════════════════════════════════════════════════════
'use strict';
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ilcreewilnkchvozicyp.supabase.co';   // la dirección del proyecto no es un secreto
const COOKIE_P = 'navidad_p', COOKIE_A = 'navidad_a', SESION_SEG = 12 * 3600;                  // las sesiones duran 12 horas
const MAX_PERSONAS = 60, MAX_GRUPOS = 12, MAX_IDEAS = 20, MAX_TEXTO_IDEA = 120, MAX_NOMBRE = 40;
const ALFABETO_ID = 'abcdefghjkmnpqrstuvwxyz23456789';
const MSG_BLOQUEO = 'Demasiados intentos. Espera un minuto y vuelve a probar.';

// ── Variables de Vercel ─────────────────────────────────────────────────────
function variables() {
  return { sbKey: process.env.SUPABASE_SERVICE_KEY || '', adminPw: process.env.NAVIDAD_ADMIN_PASSWORD || '', sess: process.env.NAVIDAD_SESSION_SECRET || '', asig: process.env.NAVIDAD_ASSIGN_KEY || '' };
}
function faltantes() {
  const v = variables(), f = [];
  if (!v.sbKey) f.push('SUPABASE_SERVICE_KEY');
  if (v.adminPw.length < 10 || v.adminPw.toLowerCase() === 'moralitos') f.push('NAVIDAD_ADMIN_PASSWORD');    // mínimo 10 caracteres y distinta de la del prototipo
  if (v.sess.length < 32) f.push('NAVIDAD_SESSION_SECRET');
  if (!/^[0-9a-fA-F]{64}$/.test(v.asig)) f.push('NAVIDAD_ASSIGN_KEY');
  return f;
}

// ── Utilidades ──────────────────────────────────────────────────────────────
const b64u = b => Buffer.from(b).toString('base64url');
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const iguales = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));          // comparación en tiempo constante
const idValido = id => typeof id === 'string' && /^[a-z0-9]{10}$/.test(id);
const nuevoId = () => Array.from({ length: 10 }, () => ALFABETO_ID[crypto.randomInt(ALFABETO_ID.length)]).join('');
const ahora = () => new Date().toISOString();

// Clave de cada persona: su primer nombre al revés, sin tildes, en minúsculas y solo letras. Jose acepta "esoj", "ESOJ" o "Esoj".
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const claveEsperada = nombre => norm(String(nombre || '').trim().split(/\s+/)[0]).split('').reverse().join('');

// ── Cifrado de las asignaciones (la clave NAVIDAD_ASSIGN_KEY solo vive en Vercel) ──
// El id de quien regala viaja como dato autenticado: un valor cifrado no se puede mover a otra fila sin que falle al descifrar.
function cifrar(receptorId, giverId) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', Buffer.from(variables().asig, 'hex'), iv);
  c.setAAD(Buffer.from('navidad|' + giverId));
  const enc = Buffer.concat([c.update(receptorId, 'utf8'), c.final()]);
  return 'v1.' + [iv, c.getAuthTag(), enc].map(b64u).join('.');
}
function descifrar(valor, giverId) {
  const p = String(valor || '').split('.'); if (p[0] !== 'v1' || p.length !== 4) throw new Error('asignación con formato inválido');
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(variables().asig, 'hex'), Buffer.from(p[1], 'base64url'));
  d.setAAD(Buffer.from('navidad|' + giverId)); d.setAuthTag(Buffer.from(p[2], 'base64url'));
  return Buffer.concat([d.update(Buffer.from(p[3], 'base64url')), d.final()]).toString('utf8');
}

// ── Sesiones: cookies httpOnly firmadas con NAVIDAD_SESSION_SECRET ───────────
function firmar(payload) {
  const cuerpo = b64u(JSON.stringify(payload));
  return cuerpo + '.' + crypto.createHmac('sha256', variables().sess).update('navidad|' + cuerpo).digest('base64url');
}
function leerToken(token) {
  try {
    const partes = String(token || '').split('.'); if (partes.length !== 2) return null;
    const esperada = crypto.createHmac('sha256', variables().sess).update('navidad|' + partes[0]).digest('base64url');
    const a = Buffer.from(partes[1]), b = Buffer.from(esperada); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const p = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
    return (p && p.exp > Math.floor(Date.now() / 1000)) ? p : null;
  } catch (e) { return null; }
}
function leerCookies(req) {
  const out = {}; String((req.headers && req.headers.cookie) || '').split(';').forEach(par => { const i = par.indexOf('='); if (i > 0) out[par.slice(0, i).trim()] = par.slice(i + 1).trim(); });
  return out;
}
const sesionParticipante = req => { const p = leerToken(leerCookies(req)[COOKIE_P]); return p && p.r === 'p' && idValido(p.id) ? p.id : null; };
const sesionAdmin = req => { const p = leerToken(leerCookies(req)[COOKIE_A]); return !!(p && p.r === 'admin'); };
const cookie = (nombre, valor, seg) => `${nombre}=${valor}; Max-Age=${seg}; Path=/; HttpOnly; Secure; SameSite=Lax`;
const exp = () => Math.floor(Date.now() / 1000) + SESION_SEG;

function huellaIp(req) {
  const ip = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'sin-ip';
  return crypto.createHash('sha256').update('navidad-ip|' + ip).digest('hex').slice(0, 16);   // no se guarda la IP, solo una huella
}

// ── Base de datos (Supabase por REST, solo con la llave de servicio de Vercel) ──
async function db(ruta, o = {}) {
  const v = variables();
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + ruta, {
    method: o.method || 'GET',
    headers: Object.assign({ apikey: v.sbKey, Authorization: 'Bearer ' + v.sbKey, 'Content-Type': 'application/json' }, o.prefer ? { Prefer: o.prefer } : {}),
    body: o.body === undefined ? undefined : JSON.stringify(o.body)
  });
  const txt = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ' ' + ruta.split('?')[0] + ' ' + String(txt).slice(0, 120));
  return txt ? JSON.parse(txt) : null;
}
const T = { g: 'navidad_grupos', p: 'navidad_participantes', i: 'navidad_ideas', n: 'navidad_intentos' };

// ── Límite de intentos (se guarda en la base: en Vercel la memoria no se comparte entre llamadas) ──
async function estaBloqueado(clave) {
  const f = (await db(`${T.n}?clave=eq.${encodeURIComponent(clave)}&select=fallos,bloqueado_hasta`))[0];
  return !!(f && f.bloqueado_hasta && Date.parse(f.bloqueado_hasta) > Date.now());
}
async function registrarFallo(clave, maxFallos, minutos) {
  const f = (await db(`${T.n}?clave=eq.${encodeURIComponent(clave)}&select=fallos`))[0], n = ((f && f.fallos) || 0) + 1;
  const fila = n >= maxFallos ? { clave, fallos: 0, bloqueado_hasta: new Date(Date.now() + minutos * 60000).toISOString() } : { clave, fallos: n, bloqueado_hasta: null };
  await db(`${T.n}?on_conflict=clave`, { method: 'POST', body: [fila], prefer: 'resolution=merge-duplicates,return=minimal' });
}
const limpiarIntentos = clave => db(`${T.n}?clave=eq.${encodeURIComponent(clave)}`, { method: 'DELETE', prefer: 'return=minimal' });

// ── Lógica del sorteo (funciones puras, probadas aparte) ────────────────────
function mezclar(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
// ¿Se puede sortear? personas: [{id, nombre, grupo}]
function problemaDeSorteo(personas) {
  const n = personas.length; if (n < 2) return 'Agrega al menos dos personas.';
  const tam = {}; personas.forEach(p => { tam[p.grupo] = (tam[p.grupo] || 0) + 1; });
  const tamanos = Object.keys(tam).map(k => tam[k]);
  if (tamanos.length < 2) return 'Se necesitan al menos dos grupos con personas.';
  if (Math.max.apply(null, tamanos) > n - Math.max.apply(null, tamanos)) return 'Un grupo tiene más de la mitad de las personas, así que no se puede sortear sin que se toquen entre ellos.';
  return null;
}
// Mezcla y asigna a cada persona la que quedó en su misma posición; si alguien cae en su grupo, se descarta y se repite.
// Todas las combinaciones válidas tienen la misma probabilidad. Como respaldo, búsqueda con retroceso. Devuelve {giverId: receptorId} o null.
function sortear(personas) {
  for (let intento = 0; intento < 50000; intento++) {
    const m = mezclar(personas);
    if (personas.every((p, i) => m[i].grupo !== p.grupo)) { const r = {}; personas.forEach((p, i) => { r[p.id] = m[i].id; }); return r; }
  }
  const usados = new Set(), r = {}, dadores = mezclar(personas);
  const bt = i => {
    if (i === dadores.length) return true;
    const g = dadores[i];
    for (const c of mezclar(personas.filter(x => !usados.has(x.id) && x.grupo !== g.grupo))) { usados.add(c.id); r[g.id] = c.id; if (bt(i + 1)) return true; usados.delete(c.id); }
    return false;
  };
  return bt(0) ? r : null;
}
// Cambiar el amigo secreto de X (alguien hizo trampa): se intercambia con otra persona Y que todavía no haya raspado.
// personas: [{id, grupo, raspada}], mapa: {giverId: receptorId}. Devuelve {mapa, y} o null si no hay con quién.
function reasignar(personas, mapa, xId) {
  const por = {}; personas.forEach(p => { por[p.id] = p; });
  const x = por[xId], rx = por[mapa[xId]]; if (!x || !rx) return null;
  const candidatos = personas.filter(y => {
    if (y.id === xId || y.raspada || !mapa[y.id]) return false;
    const ry = por[mapa[y.id]]; if (!ry) return false;
    return ry.id !== xId && ry.grupo !== x.grupo && rx.id !== y.id && rx.grupo !== y.grupo;
  });
  if (!candidatos.length) return null;
  const y = candidatos[crypto.randomInt(candidatos.length)];
  const nuevo = Object.assign({}, mapa); nuevo[xId] = mapa[y.id]; nuevo[y.id] = mapa[xId];
  return { mapa: nuevo, y: y.id };
}

// ── Respuestas ──────────────────────────────────────────────────────────────
function responder(res, estado, cuerpo, cookies) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');       // nada de esto debe quedar guardado en caché
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (cookies && cookies.length) res.setHeader('Set-Cookie', cookies);
  res.status(estado).json(cuerpo);
}
const leerCuerpo = req => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } } return (b && typeof b === 'object') ? b : {}; };
const textoLimpio = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// ── Datos de apoyo ──────────────────────────────────────────────────────────
async function ideasDe(id) { return (await db(`${T.i}?participante_id=eq.${id}&select=id,texto&order=creada_en.asc,id.asc`)).map(x => ({ id: x.id, texto: x.texto })); }
async function datosAmigo(p) {       // solo se llama cuando la tarjeta ya tiene fecha de raspado
  const rid = descifrar(p.receptor_cifrado, p.id);
  const r = (await db(`${T.p}?id=eq.${rid}&select=id,nombre`))[0]; if (!r) return null;
  return { nombre: r.nombre, ideas: (await ideasDe(r.id)).map(x => ({ texto: x.texto })) };
}
async function estadoAdmin() {
  const [grupos, personas, con] = await Promise.all([
    db(`${T.g}?select=id,nombre,orden&order=orden.asc,id.asc`),
    db(`${T.p}?select=id,nombre,grupo_id,orden,raspada_en&order=orden.asc,id.asc`),      // OJO: nunca se pide la columna del amigo secreto
    db(`${T.p}?receptor_cifrado=not.is.null&select=id&limit=1`)
  ]);
  return { sorteo_hecho: con.length > 0, grupos, personas };
}

// ── Rutas ────────────────────────────────────────────────────────────────────
const RUTAS = {
  async diagnostico() {   // solo verdadero/falso, para saber qué falta configurar. No muestra ningún valor.
    const f = faltantes(); let tablas = false;
    if (!f.includes('SUPABASE_SERVICE_KEY')) { try { await db(`${T.g}?select=id&limit=1`); tablas = true; } catch (e) { tablas = false; } }
    return [200, { listo: f.length === 0 && tablas, tablas, variables: { SUPABASE_SERVICE_KEY: !f.includes('SUPABASE_SERVICE_KEY'), NAVIDAD_ADMIN_PASSWORD: !f.includes('NAVIDAD_ADMIN_PASSWORD'), NAVIDAD_SESSION_SECRET: !f.includes('NAVIDAD_SESSION_SECRET'), NAVIDAD_ASSIGN_KEY: !f.includes('NAVIDAD_ASSIGN_KEY') } }];
  },

  // ── Públicas ──
  async participantes() {
    const [grupos, personas, con] = await Promise.all([
      db(`${T.g}?select=id,orden&order=orden.asc,id.asc`),
      db(`${T.p}?select=id,nombre,grupo_id,orden,raspada_en&order=orden.asc,id.asc`),
      db(`${T.p}?receptor_cifrado=not.is.null&select=id&limit=1`)
    ]);
    const idx = {}; grupos.forEach((g, i) => { idx[g.id] = i; });
    const lista = personas.slice().sort((a, b) => (idx[a.grupo_id] - idx[b.grupo_id]) || (a.orden - b.orden))
      .map(p => ({ id: p.id, nombre: p.nombre, grupo: idx[p.grupo_id], raspada_en: p.raspada_en || null }));
    return [200, { sorteo_hecho: con.length > 0, participantes: lista }];
  },
  async entrar(req) {
    const b = leerCuerpo(req), id = b.id, clave = b.clave;
    const k = 'p:' + (idValido(id) ? id : 'invalido') + ':' + huellaIp(req);
    if (await estaBloqueado(k)) return [429, { error: MSG_BLOQUEO }];
    const p = idValido(id) ? (await db(`${T.p}?id=eq.${id}&select=id,nombre`))[0] : null;
    const esperada = p ? claveEsperada(p.nombre) : '\u0000sin-persona';
    const bien = !!p && typeof clave === 'string' && clave.length <= 60 && esperada.length > 0 && iguales(norm(clave), esperada);
    if (!bien) { await registrarFallo(k, 5, 1); return [401, { error: 'Esa no es la clave.' }]; }       // mismo mensaje exista o no la persona
    await limpiarIntentos(k);
    return [200, { ok: true }, [cookie(COOKIE_P, firmar({ r: 'p', id: p.id, exp: exp() }), SESION_SEG)]];
  },
  async salir() {
    return [200, { ok: true }, [cookie(COOKIE_P, '', 0), cookie(COOKIE_A, '', 0)]];
  },

  // ── Participante (con sesión) ──
  async yo(req) {
    const id = sesionParticipante(req); if (!id) return [401, { error: 'Entra con tu clave primero.' }];
    const p = (await db(`${T.p}?id=eq.${id}&select=id,nombre,raspada_en,receptor_cifrado`))[0]; if (!p) return [401, { error: 'Entra con tu clave primero.' }];
    const cuerpo = { id: p.id, nombre: p.nombre, sorteo_hecho: !!p.receptor_cifrado, raspada_en: p.raspada_en || null, mis_ideas: await ideasDe(p.id), amigo: null };
    if (p.raspada_en && p.receptor_cifrado) cuerpo.amigo = await datosAmigo(p);                  // SOLO si ya raspó
    return [200, cuerpo];
  },
  async raspar(req) {
    const id = sesionParticipante(req); if (!id) return [401, { error: 'Entra con tu clave primero.' }];
    let p = (await db(`${T.p}?id=eq.${id}&select=id,nombre,raspada_en,receptor_cifrado`))[0]; if (!p) return [401, { error: 'Entra con tu clave primero.' }];
    if (!p.receptor_cifrado) return [409, { error: 'El sorteo todavía no se ha hecho.' }];
    const amigo = await datosAmigo(p);   // primero se comprueba que se puede leer: si algo falla, la tarjeta NO queda marcada como raspada
    if (!p.raspada_en) {          // solo marca si estaba vacío: la primera fecha es la que cuenta
      await db(`${T.p}?id=eq.${id}&raspada_en=is.null`, { method: 'PATCH', body: { raspada_en: ahora() }, prefer: 'return=minimal' });
      p = (await db(`${T.p}?id=eq.${id}&select=id,nombre,raspada_en,receptor_cifrado`))[0];
    }
    return [200, { raspada_en: p.raspada_en, amigo }];
  },
  async ideas(req) {
    const id = sesionParticipante(req); if (!id) return [401, { error: 'Entra con tu clave primero.' }];
    if (req.method === 'POST') {
      const texto = textoLimpio(leerCuerpo(req).texto, 400);
      if (!texto) return [400, { error: 'Escribe la idea.' }];
      if (texto.length > MAX_TEXTO_IDEA) return [400, { error: `Máximo ${MAX_TEXTO_IDEA} caracteres.` }];
      if ((await ideasDe(id)).length >= MAX_IDEAS) return [400, { error: `Máximo ${MAX_IDEAS} ideas.` }];
      await db(T.i, { method: 'POST', body: [{ participante_id: id, texto }], prefer: 'return=minimal' });   // siempre para el id de la cookie
    } else {
      const ideaId = String((req.query && req.query.id) || ''); if (!/^\d{1,9}$/.test(ideaId)) return [400, { error: 'Idea no válida.' }];
      await db(`${T.i}?id=eq.${ideaId}&participante_id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });   // solo si es suya
    }
    return [200, { ideas: await ideasDe(id) }];
  },

  // ── Organizadora ──
  async admin_entrar(req) {
    const k = 'admin:' + huellaIp(req);
    if (await estaBloqueado(k)) return [429, { error: 'Demasiados intentos. Espera 15 minutos y vuelve a probar.' }];
    const clave = leerCuerpo(req).clave;
    if (typeof clave !== 'string' || clave.length > 200 || !iguales(clave, variables().adminPw)) { await registrarFallo(k, 5, 15); return [401, { error: 'Clave incorrecta.' }]; }
    await limpiarIntentos(k);
    return [200, { ok: true }, [cookie(COOKIE_A, firmar({ r: 'admin', exp: exp() }), SESION_SEG)]];
  },
  async admin_estado(req) {
    if (!sesionAdmin(req)) return [401, { error: 'No autorizada.' }];
    return [200, await estadoAdmin()];
  },
  async admin_sortear(req) {
    if (!sesionAdmin(req)) return [401, { error: 'No autorizada.' }];
    const filas = await db(`${T.p}?select=id,nombre,grupo_id,orden&order=orden.asc,id.asc`);
    const personas = filas.filter(p => String(p.nombre || '').trim()).map(p => ({ id: p.id, nombre: p.nombre, grupo: p.grupo_id }));
    const problema = problemaDeSorteo(personas); if (problema) return [409, { error: problema }];
    const mapa = sortear(personas); if (!mapa) return [409, { error: 'No se encontró una combinación válida. Revisa los grupos.' }];
    // Una sola instrucción: o se guardan todas las asignaciones o ninguna. Rehacer el sorteo borra todas las marcas de raspado; las ideas se conservan.
    await db(`${T.p}?on_conflict=id`, { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: personas.map(p => { const f = filas.find(x => x.id === p.id); return { id: p.id, grupo_id: f.grupo_id, nombre: f.nombre, orden: f.orden, receptor_cifrado: cifrar(mapa[p.id], p.id), raspada_en: null }; }) });
    return [200, { ok: true, personas: personas.length }];
  },
  async admin_reasignar(req) {
    if (!sesionAdmin(req)) return [401, { error: 'No autorizada.' }];
    const xId = leerCuerpo(req).id; if (!idValido(xId)) return [400, { error: 'Persona no válida.' }];
    const filas = await db(`${T.p}?select=id,nombre,grupo_id,orden,raspada_en,receptor_cifrado`);
    if (!filas.some(f => f.id === xId) || !filas.some(f => f.receptor_cifrado)) return [409, { ok: false, motivo: 'El sorteo todavía no se ha hecho.' }];
    const mapa = {}; filas.forEach(f => { if (f.receptor_cifrado) mapa[f.id] = descifrar(f.receptor_cifrado, f.id); });
    const r = reasignar(filas.map(f => ({ id: f.id, grupo: f.grupo_id, raspada: !!f.raspada_en })), mapa, xId);
    if (!r) return [200, { ok: false, motivo: 'No hay con quién intercambiar sin afectar a alguien que ya raspó. La única opción es volver a sortear a todos.' }];
    const cambiar = [xId, r.y].map(id => { const f = filas.find(x => x.id === id); return { id, grupo_id: f.grupo_id, nombre: f.nombre, orden: f.orden, receptor_cifrado: cifrar(r.mapa[id], id), raspada_en: id === xId ? null : f.raspada_en }; });
    await db(`${T.p}?on_conflict=id`, { method: 'POST', body: cambiar, prefer: 'resolution=merge-duplicates,return=minimal' });
    return [200, { ok: true }];       // jamás se dice con quién se intercambió
  },
  async admin_grupos(req) {
    if (!sesionAdmin(req)) return [401, { error: 'No autorizada.' }];
    const b = leerCuerpo(req), grupos = Array.isArray(b.grupos) ? b.grupos : null, personas = Array.isArray(b.personas) ? b.personas : null;
    if (!grupos || !personas) return [400, { error: 'Datos no válidos.' }];
    if (grupos.length > MAX_GRUPOS || personas.length > MAX_PERSONAS) return [400, { error: 'Demasiados grupos o personas.' }];
    const gClean = grupos.map(g => ({ ref: String(g && g.id), nombre: textoLimpio(g && g.nombre, MAX_NOMBRE) }));
    const pClean = personas.map(p => ({ id: (p && p.id) ? String(p.id) : null, nombre: textoLimpio(p && p.nombre, MAX_NOMBRE), grupo: String(p && p.grupo) }));
    if (gClean.some(g => !g.nombre) || pClean.some(p => !p.nombre)) return [400, { error: 'Todos los nombres deben tener texto.' }];
    if (new Set(gClean.map(g => g.ref)).size !== gClean.length || pClean.some(p => !gClean.some(g => g.ref === p.grupo))) return [400, { error: 'Datos no válidos.' }];
    if (pClean.some(p => p.id && !idValido(p.id)) || new Set(pClean.filter(p => p.id).map(p => p.id)).size !== pClean.filter(p => p.id).length) return [400, { error: 'Datos no válidos.' }];

    const actual = await estadoAdmin(), gIds = new Set(actual.grupos.map(g => String(g.id))), pActual = {}; actual.personas.forEach(p => { pActual[p.id] = p; });
    if (actual.sorteo_hecho) {   // después del sorteo solo se corrigen nombres: agregar, quitar o mover gente exige volver a sortear
      const mismoGrupos = gClean.length === gIds.size && gClean.every(g => gIds.has(g.ref));
      const mismaGente = pClean.length === actual.personas.length && pClean.every(p => p.id && pActual[p.id] && String(pActual[p.id].grupo_id) === p.grupo);
      if (!mismoGrupos || !mismaGente) return [409, { error: 'El sorteo ya está hecho: solo puedes corregir nombres. Para agregar o quitar personas hay que volver a sortear.' }];
    }
    // 1) quitar a quien ya no está (sus ideas se borran con ellos)
    const quedan = new Set(pClean.filter(p => p.id).map(p => p.id));
    for (const p of actual.personas) if (!quedan.has(p.id)) await db(`${T.p}?id=eq.${p.id}`, { method: 'DELETE', prefer: 'return=minimal' });
    // 2) grupos: los existentes se renombran y se reordenan; los nuevos se crean
    const real = {};
    for (let i = 0; i < gClean.length; i++) {
      const g = gClean[i];
      if (gIds.has(g.ref)) { await db(`${T.g}?id=eq.${g.ref}`, { method: 'PATCH', body: { nombre: g.nombre, orden: i + 1 }, prefer: 'return=minimal' }); real[g.ref] = Number(g.ref); }
      else { const nuevo = await db(T.g, { method: 'POST', body: [{ nombre: g.nombre, orden: i + 1 }], prefer: 'return=representation' }); real[g.ref] = nuevo[0].id; }
    }
    // 3) personas: las existentes se actualizan (sin tocar su asignación ni su raspado) y las nuevas se crean con id aleatorio
    const contador = {};
    for (const p of pClean) {
      const gid = real[p.grupo]; contador[gid] = (contador[gid] || 0) + 1;
      if (p.id && pActual[p.id]) await db(`${T.p}?id=eq.${p.id}`, { method: 'PATCH', body: { nombre: p.nombre, grupo_id: gid, orden: contador[gid] }, prefer: 'return=minimal' });
      else { let id; do { id = nuevoId(); } while (pActual[id]); await db(T.p, { method: 'POST', body: [{ id, grupo_id: gid, nombre: p.nombre, orden: contador[gid] }], prefer: 'return=minimal' }); }
    }
    // 4) quitar los grupos que ya no están
    for (const g of actual.grupos) if (!gClean.some(x => x.ref === String(g.id))) await db(`${T.g}?id=eq.${g.id}`, { method: 'DELETE', prefer: 'return=minimal' });
    return [200, await estadoAdmin()];
  }
};

const METODOS = { diagnostico: ['GET'], participantes: ['GET'], entrar: ['POST'], salir: ['POST'], yo: ['GET'], raspar: ['POST'], ideas: ['POST', 'DELETE'],
  admin_entrar: ['POST'], admin_estado: ['GET'], admin_sortear: ['POST'], admin_reasignar: ['POST'], admin_grupos: ['PUT'] };

async function handler(req, res) {
  const accion = String((req.query && req.query.action) || '');
  try {
    if (!Object.prototype.hasOwnProperty.call(RUTAS, accion)) return responder(res, 404, { error: 'No existe.' });
    if (METODOS[accion].indexOf(req.method) < 0) { res.setHeader('Allow', METODOS[accion].join(', ')); return responder(res, 405, { error: 'Método no permitido.' }); }
    if (accion !== 'diagnostico' && accion !== 'salir' && faltantes().length) {
      console.error('[navidad] faltan variables de Vercel:', faltantes().join(', '));
      return responder(res, 503, { error: 'El sorteo todavía no está listo.' });          // al público no se le dice qué falta; la organizadora lo ve en el diagnóstico
    }
    const [estado, cuerpo, cookies] = await RUTAS[accion](req);
    return responder(res, estado, cuerpo, cookies);
  } catch (e) {
    console.error('[navidad]', accion, e && e.message);
    return responder(res, 500, { error: 'Algo salió mal. Intenta de nuevo.' });         // nunca se devuelve el detalle del error
  }
}

module.exports = handler;
module.exports._t = { norm, claveEsperada, cifrar, descifrar, firmar, leerToken, problemaDeSorteo, sortear, reasignar, faltantes, idValido, textoLimpio };

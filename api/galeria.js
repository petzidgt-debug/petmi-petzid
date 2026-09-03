const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwNTc1MiwiZXhwIjoyMDkzNTgxNzUyfQ.heD60j_eM5MBjIhoZotR7G5nzQZu7kYv9aVvypbfE8A';

// ── Web Push (notificaciones) ───────────────────────────────
const webpush = require('web-push');
const dns = require('dns').promises;
webpush.setVapidDetails(
  'mailto:info@revistapetmi.com',
  'BETkQ-teJGtPmnLMFc0OC6HqFvhFoMZySxoywrKincHOJIoixLxuDUSD5RelsWYQiq32p2wuRgn9StrCOcYhD8U',
  'QR9-huYL22s0wrUpc6Ou_kCAW86LfCOYqXZJY5bzx40'
);

// Manda un push a todas las suscripciones guardadas de un uid.
// Si una suscripción ya no es válida (410/404 — el usuario desinstaló
// o revocó permiso), se borra sola de la tabla.
async function _enviarPush(uidMascota, payload) {
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/push_subscriptions?uid_mascota=eq.' + encodeURIComponent(uidMascota) + '&select=id,endpoint,p256dh,auth',
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
    );
    const subs = await r.json();
    if (!Array.isArray(subs) || !subs.length) return;

    await Promise.all(subs.map(async (s) => {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Suscripción muerta — borrarla
          await fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?id=eq.' + s.id, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
          }).catch(() => {});
        } else {
          console.error('Push error uid ' + uidMascota + ':', err.message);
        }
      }
    }));
  } catch (e) {
    console.error('_enviarPush error:', e.message);
  }
}

// Elige 2 ganadores al azar entre quienes participaron en la quiniela,
// la primera vez que se llama — y guarda la elección en la tabla
// "config" para que sea consistente para todos los que pregunten después.
// Usa on_conflict=clave con ignore-duplicates: si 2 peticiones llegan
// casi al mismo tiempo, solo una "gana" el insert, y ambas terminan
// leyendo el mismo resultado final guardado (sin condición de carrera).
async function _obtenerOElegirGanadoresSorteo() {
  const rConf = await fetch(
    SUPABASE_URL + '/rest/v1/config?clave=eq.sorteo_ganadores&select=valor',
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
  );
  const confRows = await rConf.json();
  if (Array.isArray(confRows) && confRows.length && confRows[0].valor) {
    return confRows[0].valor.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  }

  // Calcular el Top 3 (mismo criterio que wc_ranking: puntos, luego aciertos)
  // para excluirlo del sorteo — quien ya va ganando por su desempeño no
  // debe llevarse también el premio sorpresa.
  let top3Emails = [];
  try {
    const PAGE = 1000;
    let allPreds = [], offset = 0, keepGoing = true;
    while (keepGoing) {
      const rP = await fetch(
        SUPABASE_URL + '/rest/v1/wc_predicciones?select=email,puntos,acerto&acerto=not.is.null&limit=' + PAGE + '&offset=' + offset,
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const page = await rP.json();
      if (!Array.isArray(page) || page.length === 0) { keepGoing = false; break; }
      allPreds = allPreds.concat(page);
      if (page.length < PAGE) keepGoing = false;
      offset += PAGE;
    }
    const byEmail = {};
    allPreds.forEach(p => {
      const em = (p.email || '').toLowerCase();
      if (!em) return;
      if (!byEmail[em]) byEmail[em] = { email: em, puntos: 0, aciertos: 0 };
      byEmail[em].puntos += (p.puntos || 0);
      byEmail[em].aciertos += (p.acerto ? 1 : 0);
    });
    top3Emails = Object.values(byEmail)
      .sort((a, b) => b.puntos - a.puntos || b.aciertos - a.aciertos)
      .slice(0, 3)
      .map(x => x.email);
  } catch (e) { /* si falla, simplemente no se excluye a nadie */ }

  const rEmails = await fetch(
    SUPABASE_URL + '/rest/v1/wc_predicciones?select=email',
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
  );
  const emailRows = await rEmails.json();
  const unicos = [...new Set((Array.isArray(emailRows) ? emailRows : []).map(r => (r.email || '').toLowerCase()).filter(Boolean))]
    .filter(e => !top3Emails.includes(e));
  if (unicos.length < 2) return [];

  for (let i = unicos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unicos[i], unicos[j]] = [unicos[j], unicos[i]];
  }
  const elegidos = unicos.slice(0, 2);

  await fetch(SUPABASE_URL + '/rest/v1/config?on_conflict=clave', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
      'Prefer': 'resolution=ignore-duplicates,return=minimal'
    },
    body: JSON.stringify({ clave: 'sorteo_ganadores', valor: elegidos.join(',') })
  }).catch(() => {});

  const rFinal = await fetch(
    SUPABASE_URL + '/rest/v1/config?clave=eq.sorteo_ganadores&select=valor',
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
  );
  const finalRows = await rFinal.json();
  if (Array.isArray(finalRows) && finalRows.length && finalRows[0].valor) {
    return finalRows[0].valor.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  }
  return elegidos;
}

// ── Envío del código OTP — vive en un solo lugar (Resend) ──────
// Usado tanto por el login "No recuerdo el nombre" como por la
// verificación de voto sin cuenta del concurso. Antes mandaba el correo
// via Apps Script/Gmail — se cambió a Resend (1 sep) porque Gmail estaba
// bloqueando/retrasando la entrega de correos de "código de verificación"
// por reputación del remitente, sin importar la cuota disponible.
//
// IMPORTANTE: mientras el dominio revistapetmi.com no esté verificado en
// Resend, esto SOLO puede mandar correos a la cuenta con la que te
// registraste en Resend (limitación de su modo de prueba) — no va a
// funcionar todavía para votantes/usuarios reales. En cuanto el dominio
// quede "Verified" en el panel de Resend, esto empieza a funcionar para
// cualquiera sin tocar nada más de este archivo.
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = 'PetMi <onboarding@resend.dev>'; // cambiar a noreply@revistapetmi.com en cuanto el dominio esté verificado

async function _enviarCodigoOTPPorCorreo(email, code, dueno, etiquetaLog) {
  if (!RESEND_API_KEY) {
    console.error((etiquetaLog || 'enviarOTP') + ' -> falta la variable de entorno RESEND_API_KEY en Vercel (Settings → Environment Variables).');
    return { ok: false, error: 'El servicio de correo no está configurado (falta RESEND_API_KEY en Vercel).' };
  }
  const saludo = dueno ? ('Hola ' + dueno + '!') : 'Hola!';
  const htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>'
    + '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">'
    + '<div style="background:#1a1a2e;padding:28px;text-align:center;border-radius:12px 12px 0 0">'
    + '<div style="display:inline-block;background:#fff;border-radius:12px;padding:8px 18px"><img src="https://app.revistapetmi.com/logopetmi.png" alt="PetMi" style="height:36px;width:auto;display:block"></div>'
    + '</div>'
    + '<div style="background:#fff;padding:28px;border:1px solid #eee">'
    + '<h2 style="color:#1a1a2e;margin-top:0;text-align:center">Tu código de verificación</h2>'
    + '<p style="color:#555;line-height:1.7;font-size:14px;text-align:center">' + saludo + ' Usa este código para continuar — es válido por 10 minutos.</p>'
    + '<div style="text-align:center;margin:24px 0"><span style="display:inline-block;background:#f8f8f8;border-radius:12px;padding:16px 28px;font-size:32px;font-weight:900;letter-spacing:8px;color:#1a1a2e">' + code + '</span></div>'
    + '<p style="text-align:center;color:#999;font-size:12px">Si tú no pediste este código, puedes ignorar este correo con confianza.</p>'
    + '<p style="color:#aaa;font-size:12px;margin-top:24px">Con amor, el equipo de PetMi</p>'
    + '</div>'
    + '<div style="background:#F5C842;padding:12px;text-align:center;border-radius:0 0 12px 12px">'
    + '<p style="margin:0;font-size:12px;color:#555">PetMi Guatemala</p>'
    + '</div></div></body></html>';

  try {
    const rResend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: 'Tu código de verificación: ' + code,
        html: htmlBody
      })
    });
    const bodyResend = await rResend.text();
    console.log((etiquetaLog || 'enviarOTP') + ' -> Resend status:', rResend.status, '| respuesta:', bodyResend);
    if (!rResend.ok) {
      let parsed; try { parsed = JSON.parse(bodyResend); } catch(e) { parsed = null; }
      return { ok: false, error: (parsed && parsed.message) || 'No se pudo enviar el código' };
    }
    return { ok: true };
  } catch(eResend) {
    console.error((etiquetaLog || 'enviarOTP') + ' -> Resend error:', eResend.message);
    return { ok: false, error: 'Error de conexión al enviar el código' };
  }
}

// ── Validar que el dominio del correo exista de verdad ──────────
// No manda ningún correo (no consume cuota de Gmail) — solo revisa
// si el dominio tiene registros MX (servidores de correo configurados).
// Detiene dominios inventados al azar; NO detiene un usuario inventado
// sobre un dominio real (ej. gmail.com) — es un filtro parcial, no
// una verificación completa de que la persona sea dueña del correo.
async function dominioTieneCorreoValido(email) {
  try {
    const dominio = String(email || '').split('@')[1];
    if (!dominio) return false;
    const registros = await dns.resolveMx(dominio);
    return Array.isArray(registros) && registros.length > 0;
  } catch (e) {
    return false; // dominio no existe o no tiene MX configurado
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || '';

  try {
    // ── getBasic — galería principal ─────────────────────────
    if (action === 'getBasic') {
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?uid=neq.PETMI-OFICIAL&select=uid,nombre,apodo,especie,sexo,raza,tipo_fecha,fecha,email,foto,angelito,fecha_angelito,created_at,slug&order=created_at.desc',
        {
          headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
          }
        }
      );
      const data = await response.json();
      // Convertir al formato que espera la galería
      const rows = data.map(m => [
        m.created_at,    // 0 — Fecha Registro (igual que Sheet col A)
        m.uid,           // 1
        m.nombre,        // 2
        m.apodo,         // 3
        m.especie,       // 4
        m.sexo,          // 5
        m.raza,          // 6
        m.tipo_fecha,    // 7
        m.fecha,         // 8
        m.email,         // 9
        m.foto,          // 10
        m.angelito ? 'Si' : 'No', // 11
        m.fecha_angelito, // 12
        m.slug || ''      // 13 — link público legible (ej. "pepe")
      ]);
      return res.status(200).json({ rows });
    }

    // ── getData — datos completos ─────────────────────────────
    if (action === 'getData') {
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?uid=neq.PETMI-OFICIAL&select=*&order=created_at.desc',
        {
          headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
          }
        }
      );
      const data = await response.json();
      const rows = data.map(m => {
        const r = new Array(31).fill('');
        r[1]  = m.uid            || '';
        r[2]  = m.nombre         || '';
        r[3]  = m.apodo          || '';
        r[4]  = m.especie        || '';
        r[5]  = m.sexo           || '';
        r[6]  = m.raza           || '';
        r[7]  = m.tipo_fecha     || '';
        r[8]  = m.fecha          || '';
        r[9]  = m.zona           || '';
        r[10] = m.dueno          || '';
        r[11] = m.email          || '';
        r[12] = m.whatsapp       || '';
        r[13] = m.veterinario    || '';
        r[15] = m.instagram      || '';
        r[16] = m.alimento       || '';
        r[18] = m.actividades    || '';
        r[20] = m.ofertas        ? 'Si' : 'No';
        r[23] = m.especial       || '';
        r[24] = m.correo_enviado || '';
        r[27] = m.foto           || '';
        r[28] = m.angelito       ? 'Si' : 'No';
        r[29] = m.fecha_angelito || '';
        r[30] = m.notif_mensajes ? 'Si' : 'No';
        return r;
      });
      return res.status(200).json({ rows });
    }

    // ── checkEmail ────────────────────────────────────────────
    if (action === 'checkEmail' || (req.method === 'POST' && req.body && req.body.action === 'checkEmail')) {
      const email = (req.method === 'POST' ? req.body.email : req.query.email) || '';
      if (!email) return res.status(200).json({ found: false, mascotas: [] });

      const response = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent(email.toLowerCase()) + '&select=*',
        {
          headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
          }
        }
      );
      const data = await response.json();
      const mascotas = data.map(m => ({
        uid:          m.uid            || '',
        nombre:       m.nombre         || '',
        apodo:        m.apodo          || '',
        especie:      m.especie        || '',
        sexo:         m.sexo           || '',
        raza:         m.raza           || '',
        tipoFecha:    m.tipo_fecha     || '',
        tipoPelo:     m.tipo_pelo      || '',
        fecha:        m.fecha          || '',
        zona:         m.zona           || '',
        dueno:        m.dueno          || '',
        email:        m.email          || '',
        whatsapp:     m.whatsapp       || '',
        veterinario:  m.veterinario    || '',
        instagram:    m.instagram      || '',
        alimento:     m.alimento       || '',
        actividades:  m.actividades    || '',
        especial:     m.especial       || '',
        foto:         m.foto           || '',
        angelito:     m.angelito       ? 'Si' : 'No',
        fechaAngelito:m.fecha_angelito || '',
        notifMensajes:m.notif_mensajes ? 'Si' : 'No',
        ofertas:      m.ofertas        ? 'Si' : 'No',
        premium:      m.premium        === true,
        premium_hasta:m.premium_hasta  || null,
        slug:         m.slug           || ''
      }));

      // Marcar última actividad (no bloqueante — no afecta la respuesta si falla)
      if (mascotas.length) {
        // Detectar reactivación: nunca había tenido actividad Y se registró
        // hace más de 14 días (para no confundir con el primer uso normal
        // de alguien recién registrado)
        const primeraVezConActividad = !data[0].ultima_actividad;
        const antiguedadMs = data[0].created_at ? (Date.now() - new Date(data[0].created_at).getTime()) : 0;
        const esReactivacion = primeraVezConActividad && antiguedadMs > 14 * 86400000;

        fetch(SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent(email.toLowerCase()), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ ultima_actividad: new Date().toISOString() })
        }).catch(() => {});

        if (esReactivacion) {
          fetch(SUPABASE_URL + '/rest/v1/puntos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ email: email.toLowerCase(), accion: 'reactivacion', puntos: 15 })
          }).catch(() => {});
        }
      }

      return res.status(200).json({ found: mascotas.length > 0, mascotas });
    }

    // ── getMensajes ───────────────────────────────────────────
    if (action === 'getMensajes') {
      const uid = (req.query.uid || '').toUpperCase();
      if (!uid) return res.status(200).json({ mensajes: [] });

      const response = await fetch(
        SUPABASE_URL + '/rest/v1/mensajes?uid_mascota=eq.' + encodeURIComponent(uid) + '&select=*&order=created_at.asc',
        {
          headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
          }
        }
      );
      const data = await response.json();
      const mensajes = data.map(m => ({
        fecha:         m.created_at,
        autor:         m.autor         || '',
        mensaje:       m.mensaje       || '',
        nombreMascota: m.nombre_mascota|| ''
      }));
      return res.status(200).json({ mensajes });
    }

    // ── enviarSolicitud ──────────────────────────────────────
    if (action === 'enviarSolicitud' && req.method === 'POST') {
      const { uid_solicitante, uid_receptor, email_solicitante, email_receptor } = req.body;
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/amigos?on_conflict=uid_solicitante,uid_receptor',
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
            'Prefer':        'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({ uid_solicitante, uid_receptor, email_solicitante, email_receptor, estado: 'pendiente' })
        }
      );
      return res.status(200).json({ ok: response.ok });
    }

    // ── responderSolicitud ────────────────────────────────────
    // ── updateCarnetLayout ────────────────────────────────────
    if (action === 'updateCarnetLayout' && req.method === 'POST') {
      const { uid, layout } = req.body;
      if (!uid || !layout) return res.status(200).json({ ok: false });
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ carnet_layout: layout })
        }
      );
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarAmistad ───────────────────────────────────────
    if (action === 'eliminarAmistad' && req.method === 'POST') {
      const { id } = req.body;
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/amigos?id=eq.' + encodeURIComponent(id),
        {
          method: 'DELETE',
          headers: {
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
            'Prefer':        'return=minimal'
          }
        }
      );
      return res.status(200).json({ ok: response.ok });
    }

    if (action === 'responderSolicitud' && req.method === 'POST') {
      const { id, estado } = req.body; // estado: aceptado | rechazado
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/amigos?id=eq.' + encodeURIComponent(id),
        {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
            'Prefer':        'return=minimal'
          },
          body: JSON.stringify({ estado, updated_at: new Date().toISOString() })
        }
      );
      return res.status(200).json({ ok: response.ok });
    }

    // ── getAmigos ─────────────────────────────────────────────
    // Devuelve amigos aceptados y solicitudes pendientes de un uid
    if (action === 'getAmigos') {
      const uid = req.query.uid || '';
      if (!uid) return res.status(200).json({ amigos: [], pendientes: [] });

      // Buscar donde es solicitante O receptor
      const [r1, r2] = await Promise.all([
        fetch(SUPABASE_URL + '/rest/v1/amigos?uid_solicitante=eq.' + encodeURIComponent(uid) + '&select=*', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }),
        fetch(SUPABASE_URL + '/rest/v1/amigos?uid_receptor=eq.' + encodeURIComponent(uid) + '&select=*', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        })
      ]);

      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      const todas = [...(d1||[]), ...(d2||[])];

      const amigos    = todas.filter(a => a.estado === 'aceptado');
      const pendientes = todas.filter(a => a.estado === 'pendiente');

      // Obtener UIDs de amigos para cargar sus mascotas
      const uidsAmigos = amigos.map(a => a.uid_solicitante === uid ? a.uid_receptor : a.uid_solicitante);

      let mascotasAmigos = [];
      if (uidsAmigos.length > 0) {
        const r3 = await fetch(
          SUPABASE_URL + '/rest/v1/mascotas?uid=in.(' + uidsAmigos.map(u => '"'+u+'"').join(',') + ')&select=uid,nombre,apodo,especie,foto,angelito,slug',
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
        );
        mascotasAmigos = await r3.json();
      }

      return res.status(200).json({ amigos, pendientes, mascotasAmigos });
    }

    // ── getConversaciones (lista, para el inbox) ──────────────
    if (action === 'getConversaciones') {
      const uid = (req.query.uid || '').toUpperCase();
      if (!uid) return res.status(200).json({ conversaciones: [] });

      const response = await fetch(
        SUPABASE_URL + '/rest/v1/conversaciones?or=(uid_emisor.eq.' + encodeURIComponent(uid) + ',uid_receptor.eq.' + encodeURIComponent(uid) + ')&order=created_at.desc&limit=300',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const msgs = await response.json();
      if (!msgs || !msgs.length) return res.status(200).json({ conversaciones: [] });

      // Agrupar por el "otro" uid — quedarnos con el mensaje más reciente
      // de cada conversación y contar los no leídos que me tocan a mí.
      const porUid = {};
      msgs.forEach(m => {
        const otro = m.uid_emisor === uid ? m.uid_receptor : m.uid_emisor;
        if (!porUid[otro]) {
          porUid[otro] = { otroUid: otro, ultimoMensaje: m.mensaje, ultimaFecha: m.created_at, noLeidos: 0, ultimoEsMio: m.uid_emisor === uid };
        }
        if (m.uid_receptor === uid && !m.leido) porUid[otro].noLeidos++;
      });

      const uids = Object.keys(porUid);
      let mascotasInfo = {};
      if (uids.length) {
        const rMasc = await fetch(
          SUPABASE_URL + '/rest/v1/mascotas?uid=in.(' + uids.map(u => '"' + u + '"').join(',') + ')&select=uid,nombre,foto,angelito',
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
        );
        const rows = await rMasc.json();
        (rows || []).forEach(r => { mascotasInfo[r.uid] = r; });
      }

      const conversaciones = uids.map(u => {
        const info = mascotasInfo[u] || {};
        return {
          otroUid: u,
          otroNombre: info.nombre || 'Mascota',
          otroFoto: info.foto || '',
          otroAngelito: !!info.angelito,
          ultimoMensaje: porUid[u].ultimoMensaje,
          ultimaFecha: porUid[u].ultimaFecha,
          ultimoEsMio: porUid[u].ultimoEsMio,
          noLeidos: porUid[u].noLeidos
        };
      }).sort((a, b) => new Date(b.ultimaFecha) - new Date(a.ultimaFecha));

      return res.status(200).json({ conversaciones });
    }

    // ── getConversacion ──────────────────────────────────────
    if (action === 'getConversacion') {
      const uid1 = req.query.uid1 || '';
      const uid2 = req.query.uid2 || '';
      if (!uid1 || !uid2) return res.status(200).json({ mensajes: [] });

      const response = await fetch(
        SUPABASE_URL + '/rest/v1/conversaciones?or=(and(uid_emisor.eq.' + encodeURIComponent(uid1) + ',uid_receptor.eq.' + encodeURIComponent(uid2) + '),and(uid_emisor.eq.' + encodeURIComponent(uid2) + ',uid_receptor.eq.' + encodeURIComponent(uid1) + '))&order=created_at.desc&limit=50',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await response.json();
      return res.status(200).json({ mensajes: data || [] });
    }

    // ── registrarCanje ─────────────────────────────────────────
    // Guarda la solicitud real de canje (antes se perdía — el botón
    // apuntaba a un placeholder sin llenar) y avisa al admin por correo.
    if (action === 'registrarCanje' && req.method === 'POST') {
      const { email, dueno, premio, puntos } = req.body;
      if (!email || !premio || !puntos) return res.status(200).json({ ok: false, error: 'Faltan campos' });

      const r = await fetch(SUPABASE_URL + '/rest/v1/canjes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ email, dueno: dueno || '', premio, puntos_usados: puntos, estado: 'pendiente' })
      });

      if (r.ok) {
        // Avisar al admin por correo (no bloqueante)
        fetch('https://app.revistapetmi.com/api/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'notificarCanje', email, dueno: dueno || '', premio, puntos })
        }).catch(() => {});
      }

      return res.status(200).json({ ok: r.ok });
    }

    // ── registrarVisitaPerfil ──────────────────────────────────
    if (action === 'registrarVisitaPerfil' && req.method === 'POST') {
      const { uid_mascota } = req.body;
      if (!uid_mascota) return res.status(200).json({ ok: false });
      fetch(SUPABASE_URL + '/rest/v1/visitas_perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ uid_mascota: uid_mascota.toUpperCase() })
      }).catch(() => {});
      return res.status(200).json({ ok: true });
    }

    // ── getAmigoSemanaHistorial ────────────────────────────────
    // Trae todo el historial (más reciente = el actual), con los
    // datos de cada mascota, para la página pública amigo-semana.html
    if (action === 'getAmigoSemanaHistorial') {
      const rHist = await fetch(
        SUPABASE_URL + '/rest/v1/amigo_semana_historial?select=uid_mascota,created_at&order=created_at.desc&limit=60',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const historial = await rHist.json();
      if (!Array.isArray(historial) || !historial.length) return res.status(200).json({ historial: [] });

      const uids = [...new Set(historial.map(h => h.uid_mascota))];
      const rMasc = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?uid=in.(' + uids.map(u => '"' + u + '"').join(',') + ')&select=uid,nombre,apodo,especie,raza,sexo,fecha,tipo_fecha,actividades,foto,especial,slug,email',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const mascotasRows = await rMasc.json();
      if (!Array.isArray(mascotasRows)) return res.status(200).json({ historial: [] });
      const porUid = {};
      mascotasRows.forEach(m => { porUid[m.uid] = m; });

      const resultado = historial
        .map(h => {
          const m = porUid[h.uid_mascota];
          if (!m) return null;
          return { fecha: h.created_at, nombre: m.nombre, apodo: m.apodo, especie: m.especie, raza: m.raza, sexo: m.sexo, fechaNac: m.fecha, tipoFecha: m.tipo_fecha, actividades: m.actividades, foto: m.foto, especial: m.especial, slug: m.slug || m.uid, uid: m.uid, email: m.email };
        })
        .filter(Boolean);

      return res.status(200).json({ historial: resultado });
    }

    // ── elegirAmigoSemana ──────────────────────────────────────
    // Elige al azar entre mascotas activas, con foto, con "algo
    // especial" lleno, y que no hayan salido antes. Si ya salieron
    // todas, reinicia el ciclo automáticamente.
    if (action === 'elegirAmigoSemana') {
      const rCandidatos = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?angelito=eq.false&uid=neq.PETMI-OFICIAL&foto=not.is.null&especial=not.is.null&select=uid,nombre,apodo,especie,raza,sexo,fecha,tipo_fecha,actividades,foto,especial,slug',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      let candidatos = await rCandidatos.json();
      candidatos = (Array.isArray(candidatos) ? candidatos : []).filter(m => m.foto && m.foto.indexOf('http') >= 0 && m.especial && m.especial.trim());

      if (!candidatos.length) return res.status(200).json({ ok: false, error: 'No hay candidatos calificados (foto + algo especial llenos)' });

      const rHist = await fetch(
        SUPABASE_URL + '/rest/v1/amigo_semana_historial?select=uid_mascota',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const historial = await rHist.json();
      const yaSalieron = new Set(Array.isArray(historial) ? historial.map(h => h.uid_mascota) : []);

      let disponibles = candidatos.filter(m => !yaSalieron.has(m.uid));
      let reiniciado = false;
      if (!disponibles.length) {
        // Ya salieron todos — reiniciar el ciclo
        disponibles = candidatos;
        reiniciado = true;
      }

      const elegido = disponibles[Math.floor(Math.random() * disponibles.length)];

      await fetch(SUPABASE_URL + '/rest/v1/amigo_semana_historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ uid_mascota: elegido.uid })
      });

      return res.status(200).json({ ok: true, mascota: elegido, reiniciado, totalCandidatos: candidatos.length });
    }

    // ── guardarSuscripcionPush ────────────────────────────────
    if (action === 'guardarSuscripcionPush' && req.method === 'POST') {
      const { uid_mascota, endpoint, p256dh, auth } = req.body;
      if (!uid_mascota || !endpoint || !p256dh || !auth) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?on_conflict=endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({ uid_mascota, endpoint, p256dh, auth })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── enviarPushExterno (llamado desde Apps Script) ─────────
    // Permite mandar push desde Code.gs/EmailsMarketing.gs sin que
    // Apps Script tenga que hablar el protocolo VAPID directamente.
    // uid_mascota = 'TODOS' manda a todas las suscripciones (broadcast).
    if (action === 'enviarPushExterno' && req.method === 'POST') {
      const { uid_mascota, title, body, url, tag } = req.body;
      if (!title || !body) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const payload = { title, body, url: url || '/mensajes.html', tag: tag || '' };

      if (uid_mascota === 'TODOS') {
        const r = await fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?select=uid_mascota', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        });
        const rows = await r.json();
        const uidsUnicos = [...new Set((rows || []).map(x => x.uid_mascota))];
        await Promise.all(uidsUnicos.map(u => _enviarPush(u, payload)));
        return res.status(200).json({ ok: true, destinatarios: uidsUnicos.length });
      }

      if (!uid_mascota) return res.status(200).json({ ok: false, error: 'uid_mascota requerido' });
      await _enviarPush(uid_mascota, payload);
      return res.status(200).json({ ok: true });
    }

    // ── enviarMensajePrivado ──────────────────────────────────
    if (action === 'enviarMensajePrivado' && req.method === 'POST') {
      const { uid_emisor, uid_receptor, mensaje } = req.body;
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/conversaciones',
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Prefer':        'return=minimal'
          },
          body: JSON.stringify({ uid_emisor, uid_receptor, mensaje })
        }
      );
      if (response.ok) {
        // Push al receptor (no bloqueante — si falla, el mensaje ya se guardó igual)
        _enviarPush(uid_receptor, {
          title: 'Nuevo mensaje en PetMi',
          body: String(mensaje || '').substring(0, 100),
          url: '/mensajes.html?abrir=' + encodeURIComponent(uid_emisor),
          tag: 'mensaje-' + uid_emisor
        }).catch(() => {});
      }
      return res.status(200).json({ ok: response.ok });
    }

    // ── marcarLeidos ─────────────────────────────────────────
    if (action === 'marcarLeidos' && req.method === 'POST') {
      const { uid_emisor, uid_receptor } = req.body;
      await fetch(
        SUPABASE_URL + '/rest/v1/conversaciones?uid_emisor=eq.' + encodeURIComponent(uid_emisor) + '&uid_receptor=eq.' + encodeURIComponent(uid_receptor),
        {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Prefer':        'return=minimal'
          },
          body: JSON.stringify({ leido: true })
        }
      );
      return res.status(200).json({ ok: true });
    }

    // ── getMensajesNoLeidos ───────────────────────────────────
    if (action === 'getMensajesNoLeidos') {
      const uid = req.query.uid || '';
      if (!uid) return res.status(200).json({ count: 0 });
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/conversaciones?uid_receptor=eq.' + encodeURIComponent(uid) + '&leido=eq.false&select=id',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact' } }
      );
      const count = parseInt(response.headers.get('content-range')?.split('/')[1] || '0');
      return res.status(200).json({ count });
    }

    // ── EVENTOS ──────────────────────────────────────────────
    if (action === 'getEventos') {
      const tipo = req.query.tipo || '';
      const hoy = new Date().toISOString().split('T')[0];
      let url = SUPABASE_URL + '/rest/v1/eventos?select=*&or=(activo.eq.true,activo.is.null)&fecha=gte.' + hoy + '&order=fecha.asc';
      if (tipo) url += '&tipo=eq.' + encodeURIComponent(tipo);
      const r = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
      return res.status(200).json({ eventos: await r.json() });
    }

    if (action === 'asistirEvento' && req.method === 'POST') {
      const { evento_id, uid_mascota, email } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/evento_asistentes?on_conflict=evento_id,uid_mascota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ evento_id, uid_mascota, email })
      });
      return res.status(200).json({ ok: r.ok });
    }

    if (action === 'cancelarAsistencia' && req.method === 'POST') {
      const { evento_id, uid_mascota } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/evento_asistentes?evento_id=eq.' + evento_id + '&uid_mascota=eq.' + encodeURIComponent(uid_mascota), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    if (action === 'getAsistentes') {
      const evento_id = req.query.evento_id || '';
      const r = await fetch(SUPABASE_URL + '/rest/v1/evento_asistentes?evento_id=eq.' + encodeURIComponent(evento_id) + '&select=uid_mascota,email', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      return res.status(200).json({ asistentes: await r.json() });
    }

    // ── LUGARES ───────────────────────────────────────────────
    if (action === 'getLugares') {
      const tipo = req.query.tipo || '';
      const zona = req.query.zona || '';
      let url = SUPABASE_URL + '/rest/v1/lugares?activo=eq.true&order=nombre.asc';
      if (tipo) url += '&tipo=eq.' + encodeURIComponent(tipo);
      if (zona) url += '&zona=eq.' + encodeURIComponent(zona);
      const r = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
      return res.status(200).json({ lugares: await r.json() });
    }

    if (action === 'ratingLugar' && req.method === 'POST') {
      const { lugar_id, email, rating, comentario } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/lugar_ratings?on_conflict=lugar_id,email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ lugar_id, email, rating, comentario })
      });
      // Actualizar rating promedio
      if (r.ok) {
        const ratings = await fetch(SUPABASE_URL + '/rest/v1/lugar_ratings?lugar_id=eq.' + lugar_id + '&select=rating', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(x => x.json());
        const avg = ratings.reduce((s, x) => s + x.rating, 0) / ratings.length;
        await fetch(SUPABASE_URL + '/rest/v1/lugares?id=eq.' + lugar_id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ rating: Math.round(avg * 10) / 10 })
        });
      }
      return res.status(200).json({ ok: r.ok });
    }

    // ── Enviar evento a revisión (usuarios) ─────────────────────
    if (action === 'enviarEvento' && req.method === 'POST') {
      const { titulo, tipo, fecha, hora, lugar, direccion, descripcion, imagen, link, email } = req.body;
      if (!titulo || !fecha) return res.status(200).json({ ok: false, error: 'Faltan titulo y fecha' });
      const payload = { titulo, tipo: tipo||'evento', fecha, hora: hora||null, lugar: lugar||null, direccion: direccion||null, descripcion: descripcion||null, imagen: imagen||null, link: link||null, creado_por: email||null, activo: false };
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        let errBody = '';
        try { errBody = JSON.stringify(await r.json()); } catch(e) { errBody = await r.text().catch(()=>'sin detalle'); }
        console.error('[enviarEvento] Supabase error', r.status, errBody);
        return res.status(200).json({ ok: false, error: errBody, status: r.status });
      }
      return res.status(200).json({ ok: true });
    }

    // ── Enviar lugar a revisión (usuarios) ───────────────────────
    if (action === 'enviarLugar' && req.method === 'POST') {
      const { nombre, tipo, zona, direccion, descripcion, imagen, google_maps, instagram, telefono, email } = req.body;
      if (!nombre) return res.status(200).json({ ok: false, error: 'Falta el nombre' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/lugares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ nombre, tipo: tipo||'restaurante', zona, direccion, descripcion, imagen, google_maps, instagram, telefono, activo: false })
      });
      if (!r.ok) console.error('enviarLugar insert failed:', r.status, await r.text().catch(() => ''));
      return res.status(200).json({ ok: r.ok });
    }

    // ── getActividades ───────────────────────────────────────
    if (action === 'getActividades') {
      const tipo  = req.query.tipo || '';
      const ahora = new Date().toISOString();

      // FIX: separar el or() de expiración del filtro de tipo
      // para que Supabase los combine correctamente como AND implícito
      let url = SUPABASE_URL + '/rest/v1/actividades'
        + '?activo=eq.true'
        + '&or=(expires_at.is.null,expires_at.gte.' + ahora + ')'
        + '&order=created_at.desc'
        + '&limit=100';
      if (tipo) url += '&tipo=eq.' + encodeURIComponent(tipo);

      const r = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
      const data = await r.json();

      // Doble filtro en servidor por seguridad
      const ahora2 = Date.now();
      const actividades = Array.isArray(data) ? data.filter(a => {
        if (!a.activo) return false;
        if (a.expires_at && new Date(a.expires_at).getTime() < ahora2) return false;
        return true;
      }) : [];

      return res.status(200).json({ actividades });
    }

    // ── getAvisosPendientes ───────────────────────────────────────
    if (action === 'getAvisosPendientes') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividades?activo=eq.false&order=created_at.desc&select=*', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ ok: true, avisos: data || [] });
    }

    // ── aprobarAviso ──────────────────────────────────────────────
    if (action === 'aprobarAviso' && req.method === 'POST') {
      const { id } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividades?id=eq.' + id, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ activo: true })
      });
      return res.status(200).json({ ok: r.ok, status: r.status });
    }

    // ── rechazarAviso ─────────────────────────────────────────────
    if (action === 'rechazarAviso' && req.method === 'POST') {
      const { id } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividades?id=eq.' + id, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' }
      });
      return res.status(200).json({ ok: r.ok, status: r.status });
    }

    // ── publicarActividad ─────────────────────────────────────────
    if (action === 'publicarActividad' && req.method === 'POST') {
      const { uid_creador, nombre_creador, foto_creador, tipo, categoria, titulo, descripcion, fecha, hora, ubicacion, imagen, especie, sexo, raza, whatsapp, recompensa } = req.body;
      if (!titulo || !uid_creador) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      // Calcular expiración: planes expiran en la fecha del plan, anuncios en 7 días
      let expires_at = null;
      if (tipo === 'plan' && fecha) {
        // Planes de afiliado expiran en la fecha del plan
        expires_at = new Date(fecha + 'T23:59:59').toISOString();
      } else if (tipo === 'evento' && fecha) {
        // Eventos expiran al final de su dia
        expires_at = new Date(fecha + 'T23:59:59').toISOString();
      } else if (tipo !== 'plan') {
        // Avisos normales expiran en 7 dias
        const d = new Date(); d.setDate(d.getDate() + 7);
        expires_at = d.toISOString();
      }
      // perdido = activo inmediato, resto requiere aprobacion admin
      const activo = req.body.activo_override !== undefined ? req.body.activo_override : (tipo === 'perdido');
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=representation' },
        body: JSON.stringify({ uid_creador, nombre_creador, foto_creador, email_creador: req.body.email_creador||'', tipo, categoria, titulo, descripcion, fecha, hora, ubicacion, imagen, activo, expires_at, especie: especie||null, sexo: sexo||null, raza: raza||null, whatsapp: whatsapp||null, recompensa: recompensa||null })
      });
      if (!r.ok) console.error('publicarActividad insert failed:', r.status, await r.text().catch(() => ''));
      const data = await r.json();
      return res.status(200).json({ ok: r.ok, id: data[0]?.id });
    }

    // ── apuntarse ─────────────────────────────────────────────
    if (action === 'apuntarse' && req.method === 'POST') {
      const { actividad_id, uid_mascota, nombre_mascota, foto_mascota } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividad_apuntes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ actividad_id, uid_mascota, nombre_mascota, foto_mascota })
      });
      return res.status(200).json({ ok: r.ok || r.status === 409 });
    }

    // ── desapuntarse ──────────────────────────────────────────
    if (action === 'desapuntarse' && req.method === 'POST') {
      const { actividad_id, uid_mascota } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividad_apuntes?actividad_id=eq.' + encodeURIComponent(actividad_id) + '&uid_mascota=eq.' + encodeURIComponent(uid_mascota), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getApuntes ────────────────────────────────────────────
    if (action === 'getApuntes') {
      const actividad_id = req.query.actividad_id || '';
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividad_apuntes?actividad_id=eq.' + encodeURIComponent(actividad_id) + '&select=*', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      return res.status(200).json({ apuntes: await r.json() });
    }

    // ── eliminarActividad ─────────────────────────────────────
    if (action === 'eliminarActividad' && req.method === 'POST') {
      const { actividad_id, uid_creador } = req.body;
      // Eliminar solo por id (RLS de Supabase protege el acceso)
      // No filtrar por uid_creador para que "apareció" funcione desde familia.html
      // Usa SUPABASE_SERVICE_KEY (no la anon key) — con RLS activo en "actividades",
      // la anon key devolvía "éxito" sin borrar nada de verdad.
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividades?id=eq.' + encodeURIComponent(actividad_id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      if (!r.ok) console.error('eliminarActividad failed:', r.status, await r.text().catch(() => ''));
      return res.status(200).json({ ok: r.ok });
    }

    // ── marcarAparecio ────────────────────────────────────────
    // Elimina la actividad perdido por id sin validar uid_creador
    // Se llama desde familia.html y actividades.html cuando el dueño confirma que apareció
    if (action === 'marcarAparecio' && req.method === 'POST') {
      const { actividad_id } = req.body;
      if (!actividad_id) return res.status(200).json({ ok: false, error: 'actividad_id requerido' });
      // Misma corrección: usar SUPABASE_SERVICE_KEY para que el DELETE sí aplique con RLS activo
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividades?id=eq.' + encodeURIComponent(actividad_id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      if (!r.ok) console.error('marcarAparecio failed:', r.status, await r.text().catch(() => ''));
      return res.status(200).json({ ok: r.ok });
    }

    // ── syncMascotas (admin) ─────────────────────────────────
    if (action === 'syncMascotas' && req.method === 'POST') {
      const { mascotas } = req.body;
      if (!mascotas || !mascotas.length) return res.status(200).json({ ok: true, count: 0 });
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascotas?on_conflict=uid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(mascotas)
      });
      return res.status(200).json({ ok: r.ok, count: mascotas.length });
    }

    // ── getEventosAdmin ───────────────────────────────────────
    if (action === 'getEventosAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos?order=created_at.desc', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      return res.status(200).json({ eventos: await r.json() });
    }

    // ── getEventosPendientes ──────────────────────────────────
    if (action === 'getEventosPendientes') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos?activo=eq.false&order=created_at.desc', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      return res.status(200).json({ eventos: await r.json() });
    }

    // ── toggleEvento ──────────────────────────────────────────
    if (action === 'toggleEvento' && req.method === 'POST') {
      const { id, activo } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ activo })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarEvento ────────────────────────────────────────
    if (action === 'eliminarEvento' && req.method === 'POST') {
      const { id } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getLugaresAdmin ───────────────────────────────────────
    if (action === 'getLugaresAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/lugares?order=nombre.asc', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      return res.status(200).json({ lugares: await r.json() });
    }

    // ── toggleLugar ───────────────────────────────────────────
    if (action === 'toggleLugar' && req.method === 'POST') {
      const { id, activo } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/lugares?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ activo })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarLugar ─────────────────────────────────────────
    if (action === 'eliminarLugar' && req.method === 'POST') {
      const { id } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/lugares?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ══════════════════════════════════════════════════════════
    // CARRERA A BENEFICIO — inscripciones
    // ══════════════════════════════════════════════════════════

    // ── inscribirCarrera — guarda la inscripción como "pendiente" ──
    // El pago se completa aparte, en el link de Recurrente — el webhook
    // (por separado) es el que marca esta fila como "pagado" cuando
    // confirma el pago, cruzando por email.
    if (action === 'inscribirCarrera' && req.method === 'POST') {
      const { nombre, email, telefono, uid_mascota, nombre_mascota, foto_mascota, talla_playera } = req.body;
      if (!nombre || !email || !email.includes('@')) {
        return res.status(200).json({ ok: false, error: 'Faltan nombre o correo válido' });
      }
      const r = await fetch(SUPABASE_URL + '/rest/v1/carrera_inscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          nombre, email: email.trim().toLowerCase(), telefono: telefono || null,
          uid_mascota: uid_mascota || null, nombre_mascota: nombre_mascota || null,
          foto_mascota: foto_mascota || null, talla_playera: talla_playera || null,
          estado: 'pendiente'
        })
      });
      if (!r.ok) {
        const errTxt = await r.text().catch(() => '');
        console.error('inscribirCarrera failed:', r.status, errTxt);
        return res.status(200).json({ ok: false, error: errTxt });
      }
      const data = await r.json();
      return res.status(200).json({ ok: true, id: data[0]?.id });
    }

    // ── getEstadoInscripcionCarrera — consulta si ya pagó ────────
    if (action === 'getEstadoInscripcionCarrera') {
      const email = (req.query.email || '').trim().toLowerCase();
      if (!email) return res.status(200).json({ found: false });
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/carrera_inscripciones?email=eq.' + encodeURIComponent(email) + '&select=*&order=created_at.desc&limit=1',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const data = await r.json();
      if (!Array.isArray(data) || !data.length) return res.status(200).json({ found: false });
      return res.status(200).json({ found: true, inscripcion: data[0] });
    }

    // ── getInscripcionesCarreraAdmin (admin) ─────────────────────
    if (action === 'getInscripcionesCarreraAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/carrera_inscripciones?select=*&order=created_at.desc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ inscripciones: Array.isArray(data) ? data : [] });
    }

    // ══════════════════════════════════════════════════════════
    // CONCURSOS — envío de fotos y votación pública
    // ══════════════════════════════════════════════════════════

    // ── enviarConcurso — el dueño sube la foto de su mascota ────
    if (action === 'enviarConcurso' && req.method === 'POST') {
      const { concurso, uid_mascota, nombre_mascota, foto_url, caption, email } = req.body;
      if (!concurso || !uid_mascota || !foto_url || !email) {
        return res.status(200).json({ ok: false, error: 'Faltan campos (concurso, uid_mascota, foto_url, email)' });
      }
      const r = await fetch(SUPABASE_URL + '/rest/v1/concurso_entradas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          concurso,
          uid_mascota: uid_mascota.toUpperCase(),
          nombre_mascota: nombre_mascota || '',
          foto_url,
          caption: caption || '',
          email: email.trim().toLowerCase(),
          activo: true,
          votos: 0
        })
      });
      if (!r.ok) {
        const errTxt = await r.text().catch(() => '');
        console.error('enviarConcurso failed:', r.status, errTxt);
        return res.status(200).json({ ok: false, error: errTxt || ('HTTP ' + r.status) });
      }
      return res.status(200).json({ ok: true });
    }

    // ── getConcursoEntradas (público — galería para votar) ──────
    if (action === 'getConcursoEntradas') {
      const concurso = req.query.concurso || '';
      if (!concurso) return res.status(200).json({ entradas: [] });
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/concurso_entradas?concurso=eq.' + encodeURIComponent(concurso) + '&activo=eq.true&select=*&order=votos.desc',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await r.json();
      return res.status(200).json({ entradas: Array.isArray(data) ? data : [] });
    }

    // ── checkVotoConcurso (lista de mascotas por las que ya voto este email, y cuantos le quedan) ──
    if (action === 'checkVotoConcurso') {
      const concurso = req.query.concurso || '';
      const email = (req.query.email || '').trim().toLowerCase();
      const LIMITE_VOTOS = 5;
      if (!concurso || !email) return res.status(200).json({ votadas: [], restantes: LIMITE_VOTOS });
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/concurso_votos?concurso=eq.' + encodeURIComponent(concurso) + '&email=eq.' + encodeURIComponent(email) + '&select=entrada_id',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const data = await r.json();
      const votadas = Array.isArray(data) ? data.map(v => v.entrada_id) : [];
      return res.status(200).json({ votadas, restantes: Math.max(0, LIMITE_VOTOS - votadas.length) });
    }

    // ── votarConcurso — hasta 5 votos por email por concurso, 1 por mascota ──
    // No requiere cuenta de PetMi: cualquiera puede votar solo con su email.
    if (action === 'votarConcurso' && req.method === 'POST') {
      const { concurso, entrada_id, email } = req.body;
      const LIMITE_VOTOS = 5;
      const LIMITE_VOTOS_POR_IP = 15; // ~3 personas de una misma casa/oficina, para no bloquear redes compartidas
      if (!concurso || !entrada_id || !email || !email.includes('@')) {
        return res.status(200).json({ ok: false, error: 'Correo inválido' });
      }
      const emailL = email.trim().toLowerCase();

      const dominioValido = await dominioTieneCorreoValido(emailL);
      if (!dominioValido) {
        return res.status(200).json({ ok: false, error: 'Ese correo no parece existir — revisa que esté bien escrito.' });
      }

      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'desconocida';

      const rCheck = await fetch(
        SUPABASE_URL + '/rest/v1/concurso_votos?concurso=eq.' + encodeURIComponent(concurso) + '&email=eq.' + encodeURIComponent(emailL) + '&select=entrada_id',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const existentes = await rCheck.json();
      const votadasArr = Array.isArray(existentes) ? existentes.map(v => v.entrada_id) : [];

      if (votadasArr.includes(entrada_id)) {
        return res.status(200).json({ ok: false, ya_voto_esta: true, error: 'Ya votaste por esta mascota' });
      }
      if (votadasArr.length >= LIMITE_VOTOS) {
        return res.status(200).json({ ok: false, limite_alcanzado: true, error: 'Ya usaste tus ' + LIMITE_VOTOS + ' votos en este concurso' });
      }

      // Limite adicional por IP — protege contra alguien inventando muchos
      // correos distintos desde la misma conexion.
      if (ip !== 'desconocida') {
        const rIp = await fetch(
          SUPABASE_URL + '/rest/v1/concurso_votos?concurso=eq.' + encodeURIComponent(concurso) + '&ip=eq.' + encodeURIComponent(ip) + '&select=id',
          { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'count=exact' } }
        );
        const ipVotos = await rIp.json();
        if (Array.isArray(ipVotos) && ipVotos.length >= LIMITE_VOTOS_POR_IP) {
          return res.status(200).json({ ok: false, error: 'Se alcanzó el límite de votos desde esta red. Intenta desde otra conexión.' });
        }
      }

      const rVoto = await fetch(SUPABASE_URL + '/rest/v1/concurso_votos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ concurso, entrada_id, email: emailL, ip })
      });
      if (!rVoto.ok) {
        const errTxt = await rVoto.text().catch(() => '');
        if (rVoto.status === 409 || errTxt.toLowerCase().indexOf('duplicate') >= 0) {
          return res.status(200).json({ ok: false, ya_voto_esta: true, error: 'Ya votaste por esta mascota' });
        }
        console.error('votarConcurso insert failed:', rVoto.status, errTxt);
        return res.status(200).json({ ok: false, error: errTxt || ('HTTP ' + rVoto.status) });
      }

      const rEntrada = await fetch(
        SUPABASE_URL + '/rest/v1/concurso_entradas?id=eq.' + encodeURIComponent(entrada_id) + '&select=votos',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const entradaData = await rEntrada.json();
      const votosActuales = (Array.isArray(entradaData) && entradaData[0] && entradaData[0].votos) || 0;
      await fetch(SUPABASE_URL + '/rest/v1/concurso_entradas?id=eq.' + encodeURIComponent(entrada_id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ votos: votosActuales + 1 })
      });

      return res.status(200).json({ ok: true, restantes: LIMITE_VOTOS - votadasArr.length - 1 });
    }

    // ── getConcursoEntradasAdmin (admin — incluye ocultas) ──────
    if (action === 'getConcursoEntradasAdmin') {
      const concurso = req.query.concurso || '';
      let url = SUPABASE_URL + '/rest/v1/concurso_entradas?select=*&order=votos.desc';
      if (concurso) url += '&concurso=eq.' + encodeURIComponent(concurso);
      const r = await fetch(url, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } });
      const data = await r.json();
      return res.status(200).json({ entradas: Array.isArray(data) ? data : [] });
    }

    // ── toggleConcursoEntrada (admin — ocultar entrada inapropiada) ──
    if (action === 'toggleConcursoEntrada' && req.method === 'POST') {
      const { id, activo } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/concurso_entradas?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ activo })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarConcursoEntrada (admin) ──────────────────────────
    if (action === 'eliminarConcursoEntrada' && req.method === 'POST') {
      const { id } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/concurso_entradas?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getGaleriaMascota (fotos de concursos para "Mi Galería" en el perfil) ──
    if (action === 'getGaleriaMascota') {
      const uid = (req.query.uid || '').toUpperCase();
      if (!uid) return res.status(200).json({ fotos: [] });
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/concurso_entradas?uid_mascota=eq.' + encodeURIComponent(uid) + '&activo=eq.true&select=id,foto_url,caption,concurso,votos,created_at&order=created_at.desc',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await r.json();
      return res.status(200).json({ fotos: Array.isArray(data) ? data : [] });
    }

    // ── registrarLeadConcurso (guarda el correo de quien vota + su preferencia de contacto) ──
    if (action === 'registrarLeadConcurso' && req.method === 'POST') {
      const { concurso, email, acepta_ofertas } = req.body;
      if (!concurso || !email || !email.includes('@')) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/concurso_leads?on_conflict=concurso,email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ concurso, email: email.trim().toLowerCase(), acepta_ofertas: !!acepta_ofertas })
      });
      if (!r.ok) {
        const errTxt = await r.text().catch(() => '');
        console.error('registrarLeadConcurso failed:', r.status, errTxt);
        return res.status(200).json({ ok: false, error: errTxt });
      }
      return res.status(200).json({ ok: true });
    }

    // ── enviarOTPVotoConcurso — codigo de verificacion para votar sin cuenta ──
    // Mismo mecanismo que el login (enviarOTP/verificarOTP), pero SIN exigir
    // que el correo ya tenga una mascota registrada — cualquier correo real
    // puede recibir el codigo, ya que cualquiera puede votar (no solo usuarios
    // de PetMi). Esto evita que se voten con correos inventados al azar.
    if (action === 'enviarOTPVotoConcurso' && req.method === 'POST') {
      const { email } = req.body;
      if (!email || !email.includes('@')) return res.status(200).json({ ok: false, error: 'Correo inválido' });
      const emailL = email.trim().toLowerCase();

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const rSave = await fetch(SUPABASE_URL + '/rest/v1/otp_codes', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ email: emailL, code, expires_at: expires, used: false })
      });
      if (!rSave.ok) {
        const errTxt = await rSave.text().catch(() => '');
        console.error('enviarOTPVotoConcurso guardar codigo failed:', rSave.status, errTxt);
        return res.status(200).json({ ok: false, error: 'No se pudo generar el código' });
      }

      const resultado = await _enviarCodigoOTPPorCorreo(emailL, code, '', 'enviarOTPVotoConcurso');
      if (!resultado.ok) return res.status(200).json({ ok: false, error: resultado.error });
      return res.status(200).json({ ok: true });
    }

    // ── verificarOTPVotoConcurso ──────────────────────────────────
    if (action === 'verificarOTPVotoConcurso' && req.method === 'POST') {
      const { email, code } = req.body;
      if (!email || !code) return res.status(200).json({ ok: false });
      const emailL = email.trim().toLowerCase();
      const now = new Date().toISOString();

      const r = await fetch(
        SUPABASE_URL + '/rest/v1/otp_codes?email=ilike.' + encodeURIComponent(emailL) +
        '&code=eq.' + encodeURIComponent(code.trim()) +
        '&used=eq.false&expires_at=gte.' + encodeURIComponent(now) +
        '&select=id&order=created_at.desc&limit=1',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const rows = await r.json();
      if (!rows || !rows.length) {
        return res.status(200).json({ ok: false, msg: 'Código incorrecto o expirado' });
      }

      await fetch(SUPABASE_URL + '/rest/v1/otp_codes?id=eq.' + rows[0].id, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ used: true })
      });

      return res.status(200).json({ ok: true });
    }

    // ── sortearGanadorConcurso (admin) — sortea al azar entre el TOP 5
    // mas votados. Igual que el sorteo de la quiniela: la primera vez que
    // se llama, elige y GUARDA el resultado (on_conflict + ignore-duplicates
    // evita que 2 clics casi simultaneos elijan ganadores distintos); las
    // siguientes veces devuelve siempre el mismo resultado ya guardado.
    if (action === 'sortearGanadorConcurso' && req.method === 'POST') {
      const { concurso } = req.body;
      if (!concurso) return res.status(200).json({ ok: false, error: 'Falta concurso' });
      const claveConfig = 'concurso_' + concurso + '_ganador';

      const rConf = await fetch(SUPABASE_URL + '/rest/v1/config?clave=eq.' + encodeURIComponent(claveConfig) + '&select=valor', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const confRows = await rConf.json();
      if (Array.isArray(confRows) && confRows.length && confRows[0].valor) {
        const rGanador = await fetch(SUPABASE_URL + '/rest/v1/concurso_entradas?id=eq.' + encodeURIComponent(confRows[0].valor) + '&select=*', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        });
        const ganadorRows = await rGanador.json();
        return res.status(200).json({ ok: true, ya_sorteado: true, ganador: (ganadorRows && ganadorRows[0]) || null });
      }

      const rTop = await fetch(
        SUPABASE_URL + '/rest/v1/concurso_entradas?concurso=eq.' + encodeURIComponent(concurso) + '&activo=eq.true&select=*&order=votos.desc&limit=5',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const top5 = await rTop.json();
      if (!Array.isArray(top5) || !top5.length) return res.status(200).json({ ok: false, error: 'No hay participantes activos en este concurso' });

      const elegido = top5[Math.floor(Math.random() * top5.length)];

      await fetch(SUPABASE_URL + '/rest/v1/config?on_conflict=clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ clave: claveConfig, valor: elegido.id })
      });

      // Releer el config para devolver siempre el que realmente quedo
      // guardado (por si 2 llamadas casi simultaneas compitieron)
      const rFinal = await fetch(SUPABASE_URL + '/rest/v1/config?clave=eq.' + encodeURIComponent(claveConfig) + '&select=valor', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const finalRows = await rFinal.json();
      const idFinal = (Array.isArray(finalRows) && finalRows[0] && finalRows[0].valor) || elegido.id;
      const ganadorFinal = top5.find(e => e.id === idFinal) || elegido;

      return res.status(200).json({ ok: true, ya_sorteado: false, ganador: ganadorFinal, candidatos: top5 });
    }

    // ── getLeadsConcursoAdmin (admin — para armar la campaña despues) ──
    if (action === 'getLeadsConcursoAdmin') {
      const concurso = req.query.concurso || '';
      let url = SUPABASE_URL + '/rest/v1/concurso_leads?acepta_ofertas=eq.true&select=email,created_at';
      if (concurso) url += '&concurso=eq.' + encodeURIComponent(concurso);
      const r = await fetch(url, { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } });
      const leads = await r.json();
      const emails = (Array.isArray(leads) ? leads : []).map(l => l.email);
      if (!emails.length) return res.status(200).json({ yaRegistrados: [], nuevos: [] });

      const rMasc = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?email=in.(' + emails.map(e => '"' + e + '"').join(',') + ')&select=email,dueno',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const mascData = await rMasc.json();
      const emailsRegistrados = new Set((Array.isArray(mascData) ? mascData : []).map(m => m.email));
      const duenoPorEmail = {};
      (Array.isArray(mascData) ? mascData : []).forEach(m => { if (!duenoPorEmail[m.email]) duenoPorEmail[m.email] = m.dueno || ''; });

      const yaRegistrados = emails.filter(e => emailsRegistrados.has(e)).map(e => ({ email: e, dueno: duenoPorEmail[e] || '' }));
      const nuevos = emails.filter(e => !emailsRegistrados.has(e));

      return res.status(200).json({ yaRegistrados, nuevos });
    }

    // ── getImpacto ────────────────────────────────────────────
    if (action === 'getImpacto') {
      const [rMascotas, rAdopciones, rPerdidos, rRecuperados] = await Promise.all([
        // Total mascotas registradas
        fetch(SUPABASE_URL + '/rest/v1/mascotas?select=uid', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact', 'Range': '0-0' }
        }),
        // Adopciones publicadas (activas)
        fetch(SUPABASE_URL + '/rest/v1/actividades?tipo=eq.adopcion&select=id', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact', 'Range': '0-0' }
        }),
        // Mascotas perdidas activas
        fetch(SUPABASE_URL + '/rest/v1/actividades?tipo=eq.perdido&activo=eq.true&select=id', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact', 'Range': '0-0' }
        }),
        // Mascotas recuperadas (perdidas eliminadas = aparecieron)
        fetch(SUPABASE_URL + '/rest/v1/actividades?tipo=eq.perdido&activo=eq.false&select=id', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact', 'Range': '0-0' }
        })
      ]);

      const parseCount = (r) => {
        const cr = r.headers.get('content-range');
        return cr ? parseInt(cr.split('/')[1] || '0') : 0;
      };

      // Donaciones — valor manual controlado desde admin
      const rDonaciones = await fetch(SUPABASE_URL + '/rest/v1/config?clave=eq.donaciones_total&select=valor', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const donData = await rDonaciones.json();
      const donaciones = donData && donData[0] ? donData[0].valor : '0';

      return res.status(200).json({
        mascotas:    parseCount(rMascotas),
        adopciones:  parseCount(rAdopciones),
        perdidos:    parseCount(rPerdidos),
        recuperados: parseCount(rRecuperados),
        donaciones:  donaciones
      });
    }

    // ── getPromos ─────────────────────────────────────────────
    if (action === 'getPromos') {
      const nivel = req.query.nivel || 'basico'; // basico | premium
      // Traer promos activas y no expiradas
      const ahora = new Date().toISOString();
      let url = SUPABASE_URL + '/rest/v1/promos?activo=eq.true'
        + '&or=(fecha_fin.is.null,fecha_fin.gte.' + ahora + ')'
        + '&order=nivel.asc,created_at.desc';
      const r = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const data = await r.json();
      // Si es basico, filtrar solo basicas. Si es premium, devolver todas
      // Devolver todas — el frontend filtra por tab y controla el canje
      const promos = Array.isArray(data) ? data : [];
      return res.status(200).json({ promos });
    }

    // ── createPromo (admin) ───────────────────────────────────
    if (action === 'createPromo' && req.method === 'POST') {
      const { titulo, descripcion, aliado, nivel, codigo, descuento, imagen, fecha_fin, especie, zona } = req.body;
      if (!titulo || !aliado) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=representation' },
        body: JSON.stringify({ titulo, descripcion, aliado, nivel: nivel||'basico', codigo, descuento, imagen, fecha_fin: fecha_fin||null, especie: especie||'todos', zona: zona||'todos', activo: true })
      });
      const data = await r.json();
      return res.status(200).json({ ok: r.ok, id: data[0]?.id });
    }

    // ── updatePromo (admin) ───────────────────────────────────
    if (action === 'updatePromo' && req.method === 'POST') {
      const { id, ...fields } = req.body;
      if (!id) return res.status(200).json({ ok: false, error: 'id requerido' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/promos?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify(fields)
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── deletePromo (admin) ───────────────────────────────────
    if (action === 'deletePromo' && req.method === 'POST') {
      const { id } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/promos?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── activarPremium (admin) ───────────────────────────────
    if (action === 'activarPremium' && req.method === 'POST') {
      const { uid, meses } = req.body;
      if (!uid) return res.status(200).json({ ok: false, error: 'uid requerido' });
      const hoy = new Date();
      hoy.setMonth(hoy.getMonth() + (meses || 12));
      const hasta = hoy.toISOString().split('T')[0];
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ premium: true, premium_hasta: hasta })
      });
      return res.status(200).json({ ok: r.ok, premium_hasta: hasta });
    }

    // ── desactivarPremium (admin) ─────────────────────────────
    if (action === 'desactivarPremium' && req.method === 'POST') {
      const { uid } = req.body;
      if (!uid) return res.status(200).json({ ok: false, error: 'uid requerido' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ premium: false, premium_hasta: null })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── activarPremiumGratis — 3 meses por perfil completo ───
    if (action === 'activarPremiumGratis' && req.method === 'POST') {
      const { uid } = req.body;
      if (!uid) return res.status(200).json({ ok: false, error: 'uid requerido' });
      // Verificar que no tenga ya premium activo
      const check = await fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid) + '&select=premium,premium_hasta', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await check.json();
      if (data[0]?.premium) return res.status(200).json({ ok: false, error: 'ya tiene premium' });
      const hasta = new Date();
      hasta.setMonth(hasta.getMonth() + 3);
      const hastaStr = hasta.toISOString().split('T')[0];
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ premium: true, premium_hasta: hastaStr })
      });
      return res.status(200).json({ ok: r.ok, premium_hasta: hastaStr, meses: 3 });
    }

    // ── addMensajePublico ─────────────────────────────────────
    // Guarda mensaje publico directamente en Supabase (para angelitos/cumpleanos)
    if (action === 'addMensajePublico' && req.method === 'POST') {
      const { uid: uidRaw, autor, mensaje, nombreMascota } = req.body;
      const uid = (uidRaw || '').toUpperCase();
      if (!uid || !autor || !mensaje) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ uid_mascota: uid, autor, mensaje, nombre_mascota: nombreMascota || '' })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── publicarMensaje ────────────────────────────────────────
    // NUEVO: faltaba este handler. galeria.html (botón "🎉 Felicitar" /
    // "🌈 mensaje de apoyo") llama a esta acción con un payload distinto
    // (uid_destinatario, email_emisor) al de addMensajePublico — antes
    // caía sin manejador y el frontend igual mostraba "✅ Mensaje enviado"
    // aunque nunca se guardaba nada. Guarda en la MISMA tabla "mensajes"
    // que usa perfil.html/p.html, resolviendo el nombre del emisor a
    // partir de su email (la galería no le pide que escriba su nombre).
    if (action === 'publicarMensaje' && req.method === 'POST') {
      const { uid_destinatario, email_emisor, mensaje, tipo } = req.body;
      const uid = (uid_destinatario || '').toUpperCase();
      if (!uid || !mensaje) return res.status(200).json({ ok: false, error: 'Faltan campos' });

      let autor = email_emisor || 'Alguien';
      let nombreMascota = '';
      try {
        const rEmisor = await fetch(
          SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent((email_emisor || '').toLowerCase()) + '&select=dueno&limit=1',
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
        );
        const rowsEmisor = await rEmisor.json();
        if (rowsEmisor && rowsEmisor[0] && rowsEmisor[0].dueno) autor = rowsEmisor[0].dueno;
      } catch (e) { /* si falla, usamos el email tal cual */ }
      try {
        const rDest = await fetch(
          SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid) + '&select=nombre&limit=1',
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
        );
        const rowsDest = await rDest.json();
        if (rowsDest && rowsDest[0] && rowsDest[0].nombre) nombreMascota = rowsDest[0].nombre;
      } catch (e) { /* no bloquea el envío si falla */ }

      const r = await fetch(SUPABASE_URL + '/rest/v1/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ uid_mascota: uid, autor, mensaje, nombre_mascota: nombreMascota })
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        console.error('publicarMensaje insert failed:', r.status, errText);
      }
      return res.status(200).json({ ok: r.ok });
    }

    if (action === 'deleteMascota' && req.method === 'POST') {
      const { uid } = req.body;
      if (!uid) return res.status(200).json({ ok: false, error: 'Falta uid' });
      // Use service role to bypass RLS
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid.toUpperCase()), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' }
      });
      return res.status(200).json({ ok: r.ok, status: r.status });
    }

    // ── pausarPublicacion ──────────────────────────────────────
    if (action === 'pausarPublicacion' && req.method === 'POST') {
      const { id, pausado, pausado_razon } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividades?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ pausado: pausado === true, pausado_razon: pausado_razon || null })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getAfiliados ───────────────────────────────────────────
    if (action === 'getAfiliados') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividades?es_afiliado=eq.true&select=id,afiliado_email,afiliado_plan,afiliado_vence,afiliado_periodo,titulo,descripcion,tipo,activo,pausado,pausado_razon,created_at&order=created_at.desc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ afiliados: await r.json() });
    }

    // ── verSorteoGanadores (admin) ────────────────────────────
    // Revela quiénes son los 2 ganadores del sorteo, con su nombre
    // de dueño para que sea fácil identificarlos.
    if (action === 'verSorteoGanadores') {
      const rConf = await fetch(
        SUPABASE_URL + '/rest/v1/config?clave=eq.sorteo_ganadores&select=valor',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const confRows = await rConf.json();
      if (!Array.isArray(confRows) || !confRows.length || !confRows[0].valor) {
        return res.status(200).json({ ok: true, sorteado: false, ganadores: [] });
      }
      const emails = confRows[0].valor.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

      const rDuenos = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?email=in.(' + emails.map(e => '"' + e + '"').join(',') + ')&select=email,dueno,nombre',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const duenosRows = await rDuenos.json();
      const porEmail = {};
      (Array.isArray(duenosRows) ? duenosRows : []).forEach(m => {
        if (!porEmail[m.email]) porEmail[m.email] = { dueno: m.dueno, mascotas: [] };
        porEmail[m.email].mascotas.push(m.nombre);
      });

      // Ver si ya giraron y reclamaron
      const rGiros = await fetch(
        SUPABASE_URL + '/rest/v1/wc_sorteo?email=in.(' + emails.map(e => '"' + e + '"').join(',') + ')&select=email,resultado,created_at',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const girosRows = await rGiros.json();
      const giroPorEmail = {};
      (Array.isArray(girosRows) ? girosRows : []).forEach(g => { giroPorEmail[g.email] = g; });

      const ganadores = emails.map(em => ({
        email: em,
        dueno: (porEmail[em] && porEmail[em].dueno) || '(sin encontrar)',
        mascotas: (porEmail[em] && porEmail[em].mascotas) || [],
        yaGiro: !!giroPorEmail[em],
        fechaGiro: giroPorEmail[em] ? giroPorEmail[em].created_at : null
      }));

      return res.status(200).json({ ok: true, sorteado: true, ganadores });
    }

    // ── getSinonimosRaza (admin) ────────────────────────────────
    if (action === 'getSinonimosRaza') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/raza_sinonimos?select=*&order=raza_canonica.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ sinonimos: Array.isArray(data) ? data : [] });
    }

    // ── guardarSinonimoRaza (crear o actualizar — variante es única) ──
    if (action === 'guardarSinonimoRaza' && req.method === 'POST') {
      const { raza_variante, raza_canonica } = req.body;
      if (!raza_variante || !raza_canonica) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/raza_sinonimos?on_conflict=raza_variante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ raza_variante, raza_canonica })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarSinonimoRaza (admin) ─────────────────────────────
    if (action === 'eliminarSinonimoRaza' && req.method === 'POST') {
      const { raza_variante } = req.body;
      if (!raza_variante) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/raza_sinonimos?raza_variante=eq.' + encodeURIComponent(raza_variante), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getProductosTienda (público) ────────────────────────────
    // ── getBlogPosts (últimos artículos del blog de Wix, vía RSS) ──
    // ── buscarContenido (buscador interno, sin IA — salud + lugares + blog) ──
    // ── getUsuariosNuncaVolvieron (admin) ────────────────────────
    if (action === 'getUsuariosNuncaVolvieron') {
      const [mascotasResp, enviosResp] = await Promise.all([
        fetch(SUPABASE_URL + '/rest/v1/mascotas?ultima_actividad=is.null&uid=neq.PETMI-OFICIAL&select=uid,nombre,email,dueno,whatsapp,angelito,created_at', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        }),
        fetch(SUPABASE_URL + '/rest/v1/reactivacion_envios?select=email,semana,enviado_at', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        })
      ]);
      const mascotas = await mascotasResp.json();
      const envios = await enviosResp.json();
      const enviosPorEmail = {};
      (Array.isArray(envios) ? envios : []).forEach(e => {
        const k = (e.email || '').toLowerCase();
        if (!enviosPorEmail[k]) enviosPorEmail[k] = [];
        enviosPorEmail[k].push(e.semana);
      });

      const familias = {};
      (Array.isArray(mascotas) ? mascotas : []).forEach(m => {
        if (m.angelito) return; // no incluir angelitos
        const k = (m.email || '').toLowerCase();
        if (!k) return;
        if (!familias[k]) familias[k] = { email: m.email, dueno: m.dueno || '', whatsapp: m.whatsapp || '', mascotas: [], primeraFecha: m.created_at };
        if (m.nombre) familias[k].mascotas.push(m.nombre);
        if (new Date(m.created_at) < new Date(familias[k].primeraFecha)) familias[k].primeraFecha = m.created_at;
      });

      const lista = Object.values(familias).map(f => {
        const semanasEnviadas = enviosPorEmail[f.email.toLowerCase()] || [];
        return {
          email: f.email, dueno: f.dueno, whatsapp: f.whatsapp,
          mascotas: f.mascotas.length ? f.mascotas.join(', ') : '(sin nombre)',
          registradoEl: f.primeraFecha,
          correosEnviados: semanasEnviadas.length,
          ultimaSemanaEnviada: semanasEnviadas.length ? Math.max(...semanasEnviadas) : null
        };
      }).sort((a, b) => new Date(b.registradoEl) - new Date(a.registradoEl));

      return res.status(200).json({ usuarios: lista });
    }

    if (action === 'buscarContenido') {
      const qOriginal = (req.query.q || '').toLowerCase().trim();
      if (!qOriginal || qOriginal.length < 2) return res.status(200).json({ salud: [], lugares: [], blog: [] });

      // Palabras vacías que no aportan al match (para no diluir la búsqueda)
      const stopwords = ['el','la','los','las','de','del','para','con','mi','tu','su','y','o','un','una','que','es','en','al','por','como','mejor','buen','buena'];
      const palabras = qOriginal.split(/\s+/).filter(w => (w.length >= 3 || /^\d+$/.test(w)) && stopwords.indexOf(w) === -1);
      // Si tras quitar stopwords no queda nada útil, usamos la frase completa tal cual
      const terminos = palabras.length ? palabras : [qOriginal];

      function puntaje(txt) {
        const t = (txt || '').toLowerCase();
        let score = 0;
        terminos.forEach(function(p) { if (t.indexOf(p) >= 0) score++; });
        return score;
      }
      function coincide(campos) {
        return puntaje(campos.join(' ')) > 0;
      }

      const [reglasResp, lugaresResp] = await Promise.all([
        fetch(SUPABASE_URL + '/rest/v1/reglas_salud?activo=eq.true&select=*', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        }),
        fetch(SUPABASE_URL + '/rest/v1/lugares?activo=eq.true&select=*', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        })
      ]);
      const reglas = await reglasResp.json();
      const lugares = await lugaresResp.json();

      const saludMatches = (Array.isArray(reglas) ? reglas : [])
        .map(r => ({ r, score: puntaje([r.nombre, r.descripcion, r.tip, r.tipo, r.especie].join(' ')) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(x => ({ tipo: 'salud', nombre: x.r.nombre, descripcion: x.r.descripcion || x.r.tip || '', especie: x.r.especie, link: '/calendario-vacunas.html' }));

      const lugaresMatches = (Array.isArray(lugares) ? lugares : [])
        .map(l => ({ l, score: puntaje([l.nombre, l.tipo, l.zona, l.direccion].join(' ')) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(x => ({ tipo: 'lugar', nombre: x.l.nombre, descripcion: (x.l.tipo || '') + (x.l.zona ? ' · Zona ' + x.l.zona : ''), link: '/lugares.html' }));

      let blogMatches = [];
      try {
        const rssResp = await fetch('https://www.revistapetmi.com/blog-feed.xml');
        const xml = await rssResp.text();
        function extraer(bloque, tag) {
          const m = bloque.match(new RegExp('<' + tag + '[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/' + tag + '>'));
          return m ? m[1].trim() : '';
        }
        const bloques = xml.split('<item>').slice(1);
        blogMatches = bloques
          .map(b => ({ title: extraer(b, 'title'), link: extraer(b, 'link'), desc: extraer(b, 'description').replace(/<[^>]+>/g, '') }))
          .map(p => ({ p, score: puntaje(p.title + ' ' + p.desc) }))
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map(x => ({ tipo: 'blog', nombre: x.p.title, descripcion: x.p.desc.substring(0, 140), link: x.p.link }));
      } catch (e) { /* si falla el blog, seguimos con lo demás */ }

      // Registrar la búsqueda (no bloqueante, no afecta la respuesta si falla)
      const totalResultados = saludMatches.length + lugaresMatches.length + blogMatches.length;
      fetch(SUPABASE_URL + '/rest/v1/busquedas_log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ query: qOriginal, email: (req.query.email || '').toLowerCase() || null, resultados: totalResultados })
      }).catch(() => {});

      return res.status(200).json({ salud: saludMatches, lugares: lugaresMatches, blog: blogMatches });
    }

    if (action === 'getBlogPosts') {
      try {
        const rssUrl = 'https://www.revistapetmi.com/blog-feed.xml';
        const rResp = await fetch(rssUrl);
        const xml = await rResp.text();

        function extraer(bloque, tag) {
          const m = bloque.match(new RegExp('<' + tag + '[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/' + tag + '>'));
          return m ? m[1].trim() : '';
        }

        const bloques = xml.split('<item>').slice(1).slice(0, 6);
        const posts = bloques.map(function(b) {
          const title = extraer(b, 'title');
          const link = extraer(b, 'link');
          const descRaw = extraer(b, 'description');
          const excerpt = descRaw.replace(/<[^>]+>/g, '').trim().substring(0, 160);
          const imgMatch = b.match(/<enclosure[^>]*url="([^"]+)"/) || b.match(/<media:content[^>]*url="([^"]+)"/) || b.match(/<img[^>]*src="([^"]+)"/);
          const image = imgMatch ? imgMatch[1] : '';
          const pubDate = extraer(b, 'pubDate');
          return { title, link, excerpt, image, pubDate };
        }).filter(function(p) { return p.title && p.link; });

        return res.status(200).json({ posts });
      } catch (e) {
        return res.status(200).json({ posts: [], error: e.message });
      }
    }

    // ── registrarPedido (log cada vez que alguien pide por WhatsApp) ──
    if (action === 'registrarPedido' && req.method === 'POST') {
      const { email, mascotaNombre, item, tipo } = req.body;
      if (!item) return res.status(200).json({ ok: false });
      fetch(SUPABASE_URL + '/rest/v1/pedidos_tienda_log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ email: (email||'').toLowerCase() || null, mascota_nombre: mascotaNombre || null, item, tipo: tipo || 'alimento' })
      }).catch(() => {});
      return res.status(200).json({ ok: true });
    }

    // ── getPedidosTiendaAdmin (admin) ────────────────────────────
    if (action === 'getPedidosTiendaAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/pedidos_tienda_log?select=*&order=created_at.desc&limit=200', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ pedidos: Array.isArray(data) ? data : [] });
    }

    // ── getAlimentosCatalogo (público — para buscar la foto de un alimento) ──
    if (action === 'getAlimentosCatalogo') {
      const [catResp, sinResp] = await Promise.all([
        fetch(SUPABASE_URL + '/rest/v1/alimentos_catalogo?select=*', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        }),
        fetch(SUPABASE_URL + '/rest/v1/alimentos_sinonimos?select=*', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        })
      ]);
      const data = await catResp.json();
      const sinonimos = await sinResp.json();
      return res.status(200).json({ alimentos: Array.isArray(data) ? data : [], sinonimos: Array.isArray(sinonimos) ? sinonimos : [] });
    }

    // ── getAlimentosUsadosAdmin (lista de alimentos distintos que la gente usa, para poder catalogarlos) ──
    if (action === 'getAlimentosUsadosAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascotas?alimento=not.is.null&select=alimento,especie&uid=neq.PETMI-OFICIAL', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      const rows = Array.isArray(data) ? data : [];
      const conteo = {};
      rows.forEach(m => {
        const nombre = (m.alimento || '').trim();
        const especie = m.especie || 'Sin especie';
        if (!nombre) return;
        const clave = nombre + '||' + especie;
        if (!conteo[clave]) conteo[clave] = { nombre, especie, veces: 0 };
        conteo[clave].veces++;
      });
      const catalogoResp = await fetch(SUPABASE_URL + '/rest/v1/alimentos_catalogo?select=nombre,especie,foto', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const catalogo = await catalogoResp.json();
      const fotosPorClave = {};
      (Array.isArray(catalogo) ? catalogo : []).forEach(c => { fotosPorClave[c.nombre + '||' + (c.especie||'Todos')] = c.foto; });

      const sinResp = await fetch(SUPABASE_URL + '/rest/v1/alimentos_sinonimos?select=*', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const sinonimosData = await sinResp.json();
      const sinonimos = Array.isArray(sinonimosData) ? sinonimosData : [];

      function buscarFoto(nombre, especie) {
        // 1. Coincidencia directa en el catálogo (misma especie)
        if (fotosPorClave[nombre + '||' + especie]) return fotosPorClave[nombre + '||' + especie];
        // 2. Vía sinónimo — resuelto hacia el nombre canónico, en cualquier especie que tenga foto
        const sin = sinonimos.find(s => s.variante === nombre);
        if (sin) {
          const directo = fotosPorClave[sin.alimento_canonico + '||' + especie];
          if (directo) return directo;
          const cualquierEspecie = Object.keys(fotosPorClave).find(k => k.startsWith(sin.alimento_canonico + '||') && fotosPorClave[k]);
          if (cualquierEspecie) return fotosPorClave[cualquierEspecie];
        }
        return null;
      }

      const lista = Object.values(conteo).map(x => {
        const foto = buscarFoto(x.nombre, x.especie);
        return { nombre: x.nombre, especie: x.especie, veces: x.veces, tieneFoto: !!foto, foto: foto || null };
      }).sort((a, b) => b.veces - a.veces);

      return res.status(200).json({ alimentos: lista });
    }

    // ── guardarAlimentoCatalogo (admin) ──────────────────────────
    if (action === 'guardarAlimentoCatalogo' && req.method === 'POST') {
      const { nombre, foto, especie } = req.body;
      if (!nombre) return res.status(200).json({ ok: false, error: 'Falta nombre' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/alimentos_catalogo?on_conflict=nombre,especie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ nombre, foto: foto || null, especie: especie || 'Todos' })
      });
      if (!r.ok) {
        const errTxt = await r.text().catch(() => '');
        return res.status(200).json({ ok: false, error: errTxt });
      }
      return res.status(200).json({ ok: true });
    }

    // ── registrarPedido (guarda el pedido cuando alguien toca "Pedir por WhatsApp") ──
    if (action === 'registrarPedido' && req.method === 'POST') {
      const { uid_mascota, nombre_mascota, email, producto, origen } = req.body;
      if (!producto) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/tienda_pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ uid_mascota: uid_mascota || null, nombre_mascota: nombre_mascota || '', email: email || '', producto, origen: origen || 'tienda' })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getPedidosTienda (admin) ────────────────────────────────
    if (action === 'getPedidosTienda') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/tienda_pedidos?select=*&order=created_at.desc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ pedidos: Array.isArray(data) ? data : [] });
    }

    // ── actualizarPedido (admin — marcar atendido) ──────────────
    if (action === 'actualizarPedido' && req.method === 'POST') {
      const { id, estado } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/tienda_pedidos?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ estado })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getSinonimosAlimento (admin) ────────────────────────────
    if (action === 'getSinonimosAlimento') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/alimentos_sinonimos?select=*&order=alimento_canonico.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ sinonimos: Array.isArray(data) ? data : [] });
    }

    // ── guardarSinonimoAlimento (unificar una variante con el canónico) ──
    if (action === 'guardarSinonimoAlimento' && req.method === 'POST') {
      const { variante, alimento_canonico } = req.body;
      if (!variante || !alimento_canonico) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/alimentos_sinonimos?on_conflict=variante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ variante, alimento_canonico })
      });
      if (!r.ok) {
        const errTxt = await r.text().catch(() => '');
        console.error('guardarSinonimoAlimento failed:', r.status, errTxt);
        return res.status(200).json({ ok: false, error: errTxt || ('HTTP ' + r.status) });
      }
      return res.status(200).json({ ok: true });
    }

    // ── eliminarSinonimoAlimento (admin) ────────────────────────
    if (action === 'eliminarSinonimoAlimento' && req.method === 'POST') {
      const { variante } = req.body;
      if (!variante) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/alimentos_sinonimos?variante=eq.' + encodeURIComponent(variante), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    if (action === 'getProductosTienda') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/tienda_productos?activo=eq.true&select=*&order=categoria.asc,orden.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ productos: Array.isArray(data) ? data : [] });
    }

    // ── getProductosTiendaAdmin (todos, incluye inactivos) ──────
    if (action === 'getProductosTiendaAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/tienda_productos?select=*&order=categoria.asc,orden.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ productos: Array.isArray(data) ? data : [] });
    }

    // ── crearProductoTienda (admin) ─────────────────────────────
    if (action === 'crearProductoTienda' && req.method === 'POST') {
      const { nombre, descripcion, precio, imagen, categoria, especie, orden, envio_incluido, costo_envio } = req.body;
      if (!nombre || !categoria) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/tienda_productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ nombre, descripcion: descripcion || '', precio: precio || null, imagen: imagen || null, categoria, especie: especie || 'Todos', orden: orden || 0, activo: true, envio_incluido: envio_incluido || false, costo_envio: costo_envio || null })
      });
      if (!r.ok) {
        const errTxt = await r.text().catch(() => '');
        console.error('crearProductoTienda failed:', r.status, errTxt);
        return res.status(200).json({ ok: false, error: errTxt || ('HTTP ' + r.status) });
      }
      return res.status(200).json({ ok: true });
    }

    // ── actualizarProductoTienda (admin) ─────────────────────────
    if (action === 'actualizarProductoTienda' && req.method === 'POST') {
      const { id, ...campos } = req.body;
      if (!id) return res.status(200).json({ ok: false, error: 'id requerido' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/tienda_productos?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify(campos)
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarProductoTienda (admin) ─────────────────────────────
    if (action === 'eliminarProductoTienda' && req.method === 'POST') {
      const { id } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/tienda_productos?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getLikesResumen (conteos + cuáles ya dio like el usuario) ──
    if (action === 'getLikesResumen' && req.method === 'POST') {
      const { uids, email } = req.body;
      if (!Array.isArray(uids) || !uids.length) return res.status(200).json({ conteos: {}, misLikes: [] });
      const uidsUpper = uids.map(u => String(u).toUpperCase());
      const r = await fetch(SUPABASE_URL + '/rest/v1/likes_mascotas?uid_mascota=in.(' + uidsUpper.map(u => encodeURIComponent(u)).join(',') + ')&select=uid_mascota,email_liker', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      const conteos = {};
      const misLikes = [];
      const emailL = (email || '').trim().toLowerCase();
      (Array.isArray(data) ? data : []).forEach(row => {
        conteos[row.uid_mascota] = (conteos[row.uid_mascota] || 0) + 1;
        if (emailL && row.email_liker === emailL) misLikes.push(row.uid_mascota);
      });
      return res.status(200).json({ conteos, misLikes });
    }

    // ── toggleLike ───────────────────────────────────────────────
    if (action === 'toggleLike' && req.method === 'POST') {
      const { uid_mascota, email } = req.body;
      if (!uid_mascota || !email) return res.status(200).json({ ok: false });
      const uid = uid_mascota.toUpperCase();
      const emailL = email.trim().toLowerCase();

      const rCheck = await fetch(SUPABASE_URL + '/rest/v1/likes_mascotas?uid_mascota=eq.' + encodeURIComponent(uid) + '&email_liker=eq.' + encodeURIComponent(emailL) + '&select=id', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const existente = await rCheck.json();

      if (Array.isArray(existente) && existente.length) {
        await fetch(SUPABASE_URL + '/rest/v1/likes_mascotas?id=eq.' + existente[0].id, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        });
        return res.status(200).json({ ok: true, liked: false });
      } else {
        await fetch(SUPABASE_URL + '/rest/v1/likes_mascotas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ uid_mascota: uid, email_liker: emailL })
        });
        return res.status(200).json({ ok: true, liked: true });
      }
    }

    // ── getReglasSalud (público — usado por salud.html) ────────
    if (action === 'getReglasSalud') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/reglas_salud?activo=eq.true&select=*&order=orden.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ reglas: Array.isArray(data) ? data : [] });
    }

    // ── actualizarTipoPelo ──────────────────────────────────────
    if (action === 'actualizarTipoPelo' && req.method === 'POST') {
      const { uid, tipo_pelo } = req.body;
      if (!uid || !tipo_pelo) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid.toUpperCase()), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ tipo_pelo })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getReglasSaludAdmin (todas, incluye inactivas) ─────────
    if (action === 'getReglasSaludAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/reglas_salud?select=*&order=especie.asc,orden.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ reglas: Array.isArray(data) ? data : [] });
    }

    // ── crearReglaSalud (admin) ─────────────────────────────────
    if (action === 'crearReglaSalud' && req.method === 'POST') {
      const { especie, tipo_pelo, nombre, tipo, frecuencia_meses, tip, descripcion, etiqueta, link_compra, texto_boton_compra, orden } = req.body;
      if (!especie || !nombre || !tipo || !frecuencia_meses) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/reglas_salud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ especie, tipo_pelo: tipo_pelo || null, nombre, tipo, frecuencia_meses, tip: tip || '', descripcion: descripcion || '', etiqueta: etiqueta || null, link_compra: link_compra || null, texto_boton_compra: texto_boton_compra || null, orden: orden || 0, activo: true })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── actualizarReglaSalud (admin) ─────────────────────────────
    if (action === 'actualizarReglaSalud' && req.method === 'POST') {
      const { id, ...campos } = req.body;
      if (!id) return res.status(200).json({ ok: false, error: 'id requerido' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/reglas_salud?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify(campos)
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarReglaSalud (admin) ────────────────────────────────
    if (action === 'eliminarReglaSalud' && req.method === 'POST') {
      const { id } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/reglas_salud?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getCondicionesDisponibles (público — lista para elegir) ──
    if (action === 'getCondicionesDisponibles') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/condiciones_disponibles?activo=eq.true&select=*&order=nombre.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ condiciones: Array.isArray(data) ? data : [] });
    }

    // ── getMascotaCondiciones (condiciones de una mascota específica) ──
    if (action === 'getMascotaCondiciones') {
      const uid = (req.query.uid || '').toUpperCase();
      if (!uid) return res.status(200).json({ condiciones: [] });
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascota_condiciones?uid_mascota=eq.' + encodeURIComponent(uid) + '&select=*,condiciones_disponibles(*)', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ condiciones: Array.isArray(data) ? data : [] });
    }

    // ── agregarCondicionMascota ───────────────────────────────
    if (action === 'agregarCondicionMascota' && req.method === 'POST') {
      const { uid_mascota, condicion_id, fecha_diagnostico } = req.body;
      const uid = (uid_mascota || '').toUpperCase();
      if (!uid || !condicion_id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascota_condiciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ uid_mascota: uid, condicion_id, fecha_diagnostico: fecha_diagnostico || null })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── quitarCondicionMascota ─────────────────────────────────
    if (action === 'quitarCondicionMascota' && req.method === 'POST') {
      const { id } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascota_condiciones?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getCondicionesAdmin (todas, incluye inactivas) ─────────
    if (action === 'getCondicionesAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/condiciones_disponibles?select=*&order=nombre.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ condiciones: Array.isArray(data) ? data : [] });
    }

    // ── crearCondicion (admin) ─────────────────────────────────
    if (action === 'crearCondicion' && req.method === 'POST') {
      const { nombre, recomendacion, tip, link_compra, texto_boton_compra } = req.body;
      if (!nombre || !recomendacion) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/condiciones_disponibles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ nombre, recomendacion, tip: tip || '', link_compra: link_compra || null, texto_boton_compra: texto_boton_compra || null, activo: true })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── actualizarCondicion (admin) ─────────────────────────────
    if (action === 'actualizarCondicion' && req.method === 'POST') {
      const { id, ...campos } = req.body;
      if (!id) return res.status(200).json({ ok: false, error: 'id requerido' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/condiciones_disponibles?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify(campos)
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarCondicion (admin) ────────────────────────────────
    if (action === 'eliminarCondicion' && req.method === 'POST') {
      const { id } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/condiciones_disponibles?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getRegistrosSalud ──────────────────────────────────────
    if (action === 'getRegistrosSalud') {
      const uid = (req.query.uid || '').toUpperCase();
      if (!uid) return res.status(200).json({ registros: [] });
      const r = await fetch(SUPABASE_URL + '/rest/v1/registros_salud?uid_mascota=eq.' + encodeURIComponent(uid) + '&select=*&order=fecha_aplicacion.desc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ registros: Array.isArray(data) ? data : [] });
    }

    // ── agregarRegistroSalud ───────────────────────────────────
    if (action === 'agregarRegistroSalud' && req.method === 'POST') {
      const { uid_mascota, tipo, nombre_especifico, fecha_aplicacion, foto_comprobante, email } = req.body;
      const uid = (uid_mascota || '').toUpperCase();
      if (!uid || !tipo || !nombre_especifico || !fecha_aplicacion) {
        return res.status(200).json({ ok: false, error: 'Faltan campos' });
      }
      const r = await fetch(SUPABASE_URL + '/rest/v1/registros_salud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ uid_mascota: uid, tipo, nombre_especifico, fecha_aplicacion, foto_comprobante: foto_comprobante || null })
      });
      if (!r.ok) { console.error('agregarRegistroSalud failed:', r.status, await r.text().catch(()=>'')); return res.status(200).json({ ok:false }); }

      // Puntos: +2 por agregar el registro, +1 extra si subió foto (no bloqueante)
      if (email) {
        const pts = foto_comprobante ? 3 : 2;
        fetch(SUPABASE_URL + '/rest/v1/puntos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ email: email.toLowerCase(), accion: 'registro_salud', puntos: pts, referencia: uid })
        }).catch(() => {});
      }
      return res.status(200).json({ ok: true });
    }

    // ── getRuletaPremios (público — para dibujar la rueda) ─────
    if (action === 'getRuletaPremios') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/ruleta_premios?activo=eq.true&select=*&order=orden.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ premios: Array.isArray(data) ? data : [] });
    }

    // ── girarRuleta ─────────────────────────────────────────────
    // Una sola vez por email, para siempre. Si ya giró, devuelve el
    // mismo resultado guardado (no vuelve a sortear).
    // ── checkRuletaGiro (solo consulta, no dispara giro) ────────
    if (action === 'checkRuletaGiro') {
      const email = (req.query.email || '').trim().toLowerCase();
      if (!email) return res.status(200).json({ ya_giro: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/ruleta_giros?email=eq.' + encodeURIComponent(email) + '&select=*,ruleta_premios(*)', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      if (Array.isArray(data) && data.length) {
        return res.status(200).json({ ya_giro: true, premio: data[0].ruleta_premios });
      }
      return res.status(200).json({ ya_giro: false });
    }

    if (action === 'girarRuleta' && req.method === 'POST') {
      const { email, uid_mascota, dueno } = req.body;
      if (!email || !uid_mascota) return res.status(200).json({ ok: false, error: 'Faltan datos' });
      const emailL = email.trim().toLowerCase();

      const rYaGiro = await fetch(SUPABASE_URL + '/rest/v1/ruleta_giros?email=eq.' + encodeURIComponent(emailL) + '&select=*,ruleta_premios(*)', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const yaGiroData = await rYaGiro.json();
      if (Array.isArray(yaGiroData) && yaGiroData.length) {
        return res.status(200).json({ ok: true, ya_giro: true, premio: yaGiroData[0].ruleta_premios });
      }

      const rPremios = await fetch(SUPABASE_URL + '/rest/v1/ruleta_premios?activo=eq.true&select=*', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const premios = await rPremios.json();
      if (!Array.isArray(premios) || !premios.length) return res.status(200).json({ ok: false, error: 'Sin premios configurados' });

      const totalPeso = premios.reduce((s, p) => s + Number(p.probabilidad || 0), 0);
      let dado = Math.random() * totalPeso;
      let elegido = premios[premios.length - 1];
      for (const p of premios) {
        if (dado < Number(p.probabilidad || 0)) { elegido = p; break; }
        dado -= Number(p.probabilidad || 0);
      }

      // Guardar el giro (esto es lo que evita que vuelva a girar)
      await fetch(SUPABASE_URL + '/rest/v1/ruleta_giros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ uid_mascota, email: emailL, premio_id: elegido.id })
      });

      // Aplicar el premio segun su tipo
      if (elegido.tipo === 'puntos') {
        fetch(SUPABASE_URL + '/rest/v1/puntos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ email: emailL, accion: 'ruleta_premio', puntos: Number(elegido.valor || 0) })
        }).catch(() => {});
      } else if (elegido.tipo === 'premium') {
        const hasta = new Date();
        hasta.setMonth(hasta.getMonth() + Number(elegido.valor || 1));
        fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid_mascota.toUpperCase()), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ premium: true, premium_hasta: hasta.toISOString().split('T')[0] })
        }).catch(() => {});
      } else if (elegido.tipo === 'entrega') {
        // Crea una solicitud visible en el admin (misma tabla que los canjes de puntos.html)
        fetch(SUPABASE_URL + '/rest/v1/canjes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ email: emailL, dueno: dueno || '', premio: elegido.nombre + (elegido.patrocinador ? ' (' + elegido.patrocinador + ')' : ''), puntos_usados: 0, estado: 'pendiente' })
        }).catch(() => {});
      }

      // Notificar por correo — al ganador y a info@revistapetmi.com (no bloqueante)
      fetch('https://script.google.com/macros/s/AKfycbx3nn6M61a1Jcsx9FofnWfVBiuGMI6IhSvXHih0kDxIoh2cvh1xveWVEipMlARRW5l2/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notificarPremioRuleta', email: emailL, dueno: dueno || '', premio: elegido.nombre, tipo: elegido.tipo, patrocinador: elegido.patrocinador || '' })
      }).catch(() => {});

      return res.status(200).json({ ok: true, ya_giro: false, premio: elegido });
    }

    // ── getRuletaPremiosAdmin (todos, incluye inactivos) ───────
    if (action === 'getRuletaPremiosAdmin') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/ruleta_premios?select=*&order=orden.asc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ premios: Array.isArray(data) ? data : [] });
    }

    // ── getRuletaGiros (admin — historial de quién giró y qué ganó) ──
    if (action === 'getRuletaGiros') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/ruleta_giros?select=*,ruleta_premios(nombre,tipo,patrocinador)&order=created_at.desc', {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      const data = await r.json();
      return res.status(200).json({ giros: Array.isArray(data) ? data : [] });
    }

    // ── crearRuletaPremio (admin) ────────────────────────────────
    if (action === 'crearRuletaPremio' && req.method === 'POST') {
      const { nombre, tipo, valor, probabilidad, patrocinador, color, orden } = req.body;
      if (!nombre || !tipo || probabilidad == null) return res.status(200).json({ ok: false, error: 'Faltan campos' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/ruleta_premios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ nombre, tipo, valor: valor || null, probabilidad, patrocinador: patrocinador || null, color: color || '#00B4B4', orden: orden || 0, activo: true })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── actualizarRuletaPremio (admin) ───────────────────────────
    if (action === 'actualizarRuletaPremio' && req.method === 'POST') {
      const { id, ...campos } = req.body;
      if (!id) return res.status(200).json({ ok: false, error: 'id requerido' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/ruleta_premios?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify(campos)
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarRuletaPremio (admin) ──────────────────────────────
    if (action === 'eliminarRuletaPremio' && req.method === 'POST') {
      const { id } = req.body;
      if (!id) return res.status(200).json({ ok: false });
      const r = await fetch(SUPABASE_URL + '/rest/v1/ruleta_premios?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── getPuntos ──────────────────────────────────────────────
    if (action === 'getPuntos') {
      const email = req.query.email || '';
      if (!email) return res.status(200).json({ puntos: [], total: 0 });
      const r = await fetch(SUPABASE_URL + '/rest/v1/puntos?email=eq.' + encodeURIComponent(email) + '&select=accion,puntos,created_at&order=created_at.desc', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const rows = await r.json();
      const total = Array.isArray(rows) ? rows.reduce((s, r) => s + (r.puntos || 0), 0) : 0;
      return res.status(200).json({ puntos: rows || [], total });
    }

    // ── registrarPunto ─────────────────────────────────────────
    if (action === 'registrarPunto' && req.method === 'POST') {
      const { email, accion, puntos, referencia } = req.body;
      if (!email || !accion || !puntos) return res.status(200).json({ ok: false });
      // Evitar duplicados en acciones únicas
      const UNICAS = ['perfil_completo', 'instalar_app'];
      // juego_diario y trivia_diaria: max 1 por dia
      const hoy = new Date().toISOString().split('T')[0];
      const ACCIONES_DIARIAS = ['juego_diario', 'trivia_diaria'];
      if(ACCIONES_DIARIAS.includes(accion)){
        const checkDia = await fetch(SUPABASE_URL + '/rest/v1/puntos?email=eq.' + encodeURIComponent(email) + '&accion=eq.' + accion + '&created_at=gte.' + hoy + '&select=id&limit=1', { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } });
        const diaRows = await checkDia.json();
        if(Array.isArray(diaRows) && diaRows.length > 0) return res.status(200).json({ ok: false, msg: 'Ya jugaste hoy' });
      }
      if (UNICAS.includes(accion)) {
        const check = await fetch(SUPABASE_URL + '/rest/v1/puntos?email=eq.' + encodeURIComponent(email) + '&accion=eq.' + accion + '&select=id&limit=1', {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY }
        });
        const existing = await check.json();
        if (Array.isArray(existing) && existing.length > 0) return res.status(200).json({ ok: false, msg: 'Ya registrado' });
      }
      const r = await fetch(SUPABASE_URL + '/rest/v1/puntos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ email, accion, puntos, referencia: referencia || null })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── verificarLogin ────────────────────────────────────────
    if (action === 'verificarLogin' && req.method === 'POST') {
      const { email, nombreMascota } = req.body;
      if (!email || !nombreMascota) return res.status(200).json({ ok: false, msg: 'Datos incompletos' });

      const emailL  = email.trim().toLowerCase();
      const nombreL = nombreMascota.trim().toLowerCase();

      // Buscar todas las mascotas con ese email (case-insensitive)
      const queryUrl = SUPABASE_URL + '/rest/v1/mascotas?select=uid,nombre,email,dueno,foto,especie,premium,angelito&limit=20&email=eq.' + encodeURIComponent(emailL);
      const r = await fetch(queryUrl, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
        }
      });
      const mascotas = await r.json();

      // Si no es array o está vacío — email no existe
      if (!Array.isArray(mascotas) || mascotas.length === 0) {
        return res.status(200).json({ ok: false, msg: 'Datos incorrectos', code: 'NO_ACCOUNT' });
      }

      // Limpiar caracteres invisibles del nombre buscado
      const limpiar = s => s
        .normalize('NFD')           // separar acentos
        .replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/[^a-z0-9\s]/g, '') // solo alfanuméricos
        .replace(/\s+/g, ' ')
        .trim();

      const nombreNorm = limpiar(nombreL);

      // Buscar mascota que coincida — angelito puede ser bool o string
      const match = mascotas.find(m => {
        if (!m.nombre) return false;
        const esAngelito = m.angelito === true || m.angelito === 'true' || m.angelito === 1;
        if (esAngelito) return false;
        const nombreDB = limpiar(m.nombre.toLowerCase());
        return nombreDB === nombreNorm;
      });

      if (!match) {
        return res.status(200).json({ ok: false, msg: 'Datos incorrectos' });
      }

      // ✅ Login exitoso
      return res.status(200).json({
        ok: true,
        email: emailL,
        dueno: mascotas[0].dueno || '',
        mascotas: mascotas.filter(m => !m.angelito).map(m => ({
          uid: m.uid, nombre: m.nombre, especie: m.especie,
          foto: m.foto, premium: m.premium
        }))
      });
    }


    // ── enviarOTP — fallback login sin nombre ──────────────────
    if (action === 'enviarOTP' && req.method === 'POST') {
      const { email } = req.body;
      if (!email) return res.status(200).json({ ok: false });
      const emailL = email.trim().toLowerCase();

      // Verificar que el email existe
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?email=ilike.' + encodeURIComponent(emailL) +
        '&select=uid,dueno&limit=1',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const rows = await r.json();
      if (!rows || !rows.length) {
        return res.status(200).json({ ok: false, msg: 'No encontramos ese correo' });
      }

      // Generar código 6 dígitos
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Guardar en Supabase
      await fetch(SUPABASE_URL + '/rest/v1/otp_codes', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ email: emailL, code, expires_at: expires, used: false })
      });

      // Enviar via el servicio OTP aislado
      const resultadoLogin = await _enviarCodigoOTPPorCorreo(emailL, code, rows[0].dueno || '', 'enviarOTP (login)');
      if (!resultadoLogin.ok) return res.status(200).json({ ok: false, msg: resultadoLogin.error });
      return res.status(200).json({ ok: true });
    }

    // ── verificarOTP ───────────────────────────────────────────
    if (action === 'verificarOTP' && req.method === 'POST') {
      const { email, code } = req.body;
      if (!email || !code) return res.status(200).json({ ok: false });
      const emailL = email.trim().toLowerCase();
      const now = new Date().toISOString();

      const r = await fetch(
        SUPABASE_URL + '/rest/v1/otp_codes?email=ilike.' + encodeURIComponent(emailL) +
        '&code=eq.' + encodeURIComponent(code.trim()) +
        '&used=eq.false&expires_at=gte.' + encodeURIComponent(now) +
        '&select=id&order=created_at.desc&limit=1',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const rows = await r.json();
      if (!rows || !rows.length) {
        return res.status(200).json({ ok: false, msg: 'Código incorrecto o expirado' });
      }

      // Marcar como usado
      await fetch(SUPABASE_URL + '/rest/v1/otp_codes?id=eq.' + rows[0].id, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ used: true })
      });

      // Devolver datos del usuario
      const mr = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?email=ilike.' + encodeURIComponent(emailL) +
        '&select=uid,nombre,email,dueno,foto,especie,premium&limit=20',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const mascotas = await mr.json();
      return res.status(200).json({
        ok: true, email: emailL,
        dueno: mascotas[0]?.dueno || '',
        mascotas: mascotas.map(m => ({ uid: m.uid, nombre: m.nombre, especie: m.especie, foto: m.foto, premium: m.premium }))
      });
    }


    // ── wc_predecir ───────────────────────────────────────────
    if (action === 'wc_predecir' && req.method === 'POST') {
      const { email, partido_id, prediccion } = req.body;
      if (!email || !partido_id || !prediccion) return res.status(200).json({ ok: false });
      const emailL = email.trim().toLowerCase();
      const pr = await fetch(SUPABASE_URL + '/rest/v1/wc_partidos?id=eq.' + partido_id + '&select=fecha', { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } });
      const parts = await pr.json();
      if (!parts || !parts[0]) return res.status(200).json({ ok: false, msg: 'Partido no encontrado' });
      const cierre = new Date(new Date(parts[0].fecha).getTime() - 30*60*1000);
      if (cierre <= new Date()) return res.status(200).json({ ok: false, msg: 'Predicciones cerradas (30 min antes del partido)' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/wc_predicciones?on_conflict=email,partido_id', {
        method: 'POST',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ email: emailL, partido_id, prediccion })
      });
      return res.status(200).json({ ok: r.ok });
    }


    // ── wc_porcentajes ────────────────────────────────────────
    if (action === 'wc_porcentajes') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/wc_predicciones?select=partido_id,prediccion', { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } });
      const preds = await r.json();
      if (!Array.isArray(preds)) return res.status(200).json({ porcentajes: {} });

      const byPartido = {};
      preds.forEach(p => {
        if (!byPartido[p.partido_id]) byPartido[p.partido_id] = { equipo1: 0, empate: 0, equipo2: 0, total: 0 };
        if (byPartido[p.partido_id][p.prediccion] !== undefined) {
          byPartido[p.partido_id][p.prediccion]++;
          byPartido[p.partido_id].total++;
        }
      });

      const porcentajes = {};
      Object.keys(byPartido).forEach(id => {
        const d = byPartido[id];
        if (d.total === 0) { porcentajes[id] = null; return; }
        porcentajes[id] = {
          total: d.total,
          equipo1: Math.round((d.equipo1 / d.total) * 100),
          empate:  Math.round((d.empate  / d.total) * 100),
          equipo2: Math.round((d.equipo2 / d.total) * 100)
        };
      });

      return res.status(200).json({ porcentajes });
    }

    // ── wc_ranking ────────────────────────────────────────────
    if (action === 'wc_ranking') {
      // Paginar para evitar el límite de 1000 filas por defecto de Supabase
      const PAGE = 1000;
      let allPreds = [];
      let offset   = 0;
      let keepGoing = true;
      while (keepGoing) {
        const r = await fetch(
          SUPABASE_URL + '/rest/v1/wc_predicciones?select=email,puntos,acerto&acerto=not.is.null&limit=' + PAGE + '&offset=' + offset,
          { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'count=none' } }
        );
        const page = await r.json();
        if (!Array.isArray(page) || page.length === 0) { keepGoing = false; break; }
        allPreds = allPreds.concat(page);
        if (page.length < PAGE) keepGoing = false;
        offset += PAGE;
      }
      if (!allPreds.length) return res.status(200).json({ ranking: [] });
      const byEmail = {};
      allPreds.forEach(p => {
        if (!byEmail[p.email]) byEmail[p.email] = { email: p.email, puntos: 0, aciertos: 0, predicciones: 0 };
        byEmail[p.email].puntos      += (p.puntos || 0);
        byEmail[p.email].aciertos    += (p.acerto ? 1 : 0);
        byEmail[p.email].predicciones += 1;
      });
      const ranking = Object.values(byEmail).sort((a,b) => b.puntos-a.puntos || b.aciertos-a.aciertos).slice(0,50);
      return res.status(200).json({ ranking });
    }

    // ── wc_marcarResultado (admin) ────────────────────────────
    if (action === 'wc_marcarResultado' && req.method === 'POST') {
      const { partido_id, resultado, adminKey } = req.body;
      if (adminKey !== 'petmiadmin2026') return res.status(200).json({ ok: false, msg: 'No autorizado' });
      if (!partido_id || !resultado) return res.status(200).json({ ok: false });
      // Verificar que no tenga resultado ya
      const chk = await fetch(SUPABASE_URL + '/rest/v1/wc_partidos?id=eq.' + partido_id + '&select=resultado,fecha,fase', { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } });
      const chkData = await chk.json();
      if (chkData && chkData[0] && chkData[0].resultado) {
        return res.status(200).json({ ok: false, msg: 'Este partido ya tiene resultado: ' + chkData[0].resultado });
      }
      const fase = (chkData && chkData[0] && chkData[0].fase) || 'grupos';
      const fasesBonus = ['ronda16', 'cuartos', 'semis', 'final', 'bronze'];
      const esBonus = fasesBonus.includes(fase);
      await fetch(SUPABASE_URL + '/rest/v1/wc_partidos?id=eq.' + partido_id, { method: 'PATCH', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ resultado }) });
      const pr = await fetch(SUPABASE_URL + '/rest/v1/wc_predicciones?partido_id=eq.' + partido_id + '&select=id,email,prediccion', { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } });
      const preds = await pr.json();
      if (!Array.isArray(preds)) return res.status(200).json({ ok: true, procesados: 0 });
      let aciertos = 0;
      for (const pred of preds) {
        const acerto = pred.prediccion === resultado;
        // Ronda 16+: 5pts por acierto. Grupos/R32: 2pts ganador, 1pt empate
        const puntos = !acerto ? 0 : (esBonus ? 5 : (resultado === 'empate' ? 1 : 2));
        await fetch(SUPABASE_URL + '/rest/v1/wc_predicciones?id=eq.' + pred.id, { method: 'PATCH', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ acerto, puntos }) });
        if (acerto) aciertos++;
      }
      return res.status(200).json({ ok: true, procesados: preds.length, aciertos, fase, esBonus });
    }

    // ── markAngel ─────────────────────────────────────────────
    if (action === 'markAngel' && req.method === 'POST') {
      const { uid, esAngel, fechaAngelito } = req.body;
      if (!uid) return res.status(200).json({ ok: false, error: 'uid requerido' });

      const patch = { angelito: true };
      // Si el frontend no manda la fecha, usar HOY por defecto — sin esto,
      // fecha_angelito se queda vacía y el correo automático diario
      // (que busca fecha_angelito = hoy) nunca se dispara para esta mascota.
      patch.fecha_angelito = fechaAngelito || new Date().toISOString().split('T')[0];

      const r = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid.toUpperCase()),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(patch)
        }
      );
      if (!r.ok) {
        let errMsg = '';
        try { errMsg = JSON.stringify(await r.json()); } catch(e) { errMsg = await r.text().catch(()=>''); }
        console.error('[markAngel] Supabase error', r.status, errMsg);
        return res.status(200).json({ ok: false, error: errMsg });
      }
      console.log('[markAngel] OK — uid:', uid, 'fecha:', fechaAngelito);
      return res.status(200).json({ ok: true });
    }

    // ── verificarSorteo ──────────────────────────────────────────
    // Los 2 ganadores se eligen AL AZAR entre quienes participaron en
    // la quiniela, la primera vez que alguien verifica — y esa elección
    // se guarda en la tabla "config" para que sea la misma para todos
    // (usa on_conflict=clave con ignore-duplicates para evitar que 2
    // peticiones simultáneas elijan ganadores distintos).
    if (action === 'verificarSorteo' && req.method === 'POST') {
      const { email } = req.body;
      if (!email) return res.status(200).json({ ok: false, msg: 'Email requerido' });
      const emailL = email.trim().toLowerCase();
      try {
        const rPart = await fetch(
          SUPABASE_URL + '/rest/v1/wc_predicciones?email=ilike.' + encodeURIComponent(emailL) + '&select=email&limit=1',
          { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
        );
        const rows = await rPart.json();
        if (!Array.isArray(rows) || rows.length === 0)
          return res.status(200).json({ ok: false, msg: 'Este email no participó en la quiniela.' });

        const GANADORES = await _obtenerOElegirGanadoresSorteo();

        let yaGiro = false, resultadoPrevio = null;
        try {
          const rSpin = await fetch(
            SUPABASE_URL + '/rest/v1/wc_sorteo?email=eq.' + encodeURIComponent(emailL) + '&select=resultado,es_ganador&limit=1',
            { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
          );
          if (rSpin.ok) {
            const s = await rSpin.json();
            if (Array.isArray(s) && s.length > 0) { yaGiro = true; resultadoPrevio = s[0].resultado; }
          }
        } catch(e) {}
        if (yaGiro) return res.status(200).json({ ok: true, ya_giro: true, resultado: resultadoPrevio, ganador: resultadoPrevio === 'ganador' });
        const esGanador = GANADORES.includes(emailL);
        try {
          await fetch(SUPABASE_URL + '/rest/v1/wc_sorteo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ email: emailL, resultado: esGanador ? 'ganador' : 'no_ganador', es_ganador: esGanador })
          });
        } catch(e) {}
        return res.status(200).json({ ok: true, ganador: esGanador, ya_giro: false });
      } catch(err) {
        console.error('[verificarSorteo]', err.message);
        return res.status(200).json({ ok: false, msg: 'Error verificando participación.' });
      }
    }

        return res.status(200).json({ status: 'PetMi Supabase API activa' });

  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

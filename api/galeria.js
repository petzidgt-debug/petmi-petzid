const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwNTc1MiwiZXhwIjoyMDkzNTgxNzUyfQ.heD60j_eM5MBjIhoZotR7G5nzQZu7kYv9aVvypbfE8A';

// ── Web Push (notificaciones) ───────────────────────────────
const webpush = require('web-push');
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
        notifMensajes:m.notif_mensajes ? 'Si' : 'No',
        ofertas:      m.ofertas        ? 'Si' : 'No',
        premium:      m.premium        === true,
        premium_hasta:m.premium_hasta  || null,
        slug:         m.slug           || ''
      }));

      // Marcar última actividad (no bloqueante — no afecta la respuesta si falla)
      if (mascotas.length) {
        fetch(SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent(email.toLowerCase()), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ ultima_actividad: new Date().toISOString() })
        }).catch(() => {});
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
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
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
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
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
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ nombre, tipo: tipo||'restaurante', zona, direccion, descripcion, imagen, google_maps, instagram, telefono, activo: false })
      });
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=representation' },
        body: JSON.stringify({ uid_creador, nombre_creador, foto_creador, email_creador: req.body.email_creador||'', tipo, categoria, titulo, descripcion, fecha, hora, ubicacion, imagen, activo, expires_at, especie: especie||null, sexo: sexo||null, raza: raza||null, whatsapp: whatsapp||null, recompensa: recompensa||null })
      });
      const data = await r.json();
      return res.status(200).json({ ok: r.ok, id: data[0]?.id });
    }

    // ── apuntarse ─────────────────────────────────────────────
    if (action === 'apuntarse' && req.method === 'POST') {
      const { actividad_id, uid_mascota, nombre_mascota, foto_mascota } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividad_apuntes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ actividad_id, uid_mascota, nombre_mascota, foto_mascota })
      });
      return res.status(200).json({ ok: r.ok || r.status === 409 });
    }

    // ── desapuntarse ──────────────────────────────────────────
    if (action === 'desapuntarse' && req.method === 'POST') {
      const { actividad_id, uid_mascota } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/actividad_apuntes?actividad_id=eq.' + encodeURIComponent(actividad_id) + '&uid_mascota=eq.' + encodeURIComponent(uid_mascota), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ activo })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarEvento ────────────────────────────────────────
    if (action === 'eliminarEvento' && req.method === 'POST') {
      const { id } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ activo })
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── eliminarLugar ─────────────────────────────────────────
    if (action === 'eliminarLugar' && req.method === 'POST') {
      const { id } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/lugares?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      return res.status(200).json({ ok: r.ok });
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=representation' },
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify(fields)
      });
      return res.status(200).json({ ok: r.ok });
    }

    // ── deletePromo (admin) ───────────────────────────────────
    if (action === 'deletePromo' && req.method === 'POST') {
      const { id } = req.body;
      const r = await fetch(SUPABASE_URL + '/rest/v1/promos?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
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
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const data = await check.json();
      if (data[0]?.premium) return res.status(200).json({ ok: false, error: 'ya tiene premium' });
      const hasta = new Date();
      hasta.setMonth(hasta.getMonth() + 3);
      const hastaStr = hasta.toISOString().split('T')[0];
      const r = await fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
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
      // juego_diario: max 1 por dia
      const hoy = new Date().toISOString().split('T')[0];
      if(accion === 'juego_diario'){
        const checkDia = await fetch(SUPABASE_URL + '/rest/v1/puntos?email=eq.' + encodeURIComponent(email) + '&accion=eq.juego_diario&created_at=gte.' + hoy + '&select=id&limit=1', { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } });
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

      // Enviar via Apps Script
      const scriptUrl = process.env.APPS_SCRIPT_URL || '';
      if (scriptUrl) {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'enviarOTP', email: emailL, code, dueno: rows[0].dueno || '' })
        }).catch(() => {});
      }

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

        return res.status(200).json({ status: 'PetMi Supabase API activa' });

  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

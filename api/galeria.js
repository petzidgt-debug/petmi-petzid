const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';

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
        SUPABASE_URL + '/rest/v1/mascotas?select=uid,nombre,apodo,especie,sexo,raza,tipo_fecha,fecha,email,foto,angelito,fecha_angelito,created_at&order=created_at.desc',
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
        m.uid,           // 0
        m.nombre,        // 1
        m.apodo,         // 2
        m.especie,       // 3
        m.sexo,          // 4
        m.raza,          // 5
        m.tipo_fecha,    // 6
        m.fecha,         // 7
        m.email,         // 8
        m.foto,          // 9
        m.angelito ? 'Si' : 'No', // 10
        m.fecha_angelito, // 11
        m.created_at    // 12
      ]);
      return res.status(200).json({ rows });
    }

    // ── getData — datos completos ─────────────────────────────
    if (action === 'getData') {
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?select=*&order=nombre.asc',
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
        ofertas:      m.ofertas        ? 'Si' : 'No'
      }));
      return res.status(200).json({ found: mascotas.length > 0, mascotas });
    }

    // ── getMensajes ───────────────────────────────────────────
    if (action === 'getMensajes') {
      const uid = req.query.uid || '';
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
          SUPABASE_URL + '/rest/v1/mascotas?uid=in.(' + uidsAmigos.map(u => '"'+u+'"').join(',') + ')&select=uid,nombre,apodo,especie,foto,angelito',
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
        );
        mascotasAmigos = await r3.json();
      }

      return res.status(200).json({ amigos, pendientes, mascotasAmigos });
    }

    // ── getConversacion ──────────────────────────────────────
    if (action === 'getConversacion') {
      const uid1 = req.query.uid1 || '';
      const uid2 = req.query.uid2 || '';
      if (!uid1 || !uid2) return res.status(200).json({ mensajes: [] });

      const response = await fetch(
        SUPABASE_URL + '/rest/v1/conversaciones?or=(and(uid_emisor.eq.' + encodeURIComponent(uid1) + ',uid_receptor.eq.' + encodeURIComponent(uid2) + '),and(uid_emisor.eq.' + encodeURIComponent(uid2) + ',uid_receptor.eq.' + encodeURIComponent(uid1) + '))&order=created_at.asc',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await response.json();
      return res.status(200).json({ mensajes: data || [] });
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
      let url = SUPABASE_URL + '/rest/v1/eventos?activo=eq.true&order=fecha.asc';
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

    return res.status(200).json({ status: 'PetMi Supabase API activa' });

  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

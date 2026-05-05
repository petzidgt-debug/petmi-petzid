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
        SUPABASE_URL + '/rest/v1/mascotas?select=uid,nombre,apodo,especie,sexo,raza,tipo_fecha,fecha,email,foto,angelito,fecha_angelito&order=nombre.asc',
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
        m.fecha_angelito // 11
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

    return res.status(200).json({ status: 'PetMi Supabase API activa' });

  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

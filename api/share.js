const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';
const BASE_URL = 'https://petmi-petzid.vercel.app';
const DEFAULT_IMG = BASE_URL + '/logopetmi.png';

export default async function handler(req, res) {
  const { tipo, id } = req.query;

  let titulo = 'PetMi Guatemala';
  let descripcion = 'La comunidad pet lover más grande de Guatemala';
  let imagen = DEFAULT_IMG;
  let urlDestino = BASE_URL + '/galeria.html';

  try {
    if (tipo === 'evento' && id) {
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/eventos?id=eq.' + encodeURIComponent(id) + '&select=titulo,descripcion,imagen,fecha,lugar',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await r.json();
      if (data && data[0]) {
        const e = data[0];
        titulo = e.titulo || titulo;
        descripcion = [e.fecha, e.lugar].filter(Boolean).join(' · ') || descripcion;
        if (e.imagen && e.imagen.indexOf('http') >= 0) imagen = e.imagen;
      }
      urlDestino = BASE_URL + '/eventos.html';
    }

    else if (tipo === 'aviso' && id) {
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/actividades?id=eq.' + encodeURIComponent(id) + '&select=titulo,descripcion,imagen,tipo,ubicacion,nombre_creador',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await r.json();
      if (data && data[0]) {
        const a = data[0];
        titulo = a.titulo || titulo;
        const meta = [a.nombre_creador, a.ubicacion].filter(Boolean).join(' · ');
        descripcion = meta || a.descripcion || descripcion;
        if (a.imagen && a.imagen.indexOf('http') >= 0) imagen = a.imagen;
        // Para perdidos usar foto del creador si no hay imagen del aviso
        if (!a.imagen || a.imagen.indexOf('http') < 0) {
          const r2 = await fetch(
            SUPABASE_URL + '/rest/v1/actividades?id=eq.' + encodeURIComponent(id) + '&select=foto_creador',
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
          );
          const d2 = await r2.json();
          if (d2 && d2[0] && d2[0].foto_creador && d2[0].foto_creador.indexOf('http') >= 0) {
            imagen = d2[0].foto_creador;
          }
        }
      }
      urlDestino = BASE_URL + '/avisos.html';
    }

    else if (tipo === 'lugar' && id) {
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/lugares?id=eq.' + encodeURIComponent(id) + '&select=nombre,descripcion,imagen,tipo,zona',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await r.json();
      if (data && data[0]) {
        const l = data[0];
        titulo = l.nombre || titulo;
        descripcion = [l.tipo, l.zona ? 'Zona ' + l.zona : ''].filter(Boolean).join(' · ') || descripcion;
        if (l.imagen && l.imagen.indexOf('http') >= 0) imagen = l.imagen;
      }
      urlDestino = BASE_URL + '/lugares.html';
    }

    else if (tipo === 'mascota' && id) {
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(id) + '&select=nombre,especie,raza,foto',
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await r.json();
      if (data && data[0]) {
        const m = data[0];
        titulo = m.nombre + ' — PetMi Guatemala';
        descripcion = [m.especie, m.raza].filter(Boolean).join(' · ');
        if (m.foto && m.foto.indexOf('http') >= 0) imagen = m.foto;
      }
      urlDestino = BASE_URL + '/perfil.html?uid=' + id;
    }
  } catch(e) {
    // fallback a defaults
  }

  // HTML con OG tags + redirect inmediato
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="PetMi Guatemala">
  <meta property="og:title" content="${titulo.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${descripcion.replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${imagen}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${BASE_URL}/share?tipo=${tipo||''}&id=${id||''}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${titulo.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${descripcion.replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${imagen}">
  <meta http-equiv="refresh" content="0;url=${urlDestino}">
  <title>${titulo}</title>
</head>
<body>
  <script>window.location.replace('${urlDestino}');</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
  return res.status(200).send(html);
}

// ══════════════════════════════════════════════════════════════════════
// TRIBBI · Enlace para compartir un intercambio (con vista previa en WhatsApp)
//   /api/tribbi-invita?e=<identificador>&i=<invitación>
//   WhatsApp y otras apps leen esta "ficha" (imagen, título y texto del intercambio);
//   las personas que lo abren pasan directo a la página del intercambio.
// No usa llaves secretas: la de Supabase es la PÚBLICA (anon).
// ══════════════════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';
const DISENOS = ['navidad', 'luces', 'morado', 'nieve', 'estrella', 'noche'];
const TZ = 'America/Guatemala';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dia = iso => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', timeZone: TZ });
const q = n => 'Q' + Number(n || 0).toLocaleString('es-GT', { maximumFractionDigits: 2 });

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'app.revistapetmi.com';
  const base = 'https://' + host;
  const e = String((req.query && req.query.e) || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  const i = String((req.query && req.query.i) || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  let destino = base + '/tribbi/';
  let titulo = 'Tribbi · Intercambios que arman tribu';
  let texto = 'Organiza tu amigo secreto gratis: agrega a tu familia o amigos y Tribbi hace el sorteo.';
  let imagen = base + '/tribbi/og/navidad.jpg';

  if (e) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/tribbi_edicion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON },
        body: JSON.stringify({ p_slug: e })
      });
      const d = await r.json();
      if (r.ok && d && d.ok !== false) {
        const pagina = d.con_envio ? 'tribbi.html' : 'amigo-secreto.html';
        destino = base + '/tribbi/' + pagina + '?e=' + encodeURIComponent(e) + (i ? '&i=' + encodeURIComponent(i) : '');
        const quien = d.cuenta && d.cuenta.nombre ? d.cuenta.nombre + ' te invita: ' : '';
        titulo = quien + d.nombre';
        const partes = [];
        if (d.sorteo_hecho) partes.push('¡Ya se hizo el sorteo! Entra para raspar tu tarjeta');
        else {
          if (d.inscripcion_hasta && new Date(d.inscripcion_hasta) > new Date()) partes.push('Tienes hasta el ' + dia(d.inscripcion_hasta) + ' para unirte al intercambio'+' 🎁');
          partes.push('Regalo de ' + q(d.presupuesto_q));
          if (d.sorteo_en) partes.push('Sorteo el ' + dia(d.sorteo_en));
          else if (d.evento_fecha) partes.push('Intercambio el ' + dia(d.evento_fecha));
        }
        texto = partes.join(' · ');
        const u = d.portada_url;
        if (typeof u === 'string' && u.startsWith(SUPABASE_URL + '/storage/v1/object/public/tribbi/portadas/')) imagen = u;
        else imagen = base + '/tribbi/og/' + (DISENOS.includes(d.portada_diseno) ? d.portada_diseno : 'navidad') + '.jpg';
      }
    } catch (err) { /* si Supabase no responde, se comparte la ficha general de Tribbi */ }
  }

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>${esc(titulo)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tribbi">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(texto)}">
<meta property="og:image" content="${esc(imagen)}">
<meta property="og:image:alt" content="${esc(titulo)}">
<meta property="og:url" content="${esc(base + (req.url || ''))}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(destino)}">
<link rel="canonical" href="${esc(destino)}">
</head><body style="font-family:system-ui,sans-serif;background:#FAFAF5;color:#1F3534;text-align:center;padding:40px 20px">
<p>Abriendo <a href="${esc(destino)}">${esc(titulo)}</a>…</p>
<script>location.replace(${JSON.stringify(destino)})</script>
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
}

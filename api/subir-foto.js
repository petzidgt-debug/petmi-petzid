// /api/subir-foto.js
// Sube una foto (base64) al Media Manager de Wix y devuelve la URL
// pública (wixstatic.com) — reemplaza la subida directa a Cloudinary
// para fotos nuevas, ya que Cloudinary llegó a su límite de espacio.

const WIX_API_KEY = process.env.WIX_API_KEY || '';
const WIX_SITE_ID = '25b3d584-29fb-4861-b757-d9640d37c01f';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { photoBase64, mimeType, fileName } = req.body || {};
    if (!photoBase64) {
      return res.status(400).json({ ok: false, error: 'Falta la foto' });
    }
    if (!WIX_API_KEY) {
      console.error('WIX_API_KEY no configurada');
      return res.status(500).json({ ok: false, error: 'Subida de fotos no disponible por ahora. Intenta de nuevo en unos minutos.' });
    }

    const mime = mimeType || 'image/jpeg';
    const nombre = fileName || ('foto_' + Date.now() + '.jpg');

    // ── 1. Pedir a Wix una URL de subida temporal ──────────────────
    const rUrl = await fetch('https://www.wixapis.com/site-media/v1/files/generate-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': WIX_API_KEY, 'wix-site-id': WIX_SITE_ID },
      body: JSON.stringify({ mimeType: mime, fileName: nombre })
    });
    const urlData = await rUrl.json();
    if (!rUrl.ok || !urlData.uploadUrl) {
      console.error('Error generando URL de subida en Wix:', JSON.stringify(urlData));
      return res.status(500).json({ ok: false, error: 'No se pudo iniciar la subida de la foto.' });
    }

    // ── 2. Subir el archivo binario a esa URL ───────────────────────
    const buffer = Buffer.from(photoBase64, 'base64');
    const rUpload = await fetch(urlData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mime },
      body: buffer
    });
    const uploadData = await rUpload.json();
    if (!rUpload.ok) {
      console.error('Error subiendo la foto a Wix:', JSON.stringify(uploadData));
      return res.status(500).json({ ok: false, error: 'No se pudo subir la foto.' });
    }

    // La respuesta trae el archivo dentro de "file"
    const archivo = uploadData.file || uploadData;
    const urlFinal = archivo.url || (archivo.media && archivo.media.image && archivo.media.image.url);

    if (!urlFinal) {
      console.error('Wix no devolvió una URL utilizable:', JSON.stringify(uploadData));
      return res.status(500).json({ ok: false, error: 'La foto se subió pero no se pudo obtener su link.' });
    }

    return res.status(200).json({ ok: true, url: urlFinal });

  } catch (err) {
    console.error('Error en subir-foto:', err.message);
    return res.status(500).json({ ok: false, error: 'Error inesperado subiendo la foto.' });
  }
}

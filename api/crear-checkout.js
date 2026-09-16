// /api/crear-checkout.js
// Recibe el carrito (items + email), valida stock, crea el pedido en
// pedidos_tienda, y llama a la API de Recurrente para generar un
// checkout dinámico con el monto exacto del carrito.

const SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwNTc1MiwiZXhwIjoyMDkzNTgxNzUyfQ.heD60j_eM5MBjIhoZotR7G5nzQZu7kYv9aVvypbfE8A';

// La llave secreta de Recurrente va SIEMPRE como variable de entorno
// en Vercel — nunca escrita aquí. Configúrala en Vercel → Settings →
// Environment Variables como RECURRENTE_SECRET_KEY.
const RECURRENTE_SECRET_KEY = process.env.RECURRENTE_SECRET_KEY || '';
const BASE_APP = 'https://app.revistapetmi.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, items, cupon } = req.body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Correo inválido' });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ ok: false, error: 'El carrito está vacío' });
    }
    if (!RECURRENTE_SECRET_KEY) {
      console.error('RECURRENTE_SECRET_KEY no configurada');
      return res.status(500).json({ ok: false, error: 'Pagos en línea no disponibles por ahora. Intenta pedir por WhatsApp.' });
    }

    // ── 1. Traer los productos reales de Supabase (nunca confiar en
    // el precio/nombre que manda el navegador — se recalcula todo
    // aquí con los datos verdaderos de la base de datos) ──────────
    const ids = items.map(i => i.producto_id).filter(Boolean);
    if (!ids.length) return res.status(400).json({ ok: false, error: 'Carrito inválido' });

    const rProd = await fetch(
      SUPABASE_URL + '/rest/v1/tienda_productos?id=in.(' + ids.join(',') + ')&select=id,nombre,precio,stock,activo',
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
    );
    const productosReales = await rProd.json();
    const porId = {};
    (productosReales || []).forEach(p => { porId[p.id] = p; });

    // ── 2. Validar cada item: que exista, esté activo, tenga precio,
    // y que haya stock suficiente (si el producto controla stock) ──
    const itemsFinal = [];
    for (const item of items) {
      const p = porId[item.producto_id];
      const cantidad = Math.max(1, parseInt(item.cantidad) || 1);
      if (!p) return res.status(400).json({ ok: false, error: 'Un producto del carrito ya no existe.' });
      if (!p.activo) return res.status(400).json({ ok: false, error: '"' + p.nombre + '" ya no está disponible.' });
      if (p.precio == null) return res.status(400).json({ ok: false, error: '"' + p.nombre + '" no tiene precio — pide por WhatsApp.' });
      if (p.stock != null && p.stock < cantidad) {
        return res.status(400).json({ ok: false, error: 'Solo quedan ' + p.stock + ' de "' + p.nombre + '".' });
      }
      itemsFinal.push({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad });
    }

    const totalCentavosSinDescuento = itemsFinal.reduce((sum, i) => sum + Math.round(i.precio * 100) * i.cantidad, 0);

    // ── 2.5 Validar cupón (opcional) — solo cupones de % existen
    // hoy (ej. de la ruleta de adopción); se aplica repartiendo el
    // descuento proporcionalmente entre los items, ya que Recurrente
    // no admite una línea de "descuento" separada. ──────────────────
    let cuponAplicado = null;
    let porcentajeDescuento = 0;
    if (cupon && String(cupon).trim()) {
      const codigoCupon = String(cupon).trim().toUpperCase();
      const rCupon = await fetch(
        SUPABASE_URL + '/rest/v1/cupones_tienda?codigo=eq.' + encodeURIComponent(codigoCupon) + '&select=*',
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY } }
      );
      const cuponRows = await rCupon.json();
      const c = cuponRows && cuponRows[0];
      if (!c) return res.status(400).json({ ok: false, error: 'Ese cupón no existe.' });
      if (c.usado) return res.status(400).json({ ok: false, error: 'Ese cupón ya fue usado.' });
      if (c.tipo === 'porcentaje') porcentajeDescuento = Number(c.valor) || 0;
      cuponAplicado = c.codigo;
    }

    const itemsConDescuento = itemsFinal.map(i => ({
      ...i,
      precio: porcentajeDescuento ? Number((i.precio * (1 - porcentajeDescuento / 100)).toFixed(2)) : i.precio
    }));

    const totalCentavos = itemsConDescuento.reduce((sum, i) => sum + Math.round(i.precio * 100) * i.cantidad, 0);
    if (totalCentavos < 500) {
      return res.status(400).json({ ok: false, error: 'El total mínimo para pagar en línea es Q5.00' });
    }

    // ── 3. Crear el pedido en Supabase (estado "pendiente") ────────
    const rPedido = await fetch(SUPABASE_URL + '/rest/v1/pedidos_tienda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=representation' },
      body: JSON.stringify({ email: email.toLowerCase(), items: itemsConDescuento, total_centavos: totalCentavos, estado: 'pendiente' })
    });
    if (!rPedido.ok) {
      console.error('Error creando pedido:', await rPedido.text());
      return res.status(500).json({ ok: false, error: 'No se pudo crear el pedido. Intenta de nuevo.' });
    }
    const pedidoCreado = (await rPedido.json())[0];

    // ── 4. Crear el checkout en Recurrente ──────────────────────────
    const rCheckout = await fetch('https://app.recurrente.com/api/checkouts', {
      method: 'POST',
      headers: { 'X-SECRET-KEY': RECURRENTE_SECRET_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: itemsConDescuento.map(i => ({
          name: i.nombre + (porcentajeDescuento ? ' (-' + porcentajeDescuento + '%)' : ''),
          amount_in_cents: Math.round(i.precio * 100),
          currency: 'GTQ',
          quantity: i.cantidad
        })),
        success_url: BASE_APP + '/tienda.html?pago=exito',
        cancel_url: BASE_APP + '/tienda.html?pago=cancelado',
        metadata: { pedido_id: pedidoCreado.id }
      })
    });

    const checkoutData = await rCheckout.json();
    if (!rCheckout.ok || !checkoutData.checkout_url) {
      console.error('Error de Recurrente:', JSON.stringify(checkoutData));
      await fetch(SUPABASE_URL + '/rest/v1/pedidos_tienda?id=eq.' + pedidoCreado.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ estado: 'cancelado' })
      }).catch(() => {});
      return res.status(500).json({ ok: false, error: 'No se pudo generar el link de pago. Intenta pedir por WhatsApp.' });
    }

    // Marca el cupón como usado — se hace aquí (al crear el checkout,
    // no al confirmarse el pago) para mantenerlo simple: si alguien
    // abandona el pago después de esto, el cupón queda gastado. Dado
    // que cada persona solo tiene 1 cupón de por vida (de la ruleta),
    // el caso es raro — se puede reactivar a mano desde Supabase si
    // pasa (UPDATE cupones_tienda SET usado=false WHERE codigo=...).
    if (cuponAplicado) {
      await fetch(SUPABASE_URL + '/rest/v1/cupones_tienda?codigo=eq.' + encodeURIComponent(cuponAplicado), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ usado: true, usado_en_pedido: pedidoCreado.id })
      }).catch(() => {});
    }

    // ── 5. Guardar el checkout_id/url en el pedido ──────────────────
    await fetch(SUPABASE_URL + '/rest/v1/pedidos_tienda?id=eq.' + pedidoCreado.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ checkout_id: checkoutData.id || null, checkout_url: checkoutData.checkout_url })
    }).catch(() => {});

    return res.status(200).json({ ok: true, checkout_url: checkoutData.checkout_url, pedido_id: pedidoCreado.id });

  } catch (err) {
    console.error('Error en crear-checkout:', err.message);
    return res.status(500).json({ ok: false, error: 'Error inesperado. Intenta de nuevo.' });
  }
}

/* PetMi — puerta de entrada ÚNICA de las páginas de administración.
 *
 * Qué hace:
 *  1) Pide la CLAVE DE ADMINISTRACIÓN (la misma de emails-mk.html) y la comprueba en el servidor.
 *  2) Cuando la página llama a /api/galeria, añade la clave en la cabecera x-admin-key.
 *  3) Cuando la página llama DIRECTO a la base de datos (https://…supabase.co/rest/v1/…), reenvía esa llamada por el servidor
 *     (/api/galeria?action=sb): el servidor pone la llave de acceso a la base de datos. Así las páginas YA NO la llevan dentro.
 *
 * Debe cargarse PRIMERO en cada página de administración (<script src="/admin-auth.js"></script> justo después de <head>).
 */
(function () {
  if (window.__petmiAdminAuth) return;
  window.__petmiAdminAuth = true;

  var CLAVE_LS = 'petmi_admin_key';                                   // misma que usa emails-mk.html: una sola entrada sirve para todas
  var MARCAS_VIEJAS = ['petmi_admin', 'carrera_admin', 'wazu_admin']; // las "sesiones" de las puertas antiguas de cada página
  var SUPA = 'https://ilcreewilnkchvozicyp.supabase.co';
  var fetchOriginal = window.fetch.bind(window);

  function guardado(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function poner(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function quitar(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function direccion(x) { return typeof x === 'string' ? x : (x && x.url) || String(x || ''); }
  function esGaleria(u) { return /^\/api\/galeria(\?|$)/.test(u) || u.indexOf(location.origin + '/api/galeria') === 0; }

  var pantalla = null;
  function abrirLogin(mensaje) {
    if (pantalla) { var e = pantalla.querySelector('[data-msg]'); if (e && mensaje) e.textContent = mensaje; return; }
    function montar() {
      if (pantalla) return;
      pantalla = document.createElement('div');
      pantalla.id = 'petmi-admin-login';
      pantalla.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:rgba(26,26,46,.96);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Arial,Helvetica,sans-serif');
      pantalla.innerHTML = '<div style="background:#fff;border-radius:16px;padding:28px 24px;width:100%;max-width:360px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.4)">'
        + '<div style="font-size:34px;margin-bottom:6px">🔐</div>'
        + '<h2 style="margin:0 0 6px;font-size:19px;color:#1a1a2e">Administración PetMi</h2>'
        + '<p style="margin:0 0 16px;font-size:13px;color:#777;line-height:1.5">Escribe la clave de administración.</p>'
        + '<input type="password" data-clave autocomplete="current-password" placeholder="Clave de administración" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:15px;margin-bottom:10px">'
        + '<button data-entrar style="width:100%;padding:12px;border:0;border-radius:10px;background:#00B4B4;color:#fff;font-weight:700;font-size:15px;cursor:pointer">Entrar</button>'
        + '<div data-msg style="color:#c0392b;font-size:13px;margin-top:10px;min-height:18px;line-height:1.4"></div></div>';
      document.body.appendChild(pantalla);
      var campo = pantalla.querySelector('[data-clave]'), boton = pantalla.querySelector('[data-entrar]'), msg = pantalla.querySelector('[data-msg]');
      if (mensaje) msg.textContent = mensaje;
      function entrar() {
        var valor = campo.value.trim();
        if (!valor) { msg.textContent = 'Escribe la clave.'; return; }
        boton.disabled = true; boton.textContent = 'Comprobando…'; msg.textContent = '';
        fetchOriginal('/api/galeria?action=adminPing', { headers: { 'x-admin-key': valor } })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && d.ok) {
              poner(CLAVE_LS, valor);
              MARCAS_VIEJAS.forEach(function (k) { poner(k, '1'); });   // para que las puertas antiguas de las páginas dejen pasar
              location.reload();
              return;
            }
            msg.textContent = (d && d.mensaje) || (d && d.error === 'no_autorizado' ? 'Clave incorrecta.' : 'No se pudo comprobar la clave.');
            boton.disabled = false; boton.textContent = 'Entrar';
          })
          .catch(function () { msg.textContent = 'Sin conexión con el servidor. Intenta de nuevo.'; boton.disabled = false; boton.textContent = 'Entrar'; });
      }
      boton.addEventListener('click', entrar);
      campo.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') entrar(); });
      setTimeout(function () { try { campo.focus(); } catch (e) {} }, 50);
    }
    if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
  }
  window.petmiAdminAbrirLogin = abrirLogin;
  window.petmiAdminCerrarSesion = function () { quitar(CLAVE_LS); MARCAS_VIEJAS.forEach(quitar); location.reload(); };

  // Si el servidor responde "denied" la clave falta o es incorrecta: se borra y se vuelve a pedir.
  function revisar(resp) {
    try {
      if (resp && resp.headers && resp.headers.get('X-Admin-Auth') === 'denied') {
        quitar(CLAVE_LS); MARCAS_VIEJAS.forEach(quitar);
        abrirLogin('La clave no es válida o ya no sirve. Escríbela de nuevo.');
      }
    } catch (e) {}
    return resp;
  }

  window.fetch = function (entrada, opciones) {
    var u = direccion(entrada);
    if (u.indexOf(SUPA + '/rest/v1/') === 0 && typeof entrada === 'string') {
      var o = Object.assign({}, opciones || {});
      var h = new Headers(o.headers || undefined);
      h.delete('apikey'); h.delete('Authorization'); h.set('x-admin-key', guardado(CLAVE_LS));
      o.headers = h;
      return fetchOriginal('/api/galeria?action=sb&p=' + encodeURIComponent(u.slice(SUPA.length)), o).then(revisar);
    }
    if (typeof entrada === 'string' && esGaleria(u)) {
      var o2 = Object.assign({}, opciones || {});
      var h2 = new Headers(o2.headers || undefined);
      h2.set('x-admin-key', guardado(CLAVE_LS));
      o2.headers = h2;
      return fetchOriginal(entrada, o2).then(revisar);
    }
    return fetchOriginal(entrada, opciones);
  };

  // Sin clave guardada: se pide de entrada (no hace falta esperar a que una llamada falle).
  if (!guardado(CLAVE_LS)) abrirLogin();
  // Con una clave guardada se comprueba UNA vez al abrir: si ya no sirve (se cambió, o se borró del servidor), se pide de nuevo de
  // inmediato. Si no, la página se vería "a medias" hasta que alguna acción cerrada fallara.
  else fetchOriginal('/api/galeria?action=adminPing', { headers: { 'x-admin-key': guardado(CLAVE_LS) } }).then(revisar).catch(function () {});
})();

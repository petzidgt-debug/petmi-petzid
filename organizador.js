/* PetMi — "organizador": un negocio, una veterinaria o quien organiza eventos, SIN mascota registrada.
 *
 * Después de verificar su correo con un código (registro-organizador.html), el navegador guarda aquí su sesión
 * (correo, nombre, teléfono, y un token firmado por el servidor). Las páginas que publican (avisos, lugares, eventos)
 * lo leen con PetmiOrg.get() para dejarlo publicar y para mandar al servidor quién es.
 */
(function () {
  if (window.PetmiOrg) return;
  var KEY = 'petmi_org';

  function leer() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!o || !o.email || !o.token) return null;
      if (o.exp && Date.now() / 1000 > o.exp) { localStorage.removeItem(KEY); return null; }   // el token vence: se vuelve a entrar con un código
      return o;
    } catch (e) { return null; }
  }

  var PetmiOrg = {
    get: leer,
    guardar: function (o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} },
    cerrarSesion: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    nombreParaMostrar: function (o) { o = o || leer(); return o ? (o.organizacion || o.nombre || '') : ''; },

    // Invitación para quien intenta publicar sin sesión (o sin mascota): lo manda a registrarse como organizador.
    // "que" es un texto fijo de la página (por ejemplo "tus eventos y avisos"), nunca un dato del usuario.
    invitar: function (que, opciones) {
      opciones = opciones || {};
      var previo = document.getElementById('petmi-org-invitacion'); if (previo) previo.remove();
      var volver = encodeURIComponent(location.pathname + location.search);
      var ov = document.createElement('div');
      ov.id = 'petmi-org-invitacion';
      ov.setAttribute('style', 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Arial,Helvetica,sans-serif');
      var vencida = !!opciones.vencida;
      var estiloPrim = 'display:block;padding:14px;border-radius:99px;background:linear-gradient(135deg,#00B4B4,#E05090);color:#fff;font-weight:800;font-size:14.5px;text-decoration:none;margin-bottom:6px';
      var estiloSec = 'display:block;padding:10px;color:#007a7a;font-weight:700;font-size:13px;text-decoration:none';
      var aRegistro = '<a href="/registro-organizador.html?volver=' + volver + '" style="' + (vencida ? estiloSec : estiloPrim) + '">' + (vencida ? 'Registrarme de nuevo' : 'Registrarme como organizador') + '</a>';
      var aEntrar = '<a href="/registro-organizador.html?entrar=1&volver=' + volver + '" style="' + (vencida ? estiloPrim : estiloSec) + '">' + (vencida ? 'Entrar con mi correo' : 'Ya estoy registrado: entrar con mi correo') + '</a>';
      ov.innerHTML = '<div style="background:#fff;border-radius:22px;padding:28px 22px 18px;max-width:380px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.35)">'
        + '<div style="font-size:42px;line-height:1;margin-bottom:8px">🏪</div>'
        + (vencida ? '<h3 style="margin:0 0 8px;font-size:18px;font-weight:900;color:#1a1a2e">Tu sesión de organizador venció</h3>' : '<h3 style="margin:0 0 8px;font-size:18px;font-weight:900;color:#1a1a2e">¿Tienes un negocio u organizas eventos?</h3>')
        + (vencida ? '<p style="margin:0 0 18px;font-size:13.5px;color:#666;line-height:1.6">Por seguridad hay que volver a confirmar tu correo con un código. Toma un minuto.</p>' : '<p style="margin:0 0 18px;font-size:13.5px;color:#666;line-height:1.6">' + (opciones.sinMascota ? 'Ese correo no tiene una mascota registrada. ' : '') + '<b style="color:#1a1a2e">No necesitas una mascota.</b> Regístrate como organizador con tu correo, tu nombre y tu teléfono, y publica ' + que + '.</p>')
        + (vencida ? aEntrar + aRegistro : aRegistro + aEntrar)
        + '<button type="button" data-cerrar style="width:100%;padding:10px;border:0;background:none;color:#999;font-size:13px;cursor:pointer">Ahora no</button></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function (e) { if (e.target === ov || (e.target.getAttribute && e.target.getAttribute('data-cerrar') !== null)) ov.remove(); });
    }
  };
  window.PetmiOrg = PetmiOrg;
})();

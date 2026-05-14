// header.js — Header compartido PetMi v4
(function(){
  function initHeader(){
    var sessionEmail = localStorage.getItem('petzid_email') || '';
    var sessionDueno = localStorage.getItem('petzid_dueno') || '';
    var currentPath  = window.location.pathname;

    var style = document.createElement('style');
    style.textContent = [
      '.site-header{background:#fff;border-bottom:1px solid #eee;padding:0 16px;display:flex;align-items:center;height:60px;position:sticky;top:0;z-index:300;box-shadow:0 1px 6px rgba(0,0,0,.07);gap:8px}',
      '.site-header .h-logo img{height:36px;display:block}',
      '.site-header .h-logo{text-decoration:none;flex-shrink:0}',
      '.site-header .h-nav{display:flex;align-items:center;gap:2px;flex:1;justify-content:center}',
      '.site-header .h-link{padding:6px 10px;border-radius:20px;font-size:13px;font-weight:600;color:#555;text-decoration:none;border:none;background:none;cursor:pointer;white-space:nowrap;font-family:Arial,sans-serif}',
      '.site-header .h-link:hover{background:#f0f0ee;color:#00B4B4}',
      '.site-header .h-link.active{color:#00B4B4;font-weight:700}',
      '.site-header .h-drop{position:relative;display:inline-block}',
      '.site-header .h-drop-menu{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:160px;overflow:hidden;display:none;z-index:500}',
      '.site-header .h-drop-menu.open{display:block}',
      '.site-header .h-drop-item{display:block;padding:11px 16px;font-size:13px;font-weight:600;color:#333;text-decoration:none;border:none;background:none;width:100%;text-align:left;cursor:pointer;border-bottom:1px solid #f5f5f5;font-family:Arial,sans-serif}',
      '.site-header .h-drop-item:last-child{border-bottom:none}',
      '.site-header .h-drop-item:hover{background:#f8f8f8}',
      '.site-header .h-drop-item.danger{color:#c0392b}',
      '.site-header .h-right{display:flex;align-items:center;gap:6px;flex-shrink:0}',
      '.site-header .h-badge{background:#E05090;color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;text-decoration:none;white-space:nowrap;display:none}',
      '.site-header .h-btn{padding:7px 13px;border:1.5px solid #00B4B4;border-radius:20px;font-size:12px;font-weight:700;color:#00B4B4;background:#fff;cursor:pointer;white-space:nowrap;font-family:Arial,sans-serif}',
      '.site-header .h-btn-reg{padding:7px 13px;border:none;border-radius:20px;font-size:12px;font-weight:700;color:#fff;background:#00B4B4;cursor:pointer;text-decoration:none;white-space:nowrap;font-family:Arial,sans-serif}',
      '.site-header .h-btn-in{padding:7px 13px;border:1.5px solid #ddd;border-radius:20px;font-size:12px;font-weight:700;color:#555;background:#fff;cursor:pointer;white-space:nowrap;font-family:Arial,sans-serif}',
      '.site-header .h-ham{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:8px;background:none;border:none;flex-shrink:0}',
      '.site-header .h-ham span{display:block;width:22px;height:2px;background:#555;border-radius:2px}',
      '.site-header .h-mob{display:none;position:fixed;top:60px;left:0;right:0;background:#fff;border-bottom:1px solid #eee;z-index:400;box-shadow:0 4px 12px rgba(0,0,0,.1)}',
      '.site-header .h-mob.open{display:block}',
      '.site-header .h-mob a,.site-header .h-mob button{display:block;width:100%;padding:13px 20px;font-size:14px;font-weight:600;color:#333;text-decoration:none;text-align:left;border:none;background:none;cursor:pointer;border-bottom:1px solid #f5f5f5;font-family:Arial,sans-serif}',
      '.site-header .h-mob-sec{font-size:10px;font-weight:700;letter-spacing:1px;color:#bbb;text-transform:uppercase;padding:10px 20px 4px;display:block}',
      '@media(max-width:640px){.site-header .h-nav{display:none}.site-header .h-ham{display:flex}}',
      // Login modal
      '.h-login-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:600;display:none;align-items:center;justify-content:center;padding:20px}',
      '.h-login-overlay.open{display:flex}',
      '.h-login-box{background:#fff;border-radius:20px;padding:28px;width:100%;max-width:360px}',
      '.h-login-title{font-size:20px;font-weight:900;color:#222;margin-bottom:6px}',
      '.h-login-sub{font-size:13px;color:#888;margin-bottom:20px}',
      '.h-login-input{width:100%;padding:13px 14px;border:1.5px solid #e0e0e0;border-radius:12px;font-size:16px;outline:none;margin-bottom:12px;box-sizing:border-box;font-family:Arial,sans-serif}',
      '.h-login-input:focus{border-color:#00B4B4}',
      '.h-login-ok{width:100%;padding:14px;background:#00B4B4;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;font-family:Arial,sans-serif}',
      '.h-login-ok:disabled{background:#aaa}',
      '.h-login-cancel{width:100%;padding:12px;background:#f0f0ee;color:#666;border:none;border-radius:12px;font-size:14px;cursor:pointer;font-family:Arial,sans-serif}',
      '.h-login-msg{font-size:13px;text-align:center;padding:8px;border-radius:8px;margin-bottom:10px;display:none}',
      '.h-login-msg.error{background:#fbeaf0;color:#993556}',
      '.h-login-msg.success{background:#e0f7f7;color:#007a7a}'
    ].join('');
    document.head.appendChild(style);

    // Nav central
    var navHTML =
      '<a href="https://www.revistapetmi.com/" target="_blank" class="h-link">Blog</a>' +
      '<a href="https://www.revistapetmi.com/category/all-products" target="_blank" class="h-link">Tienda</a>' +
      '<a href="https://www.revistapetmi.com/home" target="_blank" class="h-link">PetzID</a>' +
      '<div class="h-drop">' +
        '<button class="h-link" onclick="petmiTogglePF(event)">Pet Friendly ▾</button>' +
        '<div class="h-drop-menu" id="pfMenu">' +
          '<a href="/eventos.html" class="h-drop-item">🎉 Eventos</a>' +
          '<a href="/lugares.html" class="h-drop-item">📍 Lugares</a>' +
        '</div>' +
      '</div>' +
      '<a href="/actividades.html" class="h-link'+(currentPath.indexOf('actividades')>=0?' active':'')+'">🐾 ¿Quién se apunta?</a>' +
      '<a href="/galeria.html" class="h-link">Amigos PetMi</a>' +
      '<a href="/promos.html" class="h-link' + (currentPath.indexOf('promos') >= 0 ? ' active' : '') + '" style="color:#764ba2;font-weight:700">🎁 Promos</a>';

    // Lado derecho
    var rightHTML = sessionEmail
      ? '<a href="/amigos.html" id="petmiNotifBadge" class="h-badge">1 solicitud</a>' +
        '<a href="/mensajes.html" id="petmiMsgBadge" class="h-badge" style="background:#00B4B4;display:none">1 mensaje</a>' +
        '<div class="h-drop">' +
          '<button class="h-btn" onclick="petmiToggleMenu(event)">🐾 ' + (sessionDueno ? sessionDueno.split(' ')[0] : sessionEmail.split('@')[0]) + ' ▾</button>' +
          '<div class="h-drop-menu" id="petmiMenuDropdown" style="left:auto;right:0;transform:none">' +
            '<a href="/familia.html" class="h-drop-item">🏠 Mi familia</a>' +
            '<a href="/mensajes.html" class="h-drop-item">💬 Mensajes</a>' +
            '<a href="/amigos.html" class="h-drop-item">🐾 Mis amigos</a>' +
            '<a href="/index.html?agregar=1" class="h-drop-item">➕ Agregar mascota</a>' +
            '<a href="/galeria.html" class="h-drop-item">🌟 Ver galería</a>' +
            '<a href="/promos.html" class="h-drop-item">🎁 Promos</a>' +
            '<button class="h-drop-item danger" onclick="petmiCerrarSesion()">🚪 Cerrar sesión</button>' +
          '</div>' +
        '</div>'
      : '<a href="/index.html" class="h-btn-reg">Registra tu mascota</a>' +
        '<button class="h-btn-in" onclick="petmiAbrirLogin()">Ingresar</button>';

    // Mobile menu
    var mobHTML =
      '<span class="h-mob-sec">Navegación</span>' +
      '<a href="https://www.revistapetmi.com/" target="_blank">Blog</a>' +
      '<a href="https://www.revistapetmi.com/category/all-products" target="_blank">Tienda</a>' +
      '<a href="https://www.revistapetmi.com/home" target="_blank">PetzID</a>' +
      '<a href="/eventos.html">🎉 Eventos</a>' +
      '<a href="/lugares.html">📍 Lugares</a>' +
      '<a href="/actividades.html">🐾 ¿Quién se apunta?</a>' +
          '<a href="/galeria.html">Amigos PetMi</a>' +
      '<a href="/promos.html" style="color:#764ba2;font-weight:700">🎁 Promos</a>' +
      (sessionEmail
        ? '<span class="h-mob-sec">Mi cuenta</span>' +
          '<a href="/familia.html">🏠 Mi familia</a>' +
          '<a href="/mensajes.html">💬 Mensajes</a>' +
          '<a href="/amigos.html">🐾 Mis amigos</a>' +
          '<a href="/index.html">🐾 Registrar mascota</a>' +
          '<a href="/index.html?agregar=1">➕ Agregar mascota</a>' +
          '<button onclick="petmiCerrarSesion()">🚪 Cerrar sesión</button>'
        : '<span class="h-mob-sec">Cuenta</span>' +
          '<a href="/index.html" style="background:#00B4B4;color:#fff;font-weight:700">🐾 Registra tu mascota</a>' +
          '<button onclick="petmiAbrirLogin()">Ingresar</button>');

    // Login modal
    var loginHTML =
      '<div class="h-login-overlay" id="petmiLoginOverlay">' +
        '<div class="h-login-box">' +
          '<button onclick="petmiCerrarLogin()" style="float:right;background:none;border:none;font-size:20px;cursor:pointer;margin-top:-8px">×</button>' +
          '<div class="h-login-title">Ingresar a PetMi</div>' +
          '<div class="h-login-sub">Escribe tu correo para acceder a tu cuenta</div>' +
          '<div class="h-login-msg" id="petmiLoginMsg"></div>' +
          '<input type="email" class="h-login-input" id="petmiLoginEmail" placeholder="tu@correo.com" inputmode="email">' +
          '<button class="h-login-ok" id="petmiLoginBtn" onclick="petmiVerificarLogin()">Ingresar</button>' +
          '<button class="h-login-cancel" onclick="petmiCerrarLogin()">Cancelar</button>' +
        '</div>' +
      '</div>';

    // Construir header
    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<a href="https://www.revistapetmi.com/" target="_blank" class="h-logo">' +
        '<img src="https://raw.githubusercontent.com/petzidgt-debug/petmi-petzid/main/logopetmi.png" alt="PetMi" height="36" onerror="this.style.display=\'none\'">' +
      '</a>' +
      '<nav class="h-nav">' + navHTML + '</nav>' +
      '<div class="h-right">' + rightHTML + '</div>' +
      '<button class="h-ham" onclick="petmiToggleHam()" aria-label="Menu"><span></span><span></span><span></span></button>' +
      '<div class="h-mob" id="petmiMobMenu">' + mobHTML + '</div>';

    document.body.insertBefore(header, document.body.firstChild);

    // Insertar modal de login
    document.body.insertAdjacentHTML('beforeend', loginHTML);

    // Cerrar dropdowns al click fuera
    document.addEventListener('click', function(e){
      if(!e.target.closest('.h-drop')) {
        document.querySelectorAll('.h-drop-menu.open').forEach(function(m){ m.classList.remove('open'); });
      }
      if(!e.target.closest('.h-ham') && !e.target.closest('.h-mob')) {
        var mob = document.getElementById('petmiMobMenu');
        if(mob) mob.classList.remove('open');
      }
    });

    // Enter en el login
    setTimeout(function(){
      var loginInput = document.getElementById('petmiLoginEmail');
      if(loginInput) loginInput.addEventListener('keydown', function(e){ if(e.key==='Enter') petmiVerificarLogin(); });
    }, 500);

    // Cargar notificaciones
    if(sessionEmail) cargarNotifHeader(sessionEmail);
  }

  function cargarNotifHeader(sessionEmail){
    // Solicitudes pendientes
    fetch('/api/galeria?action=checkEmail',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'checkEmail', email:sessionEmail})
    }).then(function(r){return r.json();})
    .then(function(d){
      if(!d.found||!d.mascotas.length) return;
      var promesas = d.mascotas.map(function(m){
        return fetch('/api/galeria?action=getAmigos&uid='+encodeURIComponent(m.uid)).then(function(r){return r.json();}).then(function(da){return {uid:m.uid,data:da};});
      });
      Promise.all(promesas).then(function(resultados){
        var total = 0;
        resultados.forEach(function(res){
          if(!res||!res.data) return;
          total += (res.data.pendientes||[]).filter(function(a){ return a.uid_receptor===res.uid; }).length;
        });
        var badge = document.getElementById('petmiNotifBadge');
        if(badge && total > 0){
          badge.textContent = total + (total===1?' solicitud':' solicitudes');
          badge.style.display = 'inline-block';
        }
      });

      // Mensajes no leídos
      return fetch('/api/galeria?action=getMensajesNoLeidos&uid='+encodeURIComponent(d.mascotas[0].uid));
    }).then(function(r){return r&&r.json();})
    .then(function(d){
      if(!d||!d.count) return;
      var badge = document.getElementById('petmiMsgBadge');
      if(badge && d.count > 0){
        badge.textContent = d.count + (d.count===1?' mensaje':' mensajes');
        badge.style.display = 'inline-block';
      }
    }).catch(function(){});
  }

  // Funciones globales
  window.petmiTogglePF = function(e){
    e.stopPropagation();
    var m = document.getElementById('pfMenu');
    if(m) m.classList.toggle('open');
  };
  window.petmiToggleMenu = function(e){
    e.stopPropagation();
    var m = document.getElementById('petmiMenuDropdown');
    if(m) m.classList.toggle('open');
  };
  window.petmiToggleHam = function(){
    var m = document.getElementById('petmiMobMenu');
    if(m) m.classList.toggle('open');
  };
  window.petmiLimpiarNotif = function(){
    var b = document.getElementById('petmiNotifBadge');
    if(b) b.style.display = 'none';
  };
  window.petmiCerrarSesion = function(){
    localStorage.removeItem('petzid_email');
    localStorage.removeItem('petzid_dueno');
    window.location.href = '/galeria.html';
  };
  window.petmiAbrirLogin = function(){
    var o = document.getElementById('petmiLoginOverlay');
    if(o) o.classList.add('open');
    // Resetear boton de registro
    var regBtn = document.getElementById('petmiLoginRegBtn');
    if(regBtn) regBtn.style.display = 'none';
    // Limpiar mensaje
    var msg = document.getElementById('petmiLoginMsg');
    if(msg) { msg.style.display='none'; msg.textContent=''; }
    // Limpiar email
    var inp = document.getElementById('petmiLoginEmail');
    if(inp) inp.value = '';
    var btn = document.getElementById('petmiLoginBtn');
    if(btn) { btn.disabled=false; btn.textContent='Ingresar'; }
  };
  window.petmiCerrarLogin = function(){
    var o = document.getElementById('petmiLoginOverlay');
    if(o) o.classList.remove('open');
  };
  window.petmiVerificarLogin = function(){
    var email = document.getElementById('petmiLoginEmail').value.trim().toLowerCase();
    if(!email||email.indexOf('@')<0){ petmiLoginMsg('Ingresa un correo válido','error'); return; }
    var btn = document.getElementById('petmiLoginBtn');
    btn.disabled = true; btn.textContent = 'Verificando...';

    fetch('/api/galeria?action=checkEmail',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'checkEmail', email:email})
    }).then(function(r){return r.json();})
    .then(function(d){
      if(d.found && d.mascotas && d.mascotas.length > 0){
        localStorage.setItem('petzid_email', email);
        localStorage.setItem('petzid_dueno', d.mascotas[0].dueno||'');
        petmiLoginMsg('Bienvenido/a! 🐾','success');
        setTimeout(function(){ window.location.reload(); }, 1000);
      } else {
        petmiLoginMsg('No encontramos ese correo. ¿Ya tienes una mascota registrada?','error');
        btn.disabled = false; btn.textContent = 'Ingresar';
        // Mostrar boton de registrar mascota
        var regBtn = document.getElementById('petmiLoginRegBtn');
        if(!regBtn){
          regBtn = document.createElement('a');
          regBtn.id = 'petmiLoginRegBtn';
          regBtn.href = '/index.html';
          regBtn.style.cssText = 'display:block;width:100%;padding:13px;background:#00B4B4;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:8px;text-align:center;text-decoration:none;box-sizing:border-box;font-family:Arial,sans-serif';
          regBtn.textContent = '🐾 Registrar mi mascota';
          var cancelBtn = document.querySelector('.h-login-cancel');
          if(cancelBtn) cancelBtn.parentNode.insertBefore(regBtn, cancelBtn);
        }
        regBtn.style.display = 'block';
      }
    }).catch(function(){
      petmiLoginMsg('Error de conexión','error');
      btn.disabled = false; btn.textContent = 'Ingresar';
    });
  };
  function petmiLoginMsg(txt, tipo){
    var el = document.getElementById('petmiLoginMsg');
    if(el){ el.textContent=txt; el.className='h-login-msg '+tipo; el.style.display='block'; }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();

// ── PWA: manifest + service worker ──────────────────────────
(function(){
  // Manifest
  var link = document.createElement('link');
  link.rel = 'manifest'; link.href = '/manifest.json';
  document.head.appendChild(link);

  // Theme color
  var meta = document.createElement('meta');
  meta.name = 'theme-color'; meta.content = '#00B4B4';
  document.head.appendChild(meta);

  // PWA capable (standard)
  var mobileCapable = document.createElement('meta');
  mobileCapable.name = 'mobile-web-app-capable'; mobileCapable.content = 'yes';
  document.head.appendChild(mobileCapable);
  // Apple PWA (legacy)
  var appleMeta = document.createElement('meta');
  appleMeta.name = 'apple-mobile-web-app-capable'; appleMeta.content = 'yes';
  document.head.appendChild(appleMeta);
  var appleStatus = document.createElement('meta');
  appleStatus.name = 'apple-mobile-web-app-status-bar-style'; appleStatus.content = 'default';
  document.head.appendChild(appleStatus);
  var appleTitle = document.createElement('meta');
  appleTitle.name = 'apple-mobile-web-app-title'; appleTitle.content = 'PetMi';
  document.head.appendChild(appleTitle);

  // Service Worker
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js').catch(function(){});
    });
  }
})();

// header.js — Header compartido PetMi v5
(function(){
  function initHeader(){
    var sessionEmail = localStorage.getItem('petzid_email') || '';
    var sessionDueno = localStorage.getItem('petzid_dueno') || '';
    var currentPath  = window.location.pathname;
    var style = document.createElement('style');
    style.textContent = [
      // ── Estilos nuevo header ──
      '.site-header{background:#f5f5f5;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:58px;position:sticky;top:0;z-index:300;box-shadow:0 2px 8px rgba(0,0,0,.08);border-bottom:1px solid #e8e8e8}',
      '.h-logo{flex-shrink:0;text-decoration:none;display:flex;align-items:center}',
      '.h-logo img{height:34px;display:block;object-fit:contain}',
      // Desktop nav
      '.h-nav{display:flex;align-items:center;gap:2px}',
      '@media(max-width:768px){.h-nav{display:none}}',
      '.h-link{display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:99px;font-size:13px;font-weight:600;color:#555;text-decoration:none;border:none;background:none;cursor:pointer;white-space:nowrap;font-family:Arial,sans-serif;transition:background .15s}',
      '.h-link:hover,.h-link.active{background:#e0f7f7;color:#00B4B4}',
      '.h-drop{position:relative}',
      '.h-drop-menu{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:180px;overflow:hidden;display:none;z-index:500;border:0.5px solid #eee}',
      '.h-drop-menu.open{display:block}',
      '.h-drop-item{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13px;font-weight:600;color:#333;text-decoration:none;border:none;background:none;width:100%;text-align:left;cursor:pointer;border-bottom:0.5px solid #f5f5f5;font-family:Arial,sans-serif}',
      '.h-drop-item:last-child{border-bottom:none}',
      '.h-drop-item:hover{background:#f8f8f8}',
      '.h-drop-item.danger{color:#c0392b}',
      // Right section
      '.h-right{display:flex;align-items:center;gap:8px;flex-shrink:0}',
      '.h-search{width:32px;height:32px;border-radius:99px;background:#e8e8e8;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;border:none;color:#555;transition:background .15s}',
      '.h-search:hover{background:#e0f7f7}',
      '.h-avatar{width:32px;height:32px;border-radius:99px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;cursor:pointer;border:none;font-family:Arial,sans-serif;position:relative}',
      '.h-avatar-dot{position:absolute;bottom:1px;right:1px;width:8px;height:8px;border-radius:99px;background:#2ecc71;border:1.5px solid #fff}',
      '.h-avatar-dd{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.18);width:220px;overflow:hidden;display:none;z-index:500;border:0.5px solid #eee}',
      '.h-avatar-dd.open{display:block}',
      '.h-avatar-hdr{padding:13px 16px;border-bottom:1px solid #f5f5f5;background:#f8f8f8}',
      '.h-avatar-email{font-size:11px;color:#aaa;margin:0}',
      '.h-avatar-name{font-size:14px;font-weight:700;color:#222;margin:3px 0 0}',
      '.h-btn-reg{padding:8px 16px;border:none;border-radius:99px;font-size:12px;font-weight:700;color:#1a1a2e;background:#F5C842;cursor:pointer;text-decoration:none;white-space:nowrap;font-family:Arial,sans-serif}',
      '.h-btn-in{padding:8px 16px;border:1.5px solid #00B4B4;border-radius:99px;font-size:12px;font-weight:700;color:#00B4B4;background:transparent;cursor:pointer;white-space:nowrap;font-family:Arial,sans-serif}',
      '.h-btn-in:hover{background:#e0f7f7}',
      // Avisos badge
      '.h-avisos-badge{display:none;background:#E24B4A;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:99px;margin-left:3px}',

      // Bottom nav mobile
      '.h-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #f0f0ee;z-index:50;padding:8px 4px 10px;box-shadow:0 -2px 10px rgba(0,0,0,.06)}',
      '@media(max-width:768px){.h-bottom-nav{display:flex;justify-content:space-around;align-items:center}}',
      '.h-btab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;position:relative;text-decoration:none;border:none;background:none;font-family:Arial,sans-serif}',
      '.h-btab-ico{font-size:22px;line-height:1}',
      '.h-btab-lbl{font-size:9px;color:#aaa;font-weight:600}',
      '.h-btab.active .h-btab-lbl{color:#00B4B4;font-weight:700}',
      '.h-btab-bdg{position:absolute;top:-2px;right:8px;background:#E24B4A;color:#fff;font-size:8px;font-weight:700;padding:1px 4px;border-radius:99px;display:none}',
      '.h-fab-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;border:none;background:none;font-family:Arial,sans-serif;padding:0}',
      '.h-fab-circle{width:48px;height:48px;border-radius:99px;background:#F5C842;display:flex;align-items:center;justify-content:center;font-size:24px;margin-top:-18px;box-shadow:0 4px 14px rgba(0,0,0,.18);border:3px solid #fff;color:#1a1a2e;font-weight:900;line-height:1}',
      '.h-fab-lbl{font-size:9px;color:#cc9800;font-weight:700;white-space:nowrap}',
      // Mobile body padding
      '@media(max-width:768px){body{padding-bottom:70px}}',
      '@media(max-width:768px){#fabCrearPetzID{display:none!important}}',
      '.h-pwa-banner{background:var(--color-background-primary,#fff);border-top:1px solid #eee;padding:16px 16px 14px;display:none;position:fixed;bottom:68px;left:0;right:0;z-index:200;box-shadow:0 -4px 20px rgba(0,0,0,.12)}',
      '.h-pwa-banner.show{display:block}',
      '.h-pwa-handle{width:36px;height:4px;border-radius:99px;background:#ddd;margin:0 auto 14px}',
      '.h-pwa-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}',
      '.h-pwa-icon{width:48px;height:48px;border-radius:12px;background:#00B4B4;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden}',
      '.h-pwa-icon img{width:32px;height:32px;object-fit:contain}',
      '.h-pwa-name{font-size:15px;font-weight:700;color:#222;margin-bottom:2px}',
      '.h-pwa-url{font-size:12px;color:#888}',
      '.h-pwa-pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}',
      '.h-pwa-pill{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:99px;background:#f5f5f5;border:0.5px solid #eee;font-size:11px;color:#555;font-weight:600}',
      '.h-pwa-pill.green{background:#e0f7f7;border-color:#00B4B4;color:#007a7a}',
      '.h-pwa-pill.gold{background:#FFF8E1;border-color:#F5C842;color:#856404}',
      '.h-pwa-btns{display:flex;gap:8px}',
      '.h-pwa-install{flex:1;padding:11px;border-radius:99px;background:#00B4B4;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}',
      '.h-pwa-install:hover{background:#007a7a}',
      '.h-pwa-later{padding:11px 16px;border-radius:99px;background:#f0f0ee;color:#444;border:1.5px solid #ddd;font-size:13px;font-weight:600;cursor:pointer}',
      // Ocultar bottom nav si la pagina tiene su propia barra inferior
      '.has-nav-bar .h-bottom-nav{display:none!important}',
      '@media(max-width:768px){.fab-pill{bottom:82px!important}}',
      '@media(max-width:768px){#toast,[id="toast"]{bottom:82px!important}}',
      '@media(max-width:768px){.toast{bottom:82px!important}}',
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

    // ── Desktop nav ──────────────────────────────────────────
    var navHTML =
      '<a href="/galeria.html" class="h-link' + (currentPath.indexOf('galeria') >= 0 ? ' active' : '') + '">🐾 Galería</a>' +
      '<a href="https://app.revistapetmi.com/avisos.html?tipo=todos" class="h-link' + (currentPath.indexOf('avisos') >= 0 ? ' active' : '') + '">📢 Avisos <span id="hAvisosCount" class="h-avisos-badge"></span></a>' +

      '<a href="/lugares.html" class="h-link' + (currentPath.indexOf('lugares') >= 0 ? ' active' : '') + '">📍 Lugares</a>' +
      '<a href="https://www.revistapetmi.com/" target="_blank" class="h-link">📖 Revista</a>' +
      (function(){
        var _esp = localStorage.getItem('petmi_especie') || '';
        var _url = 'https://www.revistapetmi.com/tienda';
        if (_esp.toLowerCase().indexOf('gato') >= 0)
          _url = 'https://www.revistapetmi.com/tienda/coleccion/gatos';
        else if (_esp.toLowerCase().indexOf('perro') >= 0)
          _url = 'https://www.revistapetmi.com/tienda/coleccion/perros';
        return '<a href="' + _url + '" target="_blank" class="h-link">🛍️ Tienda</a>';
      })();
    // ── Right: avatar o botones ──────────────────────────────
    var userInitials = sessionDueno
      ? sessionDueno.split(' ').map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase()
      : (sessionEmail||'').substring(0,2).toUpperCase();

    var rightHTML = sessionEmail
      ? '<div class="h-drop" style="position:relative">' +
          '<button class="h-avatar" onclick="petmiToggleMenu(event)">' +
            userInitials +
            '<span class="h-avatar-dot"></span>' +
          '</button>' +
          '<div class="h-avatar-dd" id="petmiMenuDropdown">' +
            '<div class="h-avatar-hdr">' +
              '<p class="h-avatar-email">' + sessionEmail + '</p>' +
              '<p class="h-avatar-name">' + (sessionDueno || '') + '</p>' +
            '</div>' +
            '<a href="/familia.html" class="h-drop-item">🏠 Mi familia</a>' +
            '<a href="/mis-ids.html" class="h-drop-item">🆔 Mis IDs</a>' +
            '<a href="/premium.html" class="h-drop-item">⭐ Premium</a>' +
            '<a href="/amigos.html" class="h-drop-item">👥 Amigos</a>' +
            '<a href="/mis-avisos.html" class="h-drop-item">📝 Mis avisos</a>' +
            '<a href="/puntos.html" class="h-drop-item">🏆 Mis puntos</a>' +
            '<button class="h-drop-item danger" onclick="petmiCerrarSesion()">🚪 Cerrar sesión</button>' +
          '</div>' +
        '</div>'
      : '<a href="/index.html" class="h-btn-reg">Registrar mascota</a>' +
        '<button class="h-btn-in" onclick="petmiAbrirLogin()">Ingresar</button>';
    // ── Bottom nav mobile ─────────────────────────────────────
    var bottomNavHTML =
      '<a href="/galeria.html" class="h-btab' + (currentPath.indexOf('galeria') >= 0 ? ' active' : '') + '">' +
        '<span class="h-btab-ico">🐾</span>' +
        '<span class="h-btab-lbl">Galería</span>' +
      '</a>' +
      '<a href="https://app.revistapetmi.com/avisos.html?tipo=todos" class="h-btab' + (currentPath.indexOf('avisos') >= 0 ? ' active' : '') + '" style="position:relative">' +
        '<span class="h-btab-ico">📢</span>' +
        '<span class="h-btab-bdg" id="hAvisosCountMob"></span>' +
        '<span class="h-btab-lbl">Avisos</span>' +
      '</a>' +
      '<a href="/index.html" class="h-fab-tab">' +
        '<div class="h-fab-circle">➕</div>' +
        '<span class="h-fab-lbl">Crear PetzID</span>' +
      '</a>' +
      '<a href="/juego.html" class="h-btab' + (currentPath.indexOf('juego') >= 0 ? ' active' : '') + '">' +
        '<span class="h-btab-ico">🎮</span>' +
        '<span class="h-btab-lbl">Juegos</span>' +
        '<span style="font-size:8px;color:#F5C842;font-weight:700;line-height:1;display:block">¡Nuevo!</span>' +
      '</a>' +
      '<a href="https://www.revistapetmi.com/" target="_blank" class="h-btab">' +
        '<span class="h-btab-ico">📖</span>' +
        '<span class="h-btab-lbl">Revista</span>' +
      '</a>';
    var loginHTML =
      '<div class="h-login-overlay" id="petmiLoginOverlay">' +
        '<div class="h-login-box">' +
          '<button onclick="petmiCerrarLogin()" style="float:right;background:none;border:none;font-size:20px;cursor:pointer;margin-top:-8px">&#x00D7;</button>' +
          '<div id="petmiStep1">' +
            '<div class="h-login-title">Ingresar a PetMi</div>' +
            '<div class="h-login-sub">Escribe tu correo para continuar.</div>' +
            '<div class="h-login-msg" id="petmiLoginMsg"></div>' +
            '<input type="email" class="h-login-input" id="petmiLoginEmail" placeholder="tu@correo.com" inputmode="email" id="petmiLoginEmail">' +
            '<button class="h-login-ok" id="petmiLoginBtn" onclick="petmiIrPaso2()">Continuar &#x2192;</button>' +
            '<button class="h-login-cancel" onclick="petmiCerrarLogin()">Cancelar</button>' +
          '</div>' +
          '<div id="petmiStep2" style="display:none">' +
            '<div class="h-login-title">&#x1F43E; Como se llama?</div>' +
            '<div class="h-login-sub">Escribe el nombre de una de tus mascotas.</div>' +
            '<div class="h-login-msg" id="petmiLoginMsg2"></div>' +
            '<input type="text" class="h-login-input" id="petmiLoginNombre" placeholder="Nombre de tu mascota" autocomplete="off">' +
            '<button class="h-login-ok" id="petmiLoginBtn2" onclick="petmiVerificarLogin()">Ingresar</button>' +
            '<button class="h-login-cancel" onclick="petmiVolverPaso1()">&#x2190; Cambiar correo</button>' +
            '<button style="width:100%;padding:10px;background:none;border:none;color:#00B4B4;font-size:13px;cursor:pointer;margin-top:4px" onclick="petmiEnviarOTP()">&#x1F4E7; No recuerdo el nombre</button>' +
          '</div>' +
          '<div id="petmiStep3" style="display:none">' +
            '<div class="h-login-title">&#x1F4EC; Revisa tu correo</div>' +
            '<div class="h-login-sub" id="petmiOTPSub">Enviamos un codigo de 6 digitos a tu correo.</div>' +
            '<div class="h-login-msg" id="petmiLoginMsg3"></div>' +
            '<input type="text" class="h-login-input" id="petmiLoginOTP" placeholder="000000" inputmode="numeric" maxlength="6" style="letter-spacing:8px;font-size:22px;text-align:center">' +
            '<button class="h-login-ok" id="petmiLoginBtn3" onclick="petmiVerificarOTP()">Verificar codigo</button>' +
            '<button class="h-login-cancel" onclick="petmiVolverPaso2()">&#x2190; Volver</button>' +
          '</div>' +
        '</div>' +
      '</div>';


    // ── Build header ──────────────────────────────────────────
    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<a href="https://www.revistapetmi.com/" target="_blank" class="h-logo">' +
        '<img src="https://raw.githubusercontent.com/petzidgt-debug/petmi-petzid/main/logopetmi.png" alt="PetMi" height="34" onerror="this.style.display=\'none\'">' +
      '</a>' +
      '<nav class="h-nav">' + navHTML + '</nav>' +
      '<div class="h-right">' +
        '<a href="https://www.revistapetmi.com/home" target="_blank" class="h-search" aria-label="Qué es PetzID" style="text-decoration:none;padding:4px"><img src="https://app.revistapetmi.com/ID.png" alt="PetzID" style="width:22px;height:22px;object-fit:contain;display:block"></a>' +
        rightHTML +
      '</div>';
    document.body.insertBefore(header, document.body.firstChild);


    // PWA install banner
    var pwaBanner = document.createElement('div');
    pwaBanner.className = 'h-pwa-banner';
    pwaBanner.id = 'pwaBanner';
    pwaBanner.innerHTML =
      '<div class="h-pwa-handle"></div>' +
      '<div class="h-pwa-row">' +
        '<div class="h-pwa-icon"><img src="https://raw.githubusercontent.com/petzidgt-debug/petmi-petzid/main/logopetmi.png" alt="PetMi"></div>' +
        '<div><div class="h-pwa-name">Instalar PetMi</div><div class="h-pwa-url">app.revistapetmi.com</div></div>' +
      '</div>' +
      '<div class="h-pwa-pills">' +
        '<span class="h-pwa-pill green">✅ GRATIS</span>' +
        '<span class="h-pwa-pill">⚡ + Velocidad</span>' +
        '<span class="h-pwa-pill">🔔 Alertas</span>' +
        '<span class="h-pwa-pill">🎁 + Promos</span>' +
        '<span class="h-pwa-pill gold">⭐ +3 puntos al instalar</span>' +
      '</div>' +
      '<div class="h-pwa-btns">' +
        '<button class="h-pwa-install" id="pwaBtnInstall">📲 Instalar gratis</button>' +
        '<button class="h-pwa-later" onclick="petmiPwaLater()">Ahora no</button>' +
      '</div>';
    document.body.appendChild(pwaBanner);

    // Bottom nav mobile
    var bottomNav = document.createElement('nav');
    bottomNav.className = 'h-bottom-nav';
    bottomNav.innerHTML = bottomNavHTML;
    document.body.appendChild(bottomNav);

    document.body.insertAdjacentHTML('beforeend', loginHTML);

    document.addEventListener('click', function(e){
      if(!e.target.closest('.h-drop') && !e.target.closest('.h-avatar')) {
        document.querySelectorAll('.h-drop-menu.open, .h-avatar-dd.open').forEach(function(m){ m.classList.remove('open'); });
      }
    });
    setTimeout(function(){
      var loginInput = document.getElementById('petmiLoginEmail');
      // Enter key listeners (added via JS to avoid quote escaping issues)
      var loginEmail  = document.getElementById('petmiLoginEmail');
      var loginNombre = document.getElementById('petmiLoginNombre');
      var loginOTP    = document.getElementById('petmiLoginOTP');
      if(loginEmail)  loginEmail.addEventListener('keydown',  function(e){ if(e.key==='Enter') petmiIrPaso2(); });
      if(loginNombre) loginNombre.addEventListener('keydown', function(e){ if(e.key==='Enter') petmiVerificarLogin(); });
      if(loginOTP)    loginOTP.addEventListener('keydown',    function(e){ if(e.key==='Enter') petmiVerificarOTP(); });
    }, 500);
    if(sessionEmail) cargarNotifHeader(sessionEmail);
  }

  function cargarNotifHeader(sessionEmail){
    fetch('/api/galeria?action=checkEmail',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'checkEmail', email:sessionEmail})
    }).then(function(r){return r.json();})
    .then(function(d){
      if(!d.found||!d.mascotas.length) return;
      // Guardar especie de la primera mascota para link de tienda
      if(d.mascotas && d.mascotas[0] && d.mascotas[0].especie) {
        localStorage.setItem('petmi_especie', d.mascotas[0].especie);
      }
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

  window.petmiTogglePF = function(e){ e.stopPropagation(); var m=document.getElementById('pfMenu'); if(m) m.classList.toggle('open'); };
  window.petmiToggleMenu = function(e){ e.stopPropagation(); var m=document.getElementById('petmiMenuDropdown'); if(m) m.classList.toggle('open'); };
  window.petmiToggleHam = function(){ var m=document.getElementById('petmiMobMenu'); if(m) m.classList.toggle('open'); };
  window.petmiLimpiarNotif = function(){ var b=document.getElementById('petmiNotifBadge'); if(b) b.style.display='none'; };
  window.petmiCerrarSesion = function(){ localStorage.removeItem('petzid_email'); localStorage.removeItem('petzid_dueno'); window.location.href='/galeria.html'; };
  window.petmiAbrirLogin = function(){
    var o=document.getElementById('petmiLoginOverlay');
    if(o){
      o.classList.add('open');
      var s1=document.getElementById('petmiStep1'),s2=document.getElementById('petmiStep2');
      if(s1)s1.style.display='block';
      if(s2)s2.style.display='none';
      var btn=document.getElementById('petmiLoginBtn');
      if(btn){btn.disabled=false;btn.textContent='Continuar →';}
      var msg=document.getElementById('petmiLoginMsg');
      if(msg)msg.style.display='none';
      var msg2=document.getElementById('petmiLoginMsg2');
      if(msg2)msg2.style.display='none';
      var s3=document.getElementById('petmiStep3'),msg3=document.getElementById('petmiLoginMsg3');
      if(s3)s3.style.display='none';
      if(msg3)msg3.style.display='none';
    }
  };
  window.petmiCerrarLogin = function(){
    var o=document.getElementById('petmiLoginOverlay');
    if(o)o.classList.remove('open');
  };

  // ── Login 2 pasos ──────────────────────────────────────────
  window.petmiIrPaso2 = function(){
    var emailEl=document.getElementById('petmiLoginEmail');
    var step1=document.getElementById('petmiStep1');
    var step2=document.getElementById('petmiStep2');
    if(!step1||!step2){petmiAbrirLogin();return;}
    var email=emailEl?emailEl.value.trim().toLowerCase():'';
    if(!email||email.indexOf('@')<0){petmiLoginMsg('Ingresa un correo válido','error');return;}
    step1.style.display='none';
    step2.style.display='block';
    setTimeout(function(){var n=document.getElementById('petmiLoginNombre');if(n){n.value='';n.focus();}},100);
  };

  window.petmiVolverPaso2 = function(){
    var s2=document.getElementById('petmiStep2'),s3=document.getElementById('petmiStep3');
    if(s3)s3.style.display='none';
    if(s2)s2.style.display='block';
    petmiLoginMsg3('','');
  };

  window.petmiEnviarOTP = function(){
    var emailEl=document.getElementById('petmiLoginEmail');
    var email=emailEl?emailEl.value.trim().toLowerCase():'';
    var btn=document.getElementById('petmiLoginBtn2');
    if(btn){btn.disabled=true;}
    fetch('/api/galeria?action=enviarOTP',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:email})
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if(btn)btn.disabled=false;
      if(d.ok){
        var s2=document.getElementById('petmiStep2'),s3=document.getElementById('petmiStep3');
        if(s2)s2.style.display='none';
        if(s3)s3.style.display='block';
        var sub=document.getElementById('petmiOTPSub');
        if(sub)sub.textContent='Enviamos un código a '+email+'. Válido 10 minutos.';
        setTimeout(function(){var o=document.getElementById('petmiLoginOTP');if(o){o.value='';o.focus();}},100);
      } else {
        petmiLoginMsg2(d.msg||'Error al enviar código','error');
      }
    }).catch(function(){if(btn)btn.disabled=false;petmiLoginMsg2('Error de conexión','error');});
  };

  window.petmiVerificarOTP = function(){
    var emailEl=document.getElementById('petmiLoginEmail');
    var otpEl=document.getElementById('petmiLoginOTP');
    if(!otpEl)return;
    var email=emailEl?emailEl.value.trim().toLowerCase():'';
    var code=otpEl.value.trim();
    if(!code||code.length!==6){petmiLoginMsg3('Ingresa el código de 6 dígitos','error');return;}
    var btn=document.getElementById('petmiLoginBtn3');
    if(btn){btn.disabled=true;btn.textContent='Verificando...';}
    fetch('/api/galeria?action=verificarOTP',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:email,code:code})
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){
        localStorage.setItem('petzid_email',d.email||email);
        localStorage.setItem('petzid_dueno',d.dueno||'');
        if(d.mascotas&&d.mascotas[0]&&d.mascotas[0].especie)
          localStorage.setItem('petmi_especie',d.mascotas[0].especie);
        petmiLoginMsg3('¡Bienvenido/a!','success');
        setTimeout(function(){window.location.reload();},1000);
      } else {
        petmiLoginMsg3(d.msg||'Código incorrecto','error');
        if(btn){btn.disabled=false;btn.textContent='Verificar código';}
      }
    }).catch(function(){
      petmiLoginMsg3('Error de conexión','error');
      if(btn){btn.disabled=false;btn.textContent='Verificar código';}
    });
  };

  window.petmiVolverPaso1 = function(){
    var step1=document.getElementById('petmiStep1');
    var step2=document.getElementById('petmiStep2');
    if(step2)step2.style.display='none';
    if(step1)step1.style.display='block';
    petmiLoginMsg2('','');
  };

  window.petmiVerificarLogin = function(){
    var emailEl=document.getElementById('petmiLoginEmail');
    var nombreEl=document.getElementById('petmiLoginNombre');
    var step2=document.getElementById('petmiStep2');
    if(!step2||!nombreEl||step2.style.display==='none'){petmiAbrirLogin();return;}
    var email=emailEl?emailEl.value.trim().toLowerCase():'';
    var nombre=nombreEl.value.trim();
    if(!nombre){petmiLoginMsg2('Escribe el nombre de tu mascota','error');return;}
    var btn=document.getElementById('petmiLoginBtn2');
    if(btn){btn.disabled=true;btn.textContent='Verificando...';}
    fetch('/api/galeria?action=verificarLogin',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:email,nombreMascota:nombre})
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){
        localStorage.setItem('petzid_email',d.email||email);
        localStorage.setItem('petzid_dueno',d.dueno||'');
        if(d.mascotas&&d.mascotas[0]&&d.mascotas[0].especie)
          localStorage.setItem('petmi_especie',d.mascotas[0].especie);
        petmiLoginMsg2('¡Bienvenido/a!','success');
        setTimeout(function(){window.location.reload();},1000);
      }else{
        petmiLoginMsg2(d.msg||'Datos incorrectos. Intenta de nuevo.','error');
        if(btn){btn.disabled=false;btn.textContent='Ingresar';}
        if(nombreEl){nombreEl.value='';nombreEl.focus();}
      }
    }).catch(function(){
      petmiLoginMsg2('Error de conexión','error');
      if(btn){btn.disabled=false;btn.textContent='Ingresar';}
    });
  };

  function petmiLoginMsg(txt,tipo){var el=document.getElementById('petmiLoginMsg');if(el){el.textContent=txt;el.className='h-login-msg '+(tipo||'');el.style.display=txt?'block':'none';}}
  function petmiLoginMsg2(txt,tipo){var el=document.getElementById('petmiLoginMsg2');if(el){el.textContent=txt;el.className='h-login-msg '+(tipo||'');el.style.display=txt?'block':'none';}}
  function petmiLoginMsg3(txt,tipo){var el=document.getElementById('petmiLoginMsg3');if(el){el.textContent=txt;el.className='h-login-msg '+(tipo||'');el.style.display=txt?'block':'none';}}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initHeader);}else{initHeader();}
})();
// ── Ocultar bottom nav cuando hay modal abierto ─────────────
(function(){
  var bottomNav = null;
  function getNav(){ return bottomNav || (bottomNav = document.querySelector('.h-bottom-nav')); }

  function checkModals(){
    var nav = getNav();
    if(!nav) return;
    var anyOpen = false;

    // 1. Clases conocidas de modales/overlays en todas las páginas
    var selectors = [
      '.modal-overlay', '.login-overlay', '.login-modal-overlay',
      '.confirm-overlay', '.h-login-overlay', '.foto-modal',
      '.jefe-modal', '[id="modalReglas"]', '[id="modalPerdido"]',
      '[id="modalPerdidoFam"]', '[id="loginOverlay"]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function(m){
      var st = window.getComputedStyle(m);
      if(st.display !== 'none' && st.visibility !== 'hidden') anyOpen = true;
    });

    // 2. Cualquier div fixed con z-index alto (modales creados dinámicamente)
    if(!anyOpen){
      document.querySelectorAll('div, section').forEach(function(el){
        if(anyOpen) return;
        var st = window.getComputedStyle(el);
        if(st.position === 'fixed' && parseInt(st.zIndex||0) >= 200 &&
           st.display !== 'none' && st.visibility !== 'hidden' &&
           st.top === '0px' && st.left === '0px'){
          anyOpen = true;
        }
      });
    }

    nav.style.display = anyOpen ? 'none' : '';
  }

  var observer = new MutationObserver(function(){ setTimeout(checkModals, 30); });
  document.addEventListener('DOMContentLoaded', function(){
    observer.observe(document.body, {
      attributes: true, childList: true, subtree: true,
      attributeFilter: ['style', 'class']
    });
    checkModals();
  });
  // Escuchar clicks y touch
  document.addEventListener('click',   function(){ setTimeout(checkModals, 60); }, true);
  document.addEventListener('touchend', function(){ setTimeout(checkModals, 60); }, true);

  // Ocultar bottom nav si la pagina tiene su propio nav-bar fijo (ej: index.html)
  document.addEventListener('DOMContentLoaded', function(){
    if(document.querySelector('.nav-bar')){
      var bn = document.querySelector('.h-bottom-nav');
      if(bn) bn.style.setProperty('display','none','important');
    }
  });
})();

// ── PWA Install Banner ───────────────────────────────────────
(function(){
  var deferredPrompt = null;
  var SUPA_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';

  // Solo móvil y si no está instalada ya
  var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  var lastDismissed = localStorage.getItem('pwa_dismissed_at');
  var dismissed = lastDismissed && (Date.now() - parseInt(lastDismissed)) < 7*24*60*60*1000;

  // Capturar el evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', function(e){
    deferredPrompt = e;
    window._pwaPrompt = e; // Accesible desde puntos.html
    if(isMobile && !isStandalone && !dismissed){
      setTimeout(function(){
        var banner = document.getElementById('pwaBanner');
        if(banner) banner.classList.add('show');
      }, 3000);
    }
  });

  // Botón instalar
  document.addEventListener('click', function(e){
    if(e.target && e.target.id === 'pwaBtnInstall'){
      if(deferredPrompt){
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(result){
          if(result.outcome === 'accepted'){
            registrarInstall('aceptada');
          }
          deferredPrompt = null;
          var banner = document.getElementById('pwaBanner');
          if(banner) banner.classList.remove('show');
        });
      } else {
        // iOS — mostrar instrucciones
        alert('En iPhone: toca el botón compartir y selecciona "Agregar a pantalla de inicio"');
        registrarInstall('ios-manual');
      }
    }
  });

  // Detectar cuando se instala
  window.addEventListener('appinstalled', function(){
    registrarInstall('instalada');
    var banner = document.getElementById('pwaBanner');
    if(banner) banner.classList.remove('show');
  });

  function registrarInstall(tipo){
    var ua = navigator.userAgent;
    var plat = /iPhone|iPad/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : 'Desktop';
    var email = '';
    try { email = sessionStorage.getItem('petmiEmail') || localStorage.getItem('petmiEmail') || ''; } catch(err){}
    // Registrar en pwa_installs
    fetch(SUPA_URL + '/rest/v1/pwa_installs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ email: email || null, dispositivo: tipo, plataforma: plat })
    }).catch(function(){});
    // Registrar punto si hay email
    if(email && tipo !== 'ios-manual'){
      fetch('/api/galeria?action=registrarPunto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, accion: 'instalar_app', puntos: 3 })
      }).then(function(r){ return r.json(); })
      .then(function(d){ if(d && d.ok) petmiNotificarPunto('instalar_app', 3); })
      .catch(function(){});
    }
  }
})();

// ── Notificación de puntos ganados ───────────────────────────
function petmiNotificarPunto(accion, pts) {
  var MENSAJES = {
    instalar_app:    '📲 +' + pts + ' pts por instalar la app',
    perfil_completo: '🐾 +' + pts + ' pts — ¡Perfil completo!',
    referir_amigo:   '👥 +' + pts + ' pts por referir un amigo',
    racha_7dias:     '🔥 +' + pts + ' pts — ¡Racha de 7 días!',
    juego_diario:    '🎮 +' + pts + ' pts por el juego diario',
    apoyar_asoc:     '🤝 +' + pts + ' pts por apoyar una asociación'
  };
  var msg = MENSAJES[accion] || '⭐ +' + pts + ' puntos ganados';
  // Buscar o crear toast de puntos
  var t = document.getElementById('petmiPuntoToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'petmiPuntoToast';
    t.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#F5C842;padding:10px 22px;border-radius:24px;font-size:13px;font-weight:700;z-index:999;opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap;border:1px solid #F5C842';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(function() {
    t.style.opacity = '0';
  }, 3500);
}
window.petmiNotificarPunto = petmiNotificarPunto;

function petmiPwaLater(){
  localStorage.setItem('pwa_dismissed_at', Date.now().toString());
  var banner = document.getElementById('pwaBanner');
  if(banner) banner.classList.remove('show');
}

// ── Cargar conteo de avisos activos ─────────────────────────
(function(){
  var SUPA_URL='https://ilcreewilnkchvozicyp.supabase.co';
  var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';
  var ahora=new Date().toISOString();
  fetch(SUPA_URL+'/rest/v1/actividades?activo=eq.true&tipo=in.(perdido,busco,adopcion,venta,promo)&or=(expires_at.is.null,expires_at.gte.'+ahora+')&select=id',{
    headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Prefer':'count=exact','Range':'0-0'}
  }).then(function(r){
    var count=parseInt(r.headers.get('Content-Range').split('/')[1]||'0');
    if(count>0){
      ['hAvisosCount','hAvisosCountMob'].forEach(function(id){
        var el=document.getElementById(id);
        if(el){el.textContent=count>99?'99+':count;el.style.display='inline-block';}
      });
    }
  }).catch(function(){});
})();

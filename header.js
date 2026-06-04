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
      '.h-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #f0f0ee;z-index:300;padding:8px 4px 10px;box-shadow:0 -2px 10px rgba(0,0,0,.06)}',
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
      '<div class="h-drop">' +
        '<button class="h-link" onclick="petmiTogglePF(event)">📢 Avisos & Eventos ▾ <span id="hAvisosCount" class="h-avisos-badge"></span></button>' +
        '<div class="h-drop-menu" id="pfMenu">' +
          '<a href="/avisos.html?tipo=perdido" class="h-drop-item">🚨 Perdidos</a>' +
          '<a href="/avisos.html?tipo=adopcion" class="h-drop-item">🏠 Adopciones</a>' +
          '<a href="/avisos.html?tipo=busco" class="h-drop-item">🔍 Busco</a>' +
          '<a href="/avisos.html?tipo=venta" class="h-drop-item">💰 Ventas</a>' +
          '<a href="/eventos.html" class="h-drop-item" style="border-top:2px solid #f0f0ee">🎪 Eventos</a>' +
        '</div>' +
      '</div>' +
      '<a href="/lugares.html" class="h-link' + (currentPath.indexOf('lugares') >= 0 ? ' active' : '') + '">📍 Lugares</a>' +
      '<a href="https://www.revistapetmi.com/" target="_blank" class="h-link">📖 Revista</a>' +
      '<a href="https://www.revistapetmi.com/category/all-products" target="_blank" class="h-link">🛍️ Tienda</a>';
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
            '<a href="/promos.html" class="h-drop-item">🎁 Promos para mí</a>' +
            '<a href="/amigos.html" class="h-drop-item">👥 Amigos</a>' +
            '<a href="/mis-avisos.html" class="h-drop-item">📝 Mis avisos</a>' +
            '<a href="/mis-eventos.html" class="h-drop-item">🎪 Mis eventos</a>' +
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
      '<a href="/avisos.html" class="h-btab' + (currentPath.indexOf('avisos') >= 0 ? ' active' : '') + '" style="position:relative">' +
        '<span class="h-btab-ico">📢</span>' +
        '<span class="h-btab-bdg" id="hAvisosCountMob"></span>' +
        '<span class="h-btab-lbl">Avisos</span>' +
      '</a>' +
      '<a href="/index.html" class="h-fab-tab">' +
        '<div class="h-fab-circle">➕</div>' +
        '<span class="h-fab-lbl">Crear PetzID</span>' +
      '</a>' +
      '<a href="/lugares.html" class="h-btab' + (currentPath.indexOf('lugares') >= 0 ? ' active' : '') + '">' +
        '<span class="h-btab-ico">📍</span>' +
        '<span class="h-btab-lbl">Lugares</span>' +
      '</a>' +
      '<a href="https://www.revistapetmi.com/" target="_blank" class="h-btab">' +
        '<span class="h-btab-ico">📖</span>' +
        '<span class="h-btab-lbl">Revista</span>' +
      '</a>';
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

    // ── Build header ──────────────────────────────────────────
    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<a href="/galeria.html" class="h-logo">' +
        '<img src="https://raw.githubusercontent.com/petzidgt-debug/petmi-petzid/main/logopetmi.png" alt="PetMi" height="34" onerror="this.style.display=\'none\'">' +
      '</a>' +
      '<nav class="h-nav">' + navHTML + '</nav>' +
      '<div class="h-right">' +
        '<button class="h-search" onclick="petmiToggleSearch()" aria-label="Buscar">🔍</button>' +
        rightHTML +
      '</div>';
    document.body.insertBefore(header, document.body.firstChild);


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
      if(loginInput) loginInput.addEventListener('keydown', function(e){ if(e.key==='Enter') petmiVerificarLogin(); });
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
    var o=document.getElementById('petmiLoginOverlay'); if(o) o.classList.add('open');
    var regBtn=document.getElementById('petmiLoginRegBtn'); if(regBtn) regBtn.style.display='none';
    var msg=document.getElementById('petmiLoginMsg'); if(msg){msg.style.display='none';msg.textContent='';}
    var inp=document.getElementById('petmiLoginEmail'); if(inp) inp.value='';
    var btn=document.getElementById('petmiLoginBtn'); if(btn){btn.disabled=false;btn.textContent='Ingresar';}
  };
  window.petmiCerrarLogin = function(){ var o=document.getElementById('petmiLoginOverlay'); if(o) o.classList.remove('open'); };
  window.petmiVerificarLogin = function(){
    var email=document.getElementById('petmiLoginEmail').value.trim().toLowerCase();
    if(!email||email.indexOf('@')<0){petmiLoginMsg('Ingresa un correo válido','error');return;}
    var btn=document.getElementById('petmiLoginBtn');
    btn.disabled=true;btn.textContent='Verificando...';
    fetch('/api/galeria?action=checkEmail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'checkEmail',email:email})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.found&&d.mascotas&&d.mascotas.length>0){
        localStorage.setItem('petzid_email',email);
        localStorage.setItem('petzid_dueno',d.mascotas[0].dueno||'');
        petmiLoginMsg('Bienvenido/a! 🐾','success');
        setTimeout(function(){window.location.reload();},1000);
      } else {
        petmiLoginMsg('No encontramos ese correo. ¿Ya tienes una mascota registrada?','error');
        btn.disabled=false;btn.textContent='Ingresar';
        var regBtn=document.getElementById('petmiLoginRegBtn');
        if(!regBtn){
          regBtn=document.createElement('a');regBtn.id='petmiLoginRegBtn';regBtn.href='/index.html';
          regBtn.style.cssText='display:block;width:100%;padding:13px;background:#00B4B4;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:8px;text-align:center;text-decoration:none;box-sizing:border-box;font-family:Arial,sans-serif';
          regBtn.textContent='🐾 Registrar mi mascota';
          var cancelBtn=document.querySelector('.h-login-cancel');
          if(cancelBtn) cancelBtn.parentNode.insertBefore(regBtn,cancelBtn);
        }
        regBtn.style.display='block';
      }
    }).catch(function(){petmiLoginMsg('Error de conexión','error');btn.disabled=false;btn.textContent='Ingresar';});
  };

  function petmiLoginMsg(txt,tipo){var el=document.getElementById('petmiLoginMsg');if(el){el.textContent=txt;el.className='h-login-msg '+tipo;el.style.display='block';}}

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initHeader);}else{initHeader();}
})();
// ── Cargar conteo de avisos activos ─────────────────────────
(function(){
  var SUPA_URL='https://ilcreewilnkchvozicyp.supabase.co';
  var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM';
  fetch(SUPA_URL+'/rest/v1/actividades?activo=eq.true&select=id',{
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

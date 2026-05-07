// header.js — Header compartido PetMi v3
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
      '.site-header .h-drop-item{display:block;padding:11px 16px;font-size:13px;font-weight:600;color:#333;text-decoration:none;border:none;background:none;width:100%;text-align:left;cursor:pointer;border-bottom:1px solid #f5f5f5}',
      '.site-header .h-drop-item:last-child{border-bottom:none}',
      '.site-header .h-drop-item:hover{background:#f8f8f8}',
      '.site-header .h-drop-item.danger{color:#c0392b}',
      '.site-header .h-right{display:flex;align-items:center;gap:6px;flex-shrink:0}',
      '.site-header .h-badge{background:#E05090;color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;text-decoration:none;white-space:nowrap;display:none}',
      '.site-header .h-btn{padding:7px 13px;border:1.5px solid #00B4B4;border-radius:20px;font-size:12px;font-weight:700;color:#00B4B4;background:#fff;cursor:pointer;white-space:nowrap;font-family:Arial,sans-serif}',
      '.site-header .h-btn-reg{padding:7px 13px;border:none;border-radius:20px;font-size:12px;font-weight:700;color:#fff;background:#00B4B4;cursor:pointer;text-decoration:none;white-space:nowrap}',
      '.site-header .h-ham{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:8px;background:none;border:none;flex-shrink:0}',
      '.site-header .h-ham span{display:block;width:22px;height:2px;background:#555;border-radius:2px}',
      '.site-header .h-mob{display:none;position:fixed;top:60px;left:0;right:0;background:#fff;border-bottom:1px solid #eee;z-index:400;box-shadow:0 4px 12px rgba(0,0,0,.1)}',
      '.site-header .h-mob.open{display:block}',
      '.site-header .h-mob a,.site-header .h-mob button{display:block;width:100%;padding:13px 20px;font-size:14px;font-weight:600;color:#333;text-decoration:none;text-align:left;border:none;background:none;cursor:pointer;border-bottom:1px solid #f5f5f5;font-family:Arial,sans-serif}',
      '.site-header .h-mob-sec{font-size:10px;font-weight:700;letter-spacing:1px;color:#bbb;text-transform:uppercase;padding:10px 20px 4px;display:block}',
      '@media(max-width:640px){.site-header .h-nav{display:none}.site-header .h-ham{display:flex}}'
    ].join('');
    document.head.appendChild(style);

    // Nav central
    var navHTML =
      '<a href="https://www.revistapetmi.com/" target="_blank" class="h-link">Blog</a>' +
      '<a href="https://www.revistapetmi.com/category/all-products" target="_blank" class="h-link">Tienda</a>' +
      '<a href="/index.html" class="h-link' + (currentPath.indexOf('index') >= 0 ? ' active' : '') + '">PetzID</a>' +
      '<div class="h-drop">' +
        '<button class="h-link" id="pfBtn" onclick="petmiTogglePF(event)">Pet Friendly ▾</button>' +
        '<div class="h-drop-menu" id="pfMenu">' +
          '<a href="/eventos.html" class="h-drop-item">🎉 Eventos</a>' +
          '<a href="/lugares.html" class="h-drop-item">📍 Lugares</a>' +
        '</div>' +
      '</div>' +
      '<a href="/galeria.html" class="h-link">Amigos PetMi</a>';

    // Lado derecho
    var rightHTML = sessionEmail
      ? '<a href="/amigos.html" id="petmiNotifBadge" class="h-badge">1 solicitud</a>' +
        '<div class="h-drop">' +
          '<button class="h-btn" onclick="petmiToggleMenu(event)">🐾 ' + (sessionDueno ? sessionDueno.split(' ')[0] : sessionEmail.split('@')[0]) + ' ▾</button>' +
          '<div class="h-drop-menu" id="petmiMenuDropdown" style="left:auto;right:0;transform:none">' +
            '<a href="/familia.html" class="h-drop-item">🏠 Mi familia</a>' +
            '<a href="/amigos.html" class="h-drop-item">🐾 Mis amigos</a>' +
            '<a href="/index.html?agregar=1" class="h-drop-item">➕ Agregar mascota</a>' +
            '<a href="/galeria.html" class="h-drop-item">🌟 Ver galería</a>' +
            '<button class="h-drop-item danger" onclick="petmiCerrarSesion()">🚪 Cerrar sesión</button>' +
          '</div>' +
        '</div>'
      : '<a href="/index.html" class="h-btn-reg">Registra tu mascota</a>';

    // Mobile menu
    var mobHTML =
      '<span class="h-mob-sec">Navegación</span>' +
      '<a href="https://www.revistapetmi.com/" target="_blank">Blog</a>' +
      '<a href="https://www.revistapetmi.com/category/all-products" target="_blank">Tienda</a>' +
      '<a href="/galeria.html">PetzID</a>' +
      '<a href="/eventos.html">🎉 Eventos</a>' +
      '<a href="/lugares.html">📍 Lugares</a>' +
      '<a href="/galeria.html">Amigos PetMi</a>' +
      (sessionEmail
        ? '<span class="h-mob-sec">Mi cuenta</span>' +
          '<a href="/familia.html">🏠 Mi familia</a>' +
          '<a href="/amigos.html">🐾 Mis amigos</a>' +
          '<a href="/index.html?agregar=1">➕ Agregar mascota</a>' +
          '<button onclick="petmiCerrarSesion()">🚪 Cerrar sesión</button>'
        : '<a href="/index.html">Registra tu mascota</a>');

    // Construir header
    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<a href="/galeria.html" class="h-logo">' +
        '<img src="https://raw.githubusercontent.com/petzidgt-debug/petmi-petzid/main/logopetmi.png" alt="PetMi" height="36" onerror="this.style.display=\'none\'">' +
      '</a>' +
      '<nav class="h-nav">' + navHTML + '</nav>' +
      '<div class="h-right">' + rightHTML + '</div>' +
      '<button class="h-ham" onclick="petmiToggleHam()" aria-label="Menu"><span></span><span></span><span></span></button>' +
      '<div class="h-mob" id="petmiMobMenu">' + mobHTML + '</div>';

    document.body.insertBefore(header, document.body.firstChild);

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

    // Cargar notificaciones
    cargarNotifHeader(sessionEmail);
  }

  function cargarNotifHeader(sessionEmail){
    if(!sessionEmail) return;
    fetch('/api/galeria?action=checkEmail',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'checkEmail', email:sessionEmail})
    }).then(function(r){return r.json();})
    .then(function(d){
      if(!d.found||!d.mascotas.length) return;
      var promesas = d.mascotas.map(function(m){
        return fetch('/api/galeria?action=getAmigos&uid='+encodeURIComponent(m.uid)).then(function(r){return r.json();}).then(function(da){return {uid:m.uid,data:da};});
      });
      return Promise.all(promesas);
    }).then(function(resultados){
      if(!resultados) return;
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
    }).catch(function(){});
  }

  // Funciones globales
  window.petmiTogglePF = function(e){
    e.stopPropagation();
    var m = document.getElementById('pfMenu');
    if(m){ m.classList.toggle('open'); }
  };
  window.petmiToggleMenu = function(e){
    e.stopPropagation();
    var m = document.getElementById('petmiMenuDropdown');
    if(m){ m.classList.toggle('open'); }
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

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();

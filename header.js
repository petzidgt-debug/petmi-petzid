// header.js — Header compartido PetMi v2
(function(){
  function initHeader(){
    var sessionEmail = localStorage.getItem('petzid_email') || '';
    var sessionDueno = localStorage.getItem('petzid_dueno') || '';

    var style = document.createElement('style');
    style.textContent =
      '.site-header{background:#fff;border-bottom:1px solid #eee;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:300;box-shadow:0 1px 6px rgba(0,0,0,.07)}' +
      '.site-header .header-logo img{height:38px;display:block}' +
      '.site-header .header-nav{display:flex;align-items:center;gap:4px;margin:0 auto;padding:0 12px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-shrink:1;min-width:0}' +
      '.site-header .nav-link{padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;color:#555;text-decoration:none;border:1.5px solid transparent;white-space:nowrap;transition:all .2s}' +
      '.site-header .nav-link:hover{background:#f0f0ee;color:#00B4B4}' +
      '.site-header .nav-dropdown-wrap{position:relative;display:inline-block}' +
      '.site-header .nav-dropdown-btn{border:none;cursor:pointer;background:none;font-family:Arial,sans-serif}' +
      '.site-header .nav-dropdown{position:absolute;top:calc(100% + 8px);left:0;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.12);min-width:160px;overflow:hidden;display:none;z-index:500}' +
      '.site-header .nav-dropdown.open{display:block}' +
      '.site-header .nav-dropdown-item{display:block;padding:11px 16px;font-size:13px;font-weight:600;color:#333;text-decoration:none;border-bottom:1px solid #f5f5f5}' +
      '.site-header .nav-dropdown-item:last-child{border-bottom:none}' +
      '.site-header .nav-dropdown-item:hover{background:#f8f8f8}' +
      '.site-header .nav-link.active{color:#00B4B4;font-weight:700}' +
      '.site-header .header-right{display:flex;align-items:center;gap:8px;flex-shrink:0}' +
      '.site-header .user-badge{background:#e0f7f7;color:#007a7a;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}' +
      '.site-header .header-menu{position:relative;display:inline-block}' +
      '.site-header .menu-btn{padding:7px 14px;border:1.5px solid #00B4B4;border-radius:20px;font-size:12px;font-weight:700;color:#00B4B4;background:#fff;cursor:pointer;white-space:nowrap}' +
      '.site-header .menu-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:190px;overflow:hidden;display:none;z-index:500}' +
      '.site-header .menu-dropdown.open{display:block}' +
      '.site-header .menu-item{display:block;padding:12px 16px;font-size:14px;font-weight:600;color:#333;text-decoration:none;border:none;background:none;width:100%;text-align:left;border-bottom:1px solid #f5f5f5;cursor:pointer;box-sizing:border-box}' +
      '.site-header .menu-item:last-child{border-bottom:none}' +
      '.site-header .menu-item:hover{background:#f8f8f8}' +
      '.site-header .menu-item.danger{color:#c0392b}' +
      '.site-header .btn-registro{padding:7px 14px;border:none;border-radius:20px;font-size:12px;font-weight:700;color:#fff;background:#00B4B4;cursor:pointer;text-decoration:none;white-space:nowrap}' +
      '@media(max-width:600px){.site-header .header-nav{display:none}.site-header .hamburger{display:flex!important}}' +
      '.site-header .hamburger{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:6px;background:none;border:none}' +
      '.site-header .hamburger span{display:block;width:22px;height:2px;background:#555;border-radius:2px}' +
      '.site-header .mobile-menu{display:none;position:fixed;top:60px;left:0;right:0;background:#fff;border-bottom:1px solid #eee;z-index:400;padding:8px 0;box-shadow:0 4px 12px rgba(0,0,0,.1)}' +
      '.site-header .mobile-menu.open{display:block}' +
      '.site-header .mobile-menu a,.site-header .mobile-menu button{display:block;width:100%;padding:12px 20px;font-size:14px;font-weight:600;color:#333;text-decoration:none;text-align:left;border:none;background:none;cursor:pointer;border-bottom:1px solid #f5f5f5}' +
      '.site-header .mobile-menu a:last-child,.site-header .mobile-menu button:last-child{border-bottom:none}' +
      '.site-header .mobile-menu .mob-section{font-size:10px;font-weight:700;letter-spacing:1px;color:#bbb;text-transform:uppercase;padding:10px 20px 4px}';
    document.head.appendChild(style);

    // Nav links — orden: Blog, Tienda, PetzID, Amigos PetMi
    var currentPath = window.location.pathname;
    var navHTML =
      '<a href="https://www.revistapetmi.com/" target="_blank" class="nav-link">Blog</a>' +
      '<a href="https://www.revistapetmi.com/category/all-products" target="_blank" class="nav-link">Tienda</a>' +
      '<a href="/galeria.html" class="nav-link' + (currentPath.indexOf('galeria') >= 0 ? ' active' : '') + '">PetzID</a>' +
      '<div class="nav-dropdown-wrap">' +
        '<button class="nav-link nav-dropdown-btn" onclick="petmiTogglePetFriendly()">Pet Friendly &#x25BE;</button>' +
        '<div class="nav-dropdown" id="petFriendlyMenu">' +
          '<a href="/eventos.html" class="nav-dropdown-item">&#x1F389; Eventos</a>' +
          '<a href="/lugares.html" class="nav-dropdown-item">&#x1F4CD; Lugares</a>' +
        '</div>' +
      '</div>' +
      '<a href="/galeria.html" class="nav-link">Amigos PetMi</a>';

    // Lado derecho según sesión
    var rightHTML = sessionEmail
      ? '<a href="/amigos.html" id="petmiNotifBadge" style="display:none;background:#E05090;color:#fff;font-size:11px;font-weight:700;padding:6px 10px;border-radius:20px;text-decoration:none;white-space:nowrap">1 solicitud</a>' +
        '<div class="header-menu">' +
          '<button class="menu-btn" onclick="petmiToggleMenu()">&#x1F43E; ' + (sessionDueno ? sessionDueno.split(' ')[0] : sessionEmail.split('@')[0]) + ' &#x25BE;</button>' +
          '<div class="menu-dropdown" id="petmiMenuDropdown">' +
            '<a href="/familia.html" class="menu-item">&#x1F3E0; Mi familia</a>' +
            '<a href="/amigos.html" class="menu-item">&#x1F43E; Mis amigos</a>' +
            '<a href="/index.html?agregar=1" class="menu-item">&#x2795; Agregar mascota</a>' +
            '<a href="/galeria.html" class="menu-item">&#x1F43E; Amigos PetMi</a>' +
            '<button class="menu-item danger" onclick="petmiCerrarSesion()">&#x1F6AA; Cerrar sesi&oacute;n</button>' +
          '</div>' +
        '</div>'
      : '<a href="/index.html" class="btn-registro">Registra tu mascota</a>';

    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<a href="/galeria.html" class="header-logo">' +
        '<img src="https://raw.githubusercontent.com/petzidgt-debug/petmi-petzid/main/logopetmi.png" alt="PetMi" height="38" onerror="this.style.display=\'none\'">' +
      '</a>' +
      '<nav class="header-nav">' + navHTML + '</nav>' +
      '<button class="hamburger" onclick="petmiToggleHamburger()" aria-label="Menu">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
      '<div class="mobile-menu" id="petmiMobileMenu">' +
        '<div class="mob-section">Navegación</div>' +
        '<a href="https://www.revistapetmi.com/" target="_blank">Blog</a>' +
        '<a href="https://www.revistapetmi.com/category/all-products" target="_blank">Tienda</a>' +
        '<a href="/galeria.html">PetzID</a>' +
        '<a href="/eventos.html">Eventos</a>' +
        '<a href="/lugares.html">Lugares</a>' +
        '<a href="/galeria.html">Amigos PetMi</a>' +
        (sessionEmail ?
          '<div class="mob-section">Mi cuenta</div>' +
          '<a href="/familia.html">Mi familia</a>' +
          '<a href="/amigos.html">Mis amigos</a>' +
          '<a href="/index.html?agregar=1">Agregar mascota</a>' +
          '<button onclick="petmiCerrarSesion()">Cerrar sesión</button>'
        : '<a href="/index.html">Registra tu mascota</a>') +
      '</div>' +
      '<div class="header-right">' + rightHTML + '</div>';

    document.body.insertBefore(header, document.body.firstChild);

    document.addEventListener('click', function(e){
      var menu = document.getElementById('petmiMenuDropdown');
      if(menu && menu.classList.contains('open')){
        if(!e.target.closest('.header-menu')) menu.classList.remove('open');
      }
    });
  }

  window.petmiToggleHamburger = function(){
    var m = document.getElementById('petmiMobileMenu');
    if(m) m.classList.toggle('open');
  };

  window.petmiTogglePetFriendly = function(){
    var d=document.getElementById('petFriendlyMenu');
    if(d) d.classList.toggle('open');
  };

  window.petmiToggleMenu = function(){
    var d = document.getElementById('petmiMenuDropdown');
    if(d) d.classList.toggle('open');
  };

  window.petmiCerrarSesion = function(){
    localStorage.removeItem('petzid_email');
    localStorage.removeItem('petzid_dueno');
    window.location.href = '/galeria.html';
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      initHeader();
      cargarNotifHeader();
    });
  } else {
    initHeader();
    cargarNotifHeader();
  }

  function cargarNotifHeader(){
    if(!sessionEmail) return;
    var _uid = null;
    fetch('/api/galeria?action=checkEmail', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'checkEmail', email:sessionEmail})
    }).then(function(r){return r.json();})
    .then(function(d){
      if(!d.found||!d.mascotas.length) return null;
      // Buscar solicitudes para TODAS las mascotas del usuario
      var promesas = d.mascotas.map(function(m){
        return fetch('/api/galeria?action=getAmigos&uid='+encodeURIComponent(m.uid))
          .then(function(r){return r.json();})
          .then(function(da){ return {uid:m.uid, data:da}; });
      });
      return Promise.all(promesas);
    }).then(function(resultados){
      if(!resultados) return;
      var totalPendientes = 0;
      resultados.forEach(function(res){
        if(!res||!res.data) return;
        var pend = (res.data.pendientes||[]).filter(function(a){
          return a.uid_receptor === res.uid;
        });
        totalPendientes += pend.length;
      });
      var badge = document.getElementById('petmiNotifBadge');
      if(badge && totalPendientes > 0){
        badge.textContent = totalPendientes + (totalPendientes===1?' solicitud':' solicitudes');
        badge.style.display = 'inline-block';
      }
    }).catch(function(){});
  }

  window.petmiLimpiarNotif = function(){
    var badge = document.getElementById('petmiNotifBadge');
    if(badge) badge.style.display = 'none';
  };
})();

// header.js — Header compartido PetMi v2
(function(){
  function initHeader(){
    var sessionEmail = localStorage.getItem('petzid_email') || '';
    var sessionDueno = localStorage.getItem('petzid_dueno') || '';

    var style = document.createElement('style');
    style.textContent =
      '.site-header{background:#fff;border-bottom:1px solid #eee;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:300;box-shadow:0 1px 6px rgba(0,0,0,.07)}' +
      '.site-header .header-logo img{height:38px;display:block}' +
      '.site-header .header-nav{display:flex;align-items:center;gap:4px;margin:0 auto;padding:0 20px}' +
      '.site-header .nav-link{padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;color:#555;text-decoration:none;border:1.5px solid transparent;white-space:nowrap;transition:all .2s}' +
      '.site-header .nav-link:hover{background:#f0f0ee;color:#00B4B4}' +
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
      '@media(max-width:600px){.site-header .header-nav{display:none}}';
    document.head.appendChild(style);

    // Nav links — orden: Blog, Tienda, PetzID, Amigos PetMi
    var currentPath = window.location.pathname;
    var navHTML =
      '<a href="https://www.revistapetmi.com/" target="_blank" class="nav-link">Blog</a>' +
      '<a href="https://www.revistapetmi.com/category/all-products" target="_blank" class="nav-link">Tienda</a>' +
      '<a href="/galeria.html" class="nav-link' + (currentPath.indexOf('galeria') >= 0 ? ' active' : '') + '">PetzID</a>' +
      '<a href="/amigos.html" class="nav-link' + (currentPath.indexOf('amigos') >= 0 ? ' active' : '') + '">Amigos PetMi</a>';

    // Lado derecho según sesión
    var rightHTML = sessionEmail
      ? '<span class="user-badge">&#x1F43E; ' + (sessionDueno || sessionEmail) + '</span>' +
        '<div class="header-menu">' +
          '<button class="menu-btn" onclick="petmiToggleMenu()">Mi cuenta &#x25BE;</button>' +
          '<div class="menu-dropdown" id="petmiMenuDropdown">' +
            '<a href="/familia.html" class="menu-item">&#x1F3E0; Mi familia</a>' +
            '<a href="/index.html?agregar=1" class="menu-item">&#x2795; Agregar mascota</a>' +
            '<a href="/amigos.html" class="menu-item">&#x1F43E; Amigos PetMi</a>' +
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
      '<div class="header-right">' + rightHTML + '</div>';

    document.body.insertBefore(header, document.body.firstChild);

    document.addEventListener('click', function(e){
      var menu = document.getElementById('petmiMenuDropdown');
      if(menu && menu.classList.contains('open')){
        if(!e.target.closest('.header-menu')) menu.classList.remove('open');
      }
    });
  }

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
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();

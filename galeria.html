// header.js — Header compartido PetMi
// Incluir con: <script src="/header.js"></script>

(function(){
  var sessionEmail = localStorage.getItem('petzid_email') || '';
  var sessionDueno = localStorage.getItem('petzid_dueno') || '';

  // CSS
  var style = document.createElement('style');
  style.textContent = `
    .site-header{background:#fff;border-bottom:1px solid #eee;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:300;box-shadow:0 1px 6px rgba(0,0,0,.07)}
    .site-header .header-logo img{height:38px;display:block}
    .site-header .header-logo-fallback{font-size:20px;font-weight:900;color:#00B4B4;display:none}
    .site-header .header-logo-fallback span{color:#E05090}
    .site-header .header-nav{display:flex;align-items:center;gap:4px;margin:0 12px}
    .site-header .nav-link{padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;color:#555;text-decoration:none;transition:all .2s;white-space:nowrap;border:1.5px solid transparent}
    .site-header .nav-link:hover{background:#f0f0ee;color:#00B4B4}
    .site-header .header-right{display:flex;align-items:center;gap:8px}
    .site-header .user-badge{background:#e0f7f7;color:#007a7a;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
    .site-header .header-menu{position:relative;display:inline-block}
    .site-header .menu-btn{padding:7px 14px;border:1.5px solid #00B4B4;border-radius:20px;font-size:12px;font-weight:700;color:#00B4B4;background:#fff;cursor:pointer;white-space:nowrap}
    .site-header .menu-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:180px;overflow:hidden;display:none;z-index:500}
    .site-header .menu-dropdown.open{display:block}
    .site-header .menu-item{display:block;padding:12px 16px;font-size:14px;font-weight:600;color:#333;text-decoration:none;border:none;background:none;width:100%;text-align:left;border-bottom:1px solid #f5f5f5;cursor:pointer;box-sizing:border-box}
    .site-header .menu-item:last-child{border-bottom:none}
    .site-header .menu-item:hover{background:#f8f8f8}
    .site-header .menu-item.danger{color:#c0392b}
    .site-header .btn-registro{padding:7px 14px;border:none;border-radius:20px;font-size:12px;font-weight:700;color:#fff;background:#00B4B4;cursor:pointer;text-decoration:none;white-space:nowrap}
    @media(max-width:520px){.site-header .header-nav{display:none}.site-header .user-badge{display:none}}
  `;
  document.head.appendChild(style);

  // HTML del header
  var rightHTML = sessionEmail
    ? '<span class="user-badge">🐾 ' + (sessionDueno || sessionEmail) + '</span>'
      + '<div class="header-menu">'
      + '<button class="menu-btn" onclick="petmiToggleMenu()">Mi cuenta ▾</button>'
      + '<div class="menu-dropdown" id="petmiMenuDropdown">'
      + '<a href="/familia.html" class="menu-item">🐾 Mi familia</a>'
      + '<a href="/index.html?agregar=1" class="menu-item">➕ Agregar mascota</a>'
      + '<a href="/galeria.html" class="menu-item">🌟 Ver galería</a>'
      + '<button class="menu-item danger" onclick="petmiCerrarSesion()">🚪 Cerrar sesión</button>'
      + '</div></div>'
    : '<a href="/index.html" class="btn-registro">Registra tu mascota</a>';

  var headerHTML = '<header class="site-header">'
    + '<a href="https://www.revistapetmi.com" class="header-logo">'
    + '<img src="https://raw.githubusercontent.com/petzidgt-debug/petmi-petzid/main/logopetmi.png" alt="PetMi" height="38" onerror="this.style.display=\'none\'">'
    + '</a>'
    + '<nav class="header-nav">'
    + '<a href="https://www.revistapetmi.com/category/all-products" target="_blank" class="nav-link">Tienda</a>'
    + '<a href="https://www.revistapetmi.com/" target="_blank" class="nav-link">Blog</a>'
    + '</nav>'
    + '<div class="header-right">' + rightHTML + '</div>'
    + '</header>';

  // Insertar al inicio del body
  document.body.insertAdjacentHTML('afterbegin', headerHTML);

  // Funciones globales
  window.petmiToggleMenu = function(){
    var d = document.getElementById('petmiMenuDropdown');
    if(d) d.classList.toggle('open');
  };

  window.petmiCerrarSesion = function(){
    localStorage.removeItem('petzid_email');
    localStorage.removeItem('petzid_dueno');
    window.location.href = '/galeria.html';
  };

  // Cerrar menú al click fuera
  document.addEventListener('click', function(e){
    var menu = document.getElementById('petmiMenuDropdown');
    if(menu && menu.classList.contains('open')){
      if(!e.target.closest('.header-menu')) menu.classList.remove('open');
    }
  });
})();

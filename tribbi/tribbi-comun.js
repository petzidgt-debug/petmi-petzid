/* ══════════════════════════════════════════════════════════════════════
   TRIBBI · código compartido de admin.html y bookpal.html
   La llave de Supabase es la PÚBLICA ("anon"): puede ir aquí, no es un secreto.
   Nunca pegues aquí la llave "service_role" ni la de Recurrente.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const CONFIG={
  supabaseUrl:'https://ilcreewilnkchvozicyp.supabase.co',
  supabaseAnonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDU3NTIsImV4cCI6MjA5MzU4MTc1Mn0.X5QoGsMIKU0oWd0q0qvKYxlbb1tZfMvttBxOwL0BCoM',
  pagoApi:'/api/tribbi-pago'
};
const SB=CONFIG.supabaseUrl,KEY=CONFIG.supabaseAnonKey,TZ='America/Guatemala';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dia(s){if(!s)return '';const f=/^\d{4}-\d{2}-\d{2}$/.test(s);return new Date(f?s+'T12:00:00Z':s).toLocaleDateString('es-GT',{day:'numeric',month:'long',timeZone:f?'UTC':TZ})}
const diaHora=s=>s?new Date(s).toLocaleString('es-GT',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:TZ}):'';
const q=n=>'Q'+Number(n||0).toLocaleString('es-GT',{maximumFractionDigits:2});
/* Fechas para <input type="datetime-local">, siempre en hora de Guatemala (UTC-6, sin horario de verano) */
function aLocal(iso){if(!iso)return '';const d=new Date(new Date(iso).getTime()-6*3600e3);return d.toISOString().slice(0,16)}
const deLocal=v=>v?v+':00-06:00':'';
const reduced=(typeof matchMedia==='function')&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const mem={};
const store={get(k){try{return localStorage.getItem(k)}catch(e){return mem[k]||null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){mem[k]=v}},del(k){try{localStorage.removeItem(k)}catch(e){delete mem[k]}}};

const GENEROS={novela:'Novela',misterio:'Misterio',fantasia:'Fantasía',ciencia_ficcion:'Ciencia ficción',romance:'Romance',historia:'Historia',biografia:'Biografía',
  autoayuda:'Autoayuda',negocios:'Negocios',poesia:'Poesía',comic:'Cómic',clasicos:'Clásicos',cuentos:'Cuentos',divulgacion:'Divulgación',otro:'Otro'};
const PUBLICO={adultos:'Adultos','0-5':'Niños de 0 a 5','6-9':'Niños de 6 a 9','10-12':'Niños de 10 a 12',juvenil:'Juvenil (13 a 17)'};
const CONDICION={como_nuevo:'Como nuevo',buen_estado:'Buen estado',con_uso:'Con señales de uso'};

/* ── Sesión (la misma de tribbi.html: entrar en una página sirve para las demás) ── */
const SK='tribbi_sesion';
let ses=null;try{ses=JSON.parse(store.get(SK)||'null')}catch(e){ses=null}
function guardarSesion(d){ses={at:d.access_token,rt:d.refresh_token,exp:Math.floor(Date.now()/1000)+(d.expires_in||3600),email:(d.user&&d.user.email)||(ses&&ses.email)||''};store.set(SK,JSON.stringify(ses))}
function borrarSesion(){ses=null;store.del(SK)}
async function auth(path,body,tk){
  try{
    const r=await fetch(SB+'/auth/v1/'+path,{method:'POST',headers:Object.assign({'Content-Type':'application/json',apikey:KEY},tk?{Authorization:'Bearer '+tk}:{}),body:JSON.stringify(body||{})});
    let d={};try{d=await r.json()}catch(e){}
    return {ok:r.ok,status:r.status,d:d};
  }catch(e){return {ok:false,status:0,d:{}}}
}
let renovando=null;
async function token(){
  if(!ses)return null;
  if(ses.exp-60>Date.now()/1000)return ses.at;
  if(!renovando)renovando=auth('token?grant_type=refresh_token',{refresh_token:ses.rt}).then(r=>{renovando=null;if(r.ok&&r.d.access_token){guardarSesion(r.d);return ses.at}if(r.status!==0)borrarSesion();return null});
  return renovando;
}
async function salir(){const tk=ses&&ses.at;borrarSesion();if(tk)auth('logout',{},tk)}
async function rpc(fn,args){
  const tk=await token();
  try{
    const r=await fetch(SB+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+(tk||KEY)},body:JSON.stringify(args||{}),cache:'no-store'});
    let d={};try{d=await r.json()}catch(e){}
    if(r.ok&&d&&typeof d==='object')return {ok:d.ok!==false,d:d};
    if(r.status===401||r.status===403)return {ok:false,d:{error:'sesion',mensaje:'Tu sesión venció. Vuelve a entrar con tu correo.'}};
    if(r.status===404)return {ok:false,d:{error:'falta_sql',mensaje:'Falta correr un archivo SQL de Tribbi en Supabase.'}};
    return {ok:false,d:{error:'servidor',mensaje:'Algo salió mal. Intenta de nuevo.',detalle:String((d&&d.message)||'').slice(0,160)}};
  }catch(e){return {ok:false,d:{error:'red',mensaje:'Sin conexión. Revisa tu internet e intenta de nuevo.'}}}
}
/* Mensaje de error; con detalle técnico solo en el panel */
const fallo=(r,base,conDetalle)=>(r.d.error==='servidor'?base:(r.d.mensaje||base))+(conDetalle&&r.d.detalle?` (${r.d.detalle})`:'');

/* ── Entrar: una sola forma, correo y contraseña ── */
const URL_ENTRAR=()=>location.origin+location.pathname.replace(/[^/]*$/,'')+'entrar.html';
const errAuth=r=>{
  const m=String((r.d&&(r.d.msg||r.d.error_description||r.d.message||r.d.error_code||r.d.code))||'').toLowerCase();
  if(r.status===0)return 'Sin conexión. Revisa tu internet.';
  if(r.status===429)return 'Demasiados intentos. Espera unos minutos.';
  if(m.includes('already')||m.includes('exists'))return 'Ya hay una cuenta con ese correo. Entra con tu contraseña.';
  if(m.includes('invalid login')||m.includes('invalid_credentials')||m.includes('invalid grant'))return 'Correo o contraseña incorrectos.';
  if(m.includes('password'))return 'La contraseña debe tener al menos 6 caracteres.';
  if(m.includes('email'))return 'Revisa tu correo.';
  return 'No se pudo. Intenta de nuevo.';
};
/* Crea la cuenta. Devuelve '' si quedó dentro, o un mensaje de error. */
async function crearCuenta(email,clave){
  const r=await auth('signup',{email:email.trim().toLowerCase(),password:clave});
  if(r.ok&&r.d.access_token){guardarSesion(r.d);return ''}
  if(r.ok)return 'Tu cuenta se creó, pero hay que confirmarla desde tu correo. Revisa tu bandeja y vuelve a entrar.';
  return errAuth(r);
}
async function entrarConClave(email,clave){
  const r=await auth('token?grant_type=password',{email:email.trim().toLowerCase(),password:clave});
  if(r.ok&&r.d.access_token){guardarSesion(r.d);return ''}
  return errAuth(r);
}
async function recuperar(email){
  const r=await auth('recover?redirect_to='+encodeURIComponent(URL_ENTRAR()),{email:email.trim().toLowerCase()});
  return r.ok||r.status===200?'':errAuth(r);
}
/* Verifica el código de recuperación que llega por correo y deja la sesión abierta para cambiar la contraseña */
async function verificarRecuperacion(email,codigo){
  const r=await auth('verify',{type:'recovery',email:email.trim().toLowerCase(),token:String(codigo).replace(/\D/g,'')});
  if(r.ok&&r.d.access_token){guardarSesion(r.d);return ''}
  return r.status===429?'Demasiados intentos. Espera unos minutos.':'Ese código no es válido o ya venció. Revisa el último correo que te llegó o pide otro.';
}
/* Formulario de entrar, crear cuenta y "olvidé mi contraseña" */
function montarLogin(el,opts){
  opts=opts||{};
  el.innerHTML=`
  <form class="tb-box" data-paso="entrar" autocomplete="on">
    <h1>${esc(opts.titulo||'Entrar')}</h1>
    <p>${esc(opts.texto||'Entra con tu correo y tu contraseña.')}</p>
    <label>Correo<input class="tb-field" name="email" type="email" autocomplete="username" required maxlength="120"></label>
    <label>Contraseña<input class="tb-field" name="clave" type="password" autocomplete="current-password" required maxlength="72"></label>
    <div class="tb-err" role="alert"></div>
    <button class="tb-btn" type="submit">Entrar</button>
    <p class="tb-tiny"><button type="button" class="tb-link" data-ir="olvide">Olvidé mi contraseña</button>${opts.sinCrear?'':` · <button type="button" class="tb-link" data-ir="crear">Crear una cuenta</button>`}</p>
  </form>
  <form class="tb-box" data-paso="crear" hidden autocomplete="on">
    <h1>Crea tu cuenta</h1>
    <p>Con tu correo y una contraseña entras desde cualquier celular o computadora.</p>
    <label>Correo<input class="tb-field" name="email" type="email" autocomplete="username" required maxlength="120"></label>
    <label>Contraseña<input class="tb-field" name="clave" type="password" autocomplete="new-password" required minlength="6" maxlength="72"></label>
    <label>Repítela<input class="tb-field" name="clave2" type="password" autocomplete="new-password" required maxlength="72"></label>
    <div class="tb-err" role="alert"></div>
    <button class="tb-btn" type="submit">Crear mi cuenta</button>
    <p class="tb-tiny"><button type="button" class="tb-link" data-ir="entrar">Ya tengo cuenta</button></p>
  </form>
  <form class="tb-box" data-paso="olvide" hidden autocomplete="on">
    <h1>¿Olvidaste tu contraseña?</h1>
    <p>Te mandamos un código a tu correo para crear una nueva.</p>
    <label>Correo<input class="tb-field" name="email" type="email" autocomplete="username" required maxlength="120"></label>
    <div class="tb-err" role="alert"></div>
    <button class="tb-btn" type="submit">Enviar código</button>
    <p class="tb-tiny"><button type="button" class="tb-link" data-ir="entrar">Volver a entrar</button></p>
  </form>
  <form class="tb-box" data-paso="codigo" hidden autocomplete="off">
    <h1>Revisa tu correo</h1>
    <p class="tb-txt"></p>
    <input type="hidden" name="email">
    <label>Código<input class="tb-field tb-code" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required></label>
    <label>Contraseña nueva<input class="tb-field" name="clave" type="password" autocomplete="new-password" minlength="6" maxlength="72" required></label>
    <label>Repítela<input class="tb-field" name="clave2" type="password" autocomplete="new-password" maxlength="72" required></label>
    <div class="tb-err" role="alert"></div>
    <button class="tb-btn" type="submit">Guardar y entrar</button>
    <p class="tb-tiny">¿No llegó? Revisa spam o <button type="button" class="tb-link" data-ir="olvide">pide otro código</button>.</p>
  </form>`;
  const f=p=>el.querySelector(`[data-paso="${p}"]`);
  function ir(p){['entrar','crear','olvide','codigo'].forEach(x=>f(x).hidden=x!==p);const n=f(p);n.querySelector('.tb-err').textContent='';n.querySelector('.tb-err').className='tb-err';
    const prev=el.querySelector('[data-paso]:not([hidden]) [name=email]');setTimeout(()=>{const i=n.querySelector('input');i&&i.focus()},50)}
  el.addEventListener('click',e=>{const b=e.target.closest('[data-ir]');if(!b)return;const em=(el.querySelector('form:not([hidden]) [name=email]')||{}).value||'';ir(b.dataset.ir);f(b.dataset.ir).email.value=em});
  if(ses&&ses.email)f('entrar').email.value=ses.email;
  const enviar=(paso,fn)=>f(paso).addEventListener('submit',async e=>{
    e.preventDefault();const fo=f(paso),err=fo.querySelector('.tb-err'),b=fo.querySelector('button[type=submit]');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fo.email.value.trim())){err.textContent='Revisa tu correo.';return}
    b.disabled=true;err.className='tb-err';err.textContent='';const m=await fn(fo,err);b.disabled=false;if(m)err.textContent=m;
  });
  enviar('entrar',async fo=>{const m=await entrarConClave(fo.email.value,fo.clave.value);fo.clave.value='';if(!m){opts.onEntrar&&opts.onEntrar();return ''}return m});
  enviar('crear',async fo=>{if(fo.clave.value.length<6)return 'La contraseña debe tener al menos 6 caracteres.';if(fo.clave.value!==fo.clave2.value)return 'Las contraseñas no coinciden.';
    const m=await crearCuenta(fo.email.value,fo.clave.value);if(!m){opts.onEntrar&&opts.onEntrar();return ''}return m});
  enviar('olvide',async fo=>{const em=fo.email.value.trim().toLowerCase(),m=await recuperar(em);if(m)return m;
    const c=f('codigo');c.email.value=em;c.querySelector('.tb-txt').textContent=`Si hay una cuenta con ${em}, te llegó un código. Escríbelo aquí y crea tu contraseña nueva.`;
    ir('codigo');c.email.value=em;return ''});
  f('codigo').addEventListener('submit',async e=>{
    e.preventDefault();const fo=f('codigo'),err=fo.querySelector('.tb-err'),b=fo.querySelector('button[type=submit]');err.textContent='';
    if(fo.codigo.value.replace(/\D/g,'').length<6){err.textContent='El código tiene 6 números.';return}
    if(fo.clave.value.length<6){err.textContent='La contraseña debe tener al menos 6 caracteres.';return}
    if(fo.clave.value!==fo.clave2.value){err.textContent='Las contraseñas no coinciden.';return}
    b.disabled=true;let m=await verificarRecuperacion(fo.email.value,fo.codigo.value);if(!m)m=await cambiarClave(fo.clave.value);b.disabled=false;
    if(m){err.textContent=m;return}fo.reset();opts.onEntrar&&opts.onEntrar();
  });
  ir(opts.paso||'entrar');
}
/* Cambiar la contraseña cuando la persona llega desde el correo de recuperación */
async function cambiarClave(nueva){
  const tk=await token();if(!tk)return 'El enlace venció. Pide otro correo.';
  try{const r=await fetch(SB+'/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+tk},body:JSON.stringify({password:nueva})});
    let d={};try{d=await r.json()}catch(e){}return r.ok?'':errAuth({status:r.status,d})}catch(e){return 'Sin conexión. Revisa tu internet.'}
}
/* Si la página se abrió desde el correo de recuperación, guarda esa sesión. Devuelve true en ese caso. */
function sesionDesdeEnlace(){
  const h=new URLSearchParams((location.hash||'').slice(1));
  if(!h.get('access_token'))return false;
  guardarSesion({access_token:h.get('access_token'),refresh_token:h.get('refresh_token'),expires_in:Number(h.get('expires_in')||3600)});
  history.replaceState(null,'',location.pathname+location.search);
  return h.get('type')||'magiclink';
}

/* ── Tarjeta para raspar: llama a pedir() en el primer toque; pedir() devuelve el texto a mostrar o null ── */
function montarRaspa(box,pedir,alTerminar){
  box.innerHTML='<div class="tb-secret">🎁</div><canvas aria-hidden="true"></canvas>';
  const cv=box.querySelector('canvas'),sec=box.querySelector('.tb-secret');let listo=false,pend=null;
  const traer=()=>pend||(pend=Promise.resolve(pedir()).then(t=>{if(t)sec.textContent=t;else pend=null;return t}));
  async function revelar(){if(listo)return;listo=true;const t=await traer();if(!t){listo=false;return}cv.classList.add('tb-gone');confetti();alTerminar&&alTerminar()}
  (async()=>{
    try{await document.fonts.ready}catch(e){}
    const b=box.getBoundingClientRect(),dpr=window.devicePixelRatio||1;cv.width=Math.round(b.width*dpr);cv.height=Math.round(b.height*dpr);
    const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const w=b.width,h=b.height,g=ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'#D9A12E');g.addColorStop(.5,'#F7D982');g.addColorStop(1,'#C98F1F');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.55)';for(let k=0;k<90;k++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,Math.random()*2+.5,0,7);ctx.fill()}
    ctx.fillStyle='#6B4300';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 22px Fredoka, sans-serif';ctx.fillText('Raspa aquí ✨',w/2,h/2-10);
    ctx.font='400 15px Fredoka, sans-serif';ctx.fillText('con el dedo o el mouse',w/2,h/2+16);
    ctx.globalCompositeOperation='destination-out';ctx.lineWidth=40;ctx.lineCap='round';
    let down=false,last=null,moves=0;const pos=e=>{const r=cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
    const check=()=>{if(listo)return;const d=ctx.getImageData(0,0,cv.width,cv.height).data;let c=0,t=0;for(let k=3;k<d.length;k+=64){t++;if(d[k]<20)c++}if(t&&c/t>.45)revelar()};
    const stroke=p=>{const a=last||{x:p.x+.1,y:p.y};ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;if(++moves%6===0)check()};
    cv.onpointerdown=e=>{if(listo)return;traer();down=true;last=null;try{cv.setPointerCapture(e.pointerId)}catch(_){}stroke(pos(e))};
    cv.onpointermove=e=>{if(down&&!listo)stroke(pos(e))};
    cv.onpointerup=cv.onpointercancel=()=>{down=false;last=null;check()};
  })();
  return revelar;   // para el botón "Descubrir sin raspar"
}
function confetti(){
  if(reduced)return;
  const c=document.createElement('div');c.className='tb-confetti';c.setAttribute('aria-hidden','true');const cols=['#E2483D','#F3B431','#127A6E','#2F7FC1','#fff'];
  c.innerHTML=Array.from({length:60},(_,i)=>`<i style="left:${Math.random()*100}%;background:${cols[i%5]};animation-delay:${Math.random()*.5}s;animation-duration:${1.4+Math.random()}s"></i>`).join('');
  document.body.appendChild(c);setTimeout(()=>c.remove(),3200);
}
/* Abre el cobro (función de Vercel). Devuelve un mensaje de error, o nada si redirige. */
async function pagar(cuerpo){
  const tk=await token();if(!tk)return 'Tu sesión venció. Vuelve a entrar.';
  try{
    const r=await fetch(CONFIG.pagoApi,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tk},body:JSON.stringify(cuerpo)});
    let d={};try{d=await r.json()}catch(e){}
    if(r.ok&&d.url){location.href=d.url;return ''}
    return r.status===404?'El pago en línea todavía no está activado. Tu lugar quedó guardado: vuelve pronto para pagar.':(d.mensaje||'No se pudo abrir el pago. Intenta de nuevo.');
  }catch(e){return 'Sin conexión. Revisa tu internet e intenta de nuevo.'}
}
async function copiar(texto,boton){try{await navigator.clipboard.writeText(texto);if(boton){const t=boton.textContent;boton.textContent='Copiado ✓';setTimeout(()=>boton.textContent=t,1800)}}catch(e){prompt('Copia el texto:',texto)}}


/* ── Portada del intercambio ── */
const DISENOS={navidad:'🎄',luces:'',morado:'💜',nieve:'❄️',estrella:'⭐',noche:'✨'};
const LUZ=['#D7263D','#F2B33D','#1F8A5B','#2F7FC1','#E0662A'];
const lucesHTML=n=>`<span class="tb-luces" aria-hidden="true">${Array.from({length:n},(_,i)=>`<i style="--c:${LUZ[i%5]};--d:${(i%4)*.5}s"></i>`).join('')}</span>`;
const urlPortadaOk=u=>typeof u==='string'&&u.startsWith(SB+'/storage/v1/object/public/tribbi/portadas/')&&/^[A-Za-z0-9._\-\/:]+$/.test(u);
/* tam: '' (grande), 'thumb' o 'mini' */
function portadaHTML(x,tam){
  const cls='tb-portada'+(tam?' '+tam:''),nombre=esc((x&&x.nombre)||'el intercambio');
  if(x&&urlPortadaOk(x.portada_url))return `<div class="${cls}" style="background-image:url('${x.portada_url}')" role="img" aria-label="Portada de ${nombre}"></div>`;
  const d=(x&&DISENOS.hasOwnProperty(x.portada_diseno))?x.portada_diseno:'navidad';
  return `<div class="${cls} d-${d}" role="img" aria-label="Portada de ${nombre}">${d==='luces'?lucesHTML(tam?4:9):`<span aria-hidden="true">${DISENOS[d]}</span>`}</div>`;
}
/* Achica la foto en el aparato (máximo 1600 px) y la sube. Devuelve {url} o {error}. */
async function subirPortada(slug,archivo){
  if(!archivo||!/^image\//.test(archivo.type||''))return {error:'Elige una foto (JPG o PNG).'};
  let img=null;
  try{img=await createImageBitmap(archivo)}catch(e){
    img=await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=URL.createObjectURL(archivo)});
  }
  if(!img)return {error:'No pudimos leer esa foto. Prueba con una JPG o PNG.'};
  const w=img.width,h=img.height,k=Math.min(1,1600/Math.max(w,h)),cv=document.createElement('canvas');
  cv.width=Math.round(w*k);cv.height=Math.round(h*k);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
  const blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',.82));
  if(!blob)return {error:'No pudimos preparar la foto. Intenta con otra.'};
  const tk=await token();if(!tk)return {error:'Tu sesión venció. Vuelve a entrar.'};
  const ruta='portadas/'+slug+'/'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)+'.jpg';
  try{
    const r=await fetch(SB+'/storage/v1/object/tribbi/'+ruta,{method:'POST',headers:{Authorization:'Bearer '+tk,apikey:KEY,'Content-Type':'image/jpeg','x-upsert':'false'},body:blob});
    if(r.ok)return {url:SB+'/storage/v1/object/public/tribbi/'+ruta};
    let d={};try{d=await r.json()}catch(e){}
    const m=String(d.message||d.error||'').toLowerCase();
    if(m.includes('bucket'))return {error:'Falta correr 8_portadas.sql en Supabase.'};
    if(r.status===413||m.includes('size'))return {error:'La foto es muy pesada. Prueba con otra.'};
    if(r.status===401||r.status===403||m.includes('policy'))return {error:'No tienes permiso para cambiar la portada de este intercambio.'};
    return {error:'No se pudo subir la foto. Intenta de nuevo.'};
  }catch(e){return {error:'Sin conexión. Revisa tu internet e intenta de nuevo.'}}
}
/* Borra una foto anterior (si falla, no pasa nada) */
async function borrarPortada(url){
  if(!urlPortadaOk(url))return;const tk=await token();if(!tk)return;
  try{await fetch(SB+'/storage/v1/object/tribbi/'+url.split('/object/public/tribbi/')[1],{method:'DELETE',headers:{Authorization:'Bearer '+tk,apikey:KEY}})}catch(e){}
}

window.Tribbi={CONFIG,$,esc,dia,diaHora,q,aLocal,deLocal,store,GENEROS,PUBLICO,CONDICION,get ses(){return ses},token,salir,borrarSesion,rpc,fallo,montarLogin,crearCuenta,entrarConClave,recuperar,verificarRecuperacion,cambiarClave,sesionDesdeEnlace,montarRaspa,confetti,pagar,copiar,reduced,portadaHTML,subirPortada,borrarPortada,DISENOS,lucesHTML};
})();

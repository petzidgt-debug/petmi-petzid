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
function avisarSesion(){try{window.dispatchEvent(new Event('tribbi-sesion'))}catch(e){}}
function guardarSesion(d){ses={at:d.access_token,rt:d.refresh_token,exp:Math.floor(Date.now()/1000)+(d.expires_in||3600),email:(d.user&&d.user.email)||(ses&&ses.email)||''};store.set(SK,JSON.stringify(ses));avisarSesion()}
function borrarSesion(){ses=null;store.del(SK);avisarSesion()}
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
const URL_ENTRAR=()=>new URL('entrar.html',document.baseURI).href;   // la página tiene <base href="/tribbi/">
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
  // Si el correo ya tenía cuenta confirmada, Supabase responde "listo" sin mandar nada (identities vacío)
  const u=(r.d&&r.d.user)||r.d||{};
  if(r.ok&&Array.isArray(u.identities)&&u.identities.length===0)return YA_EXISTE;
  if(r.ok)return CONFIRMAR;   // Supabase mandó un código al correo para confirmar la cuenta
  return errAuth(r);
}
const CONFIRMAR='__confirmar__',YA_EXISTE='__ya_existe__';
/* Confirma la cuenta con el código que llegó al correo y deja la sesión abierta */
async function confirmarCuenta(email,codigo){
  const em=email.trim().toLowerCase(),tk=String(codigo).replace(/\D/g,'');
  let r=await auth('verify',{type:'signup',email:em,token:tk});
  if(!(r.ok&&r.d.access_token))r=await auth('verify',{type:'email',email:em,token:tk});
  if(r.ok&&r.d.access_token){guardarSesion(r.d);return ''}
  return r.status===429?'Demasiados intentos. Espera unos minutos.':'Ese código no es válido o ya venció. Revisa el último correo que te llegó o pide otro.';
}
async function reenviarCodigo(email){
  const r=await auth('resend',{type:'signup',email:email.trim().toLowerCase()});
  return r.ok?'':r.status===429?'Espera un minuto antes de pedir otro código.':'No se pudo reenviar el código. Intenta de nuevo.';
}
async function entrarConClave(email,clave){
  const r=await auth('token?grant_type=password',{email:email.trim().toLowerCase(),password:clave});
  if(r.ok&&r.d.access_token){guardarSesion(r.d);return ''}
  const m=String((r.d&&(r.d.msg||r.d.error_description||r.d.message||r.d.error_code||r.d.code))||'').toLowerCase();
  if(m.includes('not confirmed')||m.includes('not_confirmed'))return CONFIRMAR;
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
    <h1>${esc(opts.tituloCrear||'Crea tu cuenta')}</h1>
    <p>${esc(opts.textoCrear||'Con tu correo y una contraseña entras desde cualquier celular o computadora.')}</p>
    <label>Correo<input class="tb-field" name="email" type="email" autocomplete="username" required maxlength="120"></label>
    <label>Contraseña<input class="tb-field" name="clave" type="password" autocomplete="new-password" required minlength="6" maxlength="72"></label>
    <label>Repítela<input class="tb-field" name="clave2" type="password" autocomplete="new-password" required maxlength="72"></label>
    <div class="tb-err" role="alert"></div>
    <button class="tb-btn" type="submit">${esc(opts.botonCrear||'Crear mi cuenta')}</button>
    <p class="tb-tiny"><button type="button" class="tb-link" data-ir="entrar">Ya tengo cuenta</button></p>
  </form>
  <form class="tb-box" data-paso="confirmar" hidden autocomplete="off">
    <h1>Confirma tu correo</h1>
    <p class="tb-txt"></p>
    <input type="hidden" name="email">
    <label>Código<input class="tb-field tb-code" name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required></label>
    <div class="tb-err" role="alert"></div>
    <button class="tb-btn" type="submit">Confirmar y entrar</button>
    <p class="tb-tiny">¿No llegó? Revisa spam o <button type="button" class="tb-link" data-reenviar>reenvía el código</button>. <button type="button" class="tb-link" data-ir="crear">Usar otro correo</button></p>
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
  function ir(p){['entrar','crear','olvide','codigo','confirmar'].forEach(x=>f(x).hidden=x!==p);const n=f(p);n.querySelector('.tb-err').textContent='';n.querySelector('.tb-err').className='tb-err';
    const prev=el.querySelector('[data-paso]:not([hidden]) [name=email]');setTimeout(()=>{const i=n.querySelector('input');i&&i.focus()},50)}
  el.addEventListener('click',e=>{const b=e.target.closest('[data-ir]');if(!b)return;const em=(el.querySelector('form:not([hidden]) [name=email]')||{}).value||'';ir(b.dataset.ir);f(b.dataset.ir).email.value=em});
  if(ses&&ses.email)f('entrar').email.value=ses.email;
  const enviar=(paso,fn)=>f(paso).addEventListener('submit',async e=>{
    e.preventDefault();const fo=f(paso),err=fo.querySelector('.tb-err'),b=fo.querySelector('button[type=submit]');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fo.email.value.trim())){err.textContent='Revisa tu correo.';return}
    b.disabled=true;err.className='tb-err';err.textContent='';const m=await fn(fo,err);b.disabled=false;if(m)err.textContent=m;
  });
  /* Muestra el paso de confirmar el correo */
  function aConfirmar(email,reenviado){
    const c=f('confirmar'),em=email.trim().toLowerCase();ir('confirmar');c.email.value=em;c.codigo.value='';
    c.querySelector('.tb-txt').textContent=reenviado?`Tu cuenta todavía no está confirmada. Te mandamos un código a ${em}: escríbelo aquí.`:`Te mandamos un código a ${em}. Escríbelo aquí para confirmar tu cuenta.`;
  }
  enviar('entrar',async fo=>{const em=fo.email.value,m=await entrarConClave(em,fo.clave.value);fo.clave.value='';
    if(m===CONFIRMAR){await reenviarCodigo(em);aConfirmar(em,true);return ''}
    if(!m){opts.onEntrar&&opts.onEntrar();return ''}return m});
  enviar('crear',async fo=>{if(fo.clave.value.length<6)return 'La contraseña debe tener al menos 6 caracteres.';if(fo.clave.value!==fo.clave2.value)return 'Las contraseñas no coinciden.';
    const em=fo.email.value,m=await crearCuenta(em,fo.clave.value);
    if(m===CONFIRMAR){fo.clave.value='';fo.clave2.value='';aConfirmar(em,false);return ''}
    if(m===YA_EXISTE){fo.clave.value='';fo.clave2.value='';const er=fo.querySelector('.tb-err');er.className='tb-err';
      er.innerHTML='Ya hay una cuenta con ese correo.<br><button type="button" class="tb-link" data-ir="entrar">Entrar con mi contraseña</button> · <button type="button" class="tb-link" data-ir="olvide">Olvidé mi contraseña</button>';return ''}
    if(!m){opts.onEntrar&&opts.onEntrar();return ''}return m});
  f('confirmar').addEventListener('submit',async e=>{
    e.preventDefault();const fo=f('confirmar'),err=fo.querySelector('.tb-err'),b=fo.querySelector('button[type=submit]');err.className='tb-err';err.textContent='';
    if(fo.codigo.value.replace(/\D/g,'').length<6){err.textContent='El código tiene 6 números.';return}
    b.disabled=true;const m=await confirmarCuenta(fo.email.value,fo.codigo.value);b.disabled=false;
    if(m){err.textContent=m;return}fo.reset();opts.onEntrar&&opts.onEntrar();
  });
  el.querySelector('[data-reenviar]').addEventListener('click',async()=>{
    const fo=f('confirmar'),err=fo.querySelector('.tb-err'),m=await reenviarCodigo(fo.email.value);
    err.className=m?'tb-err':'tb-msg ok';err.textContent=m||'Listo, te mandamos un código nuevo.';
  });
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

/* ── Fechas: días que faltan (por calendario de Guatemala) ── */
const diaGT=d=>new Date(d).toLocaleDateString('en-CA',{timeZone:TZ});
function diasHasta(iso){const a=new Date(diaGT(Date.now())+'T00:00:00Z'),b=new Date(diaGT(iso)+'T00:00:00Z');return Math.round((b-a)/864e5)}
const horaGT=iso=>new Date(iso).toLocaleTimeString('es-GT',{hour:'numeric',minute:'2-digit',timeZone:TZ});
/* Avisos de la página que se comparte: fecha límite, sorteo y día del intercambio */
function fechasHTML(ed){
  const out=[],ahora=Date.now(),f=(cls,e,t,s)=>`<div class="tb-f ${cls}"><span class="e" aria-hidden="true">${e}</span><span>${esc(t)}${s?`<small>${esc(s)}</small>`:''}</span></div>`;
  if(ed.sorteo_hecho)out.push(f('listo','🎉','¡Ya se hizo el sorteo!','Entra para raspar tu tarjeta.'));
  else{
    if(ed.inscripcion_hasta){
      if(ahora>new Date(ed.inscripcion_hasta))out.push(f('info','🔒','Ya no se puede unir nadie',ed.sorteo_en?`El sorteo es el ${dia(ed.sorteo_en)}.`:''));
      else{const d=diasHasta(ed.inscripcion_hasta);
        out.push(d<=0?f('urge','⏰','¡Último día para unirte!',`Hoy hasta las ${horaGT(ed.inscripcion_hasta)}`)
          :d===1?f('urge','⏰','¡Mañana se cierra!',`Tienes hasta el ${dia(ed.inscripcion_hasta)}.`)
          :f('unir','⏰',`¡Tienes hasta el ${dia(ed.inscripcion_hasta)} para unirte!`,`Faltan ${d} días. Deja tus ideas antes de esa fecha.`))}
    }
    if(ed.sorteo_en){const d=diasHasta(ed.sorteo_en);
      out.push(d<0?f('info','🎲','El sorteo está por hacerse',`Estaba programado para el ${dia(ed.sorteo_en)}.`)
        :d===0?f('info','🎲','¡Hoy es el sorteo!',horaGT(ed.sorteo_en))
        :d===1?f('info','🎲','¡Mañana es el sorteo!',`${dia(ed.sorteo_en)}, ${horaGT(ed.sorteo_en)}`)
        :f('info','🎲',`En ${d} días se hace el sorteo`,`${dia(ed.sorteo_en)}, ${horaGT(ed.sorteo_en)}`))}
  }
  if(ed.evento_fecha)out.push(f('info','🎄',`Intercambio: ${diaHora(ed.evento_fecha)}`,ed.evento_lugar||''));
  return out.length?`<div class="tb-fechas">${out.join('')}</div>`:'';
}
/* Recordatorio para quien organiza: null si no toca */
function recordatorioSorteo(x){
  if(x.sorteo_hecho||!x.sorteo_en)return null;const d=diasHasta(x.sorteo_en);
  if(d>1)return null;
  return d===1?{t:`Mañana toca el sorteo de ${x.nombre}`,s:`${dia(x.sorteo_en)}, ${horaGT(x.sorteo_en)}`}
    :d===0?{t:`🎲 Hoy toca el sorteo de ${x.nombre}`,s:`Programado para las ${horaGT(x.sorteo_en)}`}
    :{t:`🎲 El sorteo de ${x.nombre} está pendiente`,s:`Estaba programado para el ${dia(x.sorteo_en)}.`};
}

/* ── Acceso directo en la pantalla de inicio ── */
const enApp=()=>{try{return (typeof matchMedia==='function'&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true}catch(e){return false}};
function plataforma(){const ua=navigator.userAgent||'';if(/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1))return 'ios';if(/Android/i.test(ua))return 'android';return 'otro'}
const PASOS={ios:'Toca el botón <b>Compartir</b> (el cuadrito con la flecha ⬆️, abajo en Safari) y elige <b>Agregar a inicio</b>.',
  android:'Toca los <b>tres puntitos ⋮</b> del navegador (arriba a la derecha) y elige <b>Agregar a la pantalla de inicio</b>.',
  otro:'Agrega esta página a tus favoritos (<b>Ctrl + D</b>, o <b>Cmd + D</b> en Mac) para volver con un clic.'};
/* Hace que el acceso directo abra ESTA página (y no la home de Tribbi) y se llame como el intercambio */
function prepararAcceso(nombre){
  const base=new URL('.',document.baseURI).href;
  const m={name:nombre||'Tribbi',short_name:(nombre||'Tribbi').slice(0,24),start_url:location.href.split('#')[0],scope:base,display:'standalone',
    background_color:'#FAFAF5',theme_color:'#FAFAF5',icons:[{src:base+'icon-192.png',sizes:'192x192',type:'image/png'},{src:base+'icon-512.png',sizes:'512x512',type:'image/png'}]};
  let l=document.querySelector('link[rel="manifest"]');if(!l){l=document.createElement('link');l.rel='manifest';document.head.appendChild(l)}
  l.href=URL.createObjectURL(new Blob([JSON.stringify(m)],{type:'application/manifest+json'}));
  let t=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(!t){t=document.createElement('meta');t.name='apple-mobile-web-app-title';document.head.appendChild(t)}
  t.content=(nombre||'Tribbi').slice(0,24);
}
let sheetPrevio=null;
function abrirAcceso(){
  let sh=document.getElementById('tbSheet');
  if(!sh){sh=document.createElement('div');sh.id='tbSheet';sh.className='tb-sheet';sh.hidden=true;sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-labelledby','tbSheetT');
    sh.innerHTML=`<div class="tb-sheet-box"><button class="tb-sheet-x" aria-label="Cerrar">×</button><div style="font-size:2.6rem" aria-hidden="true">📲</div>
      <h2 id="tbSheetT">Guarda tu amigo secreto en la pantalla de inicio</h2><p id="tbSheetP"></p>
      <p class="tb-tiny">Así vuelves con un toque.${plataforma()==='ios'?' La primera vez que lo abras, entra con tu correo y contraseña.':''}</p>
      <button class="tb-btn" data-cerrar>Listo</button><br><button class="tb-link" data-cerrar style="margin-top:6px">Ahora no</button></div>`;
    document.body.appendChild(sh);
    sh.addEventListener('click',e=>{if(e.target===sh||e.target.closest('[data-cerrar]')||e.target.closest('.tb-sheet-x'))cerrarAcceso()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sh.hidden)cerrarAcceso()});}
  document.getElementById('tbSheetP').innerHTML=PASOS[plataforma()];
  sheetPrevio=document.activeElement;sh.hidden=false;sh.querySelector('[data-cerrar]').focus();
}
function cerrarAcceso(){const sh=document.getElementById('tbSheet');if(sh)sh.hidden=true;if(sheetPrevio&&sheetPrevio.focus)sheetPrevio.focus()}
/* La ventanita sale UNA vez por intercambio, un momento después de raspar */
function ofrecerAcceso(clave){if(enApp()||store.get(clave))return;store.set(clave,'1');setTimeout(abrirAcceso,reduced?400:1500)}

/* ── Menú de Tribbi (igual en celular y computadora) ── */
const MENU_CSS=`
.tb-top{position:sticky;top:0;z-index:40;background:var(--bg);background:color-mix(in srgb,var(--bg) 88%,transparent);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding-top:env(safe-area-inset-top,0px)}
.tb-top .tb-in{max-width:1040px;margin:0 auto;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.tb-top .tb-logo{font-size:32px}
.tb-der{display:flex;align-items:center;gap:10px}
.tb-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#FCE4EC;color:#9E2F59;font-family:"Fredoka",sans-serif;font-weight:700;flex:none}
.tb-hamb{width:44px;height:44px;border-radius:14px;border:2px solid var(--line);background:var(--card);display:grid;place-items:center;cursor:pointer;color:var(--ink);padding:0}
.tb-hamb span,.tb-hamb span::before,.tb-hamb span::after{display:block;width:20px;height:2.5px;border-radius:2px;background:currentColor;position:relative;transition:transform .2s}
.tb-hamb span::before,.tb-hamb span::after{content:"";position:absolute;left:0}
.tb-hamb span::before{top:-7px}.tb-hamb span::after{top:7px}
.tb-velo{position:fixed;inset:0;z-index:70;background:rgba(15,25,24,.45);opacity:0;pointer-events:none;transition:opacity .25s}
.tb-velo.on{opacity:1;pointer-events:auto}
.tb-panel{position:fixed;top:0;right:0;bottom:0;z-index:71;width:min(340px,88vw);background:var(--card);color:var(--ink);box-shadow:-10px 0 40px rgba(0,0,0,.18);transform:translateX(105%);visibility:hidden;transition:transform .28s cubic-bezier(.2,.8,.2,1),visibility 0s .28s;display:flex;flex-direction:column;padding:calc(14px + env(safe-area-inset-top,0px)) 18px calc(18px + env(safe-area-inset-bottom,0px));overflow-y:auto}
.tb-panel.on{transform:none;visibility:visible;transition:transform .28s cubic-bezier(.2,.8,.2,1)}
@media (prefers-reduced-motion:reduce){.tb-panel,.tb-velo,.tb-hamb span::before,.tb-hamb span::after{transition:none}}
.tb-panel .tb-cab{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.tb-panel .tb-logo{font-size:30px}
.tb-panel .tb-logo .i .c path{stroke:var(--card)}
.tb-cerrar{border:0;background:none;font-size:1.8rem;line-height:1;color:var(--muted);cursor:pointer;width:44px;height:44px;border-radius:12px}
.tb-yo{display:flex;gap:12px;align-items:center;background:var(--soft);border-radius:16px;padding:12px;margin-bottom:8px;min-width:0}
.tb-yo b{display:block;font-family:"Fredoka",sans-serif}
.tb-yo small{color:var(--muted);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tb-nav{list-style:none;padding:0;margin:6px 0 0;display:grid;gap:4px}
.tb-nav a{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;color:var(--ink);text-decoration:none;font-weight:700;font-size:1.05rem}
.tb-nav a:hover,.tb-nav a[aria-current="page"]{background:var(--soft)}
.tb-nav a[aria-current="page"]{color:var(--teal)}
.tb-nav .e{width:28px;text-align:center;font-size:1.2rem}
.tb-pie{margin-top:auto;display:grid;gap:8px;padding-top:14px}
.tb-mbtn{display:block;text-align:center;font-family:"Fredoka",sans-serif;font-weight:600;font-size:1.05rem;padding:11px 20px;border-radius:999px;background:var(--btn);color:var(--btn-ink);box-shadow:0 4px 0 var(--btn-dark);text-decoration:none}
.tb-mbtn.sec{background:transparent;color:var(--teal);box-shadow:none;border:2px solid var(--line)}
.tb-msalir{border:0;border-top:1px solid var(--line);background:none;color:var(--coral);padding:14px 10px 4px;cursor:pointer;font:inherit;font-weight:700}
.tb-sitio-pie{max-width:1040px;margin:40px auto 0;padding:18px 20px calc(30px + env(safe-area-inset-bottom,0px));color:var(--muted);border-top:2px dashed var(--line);text-align:center;font-size:.95rem}
.tb-dlg-box{text-align:left}
.tb-dlg-box h2{color:var(--coral)}
.tb-dlg-box .tb-field{margin:6px 0 0}
.tb-dlg-acts{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:14px}
.tb-btn.peligro{background:var(--coral);color:#fff;box-shadow:0 4px 0 var(--coral-dark)}
`;
const LOGO_PATH="M125 547Q80 547 61.0 560.5Q42 574 38.5 595.0Q35 616 35 638Q35 661 39.0 681.5Q43 702 62.0 715.0Q81 728 126 728Q171 728 189.5 714.5Q208 701 212.0 680.0Q216 659 216 637Q216 615 212.0 594.0Q208 573 189.5 560.0Q171 547 125 547Z";
function logoHTML(){
  const c=[['#F7B3C6',-.165],['#E86F94',.235],['#F2C14E',-.065],['#36D6C4',.135]];
  return `<a class="tb-logo" href="./" aria-label="Tribbi, inicio">Tribb<span class="i" aria-hidden="true">i${c.map(([f,l])=>`<svg class="c" style="left:${l}em;top:.141em" viewBox="35 547 181 181"><path transform="translate(0 1275) scale(1 -1)" d="${LOGO_PATH}" fill="${f}"/></svg>`).join('')}<svg class="c p" style="left:.035em;top:.141em" viewBox="35 547 181 181"><path transform="translate(0 1275) scale(1 -1)" d="${LOGO_PATH}"/></svg></span></a>`;
}
let menuInfo=null,menuActual='';
async function infoMenu(){
  if(!(await token())){menuInfo=null;return}
  const r=await rpc('tribbi_mis_cuentas');
  menuInfo={email:(ses&&ses.email)||'',nombre:r.ok&&r.d.perfil?(r.d.perfil.nombre_publico||r.d.perfil.nombre):'',equipo:!!(r.ok&&r.d.es_equipo)};
}
function pintarMenu(){
  const top=document.getElementById('tbTop');if(!top)return;
  const conSes=!!ses,inicial=((menuInfo&&menuInfo.nombre)||(ses&&ses.email)||'?').trim().charAt(0).toUpperCase();
  const av=top.querySelector('.tb-avatar');av.hidden=!conSes;av.textContent=inicial;
  const items=[['🏠','Inicio','./','inicio'],['🎁','Mis intercambios','entrar.html','mis'],['✨','Organizar un amigo secreto','organizar.html','org'],['📚','BookPal','bookpal.html','bp']]
    .filter(i=>conSes||i[3]!=='mis').concat(menuInfo&&menuInfo.equipo?[['🛠️','Panel admin','admin.html','admin']]:[]);
  document.getElementById('tbYo').innerHTML=conSes?`<div class="tb-yo"><span class="tb-avatar" aria-hidden="true">${esc(inicial)}</span><span style="min-width:0"><b>${esc((menuInfo&&menuInfo.nombre)||'Tu cuenta')}</b><small>${esc((ses&&ses.email)||'')}</small></span></div>`:'';
  document.getElementById('tbNav').innerHTML=items.map(([e,t,h,k])=>`<li><a href="${h}"${k===menuActual?' aria-current="page"':''}><span class="e" aria-hidden="true">${e}</span>${esc(t)}</a></li>`).join('');
  document.getElementById('tbPie').innerHTML=conSes?`<button class="tb-msalir" id="tbSalir">Salir</button>`:`<a class="tb-mbtn" href="entrar.html">Entrar</a><a class="tb-mbtn sec" href="entrar.html#crear">Crear cuenta</a>`;
}
let menuPrevio=null;
function abrirMenu(){menuPrevio=document.activeElement;const p=document.getElementById('tbPanel');p.classList.add('on');document.getElementById('tbVelo').classList.add('on');p.setAttribute('aria-hidden','false');
  document.getElementById('tbHamb').setAttribute('aria-expanded','true');setTimeout(()=>document.getElementById('tbCerrar').focus(),50);infoMenu().then(pintarMenu)}
function cerrarMenu(){const p=document.getElementById('tbPanel');if(!p||!p.classList.contains('on'))return;p.classList.remove('on');document.getElementById('tbVelo').classList.remove('on');p.setAttribute('aria-hidden','true');
  document.getElementById('tbHamb').setAttribute('aria-expanded','false');if(menuPrevio&&menuPrevio.focus)menuPrevio.focus()}
/* actual: 'inicio' | 'mis' | 'org' | 'bp' | 'admin' */
function montarMenu(actual){
  if(document.getElementById('tbTop'))return;menuActual=actual||'';
  if(!document.getElementById('tbMenuCss')){const st=document.createElement('style');st.id='tbMenuCss';st.textContent=MENU_CSS;document.head.appendChild(st)}
  const top=document.createElement('header');top.className='tb-top';top.id='tbTop';
  top.innerHTML=`<div class="tb-in">${logoHTML()}<div class="tb-der"><span class="tb-avatar" aria-hidden="true" hidden></span><button class="tb-hamb" id="tbHamb" aria-label="Abrir menú" aria-expanded="false" aria-controls="tbPanel"><span></span></button></div></div>`;
  document.body.insertBefore(top,document.body.firstChild);
  const velo=document.createElement('div');velo.className='tb-velo';velo.id='tbVelo';
  const panel=document.createElement('nav');panel.className='tb-panel';panel.id='tbPanel';panel.setAttribute('aria-label','Menú de Tribbi');panel.setAttribute('aria-hidden','true');
  panel.innerHTML=`<div class="tb-cab">${logoHTML()}<button class="tb-cerrar" id="tbCerrar" aria-label="Cerrar menú">×</button></div><div id="tbYo"></div><ul class="tb-nav" id="tbNav"></ul><div class="tb-pie" id="tbPie"></div>`;
  document.body.appendChild(velo);document.body.appendChild(panel);
  document.querySelectorAll('body > footer').forEach(f=>f.remove());
  const pie=document.createElement('footer');pie.className='tb-sitio-pie';pie.textContent='Tribbi · Una iniciativa de PetMi 🐾';document.body.insertBefore(pie,velo);
  document.getElementById('tbHamb').onclick=()=>panel.classList.contains('on')?cerrarMenu():abrirMenu();
  document.getElementById('tbCerrar').onclick=cerrarMenu;velo.onclick=cerrarMenu;
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cerrarMenu()});
  panel.addEventListener('click',async e=>{if(e.target.id==='tbSalir'){await salir();cerrarMenu();location.reload()}});
  window.addEventListener('tribbi-sesion',()=>{infoMenu().then(pintarMenu)});
  pintarMenu();infoMenu().then(pintarMenu);
}

/* Ventanita para eliminar algo escribiendo su nombre. eliminar(forzar) → {ok} o {error,mensaje}. */
function confirmarEliminar(nombre,detalle,eliminar){
  return new Promise(res=>{
    if(!document.getElementById('tbMenuCss')){const st=document.createElement('style');st.id='tbMenuCss';st.textContent=MENU_CSS;document.head.appendChild(st)}
    const sh=document.createElement('div');sh.className='tb-sheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-labelledby','tbDlgT');
    sh.innerHTML=`<div class="tb-sheet-box tb-dlg-box"><button class="tb-sheet-x" aria-label="Cerrar">×</button>
      <h2 id="tbDlgT">Eliminar «${esc(nombre)}»</h2><p>${esc(detalle)}</p><p><b>No se puede deshacer.</b></p>
      <label>Escribe el nombre del intercambio para confirmar<input class="tb-field" autocomplete="off" spellcheck="false"></label>
      <label class="check" hidden style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-weight:700"><input type="checkbox"> <span></span></label>
      <p class="tb-err" role="alert"></p>
      <div class="tb-dlg-acts"><button class="tb-btn peligro" disabled>Eliminar para siempre</button><button class="tb-link" data-no>Cancelar</button></div></div>`;
    document.body.appendChild(sh);
    const inp=sh.querySelector('input.tb-field'),btn=sh.querySelector('.peligro'),err=sh.querySelector('.tb-err'),ck=sh.querySelector('label.check'),previo=document.activeElement;
    const fin=v=>{sh.remove();if(previo&&previo.focus)previo.focus();res(v)};
    inp.addEventListener('input',()=>{btn.disabled=inp.value.trim().toLowerCase()!==nombre.trim().toLowerCase()||(!ck.hidden&&!ck.querySelector('input').checked)});
    ck.querySelector('input').addEventListener('change',()=>inp.dispatchEvent(new Event('input')));
    sh.addEventListener('click',e=>{if(e.target===sh||e.target.closest('.tb-sheet-x')||e.target.closest('[data-no]'))fin(false)});
    sh.addEventListener('keydown',e=>{if(e.key==='Escape')fin(false)});
    btn.addEventListener('click',async()=>{
      btn.disabled=true;err.textContent='';const r=await eliminar(!ck.hidden&&ck.querySelector('input').checked);
      if(r&&r.ok){fin(r);return}
      if(r&&r.error==='sorteado'){ck.hidden=false;ck.querySelector('span').textContent=r.mensaje+' Entiendo, eliminarlo de todas formas.';btn.disabled=true;return}
      err.textContent=(r&&r.mensaje)||'No se pudo eliminar.';btn.disabled=false;
    });
    setTimeout(()=>inp.focus(),50);
  });
}

/* ── Fecha y hora: el día escrito y la hora con un reloj ──
   Se monta sobre un <input type="datetime-local"> que sigue guardando el valor (AAAA-MM-DDTHH:MM). */
const pad2=n=>String(n).padStart(2,'0');
function textoDia(d){if(!d)return '';const t=new Date(d+'T12:00:00Z').toLocaleDateString('es-GT',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});return t.charAt(0).toUpperCase()+t.slice(1)}
function textoHora(hm){if(!hm)return '';let [h,m]=hm.split(':').map(Number);const pm=h>=12;h=h%12||12;return `${h}:${pad2(m)} ${pm?'p. m.':'a. m.'}`}
function relojAbrir(hm,alListo){
  let [h24,m]=(hm||'19:00').split(':').map(Number);let h=h24%12||12,pm=h24>=12,modo='h';
  const sh=document.createElement('div');sh.className='tb-sheet abajo';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label','Elegir hora');
  sh.innerHTML=`<div class="tb-sheet-box tb-reloj"><div class="disp"><button data-dh aria-label="Hora"></button>:<button data-dm aria-label="Minutos"></button>
    <div class="ampm"><button data-am>a. m.</button><button data-pm>p. m.</button></div></div>
    <div class="tb-cara"><div class="tb-aguja"></div><div class="tb-centro"></div></div><p class="tip"></p>
    <div class="acts"><button class="tb-link" data-no>Cancelar</button><button class="tb-btn sm" data-ok>Listo</button></div></div>`;
  document.body.appendChild(sh);const cara=sh.querySelector('.tb-cara'),previo=document.activeElement;
  const pos=i=>{const a=(i/12)*2*Math.PI-Math.PI/2;return [130+104*Math.cos(a),130+104*Math.sin(a)]};
  function pintar(){
    cara.querySelectorAll('.tb-num').forEach(n=>n.remove());
    const vals=modo==='h'?[12,1,2,3,4,5,6,7,8,9,10,11]:[0,5,10,15,20,25,30,35,40,45,50,55];
    vals.forEach((v,i)=>{const [x,y]=pos(i),b=document.createElement('button');b.type='button';b.className='tb-num';b.style.left=x+'px';b.style.top=y+'px';
      b.textContent=modo==='h'?v:pad2(v);b.setAttribute('aria-label',modo==='h'?`${v} en punto`:`${v} minutos`);
      b.setAttribute('aria-pressed',String(modo==='h'?v===h:v===m));b.onclick=()=>{if(modo==='h'){h=v;modo='m'}else m=v;pintar()};cara.appendChild(b)});
    sh.querySelector('.tb-aguja').style.transform=`translateX(-50%) rotate(${(modo==='h'?h%12:Math.round(m/5)%12)*30}deg)`;
    const dh=sh.querySelector('[data-dh]'),dm=sh.querySelector('[data-dm]');dh.textContent=h;dm.textContent=pad2(m);
    dh.setAttribute('aria-pressed',String(modo==='h'));dm.setAttribute('aria-pressed',String(modo==='m'));
    sh.querySelector('[data-am]').setAttribute('aria-pressed',String(!pm));sh.querySelector('[data-pm]').setAttribute('aria-pressed',String(pm));
    sh.querySelector('.tip').textContent=modo==='h'?'Toca la hora':'Ahora los minutos';
  }
  const punto=e=>{const r=cara.getBoundingClientRect(),x=e.clientX-r.left-130,y=e.clientY-r.top-130;let a=Math.atan2(y,x)+Math.PI/2;if(a<0)a+=2*Math.PI;
    const i=Math.round(a/(2*Math.PI)*12)%12;if(modo==='h')h=i===0?12:i;else m=i*5;pintar()};
  let arr=false;
  cara.addEventListener('pointerdown',e=>{if(e.target.classList.contains('tb-num'))return;arr=true;try{cara.setPointerCapture(e.pointerId)}catch(_){}punto(e)});
  cara.addEventListener('pointermove',e=>{if(arr)punto(e)});
  cara.addEventListener('pointerup',()=>{if(arr&&modo==='h'){modo='m';pintar()}arr=false});
  const fin=ok=>{sh.remove();if(previo&&previo.focus)previo.focus();if(ok)alListo(`${pad2((h%12)+(pm?12:0))}:${pad2(m)}`)};
  sh.addEventListener('click',e=>{const t=e.target;
    if(t===sh||t.closest('[data-no]'))fin(false);else if(t.closest('[data-ok]'))fin(true);
    else if(t.closest('[data-dh]')){modo='h';pintar()}else if(t.closest('[data-dm]')){modo='m';pintar()}
    else if(t.closest('[data-am]')){pm=false;pintar()}else if(t.closest('[data-pm]')){pm=true;pintar()}});
  sh.addEventListener('keydown',e=>{if(e.key==='Escape')fin(false)});
  pintar();setTimeout(()=>sh.querySelector('[data-dh]').focus(),50);
}
/* opts: {rapidas:['12:00','19:00'], horaPorDefecto:'19:00', opcional:true} */
function montarFechaHora(inp,opts){
  opts=opts||{};if(inp.dataset.tbFh)return;inp.dataset.tbFh='1';inp.hidden=true;
  const w=document.createElement('div');w.className='tb-fh';
  w.innerHTML=`<label class="tb-pick"><span class="e" aria-hidden="true">📅</span><span><b data-dia></b><small data-dia2></small></span><input type="date" aria-label="Elegir día"></label>
    <button type="button" class="tb-pick" data-hora><span class="e" aria-hidden="true">🕖</span><span><b data-h></b><small data-h2></small></span></button>
    ${opts.opcional!==false?'<button type="button" class="tb-quitar" data-quitar hidden>Quitar</button>':''}
    ${(opts.rapidas||[]).length?`<div class="tb-rapidas" role="group" aria-label="Horas frecuentes">${opts.rapidas.map(r=>`<button type="button" data-r="${r}">${textoHora(r)}</button>`).join('')}</div>`:''}`;
  inp.insertAdjacentElement('afterend',w);
  const fecha=w.querySelector('input[type=date]');
  const val=()=>{const v=inp.value||'';return {d:v.slice(0,10),hm:v.length>=16?v.slice(11,16):''}};
  const poner=(d,hm)=>{inp.value=d?`${d}T${hm||opts.horaPorDefecto||'19:00'}`:'';inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));pintar()};
  function pintar(){
    const {d,hm}=val();
    w.querySelector('[data-dia]').textContent=d?textoDia(d):'Elegir día';w.querySelector('[data-dia2]').textContent=d?'Cambiar día':'Toca para elegir';
    w.querySelector('[data-h]').textContent=hm?textoHora(hm):'Hora';w.querySelector('[data-h2]').textContent=hm?'Cambiar hora':(d?'Toca para elegir':'Primero el día');
    fecha.value=d;const q=w.querySelector('[data-quitar]');if(q)q.hidden=!d;
    w.querySelectorAll('[data-r]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.r===hm)));
  }
  fecha.addEventListener('click',()=>{try{fecha.showPicker&&fecha.showPicker()}catch(e){}});
  fecha.addEventListener('change',()=>poner(fecha.value,val().hm));
  w.querySelector('[data-hora]').addEventListener('click',()=>{const {d,hm}=val();
    relojAbrir(hm||opts.horaPorDefecto,nueva=>{const dd=d||new Date().toLocaleDateString('en-CA',{timeZone:TZ});poner(dd,nueva)})});
  w.querySelectorAll('[data-r]').forEach(b=>b.addEventListener('click',()=>{const {d}=val();poner(d||new Date().toLocaleDateString('en-CA',{timeZone:TZ}),b.dataset.r)}));
  const q=w.querySelector('[data-quitar]');if(q)q.addEventListener('click',()=>poner('',''));
  inp._tbPintar=pintar;pintar();
}
/* Volver a pintar después de cambiar los valores por código (por ejemplo, al abrir un formulario) */
function refrescarFechaHora(raiz){(raiz||document).querySelectorAll('input[data-tb-fh]').forEach(i=>i._tbPintar&&i._tbPintar())}

window.Tribbi={CONFIG,$,esc,dia,diaHora,q,aLocal,deLocal,store,GENEROS,PUBLICO,CONDICION,get ses(){return ses},token,salir,borrarSesion,rpc,fallo,montarLogin,crearCuenta,confirmarCuenta,reenviarCodigo,entrarConClave,recuperar,verificarRecuperacion,cambiarClave,sesionDesdeEnlace,montarRaspa,confetti,pagar,copiar,reduced,portadaHTML,subirPortada,borrarPortada,DISENOS,lucesHTML,diasHasta,fechasHTML,recordatorioSorteo,enApp,prepararAcceso,abrirAcceso,ofrecerAcceso,montarMenu,cerrarMenu,confirmarEliminar,CONFIRMAR,YA_EXISTE,montarFechaHora,refrescarFechaHora};
})();

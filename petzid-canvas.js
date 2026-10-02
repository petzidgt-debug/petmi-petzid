// ══════════════════════════════════════════════════════════════
// petzid-canvas.js — Dibuja la tarjeta PetzID en un <canvas>.
// 2 oct: ARCHIVO ÚNICO — antes esta misma lógica estaba copiada y
// pegada en editar.html, admin.html y familia.html. Cualquier
// cambio (tamaño de foto, texto, etc.) tenía que hacerse 3 veces,
// y era fácil que alguno se quedara desactualizado. Ahora todas las
// páginas incluyen este archivo con <script src="/petzid-canvas.js">
// y llaman a generarCanvasPetzID(datos) — un solo lugar que
// mantener.
//
// Uso:
//   var canvas = await generarCanvasPetzID({
//     nombre, apodo, especie, sexo, raza, tipoFecha, fecha, dueno, foto, uid
//   });
//   // canvas.toDataURL('image/png') para descargar o previsualizar
//
// Todos los campos son opcionales salvo que el objeto exista; los
// que falten se muestran como "-".
// ══════════════════════════════════════════════════════════════

async function generarCanvasPetzID(d){
  d = d || {};
  var W=1050, H=600, FW=Math.round(W*0.43), IW=W-FW, YH=76, TH=H-YH;
  var TEAL_H=Math.round(TH*0.50), WHITE_H=TH-TEAL_H;
  var canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  var ctx=canvas.getContext('2d');

  // ── Foto (columna izquierda, altura completa menos la franja) ──
  ctx.fillStyle='#b2e0e0'; ctx.fillRect(0,0,FW,H-YH);
  if(d.foto && d.foto.indexOf('http')>=0){
    try{
      await new Promise(function(res){
        var tmp=new Image(); tmp.crossOrigin='anonymous';
        tmp.onload=function(){
          var scale=Math.max(FW/tmp.width,(H-YH)/tmp.height);
          var sw=tmp.width*scale, sh=tmp.height*scale;
          ctx.save(); ctx.beginPath(); ctx.rect(0,0,FW,H-YH); ctx.clip();
          ctx.drawImage(tmp,(FW-sw)/2,(H-YH-sh)/2,sw,sh);
          ctx.restore(); res();
        };
        tmp.onerror=res; tmp.src=d.foto; setTimeout(res,3000);
      });
    }catch(e){}
  }

  // ── Encabezado teal: NOMBRE + apodo ──
  ctx.fillStyle='#00B4B4'; ctx.fillRect(FW,0,IW,TEAL_H);
  var px=FW+20, pw=IW-40;
  ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.font='700 16px Arial'; ctx.textAlign='left';
  ctx.fillText('N O M B R E',px,TEAL_H-121);
  ctx.fillStyle='#fff'; ctx.font='900 47px Arial Black,Arial';
  ctx.fillText('"'+(d.nombre||'').toUpperCase()+'"',px,TEAL_H-66);
  if(d.apodo && d.apodo.trim() && d.apodo!=='-'){
    var ap=d.apodo.toUpperCase(); ctx.font='700 17px Arial';
    var bw=ctx.measureText(ap).width+26;
    ctx.fillStyle='#F4A0B0'; ctx.beginPath(); ctx.roundRect(px,TEAL_H-46,bw,26,13); ctx.fill();
    ctx.fillStyle='#7a1a2e'; ctx.textAlign='center'; ctx.fillText(ap,px+bw/2,TEAL_H-29);
  }

  // ── Campos blancos: ESPECIE/SEXO, RAZA/NACIMIENTO, RESPONSABLE ──
  ctx.fillStyle='#fff'; ctx.fillRect(FW,TEAL_H,IW,WHITE_H);
  var ROW=Math.floor(WHITE_H/3), col=Math.floor(pw/2);
  // Recorta el texto con "…" si no cabe en maxW, para que un valor largo
  // (ej. una raza con nombre largo) nunca se meta en la otra columna.
  function truncarTexto(texto,maxW){
    if(ctx.measureText(texto).width<=maxW) return texto;
    var t=texto;
    while(t.length>1 && ctx.measureText(t+'…').width>maxW){ t=t.slice(0,-1); }
    return t+'…';
  }
  function field(lbl,val,x,y,right){
    // La columna derecha termina en el borde real del área (x+pw), no
    // a la mitad — así queda claramente separada de la izquierda. Cada
    // columna tiene como máximo "col" de ancho disponible, con un
    // pequeño margen entre ellas para que nunca se toquen.
    ctx.textAlign=right?'right':'left'; var tx=right?(x+pw):x;
    var maxW=col-14;
    ctx.fillStyle='#bbb'; ctx.font='600 11px Arial'; ctx.fillText(truncarTexto(lbl,maxW),tx,y);
    ctx.fillStyle='#222'; ctx.font='700 22px Arial';
    ctx.fillText(truncarTexto((val||'-').toUpperCase(),maxW),tx,y+28);
  }
  // fl: el texto de la fecha cambia según si es nacimiento o llegada a casa.
  // Algunas fechas vienen como timestamp completo (2021-10-09T06:00:00.000Z)
  // en vez de solo la fecha — esto se queda con la parte YYYY-MM-DD.
  var fechaLimpia = d.fecha ? String(d.fecha).split('T')[0] : d.fecha;
  var fl=(d.tipoFecha||'nacimiento')==='llegada'?'LLEGO A CASA':'NACIMIENTO';
  field('ESPECIE',d.especie,px,TEAL_H+14,false); field('SEXO',d.sexo,px,TEAL_H+14,true);
  ctx.fillStyle='#eee'; ctx.fillRect(px,TEAL_H+ROW,pw,1);
  field('RAZA',d.raza,px,TEAL_H+ROW+24,false); field(fl,fechaLimpia,px,TEAL_H+ROW+24,true);
  ctx.fillStyle='#eee'; ctx.fillRect(px,TEAL_H+ROW*2,pw,1);
  ctx.textAlign='left'; ctx.fillStyle='#bbb'; ctx.font='600 11px Arial';
  ctx.fillText('RESPONSABLE',px,TEAL_H+ROW*2+24);
  ctx.fillStyle='#222'; ctx.font='700 22px Arial';
  ctx.fillText((d.dueno||'-').toUpperCase(),px,TEAL_H+ROW*2+52);

  // ── Franja amarilla: ID a la izquierda, logo al centro, URL a la derecha ──
  ctx.fillStyle='#F5C842'; ctx.fillRect(0,H-YH,W,YH);
  var uid6=(d.uid||'').replace(/-/g,'').toUpperCase().slice(-6);
  var barLeft=20, barRight=W-20, barCy=H-YH/2;
  ctx.fillStyle='#555'; ctx.font='600 14px Arial'; ctx.textAlign='left';
  ctx.fillText('ID',barLeft,H-YH+27);
  ctx.fillStyle='#333'; ctx.font='400 29px Arial';
  ctx.fillText(uid6,barLeft,H-YH+55);

  try{
    await new Promise(function(res){
      var logo=new Image(); logo.crossOrigin='anonymous';
      logo.onload=function(){
        var lh=36, lw=logo.width*(lh/logo.height);
        // Logo centrado en la franja completa
        ctx.drawImage(logo,(W-lw)/2,barCy-lh/2,lw,lh);
        // URL alineada a la derecha
        ctx.font='700 20px Arial';
        ctx.fillStyle='rgba(0,0,0,.6)'; ctx.textAlign='right'; ctx.textBaseline='middle';
        ctx.fillText('app.revistapetmi.com',barRight,barCy);
        ctx.textBaseline='alphabetic';
        res();
      };
      logo.onerror=res;
      logo.src='https://ilcreewilnkchvozicyp.supabase.co/storage/v1/object/sign/assets/logopetmi.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zYmZiMjhlZS05MmIwLTRkYjEtYWUyMi02ZTcxOGQzMzhlMTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvbG9nb3BldG1pLnBuZyIsImlhdCI6MTc3OTM5NTY4MiwiZXhwIjoyMDk0NzU1NjgyfQ.UFxj_NZ3QonOLDXVoUD_rC3nxRQg4C3aiJLjFrt5SO8';
      setTimeout(res,3000);
    });
  }catch(e){}

  return canvas;
}

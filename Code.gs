// ============================================================
//  PETMI — Google Apps Script v12
//  Sheet: 1jfjWUOCWT7Xp9_R04iFIfR4q1-FGIXGJVeZVV1lvkA0
// ============================================================

// ── Configuración ────────────────────────────────────────────
var SHEET_ID        = '1jfjWUOCWT7Xp9_R04iFIfR4q1-FGIXGJVeZVV1lvkA0';
var SHEET_NAME      = 'PetzIDs';
var SHEET_ANTIGUO   = '1bcwFtd0c4IH69rM9P1ZcpuT73bx0p9r4lBWq8GZKJws';
var FOLDER_ID       = '1jHOCbM0B_e_vh19khnVtG2wk8OKqLdu';
var FOLDER_VIEJO    = '1xWFM3_HJFrIJuR1Ii2jrCNXONwnIBpQb';
var REMITENTE       = 'PetMi';
var BASE_WIX        = 'https://static.wixstatic.com/media/';
var LOGO_URL        = 'https://petmi-petzid.vercel.app/logopetmi.png';
var COL_FOTO        = 28;
var COL_ANGEL       = 29;
var COL_FECHA_ANGEL = 30;
var COL_NOTIF       = 31;
var LOTE            = 100;

var SUPABASE_URL = 'https://ilcreewilnkchvozicyp.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsY3JlZXdpbG5rY2h2b3ppY3lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwNTc1MiwiZXhwIjoyMDkzNTgxNzUyfQ.heD60j_eM5MBjIhoZotR7G5nzQZu7kYv9aVvypbfE8A';

var HEADERS = [
  'Fecha Registro','ID Unico','Nombre','Apodo','Especie','Sexo','Raza',
  'Tipo Fecha','Fecha Mascota','Zona','Dueno','Email','WhatsApp','Veterinario',
  'Convive Con','Instagram','Alimento','Tipo Alimentacion','Actividades',
  'Personalidad','Ofertas','Actividades Info','Comunidad','Algo Especial',
  'Correo Enviado','Fecha Envio','','Foto','Angelito','Fecha Angelito','Notif Mensajes'
];

var LOGO_HEADER        = '<h1 style="color:#fff;margin:0;font-size:30px">petz<span style="color:#F5C842">ID</span></h1>';
var LOGO_HEADER_YELLOW = '<h1 style="color:#1a1a1a;margin:0;font-size:30px">petz<span style="color:#E05090">ID</span></h1>';

// ============================================================
// SUPABASE — helpers
// ============================================================
function sbUpsert(table, payload) {
  try {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + table + '?on_conflict=uid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch(e) { Logger.log('sbUpsert error: ' + e.message); }
}

function sbInsert(table, payload) {
  try {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch(e) { Logger.log('sbInsert error: ' + e.message); }
}

function sbUpdate(uid, fields) {
  try {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
      payload: JSON.stringify(fields),
      muteHttpExceptions: true
    });
  } catch(e) { Logger.log('sbUpdate error: ' + e.message); }
}

function sbDelete(uid) {
  try {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(uid), {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
      muteHttpExceptions: true
    });
  } catch(e) { Logger.log('sbDelete error: ' + e.message); }
}

// ============================================================
// MENU
// ============================================================
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('PetMi')
      .addItem('Reenviar ID seleccionado',       'reenviarSeleccionado')
      .addItem('Reenviar todos los pendientes',  'reenviarPendientes')
      .addSeparator()
      .addItem('Enviar promo segmentada',        'enviarPromo')
      .addItem('Vista previa de segmento',       'vistaPrevia')
      .addSeparator()
      .addItem('Enviar feliz cumpleanos',        'enviarCumpleanosHoy')
      .addSeparator()
      .addItem('Detectar y eliminar duplicados', 'detectarDuplicados')
      .addItem('Generar grupos familiares',      'generarGruposFamiliares')
      .addItem('Limpiar telefonos WhatsApp',     'limpiarTelefonos')
      .addSeparator()
      .addItem('Migrar fotos antiguas (Wix)',    'migrarFotosAntiguas')
      .addItem('Migrar fotos de Wix a Drive',    'migrarFotosADrive')
      .addItem('Indexar folder Drive',           'indexarFolderYGuardar')
      .addItem('Vincular lote Drive',            'vincularLote')
      .addSeparator()
      .addItem('Contar fotos vinculadas',        'contarFotos')
      .addItem('Ver headers sheet antiguo',      'verHeadersAntiguos')
      .addSeparator()
      .addItem('Instalar triggers',              'setupTriggers')
      .addSeparator()
      .addItem('Sincronizar Sheet a Supabase',   'sincronizarTodo')
      .addToUi();
  } catch(e) { Logger.log('onOpen: ' + e.message); }
}

// ============================================================
// EMAIL HELPER
// ============================================================
function emailHtml(headerColor, headerContent, bodyContent) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>'
    + '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">'
    + '<div style="background:' + headerColor + ';padding:28px;text-align:center;border-radius:12px 12px 0 0">'
    + headerContent + '</div>'
    + '<div style="background:#fff;padding:28px;border:1px solid #eee">'
    + bodyContent
    + '<p style="color:#aaa;font-size:12px;margin-top:24px">Con amor, el equipo de PetMi</p>'
    + '</div>'
    + '<div style="background:#F5C842;padding:12px;text-align:center;border-radius:0 0 12px 12px">'
    + '<p style="margin:0;font-size:12px;color:#555">PetMi Guatemala</p>'
    + '</div></div></body></html>';
}

// ============================================================
// doPost
// ============================================================
function doPost(e) {
  try {
    if (!e || !e.postData) return ok();
    var data   = JSON.parse(e.postData.contents);
    var action = data.action || '';
    Logger.log('doPost action: ' + action + ' | email: ' + (data.email || ''));

    // ── updateRow ──────────────────────────────────────────
    if (action === 'updateRow') {
      var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
      var lastRow = sheet.getLastRow();
      var uid     = String(data.uid || '').trim();
      var d       = data.data || {};
      var sbFields = {};
      for (var i = 2; i <= lastRow; i++) {
        if (String(sheet.getRange(i, 2).getValue()).trim() !== uid) continue;
        if (d.nombre        !== undefined) { sheet.getRange(i,  3).setValue(d.nombre);        sbFields.nombre        = d.nombre; }
        if (d.apodo         !== undefined) { sheet.getRange(i,  4).setValue(d.apodo);         sbFields.apodo         = d.apodo; }
        if (d.especie       !== undefined) { sheet.getRange(i,  5).setValue(d.especie);       sbFields.especie       = d.especie; }
        if (d.sexo          !== undefined) { sheet.getRange(i,  6).setValue(d.sexo);          sbFields.sexo          = d.sexo; }
        if (d.raza          !== undefined) { sheet.getRange(i,  7).setValue(d.raza);          sbFields.raza          = d.raza; }
        if (d.tipoFecha     !== undefined) { sheet.getRange(i,  8).setValue(d.tipoFecha);     sbFields.tipo_fecha    = d.tipoFecha; }
        if (d.fecha         !== undefined) { sheet.getRange(i,  9).setValue(d.fecha);         sbFields.fecha         = d.fecha; }
        if (d.zona          !== undefined) { sheet.getRange(i, 10).setValue(d.zona);          sbFields.zona          = d.zona; }
        if (d.dueno         !== undefined) { sheet.getRange(i, 11).setValue(d.dueno);         sbFields.dueno         = d.dueno; }
        if (d.whatsapp      !== undefined) { sheet.getRange(i, 13).setValue(d.whatsapp);      sbFields.whatsapp      = d.whatsapp; }
        if (d.veterinario   !== undefined) { sheet.getRange(i, 14).setValue(d.veterinario);   sbFields.veterinario   = d.veterinario; }
        if (d.instagram     !== undefined) { sheet.getRange(i, 16).setValue(d.instagram);     sbFields.instagram     = d.instagram; }
        if (d.alimento      !== undefined) { sheet.getRange(i, 17).setValue(d.alimento);      sbFields.alimento      = d.alimento; }
        if (d.actividades   !== undefined) { sheet.getRange(i, 19).setValue(d.actividades);   sbFields.actividades   = d.actividades; }
        if (d.especial      !== undefined) { sheet.getRange(i, 24).setValue(d.especial);      sbFields.especial      = d.especial; }
        if (d.ofertas       !== undefined) { sheet.getRange(i, 21).setValue(d.ofertas);       sbFields.ofertas       = d.ofertas === 'Si'; }
        if (d.notifMensajes !== undefined) { sheet.getRange(i, COL_NOTIF).setValue(d.notifMensajes); sbFields.notif_mensajes = d.notifMensajes !== 'No'; }
        if (d.foto          !== undefined && d.foto) { sheet.getRange(i, COL_FOTO).setValue(d.foto); sbFields.foto = d.foto; }
        break;
      }
      if (Object.keys(sbFields).length > 0) sbUpdate(uid, sbFields);
      return ok();
    }

    // ── markAngel ──────────────────────────────────────────
    if (action === 'markAngel') {
      var sheet    = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
      var lastRow  = sheet.getLastRow();
      var uid      = String(data.uid || '').trim();
      var uidLower = uid.toLowerCase();
      var esAngel  = data.esAngel ? true : false;
      var fa       = data.fechaAngelito ? new Date(data.fechaAngelito) : new Date();
      var fechaAngel = data.esAngel ? (data.fechaAngelito || new Date().toISOString().split('T')[0]) : null;
      var rowData  = null;
      for (var i = 2; i <= lastRow; i++) {
        if (String(sheet.getRange(i, 2).getValue()).trim().toLowerCase() !== uidLower) continue;
        sheet.getRange(i, COL_ANGEL).setValue(esAngel);
        sheet.getRange(i, COL_FECHA_ANGEL).setValue(esAngel ? fa : '');
        rowData = sheet.getRange(i, 1, 1, 31).getValues()[0];
        break;
      }
      if (rowData) {
        sbUpsert('mascotas', {
          uid: uidLower, nombre: String(rowData[2]||''), apodo: String(rowData[3]||''),
          especie: String(rowData[4]||''), sexo: String(rowData[5]||''), raza: String(rowData[6]||''),
          tipo_fecha: String(rowData[7]||'nacimiento'), fecha: String(rowData[8]||''),
          zona: String(rowData[9]||''), dueno: String(rowData[10]||''),
          email: String(rowData[11]||'').toLowerCase(), whatsapp: String(rowData[12]||''),
          veterinario: String(rowData[13]||''), instagram: String(rowData[15]||''),
          alimento: String(rowData[16]||''), actividades: String(rowData[18]||''),
          especial: String(rowData[23]||''), foto: String(rowData[27]||''),
          angelito: esAngel, fecha_angelito: fechaAngel, notif_mensajes: true, ofertas: false
        });
      } else {
        sbUpdate(uid.toUpperCase(), { angelito: esAngel, fecha_angelito: fechaAngel });
      }
      return ok();
    }

    // ── deleteMascota ──────────────────────────────────────
    if (action === 'deleteMascota') {
      var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
      var lastRow = sheet.getLastRow();
      var uid     = String(data.uid || '').trim();
      for (var i = 2; i <= lastRow; i++) {
        if (String(sheet.getRange(i, 2).getValue()).trim() !== uid) continue;
        sheet.deleteRow(i);
        break;
      }
      sbDelete(uid);
      return ok();
    }

    // ── addMensaje ─────────────────────────────────────────
    if (action === 'addMensaje') {
      var ss       = SpreadsheetApp.openById(SHEET_ID);
      var msgSheet = ss.getSheetByName('Mensajes');
      if (!msgSheet) {
        msgSheet = ss.insertSheet('Mensajes');
        msgSheet.appendRow(['Fecha','UID Mascota','Autor','Mensaje','Nombre Mascota']);
        msgSheet.getRange(1,1,1,5).setBackground('#00B4B4').setFontColor('#fff').setFontWeight('bold');
      }
      msgSheet.appendRow([new Date(), data.uid||'', data.autor||'', data.mensaje||'', data.nombreMascota||'']);
      sbInsert('mensajes', { uid_mascota: data.uid||'', autor: data.autor||'', mensaje: data.mensaje||'', nombre_mascota: data.nombreMascota||'' });
      var sheet   = ss.getSheetByName(SHEET_NAME);
      var lastRow = sheet.getLastRow();
      for (var i = 2; i <= lastRow; i++) {
        if (String(sheet.getRange(i, 2).getValue()).trim() !== (data.uid||'').trim()) continue;
        var emailDueno = String(sheet.getRange(i, 12).getValue()).trim();
        var notifOk    = String(sheet.getRange(i, COL_NOTIF).getValue()).trim();
        var nombreMasc = String(sheet.getRange(i,  3).getValue()).trim();
        if (emailDueno && notifOk !== 'No') {
          var autor = String(data.autor||'Alguien').trim();
          var html  = emailHtml('#00B4B4', LOGO_HEADER,
            '<h2 style="color:#222;margin-top:0">Nuevo mensaje para ' + nombreMasc + '</h2>'
            + '<div style="background:#f8f8f8;border-radius:10px;padding:16px;margin:16px 0;border-left:4px solid #00B4B4">'
            + '<div style="font-size:12px;color:#999;margin-bottom:6px">Mensaje de <strong>' + autor + '</strong></div>'
            + '<div style="font-size:15px;color:#333;line-height:1.6">' + (data.mensaje||'') + '</div>'
            + '</div>');
          try { GmailApp.sendEmail(emailDueno, autor + ' le mando un mensaje a ' + nombreMasc + ' en PetMi', '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(err) { Logger.log('addMensaje email: ' + err.message); }
        }
        break;
      }
      return ok();
    }

    // ── Notificaciones ─────────────────────────────────────
    if (action === 'notificarSolicitud') {
      var emailReceptor = String(data.emailReceptor||'').trim();
      if (emailReceptor) {
        var html = emailHtml('#00B4B4', LOGO_HEADER,
          '<h2 style="color:#222;margin-top:0">Nueva solicitud de amistad</h2>'
          + '<p style="color:#555;font-size:15px;line-height:1.7"><strong>' + String(data.nombreSolicit||'') + '</strong> quiere ser amigo de <strong>' + String(data.nombreReceptor||'') + '</strong> en PetMi</p>'
          + '<div style="text-align:center;margin:24px 0"><a href="https://petmi-petzid.vercel.app/amigos.html" style="background:#00B4B4;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700;font-size:15px">Ver solicitud</a></div>');
        try { GmailApp.sendEmail(emailReceptor, String(data.nombreSolicit||'') + ' quiere ser amigo en PetMi', '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(e) {}
      }
      return ok();
    }

    if (action === 'notificarAceptado') {
      var emailSolicit = String(data.emailSolicit||'').trim();
      if (emailSolicit) {
        var html = emailHtml('#00B4B4', LOGO_HEADER,
          '<h2 style="color:#222;margin-top:0">Solicitud aceptada</h2>'
          + '<p style="color:#555;font-size:15px;line-height:1.7"><strong>' + String(data.nombreAceptor||'') + '</strong> y <strong>' + String(data.nombreSolicit||'') + '</strong> ahora son amigos en PetMi</p>'
          + '<div style="text-align:center;margin:24px 0"><a href="https://petmi-petzid.vercel.app/amigos.html" style="background:#00B4B4;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700;font-size:15px">Ver mis amigos</a></div>');
        try { GmailApp.sendEmail(emailSolicit, String(data.nombreAceptor||'') + ' acepto tu solicitud en PetMi', '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(e) {}
      }
      return ok();
    }

    if (action === 'notificarApunte') {
      var emailCreador = String(data.emailCreador||'').trim();
      if (emailCreador) {
        var html = emailHtml('#764ba2', LOGO_HEADER,
          '<h2 style="color:#222;margin-top:0">Alguien se apunto a tu plan</h2>'
          + '<p style="color:#555;font-size:15px;line-height:1.7"><strong>' + String(data.nombreMascota||'') + '</strong> se apunto a tu plan:<br><strong>' + String(data.nombrePlan||'') + '</strong></p>'
          + '<div style="text-align:center;margin:24px 0"><a href="https://petmi-petzid.vercel.app/avisos.html" style="background:#764ba2;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700;font-size:15px">Ver actividades</a></div>');
        try { GmailApp.sendEmail(emailCreador, String(data.nombreMascota||'') + ' se apunto a: ' + String(data.nombrePlan||''), '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(e) {}
      }
      return ok();
    }

    if (action === 'notificarInfoPerdido') {
      var emailDueno = String(data.emailCreador||'').trim();
      var nombreCont = String(data.nombreContacto||'Alguien').trim();
      var msgCont    = String(data.mensaje||'').trim();
      var emailCont  = String(data.emailInteresado||'').trim();
      var tituloPerd = String(data.tituloAnuncio||'mascota perdida').trim();
      if (emailDueno) {
        var html = emailHtml('#c0392b', '<h1 style="color:#fff;margin:0;font-size:24px">Informacion sobre tu mascota</h1>',
          '<h2 style="color:#222;margin-top:0">' + nombreCont + ' tiene informacion</h2>'
          + '<p style="color:#555;font-size:15px">Sobre: <strong>' + tituloPerd + '</strong></p>'
          + '<div style="background:#f8f8f8;border-left:4px solid #c0392b;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:0">' + msgCont + '</p></div>'
          + (emailCont ? '<p>Contactar: <a href="mailto:' + emailCont + '">' + emailCont + '</a></p>' : '')
          + '<div style="text-align:center;margin:24px 0"><a href="https://petmi-petzid.vercel.app/avisos.html" style="background:#c0392b;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700">Ver avisos</a></div>');
        try { GmailApp.sendEmail(emailDueno, nombreCont + ' tiene informacion sobre ' + tituloPerd, '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(e) {}
      }
      return ok();
    }

    if (action === 'notificarInteres') {
      var emailCreador    = String(data.emailCreador||'').trim();
      var emailInteresado = String(data.emailInteresado||'').trim();
      var tituloAnuncio   = String(data.tituloAnuncio||'').trim();
      var nombreMascota   = String(data.nombreMascota||'').trim();
      if (emailCreador) {
        var html = emailHtml('#E05090', LOGO_HEADER,
          '<h2 style="color:#222;margin-top:0">Alguien esta interesado</h2>'
          + '<p style="color:#555;font-size:15px;line-height:1.7"><strong>' + nombreMascota + '</strong> esta interesado en: <strong>' + tituloAnuncio + '</strong></p>'
          + (emailInteresado ? '<p style="color:#555">Contactar: <a href="mailto:' + emailInteresado + '" style="color:#E05090">' + emailInteresado + '</a></p>' : '')
          + '<div style="text-align:center;margin:24px 0"><a href="https://petmi-petzid.vercel.app/avisos.html" style="background:#E05090;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700">Ver avisos</a></div>');
        try { GmailApp.sendEmail(emailCreador, nombreMascota + ' esta interesado en: ' + tituloAnuncio, '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(e) {}
      }
      return ok();
    }

    if (action === 'notificarInvitacion') {
      var emailReceptor = String(data.emailReceptor||'').trim();
      if (emailReceptor) {
        var html = emailHtml('#00B4B4', LOGO_HEADER,
          '<h2 style="color:#222;margin-top:0">Te invitaron a un evento</h2>'
          + '<p style="color:#555;font-size:15px;line-height:1.7"><strong>' + String(data.nombreEmisor||'') + '</strong> te invita a:</p>'
          + '<div style="background:#e0f7f7;border-radius:12px;padding:16px;margin:16px 0">'
          + '<div style="font-size:18px;font-weight:700;color:#007a7a">' + String(data.nombreEvento||'') + '</div>'
          + (data.fechaEvento ? '<div style="font-size:14px;color:#555">Fecha: ' + data.fechaEvento + '</div>' : '')
          + (data.lugarEvento ? '<div style="font-size:14px;color:#555">Lugar: ' + data.lugarEvento + '</div>' : '')
          + '</div>'
          + '<div style="text-align:center;margin:24px 0"><a href="' + String(data.urlEventos||'https://petmi-petzid.vercel.app/eventos.html') + '" style="background:#00B4B4;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700">Ver evento</a></div>');
        try { GmailApp.sendEmail(emailReceptor, String(data.nombreEmisor||'') + ' te invita a ' + String(data.nombreEvento||'') + ' en PetMi', '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(e) {}
      }
      return ok();
    }

    if (action === 'notificarMensaje') {
      var emailReceptor = String(data.emailReceptor||'').trim();
      if (emailReceptor) {
        var emisorLabel = (data.nombreEmisor && String(data.nombreEmisor).indexOf('@') < 0) ? data.nombreEmisor : 'Tu amigo PetMi';
        var html = emailHtml('#00B4B4', LOGO_HEADER,
          '<h2 style="color:#222;margin-top:0">Nuevo mensaje privado</h2>'
          + '<p style="color:#555;font-size:15px;line-height:1.7"><strong>' + emisorLabel + '</strong> te envio un mensaje:</p>'
          + '<div style="background:#f0f0ee;border-radius:12px;padding:14px;font-size:15px;color:#333;margin:16px 0">' + String(data.mensaje||'') + '</div>'
          + '<div style="text-align:center;margin:24px 0"><a href="https://petmi-petzid.vercel.app/amigos.html" style="background:#00B4B4;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700">Ver mensaje</a></div>');
        try { GmailApp.sendEmail(emailReceptor, emisorLabel + ' te envio un mensaje privado en PetMi', '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(e) {}
      }
      return ok();
    }

    if (action === 'notificarCumple') {
      var emailDueno  = String(data.emailDueno||'').trim();
      var tipoFecha   = String(data.tipoFecha||'nacimiento').trim();
      var tituloFecha = tipoFecha === 'llegada' ? 'aniversario de llegada a casa' : 'cumpleanos';
      if (emailDueno) {
        var html = emailHtml('#F5C842', LOGO_HEADER_YELLOW,
          '<h2 style="color:#222;margin-top:0">Feliz ' + tituloFecha + ', ' + String(data.nombreMasc||'') + '</h2>'
          + '<p style="color:#555;font-size:15px;line-height:1.7">Hola <strong>' + String(data.nombreDueno||'') + '</strong>,</p>'
          + '<p style="color:#555;font-size:15px;line-height:1.7">Hoy es un dia especial para <strong>' + String(data.nombreMasc||'') + '</strong>. Toda la comunidad PetMi te manda un abrazo.</p>'
          + '<div style="text-align:center;margin:28px 0;font-size:56px">&#x1F382;&#x1F43E;</div>'
          + '<div style="text-align:center;margin:24px 0"><a href="https://petmi-petzid.vercel.app/galeria.html" style="background:#00B4B4;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700">Ver la galeria PetMi</a></div>');
        try { GmailApp.sendEmail(emailDueno, 'Feliz ' + tituloFecha + ' para ' + String(data.nombreMasc||''), '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'}); } catch(e) {}
      }
      return ok();
    }

    // ── deleteAccount ──────────────────────────────────────
    if (action === 'deleteAccount') {
      var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
      var lastRow = sheet.getLastRow();
      var email   = String(data.email||'').trim().toLowerCase();
      var filas   = [], uids = [];
      for (var i = 2; i <= lastRow; i++) {
        if (String(sheet.getRange(i, 12).getValue()).trim().toLowerCase() !== email) continue;
        uids.push(String(sheet.getRange(i, 2).getValue()).trim());
        filas.push(i);
      }
      filas.reverse().forEach(function(fila) { sheet.deleteRow(fila); });
      uids.forEach(function(uid) { sbDelete(uid); });
      return ContentService.createTextOutput(JSON.stringify({ok:true, eliminadas:filas.length})).setMimeType(ContentService.MimeType.JSON);
    }

    // ── checkEmail (POST) ──────────────────────────────────
    if (action === 'checkEmail') {
      return checkEmailHandler(data.email);
    }

    // ── submit normal ──────────────────────────────────────
    var sheet = getOrCreateSheet();
    var uid   = data.uid || generateUID();
    saveRow(sheet, uid, data);

    // Heredar Premium si el email ya lo tiene
    var premiumData = { premium: false, premium_hasta: null, premium_metodo: null };
    try {
      var emailLower = (data.email||'').toLowerCase();
      var premCheck  = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/mascotas?email=eq.' + encodeURIComponent(emailLower) + '&premium=eq.true&select=premium,premium_hasta,premium_metodo&limit=1', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      var premRows = JSON.parse(premCheck.getContentText());
      if (premRows && premRows.length > 0 && premRows[0].premium) {
        premiumData.premium        = true;
        premiumData.premium_hasta  = premRows[0].premium_hasta || null;
        premiumData.premium_metodo = premRows[0].premium_metodo || null;
      }
    } catch(pe) { Logger.log('Premium check: ' + pe.message); }

    sbUpsert('mascotas', {
      uid: uid, nombre: data.nombre||'', apodo: data.apodo||'', especie: data.especie||'',
      sexo: data.sexo||'', raza: data.raza||'', tipo_fecha: data.tipoFecha||'nacimiento',
      fecha: data.fecha||'', zona: String(data.zona||''), dueno: data.dueno||'',
      email: (data.email||'').toLowerCase(), whatsapp: data.whatsapp||'', veterinario: data.veterinario||'',
      instagram: data.instagram||'', alimento: data.alimento||'',
      actividades: Array.isArray(data.actividades) ? data.actividades.join(', ') : (data.actividades||''),
      especial: data.especial||'', foto: data.foto||'', angelito: false, notif_mensajes: true,
      ofertas: data.recibeOfertas ? true : false,
      premium: premiumData.premium,
      premium_hasta: premiumData.premium_hasta,
      premium_metodo: premiumData.premium_metodo
    });

    // Punto por referido
    if (data.referido_por) {
      try {
        var refUid = String(data.referido_por).trim().toLowerCase();
        var refCheck = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/mascotas?uid=eq.' + encodeURIComponent(refUid) + '&select=email&limit=1', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
          muteHttpExceptions: true
        });
        var refRows = JSON.parse(refCheck.getContentText());
        if (refRows && refRows.length && refRows[0].email) {
          sbInsert('puntos', {
            email: refRows[0].email,
            accion: 'referir_amigo',
            puntos: 10,
            referencia: uid
          });
        }
      } catch(refErr) { Logger.log('Referido error: ' + refErr.message); }
    }

    if (data.email) {
      try {
        if (data.isSibling && data.siblings && data.siblings.length > 0) {
          sendEmailFamilia(data.email, data.dueno, data.nombre, data.siblings);
        } else {
          sendEmailBienvenida(data.email, data.dueno, data.nombre);
        }
        var lastRow2 = sheet.getLastRow();
        sheet.getRange(lastRow2, 25).setValue('Si');
        sheet.getRange(lastRow2, 26).setValue(new Date());
      } catch(mailErr) { Logger.log('Error correo: ' + mailErr.message); }
    }
    return ContentService.createTextOutput(JSON.stringify({ok:true, uid:uid})).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    Logger.log('doPost error: ' + err.message);
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function ok() {
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// doGet
// ============================================================
function doGet(e) {
  if (!e || !e.parameter) return ContentService.createTextOutput(JSON.stringify({status:'PetMi API v12'})).setMimeType(ContentService.MimeType.JSON);
  var action = e.parameter.action || '';

  if (action === 'getData') {
    var ss        = SpreadsheetApp.openById(SHEET_ID);
    var sheet     = ss.getSheetByName(SHEET_NAME);
    var lastRow   = sheet.getLastRow();
    var rows      = lastRow > 1 ? sheet.getRange(2, 1, lastRow-1, 31).getValues() : [];
    var campSheet = ss.getSheetByName('Campanas');
    var campRows  = [];
    if (campSheet && campSheet.getLastRow() > 1) campRows = campSheet.getRange(2, 1, campSheet.getLastRow()-1, 5).getValues();
    return ContentService.createTextOutput(JSON.stringify({rows:rows, campanas:campRows})).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getBasic') {
    var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return ContentService.createTextOutput(JSON.stringify({rows:[]})).setMimeType(ContentService.MimeType.JSON);
    var colsB = sheet.getRange(2, 2, lastRow-1, 11).getValues();
    var colsF = sheet.getRange(2, 28, lastRow-1, 4).getValues();
    var rows  = colsB.map(function(r, i) {
      var f = colsF[i] || [];
      return [String(r[0]||''),String(r[1]||''),String(r[2]||''),String(r[3]||''),String(r[4]||''),String(r[5]||''),String(r[6]||''),String(r[7]||''),String(r[10]||''),String(f[0]||''),String(f[1]||''),String(f[2]||''),String(f[3]||'')];
    }).filter(function(r){ return r[1]; });
    return ContentService.createTextOutput(JSON.stringify({rows:rows})).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'checkEmail') {
    return checkEmailHandler(e.parameter.email);
  }

  if (action === 'getMensajes') {
    var uid      = e.parameter.uid ? e.parameter.uid.trim() : '';
    if (!uid) return ContentService.createTextOutput(JSON.stringify({mensajes:[]})).setMimeType(ContentService.MimeType.JSON);
    var ss       = SpreadsheetApp.openById(SHEET_ID);
    var msgSheet = ss.getSheetByName('Mensajes');
    var mensajes = [];
    if (msgSheet && msgSheet.getLastRow() > 1) {
      var data = msgSheet.getRange(2, 1, msgSheet.getLastRow()-1, 5).getValues();
      data.forEach(function(row) {
        if (String(row[1]).trim() !== uid) return;
        mensajes.push({fecha:row[0], autor:String(row[2]||''), mensaje:String(row[3]||''), nombreMascota:String(row[4]||'')});
      });
    }
    return ContentService.createTextOutput(JSON.stringify({mensajes:mensajes})).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({status:'PetMi API v12'})).setMimeType(ContentService.MimeType.JSON);
}

// ── checkEmail helper compartido ───────────────────────────
function checkEmailHandler(emailRaw) {
  var email   = String(emailRaw||'').trim().toLowerCase();
  if (!email) return ContentService.createTextOutput(JSON.stringify({found:false, mascotas:[]})).setMimeType(ContentService.MimeType.JSON);
  var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return ContentService.createTextOutput(JSON.stringify({found:false, mascotas:[]})).setMimeType(ContentService.MimeType.JSON);
  var rows     = sheet.getRange(2, 1, lastRow-1, 31).getValues();
  var mascotas = [];
  rows.forEach(function(row) {
    if (String(row[11]||'').trim().toLowerCase() !== email) return;
    mascotas.push({
      uid:String(row[1]||'').trim(), nombre:String(row[2]||'').trim(), apodo:String(row[3]||'').trim(),
      especie:String(row[4]||'').trim(), sexo:String(row[5]||'').trim(), raza:String(row[6]||'').trim(),
      tipoFecha:String(row[7]||'').trim(), fecha:String(row[8]||'').trim(), zona:String(row[9]||'').trim(),
      dueno:String(row[10]||'').trim(), email:String(row[11]||'').trim(), whatsapp:String(row[12]||'').trim(),
      veterinario:String(row[13]||'').trim(), instagram:String(row[15]||'').trim(), alimento:String(row[16]||'').trim(),
      actividades:String(row[18]||'').trim(), especial:String(row[23]||'').trim(), foto:String(row[27]||'').trim(),
      angelito:String(row[28]||'').trim(), notifMensajes:String(row[30]||'').trim()
    });
  });
  return ContentService.createTextOutput(JSON.stringify({found:mascotas.length>0, mascotas:mascotas})).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// TRIGGERS
// ============================================================
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('enviarPendientesAuto').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('enviarCumpleanosHoy').timeBased().everyDays(1).atHour(14).create();
}

function enviarPendientesAuto() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  for (var row = 2; row <= lastRow; row++) {
    if (sheet.getRange(row, 25).getValue() === 'Si') continue;
    var d = rowToData(sheet, row);
    if (!d.email) continue;
    sheet.getRange(row, 25).setValue('Requiere reenvio manual');
  }
}

function enviarCumpleanosHoy() {
  var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var hoy = new Date();
  var rows = sheet.getRange(2, 1, lastRow-1, 31).getValues();
  var count = 0;
  rows.forEach(function(row) {
    var email     = String(row[11]||'').trim();
    var nombre    = String(row[2] ||'').trim();
    var dueno     = String(row[10]||'').trim();
    var fecha     = String(row[8] ||'').trim();
    var tipoFecha = String(row[7] ||'').trim();
    var angelito  = String(row[28]||'').trim().toLowerCase();
    if (!email || !fecha || angelito === 'si') return;
    var dia, mes;
    var p = fecha.split('/');
    if (p.length === 3) { dia = parseInt(p[0]); mes = parseInt(p[1]); }
    else { var d2 = new Date(fecha); dia = d2.getDate(); mes = d2.getMonth()+1; }
    if (isNaN(dia) || isNaN(mes) || dia !== hoy.getDate() || mes !== hoy.getMonth()+1) return;
    try {
      var tituloFecha = tipoFecha === 'llegada' ? 'aniversario de llegada a casa' : 'cumpleanos';
      var html = emailHtml('#F5C842', LOGO_HEADER_YELLOW,
        '<h2 style="color:#222;margin-top:0">Feliz ' + tituloFecha + ', ' + nombre + '</h2>'
        + '<p style="color:#555;font-size:15px;line-height:1.7">Hola <strong>' + dueno + '</strong>, hoy es un dia especial para <strong>' + nombre + '</strong>.</p>'
        + '<div style="text-align:center;margin:28px 0;font-size:56px">&#x1F382;&#x1F43E;</div>'
        + '<div style="text-align:center"><a href="https://petmi-petzid.vercel.app/galeria.html" style="background:#00B4B4;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700">Ver la galeria PetMi</a></div>');
      GmailApp.sendEmail(email, 'Feliz ' + tituloFecha + ' para ' + nombre, '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'});
      count++;
      Utilities.sleep(500);
    } catch(err) { Logger.log('Error cumple ' + nombre + ': ' + err.message); }
  });
  Logger.log('Cumpleanos enviados: ' + count);
}

function deleteTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'vincularLote') ScriptApp.deleteTrigger(t);
  });
}

// ============================================================
// REENVIO
// ============================================================
function reenviarSeleccionado() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var row   = sheet.getActiveRange().getRow();
  if (row <= 1) { SpreadsheetApp.getUi().alert('Selecciona una fila de datos.'); return; }
  var d = rowToData(sheet, row);
  if (!d.email) { SpreadsheetApp.getUi().alert('Esta fila no tiene correo.'); return; }
  sendEmailBienvenida(d.email, d.dueno, d.nombre);
  sheet.getRange(row, 25).setValue('Si');
  sheet.getRange(row, 26).setValue(new Date());
  SpreadsheetApp.getUi().alert('PetzID reenviado a ' + d.email);
}

function reenviarPendientes() {
  var sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();
  var count   = 0;
  for (var row = 2; row <= lastRow; row++) {
    if (sheet.getRange(row, 25).getValue() === 'Si') continue;
    var d = rowToData(sheet, row);
    if (!d.email) continue;
    sendEmailBienvenida(d.email, d.dueno, d.nombre);
    sheet.getRange(row, 25).setValue('Si');
    sheet.getRange(row, 26).setValue(new Date());
    count++;
    Utilities.sleep(1000);
  }
  SpreadsheetApp.getUi().alert(count + ' PetzID(s) enviados.');
}

// ============================================================
// CRM — PROMOS
// ============================================================
function enviarPromo() {
  var ui = SpreadsheetApp.getUi();
  var segResp = ui.prompt('PetMi CRM — Segmento', 'Define el segmento (vacio = TODOS):', ui.ButtonSet.OK_CANCEL);
  if (segResp.getSelectedButton() !== ui.Button.OK) return;
  var filtroTexto = segResp.getResponseText().trim();
  var asuntoResp  = ui.prompt('Asunto del correo:', ui.ButtonSet.OK_CANCEL);
  if (asuntoResp.getSelectedButton() !== ui.Button.OK) return;
  var asunto = asuntoResp.getResponseText().trim();
  if (!asunto) { ui.alert('El asunto no puede estar vacio.'); return; }
  var mensajeResp = ui.prompt('Mensaje (usa {nombre} y {dueno}):', ui.ButtonSet.OK_CANCEL);
  if (mensajeResp.getSelectedButton() !== ui.Button.OK) return;
  var mensaje = mensajeResp.getResponseText().trim();
  if (!mensaje) { ui.alert('El mensaje no puede estar vacio.'); return; }
  var sheet         = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var destinatarios = filtrarDestinatarios(sheet, parseFiltros(filtroTexto));
  if (!destinatarios.length) { ui.alert('No se encontraron usuarios.'); return; }
  if (ui.alert('Enviar a ' + destinatarios.length + ' usuario(s)?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var enviados = 0, errores = 0;
  destinatarios.forEach(function(d) {
    try {
      var msg = mensaje.replace(/\{nombre\}/gi, d.nombre||'tu mascota').replace(/\{dueno\}/gi, d.dueno||'');
      GmailApp.sendEmail(d.email, asunto, msg, {name:REMITENTE, htmlBody:buildPromoHTML(asunto, d.nombre, d.dueno, msg), charset:'UTF-8'});
      enviados++; Utilities.sleep(500);
    } catch(err) { errores++; }
  });
  registrarCampana(filtroTexto, asunto, enviados, errores);
  ui.alert('Enviados: ' + enviados + '\nErrores: ' + errores);
}

function vistaPrevia() {
  var ui   = SpreadsheetApp.getUi();
  var resp = ui.prompt('Segmento:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var dest  = filtrarDestinatarios(sheet, parseFiltros(resp.getResponseText().trim()));
  ui.alert('Usuarios: ' + dest.length);
}

function parseFiltros(texto) {
  var f = {};
  if (!texto) return f;
  texto.split(',').forEach(function(p) {
    var x = p.split('=');
    if (x.length === 2) f[x[0].trim().toLowerCase()] = x[1].trim().toLowerCase();
  });
  return f;
}

function filtrarDestinatarios(sheet, filtros) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 1, lastRow-1, 26).getValues();
  var res  = [];
  data.forEach(function(row) {
    var email = row[11];
    if (!email || row[20] === 'No') return;
    var match = true;
    Object.keys(filtros).forEach(function(k) {
      var v = filtros[k];
      if (k==='especie' && String(row[4]).toLowerCase().indexOf(v)<0)  match=false;
      if (k==='zona'    && String(row[9]).toLowerCase().indexOf(v)<0)  match=false;
      if (k==='sexo'    && String(row[5]).toLowerCase().indexOf(v)<0)  match=false;
      if (k==='raza'    && String(row[6]).toLowerCase().indexOf(v)<0)  match=false;
    });
    if (match) res.push({nombre:row[2], dueno:row[10], email:email, whatsapp:row[12]});
  });
  return res;
}

function buildPromoHTML(asunto, nombre, dueno, mensaje) {
  return emailHtml('#00B4B4', LOGO_HEADER,
    '<h2 style="color:#222;margin-top:0">' + asunto + '</h2>'
    + '<p style="color:#555;line-height:1.7">Hola <strong>' + (dueno||'') + '</strong>,</p>'
    + '<p style="color:#555;line-height:1.7">' + mensaje.replace(/\n/g,'<br>') + '</p>');
}

function registrarCampana(filtro, asunto, enviados, errores) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var s  = ss.getSheetByName('Campanas');
  if (!s) { s = ss.insertSheet('Campanas'); s.appendRow(['Fecha','Segmento','Asunto','Enviados','Errores']); s.getRange(1,1,1,5).setBackground('#00B4B4').setFontColor('#fff').setFontWeight('bold'); }
  s.appendRow([new Date(), filtro||'TODOS', asunto, enviados, errores]);
}

// ============================================================
// DEDUPLICACION Y UTILIDADES
// ============================================================
function detectarDuplicados() {
  var ui=SpreadsheetApp.getUi(), sheet=SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME), lastRow=sheet.getLastRow();
  if(lastRow<2){ui.alert('No hay datos.');return;}
  var data=sheet.getRange(2,1,lastRow-1,26).getValues(), vistos={}, dups=[];
  data.forEach(function(row,i){
    var k=String(row[11]||'').trim().toLowerCase()+'|'+String(row[2]||'').trim().toLowerCase();
    if(!row[11])return;
    if(vistos[k]!==undefined){if(new Date(row[0])>=new Date(data[vistos[k]][0])){dups.push(vistos[k]+2);vistos[k]=i;}else dups.push(i+2);}
    else vistos[k]=i;
  });
  if(!dups.length){ui.alert('No hay duplicados.');return;}
  if(ui.alert('Eliminar '+dups.length+' duplicados?',ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
  dups.sort(function(a,b){return b-a;});
  dups.forEach(function(r){sheet.deleteRow(r);});
  ui.alert('Eliminados: '+dups.length);
}

function generarGruposFamiliares() {
  var ui=SpreadsheetApp.getUi(), ss=SpreadsheetApp.openById(SHEET_ID), sheet=ss.getSheetByName(SHEET_NAME), lastRow=sheet.getLastRow();
  if(lastRow<2){ui.alert('No hay datos.');return;}
  var data=sheet.getRange(2,1,lastRow-1,26).getValues(), fams={};
  data.forEach(function(row){
    var email=String(row[11]||'').trim().toLowerCase();
    if(!email)return;
    if(!fams[email])fams[email]={dueno:String(row[10]||''),email:email,whatsapp:String(row[12]||''),zona:String(row[9]||''),mascotas:[]};
    fams[email].mascotas.push(String(row[2]||'')+'('+String(row[4]||'')+')');
  });
  var fs=ss.getSheetByName('Familias');
  if(!fs)fs=ss.insertSheet('Familias');else fs.clearContents();
  fs.appendRow(['Dueno','Email','WhatsApp','Zona','Total','Mascotas']);
  fs.getRange(1,1,1,6).setBackground('#00B4B4').setFontColor('#fff').setFontWeight('bold');
  var tot=0,multi=0;
  Object.keys(fams).forEach(function(k){var f=fams[k];fs.appendRow([f.dueno,f.email,f.whatsapp,f.zona,f.mascotas.length,f.mascotas.join(', ')]);tot++;if(f.mascotas.length>1)multi++;});
  ui.alert('Familias: '+tot+' | Con 2+: '+multi);
}

function limpiarTelefonos() {
  var ui=SpreadsheetApp.getUi(), sheet=SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME), lastRow=sheet.getLastRow();
  if(lastRow<2){ui.alert('No hay datos.');return;}
  var data=sheet.getRange(2,13,lastRow-1,1).getValues(), act=0,rev=0,vac=0;
  data.forEach(function(row,i){
    var o=String(row[0]||'').trim();
    if(!o){vac++;return;}
    var l=normalizarTelefono(o);
    sheet.getRange(i+2,13).setValue(l);
    if(l.indexOf('REVISAR')>=0)rev++;else act++;
  });
  ui.alert('Actualizados: '+act+' | Revisar: '+rev+' | Vacios: '+vac);
}

function normalizarTelefono(tel) {
  var d=tel.replace(/[^\d]/g,'');
  if(d.startsWith('502')&&d.length===11)d=d.substring(3);
  else if(d.startsWith('1')&&d.length===11)d=d.substring(1);
  if(d.length===8)return '+502'+d;
  return 'REVISAR: '+tel;
}

// ============================================================
// FOTOS — MIGRACIÓN
// ============================================================
function migrarFotosAntiguas() {
  var sN=SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME), sA=SpreadsheetApp.openById(SHEET_ANTIGUO).getSheets()[0];
  var dA=sA.getRange(2,1,sA.getLastRow()-1,27).getValues(), idx={},si=0;
  dA.forEach(function(r){
    var n=String(r[0]||'').trim().toLowerCase(),e=String(r[11]||'').trim().toLowerCase(),img=String(r[26]||'').trim();
    if(!e||!n||!img||img==='media'){si++;return;}
    idx[e+'|'+n]=BASE_WIX+img;
  });
  var dN=sN.getRange(2,1,sN.getLastRow()-1,12).getValues(), v=0,sm=0;
  dN.forEach(function(r,i){
    var n=String(r[2]||'').trim().toLowerCase(),e=String(r[11]||'').trim().toLowerCase();
    if(!e||!n)return;
    var url=idx[e+'|'+n];
    if(url){sN.getRange(i+2,COL_FOTO).setValue(url);v++;}else sm++;
  });
  SpreadsheetApp.getUi().alert('Vinculadas: '+v+' | Sin match: '+sm+' | Sin img: '+si);
}

function migrarFotosADrive() {
  var ui=SpreadsheetApp.getUi(), sheet=SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME), lastRow=sheet.getLastRow();
  if(lastRow<2){ui.alert('No hay datos.');return;}
  var data=sheet.getRange(2,1,lastRow-1,28).getValues(), pend=[];
  data.forEach(function(r,i){
    var u=String(r[27]||'').trim();
    if(u.indexOf('wixstatic.com')>=0||u.indexOf('wix.com')>=0)pend.push({rowNum:i+2,uid:String(r[1]||''),url:u});
  });
  if(!pend.length){ui.alert('No hay fotos Wix.');return;}
  if(ui.alert('Migrar '+pend.length+'?',ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
  var folder=DriveApp.getFolderById(FOLDER_ID),m=0,err=0,lote=Math.min(pend.length,20);
  for(var i=0;i<lote;i++){
    var item=pend[i];
    try{
      var r=UrlFetchApp.fetch(item.url,{muteHttpExceptions:true,followRedirects:true,deadline:10});
      if(r.getResponseCode()===200){
        var b=r.getBlob();b.setName('foto_'+(item.uid||i)+'.jpg');
        var f=DriveApp.getFolderById(FOLDER_ID).createFile(b);f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
        sheet.getRange(item.rowNum,COL_FOTO).setValue('https://drive.google.com/uc?id='+f.getId());m++;
      }else{sheet.getRange(item.rowNum,COL_FOTO).setValue('sin_foto');err++;}
    }catch(e){sheet.getRange(item.rowNum,COL_FOTO).setValue('sin_foto');err++;}
  }
  ui.alert('Migradas: '+m+' | Errores: '+err+(pend.length-lote>0?' | Quedan: '+(pend.length-lote):''));
}

function indexarFolderYGuardar() {
  var folder=DriveApp.getFolderById(FOLDER_VIEJO),files=folder.getFiles(),idx={};
  while(files.hasNext()){var f=files.next();try{f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}idx[f.getName().replace(/\.[^/.]+$/,'').trim().toLowerCase()]='https://drive.google.com/uc?id='+f.getId();}
  PropertiesService.getScriptProperties().setProperties({'fotoIndex':JSON.stringify(idx),'cursorFila':'2'});
  SpreadsheetApp.getUi().alert('Indexadas: '+Object.keys(idx).length);
}

function vincularLote() {
  var props=PropertiesService.getScriptProperties(), raw=props.getProperty('fotoIndex');
  if(!raw){SpreadsheetApp.getUi().alert('Primero indexa.');return;}
  var idx=JSON.parse(raw),cursor=parseInt(props.getProperty('cursorFila')||'2');
  var sheet=SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME), lastRow=sheet.getLastRow();
  if(cursor>lastRow){SpreadsheetApp.getUi().alert('FIN.');deleteTrigger();return;}
  var hasta=Math.min(cursor+LOTE-1,lastRow),filas=hasta-cursor+1;
  var idD=sheet.getRange(cursor,17,filas,1).getValues(), ftD=sheet.getRange(cursor,COL_FOTO,filas,1).getValues(), v=0;
  idD.forEach(function(r,i){
    if(String(ftD[i][0]).indexOf('drive.google.com')>=0)return;
    var k=String(r[0]||'').trim().toLowerCase();if(!k)return;
    var url=idx[k];
    if(!url){var b=k.replace(/_\d+(_\d+)*$/,'');url=idx[b];}
    if(!url){var ks=Object.keys(idx);for(var j=0;j<ks.length;j++){if(ks[j].indexOf(k)>=0||k.indexOf(ks[j].replace(/_\d+(_\d+)*$/,''))>=0){url=idx[ks[j]];break;}}}
    if(url){sheet.getRange(cursor+i,COL_FOTO).setValue(url);v++;}
  });
  props.setProperty('cursorFila',String(hasta+1));
  SpreadsheetApp.getUi().alert('Filas '+cursor+'-'+hasta+' | Vinculadas: '+v+(hasta>=lastRow?'\n\nFIN':''));
}

function contarFotos() {
  var sheet=SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME), lastRow=sheet.getLastRow();
  var f=sheet.getRange(2,COL_FOTO,lastRow-1,1).getValues();
  SpreadsheetApp.getUi().alert('Con foto: '+f.filter(function(r){return String(r[0]).indexOf('http')>=0;}).length+' de '+(lastRow-1));
}

function verHeadersAntiguos() {
  var sheet=SpreadsheetApp.openById(SHEET_ANTIGUO).getSheets()[0];
  var h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  SpreadsheetApp.getUi().alert(h.map(function(v,i){return 'Col '+(i+1)+': '+v;}).join('\n'));
}

// ============================================================
// SHEETS — helpers
// ============================================================
function getOrCreateSheet() {
  var ss=SpreadsheetApp.openById(SHEET_ID), sheet=ss.getSheetByName(SHEET_NAME);
  if(!sheet){
    sheet=ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1,1,1,HEADERS.length).setBackground('#00B4B4').setFontColor('#fff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function saveRow(sheet, uid, d) {
  sheet.appendRow([
    new Date(),uid,d.nombre||'',d.apodo||'',d.especie||'',d.sexo||'',d.raza||'',
    d.tipoFecha||'nacimiento',d.fecha||'',String(d.zona||''),d.dueno||'',d.email||'',d.whatsapp||'',
    d.veterinario||'',d.conviveCon||'',d.instagram||'',d.alimento||'',
    Array.isArray(d.tipoAlimento)?d.tipoAlimento.join(', '):(d.tipoAlimento||''),
    Array.isArray(d.actividades)?d.actividades.join(', '):(d.actividades||''),
    Array.isArray(d.personalidad)?d.personalidad.join(', '):(d.personalidad||''),
    d.recibeOfertas?'Si':'No','','',d.especial||'','Pendiente','','',d.foto||'','','',''
  ]);
}

function rowToData(sheet, row) {
  var v=sheet.getRange(row,1,1,31).getValues()[0];
  return {uid:v[1],nombre:v[2],apodo:v[3],especie:v[4],sexo:v[5],raza:v[6],tipoFecha:v[7],fecha:v[8],zona:v[9],dueno:v[10],email:v[11],whatsapp:v[12],veterinario:v[13],conviveCon:v[14],instagram:v[15],foto:v[27],angelito:v[28]};
}

// ============================================================
// SYNC SHEET → SUPABASE
// ============================================================
function sincronizarTodo() {
  var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { SpreadsheetApp.getUi().alert('No hay datos.'); return; }
  var rows = sheet.getRange(2, 1, lastRow-1, 31).getValues();
  var ok = 0, err = 0;
  rows.forEach(function(r) {
    var uid = String(r[1]||'').trim().toLowerCase();
    if (!uid) return;
    try {
      sbUpsert('mascotas', {
        uid:uid, nombre:String(r[2]||''), apodo:String(r[3]||''), especie:String(r[4]||''),
        sexo:String(r[5]||''), raza:String(r[6]||''), tipo_fecha:String(r[7]||'nacimiento'),
        fecha:String(r[8]||''), zona:String(r[9]||''), dueno:String(r[10]||''),
        email:String(r[11]||'').toLowerCase(), whatsapp:String(r[12]||''),
        veterinario:String(r[13]||''), instagram:String(r[15]||''), alimento:String(r[16]||''),
        actividades:String(r[18]||''), especial:String(r[23]||''), foto:String(r[27]||''),
        angelito:(r[28]===true||String(r[28]||'').toLowerCase()==='si'),
        fecha_angelito:String(r[29]||'')||null, notif_mensajes:true, ofertas:false
      });
      ok++; Utilities.sleep(50);
    } catch(e) { err++; Logger.log('Sync error '+uid+': '+e.message); }
  });
  SpreadsheetApp.getUi().alert('Sincronizadas: ' + ok + ' | Errores: ' + err);
}

// ============================================================
// EMAILS DE BIENVENIDA
// ============================================================
function sendEmailBienvenida(to, dueno, nombreMascota) {
  if(!to) return;
  var BASE = 'https://petmi-petzid.vercel.app';
  var body = '<h2 style="color:#222;margin-top:0">Hola ' + (dueno||'') + ', ya eres parte de PetMi</h2>'
    + '<p style="color:#555;line-height:1.7;font-size:14px">El PetzID de <strong>' + (nombreMascota||'tu mascota') + '</strong> ya esta listo.</p>'
    + '<div style="background:#f0f7ff;border-radius:10px;padding:12px 16px;margin:0 0 16px;border-left:3px solid #00B4B4;font-size:13px;color:#333;line-height:1.6">'
    + 'Puedes editar el perfil y descargar su ID desde <strong>Mi Familia &rarr; Editar</strong>.</div>'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px"><tr>'
    + '<td width="50%" style="padding:4px"><a href="'+BASE+'/eventos.html" style="display:block;background:#f8f8f8;border-radius:10px;padding:14px 12px;text-align:center;text-decoration:none"><div style="font-size:22px;margin-bottom:4px">&#x1F4C5;</div><div style="font-size:12px;font-weight:700;color:#222">Eventos</div></a></td>'
    + '<td width="50%" style="padding:4px"><a href="'+BASE+'/lugares.html" style="display:block;background:#f8f8f8;border-radius:10px;padding:14px 12px;text-align:center;text-decoration:none"><div style="font-size:22px;margin-bottom:4px">&#x1F4CD;</div><div style="font-size:12px;font-weight:700;color:#222">Lugares</div></a></td>'
    + '</tr><tr>'
    + '<td width="50%" style="padding:4px"><a href="'+BASE+'/avisos.html" style="display:block;background:#f8f8f8;border-radius:10px;padding:14px 12px;text-align:center;text-decoration:none"><div style="font-size:22px;margin-bottom:4px">&#x1F6A8;</div><div style="font-size:12px;font-weight:700;color:#222">Mascotas perdidas</div></a></td>'
    + '<td width="50%" style="padding:4px"><a href="'+BASE+'/galeria.html" style="display:block;background:#f8f8f8;border-radius:10px;padding:14px 12px;text-align:center;text-decoration:none"><div style="font-size:22px;margin-bottom:4px">&#x1F43E;</div><div style="font-size:12px;font-weight:700;color:#222">Comunidad</div></a></td>'
    + '</tr></table>'
    + '<div style="text-align:center;margin:20px 0 8px"><a href="'+BASE+'/familia.html" style="background:#00B4B4;color:#fff;padding:14px 32px;border-radius:24px;text-decoration:none;font-weight:700;font-size:15px">Ver mi familia en PetMi</a></div>';
  GmailApp.sendEmail(to, 'Bienvenido a PetMi, ' + (dueno||'') + '!', '', {name:REMITENTE, htmlBody:emailHtml('#00B4B4', LOGO_HEADER, body), charset:'UTF-8'});
}

function sendEmailFamilia(to, dueno, nombreNuevo, siblings) {
  if(!to) return;
  var total = (siblings ? siblings.length : 0) + 1;
  var listHTML = '';
  if(siblings) {
    siblings.forEach(function(s){
      var emoji = s.especie && s.especie.toLowerCase().indexOf('gato')>=0 ? '&#x1F431;' : '&#x1F436;';
      listHTML += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:0.5px solid #e0e8e0">'
        + '<div style="width:32px;height:32px;border-radius:8px;background:#00B4B4;text-align:center;line-height:32px;font-size:16px">' + emoji + '</div>'
        + '<div><div style="font-size:13px;font-weight:700;color:#222">' + (s.nombre||'') + '</div>'
        + '<div style="font-size:11px;color:#888">' + (s.especie||'') + (s.sexo?' · '+s.sexo:'') + '</div></div></div>';
    });
  }
  listHTML += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0">'
    + '<div style="width:32px;height:32px;border-radius:8px;background:#E05090;text-align:center;line-height:32px;font-size:16px">&#x1F43E;</div>'
    + '<div><div style="font-size:13px;font-weight:700;color:#222">' + (nombreNuevo||'') + ' <span style="font-size:10px;background:#e0f7f7;color:#007a7a;padding:2px 8px;border-radius:20px">Nuevo</span></div></div></div>';
  var html = emailHtml('#764ba2', LOGO_HEADER,
    '<h2 style="color:#222;margin-top:0">' + (nombreNuevo||'Tu nueva mascota') + ' se unio a tu familia</h2>'
    + '<p style="color:#555;line-height:1.7">Ahora tienen <strong>' + total + ' mascota' + (total!==1?'s':'') + '</strong> en PetMi.</p>'
    + '<div style="background:#f0f7f0;border-radius:10px;padding:14px 16px;margin:14px 0">' + listHTML + '</div>'
    + '<div style="text-align:center;margin:20px 0"><a href="https://petmi-petzid.vercel.app/familia.html" style="background:#764ba2;color:#fff;padding:14px 28px;border-radius:24px;text-decoration:none;font-weight:700">Ver mi familia en PetMi</a></div>');
  GmailApp.sendEmail(to, (nombreNuevo||'Tu nueva mascota') + ' se unio a tu familia en PetMi', '', {name:REMITENTE, htmlBody:html, charset:'UTF-8'});
}

// ============================================================
// HELPERS GENERALES
// ============================================================
function toStr(v) {
  return (v===null||v===undefined||v==='') ? '-' : String(v).toUpperCase();
}

function fmtDate(v) {
  if(!v) return '-';
  try{
    var d=new Date(v);
    if(isNaN(d.getTime())) return String(v);
    return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
  }catch(e){return String(v);}
}

function generateUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
    var r=Math.random()*16|0;
    return(c==='x'?r:(r&0x3|0x8)).toString(16).toUpperCase();
  });
}

function columnLetter(n) {
  var s='';
  while(n>0){n--;s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26);}
  return s;
}

// ============================================================
// GENERAR PNG — CR80
// ============================================================
function generatePNG(d) {
  var W=1011, H=638, FW=Math.round(W*0.43), IW=W-FW, YH=72, TH=H-YH;
  var TEAL_H=Math.round(TH*0.50), WHITE_H=TH-TEAL_H;
  var pres=SlidesApp.create('PetzID_tmp_'+(d.uid||'x')), presId=pres.getId();
  try {
    UrlFetchApp.fetch('https://slides.googleapis.com/v1/presentations/'+presId+':batchUpdate',{
      method:'POST',
      headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'Content-Type':'application/json'},
      payload:JSON.stringify({requests:[{updatePresentationProperties:{presentationProperties:{pageSize:{pageWidth:{magnitude:W,unit:'PT'},pageHeight:{magnitude:H,unit:'PT'}}},fields:'pageSize'}}]}),
      muteHttpExceptions:true
    });
  }catch(e){Logger.log('setSize: '+e.message);}
  var slide=SlidesApp.openById(presId).getSlides()[0];

  function addShape(x,y,w,h,hex){var s=slide.insertShape(SlidesApp.ShapeType.RECTANGLE,x,y,w,h);s.getFill().setSolidFill(hex);s.getBorder().setTransparent();return s;}
  function addText(text,x,y,w,h,size,hex,bold,align){var box=slide.insertTextBox(text||'',x,y,w,h);box.getBorder().setTransparent();box.getFill().setTransparent();box.getText().getTextStyle().setFontSize(size).setForegroundColor(hex).setBold(bold);box.getText().getParagraphStyle().setParagraphAlignment(align);return box;}
  function addField(label,value,x,y,w,alignRight){var al=alignRight?SlidesApp.ParagraphAlignment.END:SlidesApp.ParagraphAlignment.START;addText(label,x,y,w,16,9,'#bbbbbb',false,al);addText(toStr(value),x,y+18,w,28,17,'#222222',true,al);}

  addShape(0,0,FW,H-YH,'#b2e0e0');
  function insertFoto(blob){
    try{
      var img=slide.insertImage(blob),iw=img.getWidth(),ih=img.getHeight(),tw=FW,th=H-YH;
      var scale=Math.max(tw/iw,th/ih),sw=iw*scale,sh=ih*scale;
      img.setLeftCrop((sw-tw)/(2*sw)).setRightCrop((sw-tw)/(2*sw)).setTopCrop((sh-th)/(2*sh)).setBottomCrop((sh-th)/(2*sh));
      img.setLeft(0).setTop(0).setWidth(tw).setHeight(th);return true;
    }catch(err){try{slide.insertImage(blob,0,0,FW,H-YH);return true;}catch(e2){return false;}}
  }
  var fotoOk=false;
  if(d.photoBase64){try{fotoOk=insertFoto(Utilities.newBlob(Utilities.base64Decode(d.photoBase64),d.photoMime||'image/jpeg','foto.jpg'));}catch(e){}}
  if(!fotoOk&&d.foto&&d.foto.indexOf('http')>=0){try{var r=UrlFetchApp.fetch(d.foto,{muteHttpExceptions:true,deadline:15});if(r.getResponseCode()===200)fotoOk=insertFoto(r.getBlob());}catch(e){}}

  addShape(FW,0,IW,TEAL_H,'#00B4B4');
  var px=FW+18, pw=IW-36;
  addText('N O M B R E',px,TEAL_H-118,pw,18,10,'#e0f7f7',false,SlidesApp.ParagraphAlignment.START);
  addText('"'+toStr(d.nombre)+'"',px,TEAL_H-96,pw,60,38,'#FFFFFF',true,SlidesApp.ParagraphAlignment.START);
  if(d.apodo&&String(d.apodo).trim()&&String(d.apodo).trim()!=='-'){
    var ap=String(d.apodo).trim().toUpperCase(),bw=Math.min(ap.length*9+24,200);
    addShape(px,TEAL_H-32,bw,26,'#F4A0B0');
    addText(ap,px+2,TEAL_H-30,bw-4,22,11,'#7a1a2e',true,SlidesApp.ParagraphAlignment.CENTER);
  }

  addShape(FW,TEAL_H,IW,WHITE_H,'#FFFFFF');
  var ROW_H=Math.floor(WHITE_H/3), col2=Math.floor(pw/2);
  addField('ESPECIE',d.especie,px,TEAL_H+12,col2,false);
  addField('SEXO',d.sexo,px+col2,TEAL_H+12,col2,true);
  addShape(px,TEAL_H+ROW_H,pw,1,'#f0f0f0');
  addField('RAZA',d.raza,px,TEAL_H+ROW_H+12,col2,false);
  addField(d.tipoFecha==='llegada'?'LLEGO A CASA':'NACIMIENTO',fmtDate(d.fecha),px+col2,TEAL_H+ROW_H+12,col2,true);
  addShape(px,TEAL_H+ROW_H*2,pw,1,'#f0f0f0');
  addField('RESPONSABLE',d.dueno,px,TEAL_H+ROW_H*2+12,pw,false);

  addShape(0,H-YH,W,YH,'#F5C842');
  var especieTexto=(d.especie&&d.especie.toLowerCase().indexOf('gato')>=0)?'CAT':'DOG';
  addShape(16,H-YH+16,46,40,'#E05090');
  addText(especieTexto,17,H-YH+18,44,32,12,'#FFFFFF',true,SlidesApp.ParagraphAlignment.CENTER);
  try{
    var logoRes=UrlFetchApp.fetch(LOGO_URL,{muteHttpExceptions:true,deadline:10});
    if(logoRes.getResponseCode()===200){var logoImg=slide.insertImage(logoRes.getBlob()),lh=42,lw=logoImg.getWidth()*(lh/logoImg.getHeight());logoImg.setWidth(lw).setHeight(lh).setLeft(W-lw-16).setTop(H-YH+(YH-lh)/2);}
  }catch(e){}

  pres.saveAndClose();
  var slideId   = SlidesApp.openById(presId).getSlides()[0].getObjectId();
  var exportUrl = 'https://docs.google.com/presentation/d/'+presId+'/export/png?pageid='+slideId;
  var res       = UrlFetchApp.fetch(exportUrl,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()}});
  var png       = res.getBlob().setName('PetzID_'+(d.nombre||'mascota')+'.png');
  DriveApp.getFileById(presId).setTrashed(true);
  return png;
}

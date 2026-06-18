// ============================================================
//  AUDITORÍA DE EMAILS ENVIADOS — PetMi / PetzID
//  Busca en Gmail los enviados y genera reporte en el Sheet
// ============================================================

function auditarEmailsEnviados() {
  var ui = SpreadsheetApp.getUi();

  // Confirmar
  var resp = ui.alert(
    'Auditoría de Emails',
    'Se buscarán los últimos emails enviados desde esta cuenta y se generará un reporte en la pestaña "Auditoria".\n\n¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var auditSheet = ss.getSheetByName('Auditoria');
  if (!auditSheet) {
    auditSheet = ss.insertSheet('Auditoria');
  } else {
    auditSheet.clearContents();
  }

  // Headers
  var headers = ['Fecha', 'Para', 'Asunto', 'Campaña detectada', 'Thread ID'];
  auditSheet.appendRow(headers);
  auditSheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e')
    .setFontColor('#F5C842')
    .setFontWeight('bold');
  auditSheet.setFrozenRows(1);

  // Buscar los últimos 500 enviados (Gmail limite por búsqueda)
  var hilos = GmailApp.search('in:sent', 0, 500);
  Logger.log('Hilos encontrados: ' + hilos.length);

  var filas = [];

  hilos.forEach(function(hilo) {
    try {
      var mensajes = hilo.getMessages();
      mensajes.forEach(function(msg) {
        var fecha   = msg.getDate();
        var para    = msg.getTo();
        var asunto  = msg.getSubject();
        var threadId = hilo.getId();

        // Detectar campaña por asunto
        var campana = detectarCampana(asunto);

        filas.push([fecha, para, asunto, campana, threadId]);
      });
    } catch(e) {
      Logger.log('Error en hilo: ' + e.message);
    }
  });

  // Ordenar por fecha desc
  filas.sort(function(a, b) { return b[0] - a[0]; });

  if (filas.length > 0) {
    auditSheet.getRange(2, 1, filas.length, headers.length).setValues(filas);

    // Formato fecha
    auditSheet.getRange(2, 1, filas.length, 1)
      .setNumberFormat('dd/mm/yyyy HH:mm');

    // Colorear filas por campaña
    for (var i = 0; i < filas.length; i++) {
      var color = colorCampana(filas[i][3]);
      auditSheet.getRange(i + 2, 4).setBackground(color).setFontWeight('bold');
    }

    // Autofit columnas
    auditSheet.autoResizeColumns(1, headers.length);
  }

  // Resumen por campaña
  var resumen = contarCampanas(filas);
  var resumenRow = filas.length + 3;
  auditSheet.getRange(resumenRow, 1).setValue('RESUMEN POR CAMPAÑA')
    .setFontWeight('bold').setFontSize(12);
  resumenRow++;
  auditSheet.getRange(resumenRow, 1).setValue('Campaña');
  auditSheet.getRange(resumenRow, 2).setValue('Cantidad');
  auditSheet.getRange(resumenRow, 1, 1, 2).setBackground('#00B4B4').setFontColor('#fff').setFontWeight('bold');
  resumenRow++;

  Object.keys(resumen).sort().forEach(function(camp) {
    auditSheet.getRange(resumenRow, 1).setValue(camp);
    auditSheet.getRange(resumenRow, 2).setValue(resumen[camp]);
    resumenRow++;
  });

  ui.alert(
    'Auditoría completa',
    'Se encontraron ' + filas.length + ' emails enviados.\nRevisa la pestaña "Auditoria" para ver el detalle.\n\n' + resumenStr(resumen),
    ui.ButtonSet.OK
  );
}

// ── Detecta el tipo de campaña por el asunto ────────────────
function detectarCampana(asunto) {
  var a = (asunto || '').toLowerCase();

  if (a.indexOf('cumpleaños') >= 0 || a.indexOf('cumpleanos') >= 0 || a.indexOf('felices fiestas') >= 0)
    return 'Cumpleaños';
  if (a.indexOf('aniversario') >= 0)
    return 'Aniversario';
  if (a.indexOf('petmi2m') >= 0 || a.indexOf('premium gratis') >= 0 || a.indexOf('premium') >= 0)
    return 'Promo Premium';
  if (a.indexOf('mundial') >= 0 || a.indexOf('quiniela') >= 0 || a.indexOf('mundialista') >= 0)
    return 'Mundial / Quiniela';
  if (a.indexOf('ajusta') >= 0 || a.indexOf('fuera de lugar') >= 0 || a.indexOf('correccion') >= 0)
    return 'Corrección Quiniela';
  if (a.indexOf('novedades') >= 0 || a.indexOf('actualizacion') >= 0 || a.indexOf('actualización') >= 0)
    return 'Actualización App';
  if (a.indexOf('bienvenido') >= 0 || a.indexOf('petzid') >= 0)
    return 'Bienvenida PetzID';
  if (a.indexOf('se unió') >= 0 || a.indexOf('se unio') >= 0 || a.indexOf('familia') >= 0)
    return 'Nueva Mascota Familia';
  if (a.indexOf('solicitud') >= 0 || a.indexOf('quiere ser amigo') >= 0)
    return 'Solicitud Amistad';
  if (a.indexOf('aceptó') >= 0 || a.indexOf('acepto') >= 0)
    return 'Amistad Aceptada';
  if (a.indexOf('mensaje') >= 0)
    return 'Mensaje Privado';
  if (a.indexOf('interesado') >= 0)
    return 'Aviso / Interés';
  if (a.indexOf('invita') >= 0 || a.indexOf('evento') >= 0)
    return 'Invitación Evento';
  if (a.indexOf('información') >= 0 || a.indexOf('informacion') >= 0 || a.indexOf('perdid') >= 0)
    return 'Mascota Perdida';
  if (a.indexOf('apuntó') >= 0 || a.indexOf('apunto') >= 0)
    return 'Actividad / Plan';
  if (a.indexOf('código') >= 0 || a.indexOf('codigo') >= 0 || a.indexOf('acceso') >= 0)
    return 'OTP / Acceso';
  if (a.indexOf('[test]') >= 0 || a.indexOf('[prueba]') >= 0)
    return 'TEST (prueba)';

  return 'Otro';
}

// ── Color por campaña ───────────────────────────────────────
function colorCampana(camp) {
  var colores = {
    'Cumpleaños':           '#FFF8DC',
    'Aniversario':          '#FCE4EC',
    'Promo Premium':        '#FFF9C4',
    'Mundial / Quiniela':   '#E8F5E9',
    'Corrección Quiniela':  '#FFF3E0',
    'Actualización App':    '#E3F2FD',
    'Bienvenida PetzID':    '#E0F7FA',
    'Nueva Mascota Familia':'#F3E5F5',
    'Solicitud Amistad':    '#E8EAF6',
    'Amistad Aceptada':     '#E8F5E9',
    'Mensaje Privado':      '#FAFAFA',
    'Aviso / Interés':      '#FBE9E7',
    'Invitación Evento':    '#E0F7FA',
    'Mascota Perdida':      '#FFEBEE',
    'Actividad / Plan':     '#EDE7F6',
    'OTP / Acceso':         '#F1F8E9',
    'TEST (prueba)':        '#BDBDBD',
    'Otro':                 '#F5F5F5'
  };
  return colores[camp] || '#F5F5F5';
}

// ── Contar por campaña ──────────────────────────────────────
function contarCampanas(filas) {
  var res = {};
  filas.forEach(function(f) {
    var camp = f[3] || 'Otro';
    res[camp] = (res[camp] || 0) + 1;
  });
  return res;
}

function resumenStr(resumen) {
  return Object.keys(resumen).sort().map(function(k) {
    return k + ': ' + resumen[k];
  }).join('\n');
}

// ── Versión rápida: solo los últimos N enviados ─────────────
function auditarUltimos50() {
  var hilos    = GmailApp.search('in:sent', 0, 50);
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var sheet    = ss.getSheetByName('Auditoria') || ss.insertSheet('Auditoria');
  sheet.clearContents();

  var headers = ['Fecha', 'Para', 'Asunto', 'Campaña'];
  sheet.appendRow(headers);
  sheet.getRange(1,1,1,4).setBackground('#1a1a2e').setFontColor('#F5C842').setFontWeight('bold');

  var filas = [];
  hilos.forEach(function(hilo) {
    try {
      hilo.getMessages().forEach(function(msg) {
        filas.push([
          msg.getDate(),
          msg.getTo(),
          msg.getSubject(),
          detectarCampana(msg.getSubject())
        ]);
      });
    } catch(e) {}
  });

  filas.sort(function(a,b){ return b[0]-a[0]; });

  if (filas.length > 0) {
    sheet.getRange(2,1,filas.length,4).setValues(filas);
    sheet.getRange(2,1,filas.length,1).setNumberFormat('dd/mm/yyyy HH:mm');
    for (var i=0; i<filas.length; i++) {
      sheet.getRange(i+2,4).setBackground(colorCampana(filas[i][3]));
    }
    sheet.autoResizeColumns(1,4);
  }

  try {
    SpreadsheetApp.getUi().alert('Últimos ' + filas.length + ' emails cargados en pestaña Auditoria.');
  } catch(e) {}
}

// ── Buscar por campaña específica ───────────────────────────
function auditarPorCampana() {
  var ui   = SpreadsheetApp.getUi();
  var resp = ui.prompt(
    'Buscar campaña',
    'Escribe parte del asunto a buscar (ej: "cumpleaños", "premium", "mundial"):',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  var termino = resp.getResponseText().trim();
  if (!termino) return;

  var hilos = GmailApp.search('in:sent subject:' + termino, 0, 200);
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Auditoria') || ss.insertSheet('Auditoria');
  sheet.clearContents();

  var headers = ['Fecha', 'Para', 'Asunto', 'Campaña'];
  sheet.appendRow(headers);
  sheet.getRange(1,1,1,4).setBackground('#00B4B4').setFontColor('#fff').setFontWeight('bold');

  var filas = [];
  hilos.forEach(function(hilo) {
    try {
      hilo.getMessages().forEach(function(msg) {
        filas.push([
          msg.getDate(),
          msg.getTo(),
          msg.getSubject(),
          detectarCampana(msg.getSubject())
        ]);
      });
    } catch(e) {}
  });

  filas.sort(function(a,b){ return b[0]-a[0]; });

  if (filas.length > 0) {
    sheet.getRange(2,1,filas.length,4).setValues(filas);
    sheet.getRange(2,1,filas.length,1).setNumberFormat('dd/mm/yyyy HH:mm');
    for (var i=0; i<filas.length; i++) {
      sheet.getRange(i+2,4).setBackground(colorCampana(filas[i][3]));
    }
    sheet.autoResizeColumns(1,4);
  }

  ui.alert(
    'Búsqueda: "' + termino + '"',
    'Encontrados: ' + filas.length + ' emails.\nRevisa la pestaña Auditoria.',
    ui.ButtonSet.OK
  );
}

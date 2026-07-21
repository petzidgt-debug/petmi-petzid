// ══════════════════════════════════════════════════════════════
// EmailCumpleaneros.gs  —  Módulo independiente PetMi
// ──────────────────────────────────────────────────────────────
// Agregar como NUEVO ARCHIVO en Apps Script:
//   Editor → Archivo → Nuevo → Script → Nombre: "EmailCumpleaneros"
//
// NO modifica Code.gs.
// Usa las constantes globales: SHEET_ID, SHEET_NAME, REMITENTE
//
// CONFIGURAR:
//   EC_LANDING_URL  → URL de la oferta del patrocinador del mes
//   EC_MARCA_NOMBRE → Nombre de la marca patrocinadora
//   EC_MARCA_OFERTA → Texto de la oferta (ej. "20% de descuento")
//   EC_MARCA_CODIGO → Código de descuento (opcional)
// ══════════════════════════════════════════════════════════════

// ── CONFIGURACIÓN DEL MES ─────────────────────────────────────
// EDITAR ESTOS VALORES CADA MES SEGÚN EL PATROCINADOR

var EC_LANDING_URL  = 'https://app.revistapetmi.com/ofertas';  // ← URL del patrocinador
var EC_MARCA_NOMBRE = 'PetMi';                                  // ← Nombre de la marca
var EC_MARCA_OFERTA = '10% de descuento en tu próxima compra'; // ← Texto de la oferta
var EC_MARCA_CODIGO = '';                                        // ← Código (vacío si no hay)

// ── CONTROL DE ENVÍOS ─────────────────────────────────────────
var EC_KEY_MENSUAL  = 'cumple_enviados_';  // + 'YYYY-MM' → evita reenvíos en el mismo mes

// ══════════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ══════════════════════════════════════════════════════════════

// TEST — Envía preview a elsamoralesg@gmail.com con datos de prueba
function ec_test() {
  var html = ec_buildEmail('Prueba', 'Luna', 'nacimiento', 'Gato', '5', 'Sofía');
  GmailApp.sendEmail(
    'elsamoralesg@gmail.com',
    '🎂 TEST — ¡Este mes Luna está de fiesta!',
    'Este mes Luna cumple años. Hay una sorpresa esperándola.',
    { name: REMITENTE || 'PetMi', htmlBody: html, charset: 'UTF-8' }
  );
  Logger.log('✅ Email de prueba enviado a elsamoralesg@gmail.com');
}

// ENVÍO MASIVO — Cumpleaños del mes actual
function ec_enviarMes() {
  var props    = PropertiesService.getScriptProperties();
  var mesActual = _ec_getMesKey(); // 'YYYY-MM'
  var KEY      = EC_KEY_MENSUAL + mesActual;
  var ya       = JSON.parse(props.getProperty(KEY) || '[]');

  var sheet    = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var lastRow  = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('Sheet vacío'); return; }

  var rows     = sheet.getRange(2, 1, lastRow - 1, 31).getValues();
  var hoyMes   = new Date().getMonth() + 1; // 1-12
  var enviados = 0, saltados = 0, sinFecha = 0, errores = 0;
  var vistos   = {}; // evitar duplicados por email

  rows.forEach(function(row) {
    var email     = String(row[11] || '').trim().toLowerCase();
    var nombre    = String(row[2]  || '').trim();
    var dueno     = String(row[10] || '').trim() || 'Amigo PetMi';
    var tipoFecha = String(row[7]  || 'nacimiento').trim();
    var fecha     = String(row[8]  || '').trim();
    var especie   = String(row[4]  || '').trim();
    var angelito  = String(row[20] || '').trim().toLowerCase(); // col U = angelito
    var ofertas   = row[18]; // col S = ofertas (boolean o 'Si'/'No')

    // Validaciones básicas
    if (!email || email.indexOf('@') < 0) { sinFecha++; return; }
    if (!nombre || !fecha)                { sinFecha++; return; }
    if (angelito === 'true' || angelito === 'si') { saltados++; return; } // mascota fallecida
    if (vistos[email])                    { saltados++; return; }
    vistos[email] = true;
    if (ya.indexOf(email) >= 0)           { saltados++; return; } // ya enviado este mes

    // Filtrar por mes de la fecha
    var mes = _ec_extraerMes(fecha);
    if (!mes || mes !== hoyMes) return;

    // Verificar que acepta correos (campo ofertas es boolean o texto)
    // Nota: emails de SERVICIO como cumpleaños pueden ir a todos,
    // pero si quieres restringir, descomenta la siguiente línea:
    // if (ofertas === false || String(ofertas).toLowerCase() === 'no') { saltados++; return; }

    try {
      Utilities.sleep(350);
      var edad = _ec_calcularEdad(fecha);
      var asunto = tipoFecha === 'llegada'
        ? '🏠 ' + nombre + ' cumple ' + (edad || 'un') + ' año(s) contigo'
        : '🎂 ¡Este mes ' + nombre + ' está de fiesta!';
      var html = ec_buildEmail(nombre, nombre, tipoFecha, especie, edad, dueno);
      GmailApp.sendEmail(email, asunto,
        'Este mes ' + nombre + ' tiene una celebración especial en PetMi. Entra a ver la sorpresa.',
        { name: REMITENTE || 'PetMi', htmlBody: html, charset: 'UTF-8' });
      ya.push(email);
      enviados++;
      if (enviados % 20 === 0) props.setProperty(KEY, JSON.stringify(ya));
    } catch(e) {
      var msg = e.message || '';
      if (msg.indexOf('too many') >= 0 || msg.indexOf('Service invoked') >= 0) {
        props.setProperty(KEY, JSON.stringify(ya));
        Logger.log('⚠️ Límite de Gmail. Enviados hoy: ' + enviados + '. Corre de nuevo mañana.');
        return;
      }
      errores++;
      Logger.log('Error ' + email + ': ' + msg);
    }
  });

  props.setProperty(KEY, JSON.stringify(ya));
  Logger.log('Cumpleañeros ' + mesActual
    + ' — Enviados: ' + enviados
    + ' | Saltados: ' + saltados
    + ' | Sin fecha: ' + sinFecha
    + ' | Errores: '  + errores);
}

// VER CUÁNTOS CUMPLEAÑEROS HAY ESTE MES (sin enviar)
function ec_preview() {
  var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('Sheet vacío'); return; }
  var rows    = sheet.getRange(2, 1, lastRow - 1, 31).getValues();
  var hoyMes  = new Date().getMonth() + 1;
  var nacimiento = [], llegada = [];
  var vistos = {};

  rows.forEach(function(row) {
    var email     = String(row[11] || '').trim().toLowerCase();
    var nombre    = String(row[2]  || '').trim();
    var dueno     = String(row[10] || '').trim();
    var tipoFecha = String(row[7]  || 'nacimiento').trim();
    var fecha     = String(row[8]  || '').trim();
    var angelito  = String(row[20] || '').trim().toLowerCase();
    if (!email || !nombre || !fecha || angelito === 'true' || angelito === 'si') return;
    if (vistos[email]) return;
    vistos[email] = true;
    var mes = _ec_extraerMes(fecha);
    if (!mes || mes !== hoyMes) return;
    var edad = _ec_calcularEdad(fecha);
    var info = nombre + ' (' + dueno + ') — ' + edad + ' años — ' + email;
    if (tipoFecha === 'llegada') llegada.push(info);
    else nacimiento.push(info);
  });

  Logger.log('=== CUMPLEAÑEROS MES ' + hoyMes + ' ===');
  Logger.log('NACIMIENTO (' + nacimiento.length + '):');
  nacimiento.forEach(function(x){ Logger.log('  ' + x); });
  Logger.log('LLEGADA A CASA (' + llegada.length + '):');
  llegada.forEach(function(x){ Logger.log('  ' + x); });
  Logger.log('TOTAL: ' + (nacimiento.length + llegada.length));
}

// RESETEAR lista del mes actual (para reenviar)
function ec_resetearMes() {
  var KEY = EC_KEY_MENSUAL + _ec_getMesKey();
  PropertiesService.getScriptProperties().deleteProperty(KEY);
  Logger.log('✅ Lista de ' + _ec_getMesKey() + ' reseteada.');
}

// VER PROGRESO del mes actual
function ec_verProgreso() {
  var KEY = EC_KEY_MENSUAL + _ec_getMesKey();
  var ya  = JSON.parse(PropertiesService.getScriptProperties().getProperty(KEY) || '[]');
  Logger.log('Cumpleañeros enviados en ' + _ec_getMesKey() + ': ' + ya.length);
}

// TRIGGER MENSUAL — instalar para que corra automáticamente el día 1 de cada mes
function ec_instalarTrigger() {
  // Eliminar triggers anteriores de esta función
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'ec_enviarMes') ScriptApp.deleteTrigger(t);
  });
  // Nuevo trigger: día 1 de cada mes a las 9am
  ScriptApp.newTrigger('ec_enviarMes')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
  Logger.log('✅ Trigger mensual instalado: ec_enviarMes cada día 1 a las 9am.');
}

// ══════════════════════════════════════════════════════════════
// HTML DEL EMAIL
// ══════════════════════════════════════════════════════════════
function ec_buildEmail(nombre, nombreMascota, tipoFecha, especie, edad, dueno) {
  var logo     = 'https://app.revistapetmi.com/logopetmi.png';
  var url      = EC_LANDING_URL;
  var marca    = EC_MARCA_NOMBRE;
  var oferta   = EC_MARCA_OFERTA;
  var codigo   = EC_MARCA_CODIGO;
  var esLlegada = tipoFecha === 'llegada';
  var emoji    = esLlegada ? '&#x1F3E0;' : '&#x1F382;';
  var titulo   = esLlegada
    ? 'Un a\u00f1o m\u00e1s que ' + nombreMascota + ' eligi\u00f3 tu hogar'
    : '\u00a1Este mes ' + nombreMascota + ' est\u00e1 de fiesta!';
  var subtitulo = esLlegada
    ? 'Hoy es el aniversario de llegada de ' + nombreMascota + ' a casa.'
    : 'Este mes ' + nombreMascota + ' cumple ' + (edad ? edad + ' a\u00f1o(s)' : 'un a\u00f1o m\u00e1s') + '.';
  var edadTexto = edad ? 'Ya tiene <strong>' + edad + ' a\u00f1o(s)</strong>.' : '';

  var html = '<div style="max-width:520px;margin:0 auto;font-family:Arial,sans-serif;border-radius:14px;overflow:hidden;border:1px solid #ddd">'

  // Header teal con logo
  + '<div style="background:#00B4B4;padding:22px 24px 18px;text-align:center">'
  +   '<img src="' + logo + '" alt="PetMi" style="height:44px;display:block;margin:0 auto 10px">'
  +   '<div style="display:inline-block;background:rgba(255,255,255,.25);border-radius:99px;padding:4px 16px">'
  +     '<span style="color:#fff;font-size:12px;font-weight:700">' + emoji + ' PetMi Celebra</span>'
  +   '</div>'
  + '</div>'

  // Saludo
  + '<div style="background:#fff;padding:22px 24px 0">'
  +   '<p style="color:#1a1a2e;font-size:16px;font-weight:700;margin:0 0 6px">'
  +     'Hola ' + dueno + ' &#x1F43E;</p>'
  +   '<p style="color:#555;font-size:13px;line-height:1.7;margin:0 0 16px">'
  +     subtitulo + ' ' + edadTexto + ' '
  +     'Para nosotros en PetMi, ese es un motivo de celebraci\u00f3n.'
  +   '</p>'
  + '</div>'

  // Emoji grande
  + '<div style="background:#fff;text-align:center;padding:4px 24px 16px;font-size:64px">'
  +   emoji + ' &#x1F43E;'
  + '</div>'

  // Mensaje especial
  + '<div style="background:#fff;padding:0 24px 18px">'
  +   '<div style="background:#E0F7F7;border-radius:14px;padding:18px 20px;text-align:center;border:1.5px solid #b2ece5">'
  +     '<div style="color:#1a1a2e;font-size:15px;font-weight:700;margin-bottom:8px">' + titulo + '</div>'
  +     '<div style="color:#555;font-size:13px;line-height:1.7">'
  +       'Desde PetMi queremos que ' + nombreMascota + ' tenga un mes especial. '
  +       'Y tenemos algo para celebrarlo junto a ti.'
  +     '</div>'
  +   '</div>'
  + '</div>'

  // Oferta patrocinadora (solo si hay URL/marca configurada)
  + (url !== 'https://app.revistapetmi.com/ofertas' || marca !== 'PetMi'
    ? '<div style="background:#FFF8E0;padding:0 24px 18px;border-top:1px solid #f5edc0">'
    +   '<div style="background:#fff;border:2px solid #F5C842;border-radius:14px;padding:16px 20px;text-align:center">'
    +     '<div style="color:#856404;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">'
    +       '&#x1F381; Regalo especial de ' + marca + '</div>'
    +     '<div style="color:#1a1a2e;font-size:15px;font-weight:700;margin-bottom:6px">' + oferta + '</div>'
    +     (codigo ? '<div style="background:#1a1a2e;color:#F5C842;font-family:monospace;font-size:16px;font-weight:700;padding:8px 16px;border-radius:8px;display:inline-block;margin-bottom:10px;letter-spacing:2px">' + codigo + '</div>' : '')
    +   '</div>'
    +   '<div style="text-align:center;margin-top:14px">'
    +     '<a href="' + url + '" style="background:#F5C842;color:#1a1a2e;text-decoration:none;padding:13px 36px;border-radius:99px;font-weight:900;font-size:14px;display:inline-block">'
    +       '&#x1F381; Ver la oferta de ' + nombreMascota + ' &#x2192;</a>'
    +   '</div>'
    + '</div>'
    : '<div style="padding:0 24px 20px;text-align:center">'
    +   '<a href="https://app.revistapetmi.com/galeria.html" style="background:#F5C842;color:#1a1a2e;text-decoration:none;padding:13px 36px;border-radius:99px;font-weight:900;font-size:14px;display:inline-block">'
    +     '&#x1F43E; Ver la comunidad PetMi &#x2192;</a>'
    + '</div>')

  // Footer
  + '<div style="background:#E0F7F7;padding:14px 24px;text-align:center;border-top:1px solid #b2ece5">'
  +   '<img src="' + logo + '" alt="PetMi" style="height:26px;display:block;margin:0 auto 6px">'
  +   '<div style="font-size:10px;color:#006060">Guatemala \u00b7 app.revistapetmi.com</div>'
  +   '<div style="font-size:10px;color:#888;margin-top:2px">'
  +     'Recibes esto porque tu mascota est\u00e1 registrada en PetMi &#x1F43E;</div>'
  + '</div>'

  + '</div>';

  return html;
}

// ══════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ══════════════════════════════════════════════════════════════
function _ec_getMesKey() {
  var hoy = new Date();
  var mm  = ('0' + (hoy.getMonth() + 1)).slice(-2);
  return hoy.getFullYear() + '-' + mm;
}

function _ec_extraerMes(fechaStr) {
  if (!fechaStr) return null;
  var p = fechaStr.split('/');
  if (p.length === 3) return parseInt(p[1]); // DD/MM/YYYY
  var d = new Date(fechaStr);
  return isNaN(d) ? null : d.getMonth() + 1;
}

function _ec_calcularEdad(fechaStr) {
  if (!fechaStr) return null;
  var p = fechaStr.split('/');
  var nacimiento;
  if (p.length === 3) nacimiento = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
  else nacimiento = new Date(fechaStr);
  if (isNaN(nacimiento)) return null;
  var hoy  = new Date();
  var edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (hoy.getMonth() < nacimiento.getMonth() ||
     (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad > 0 ? edad : null;
}

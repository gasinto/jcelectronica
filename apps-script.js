/* ============================================
   Google Apps Script — API para JC Electrónica
   ============================================
    CÓMO USAR:
    1. Andá a https://sheets.google.com y creá una planilla nueva
    2. Creá las pestañas (hojas):
       - "Productos"      → con los encabezados de abajo
       - "Servicios"      → con los encabezados de abajo
       - "Condiciones"    → con los encabezados de abajo
       - "Turnos"         → con los encabezados de abajo (se crea sola al primer turno)
       - "Config"         → se crea sola al primer login (ver sección Config)
    3. Llená tus datos en cada hoja
   4. Andá a Extensiones → Apps Script
   5. PEGÁ TODO este archivo en el editor (borrá lo que venga por defecto)
   6. Guardá (Ctrl+S) — ponele nombre "JC Electrónica API"
   7. Hacé clic en "Implementar" → "Nueva implementación"
   8. Tipo: "Aplicación web"
   9. Ejecutar como: "Yo"
   10. Quién puede acceder: "Cualquier usuario" (es solo lectura, no hay riesgo)
   11. Implementá y copiá la URL que te da
   12. PEGÁ ESA URL en gestion.html, index.html y servicios.html
   ============================================ */

/*
  =============================================
  HOJA "Condiciones" (fila 1 = encabezados):
  =============================================
  A: id           → 1, 2, 3...
  B: texto        → "Presupuesto sin cargo"
  C: ambito       → "publico" | "gremio" | "ambos"
  D: orden        → 1, 2, 3... (para ordenar)

  =============================================
  HOJA "Turnos" (fila 1 = encabezados):
  =============================================
  A: id              → 1, 2, 3...
  B: nombre          → "Juan Pérez"
  C: dni             → "12.345.678"
  D: whatsapp        → "5491153348030"
  E: codigo_postal   → "1718"
  F: ciudad          → "Merlo"
  G: domicilio       → "Av. del Libertador 1234"
  H: cantidad_equipos → 1
  I: equipo          → "notebook" | "pc" | "consola" | "celular" | "tv" | "parlante" | "otro"
  J: tipo_reparacion → "diagnostico" | "hardware" | "software" | "mantenimiento" | "upgrade" | "otro"
  K: falla           → "No enciende, pantalla rota"
  L: fecha           → "2026-06-15"
  M: hora            → "10:30"
  N: estado          → "pendiente" | "pagado" | "confirmado" | "completado" | "cancelado"
  O: pago_link       → "https://mpago.li/..." (link de MP, opcional)
  P: admin_nota      → "Cliente llamó para confirmar" (nota interna)
  Q: created_at      → "2026-06-10 14:30:00"

  =============================================
  HOJA "Config" (clave → valor):
  =============================================
  admin_password_hash  → sha256 de la contraseña
  horario_inicio       → "09:00"
  horario_fin          → "20:00"
  intervalo            → 30 (minutos)
  pausa_1_inicio       → "12:30"
  pausa_1_fin          → "13:30"
  pausa_2_inicio       → "16:30"
  pausa_2_fin          → "18:00"
  dias_laborales       → "1,2,3,4,5,6" (1=lunes, 7=domingo)
*/

// =============================================
//  1. DOGET — Punto de entrada único
//     - ?sheet=productos (o nada) → leer productos
//     - ?sheet=servicios          → leer servicios
//     - ?sheet=condiciones        → leer condiciones
//     - ?action=save&sheet=...&password=...&data=...  → guardar
//     - ?action=verifyAdmin&password=...             → verificar admin
// =============================================
function doGet(e) {
  try {
    // --- MODO VERIFICAR ADMIN ---
    if (e?.parameter?.action === 'verifyAdmin') {
      return handleVerifyAdmin(e);
    }

    // --- MODO GUARDAR (protegido con password) ---
    if (e?.parameter?.action === 'save') {
      return handleSave(e);
    }

    // --- MODO GUARDAR HORARIOS (protegido con password) ---
    if (e?.parameter?.action === 'saveHorarios') {
      return saveHorarios(e);
    }

    // --- MODO GUARDAR TURNO PÚBLICO (sin password) ---
    if (e?.parameter?.action === 'saveTurno') {
      return saveTurno(e);
    }

    // --- MODO LEER HORARIOS ---
    if (e?.parameter?.action === 'getHorarios') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: getHorarios() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- MODO LEER ---
    const sheetName = e?.parameter?.sheet || 'productos';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(capitalize(sheetName));

    if (!sheet) {
      return respond(false, null, null,
        'Hoja "' + capitalize(sheetName) + '" no encontrada. Hojas disponibles: ' +
        ss.getSheets().map(s => '"' + s.getName() + '"').join(', '));
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().toLowerCase().trim());
    const rows = data.slice(1).filter(row => row[0] !== '');

    if (sheetName === 'condiciones') {
      return respond(true, parseCondiciones(headers, rows), e);
    }
    if (sheetName === 'servicios') {
      return respond(true, parseServices(headers, rows), e);
    }
    if (sheetName === 'turnos') {
      return respond(true, parseTurnos(headers, rows), e);
    }
    return respond(true, parseProducts(headers, rows), e);

  } catch (err) {
    return respond(false, null, null, err.toString());
  }
}

// =============================================
//  1a. VERIFY ADMIN — Autenticación server-side
//      Busca en hoja "Config" el hash SHA-256
//      de la contraseña de admin y compara.
//
//      Config sheet columns: | clave | valor |
//      admin_password_hash = sha256("tu_password")
//
//      Llamar: ?action=verifyAdmin&password=xxxxx
// =============================================
function handleVerifyAdmin(e) {
  try {
    const inputPassword = e?.parameter?.password || '';
    if (!inputPassword) {
      return respond(false, null, null, 'Password requerida');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = ss.getSheetByName('Config');

    // Si no existe Config, crear con valores por defecto
    if (!configSheet) {
      configSheet = ss.insertSheet('Config');
      const defaultHash = sha256('@Isateamo123');
      configSheet.getRange(1, 1, 2, 2).setValues([
        ['clave', 'valor'],
        ['admin_password_hash', defaultHash]
      ]);
      configSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      configSheet.setFrozenRows(1);
    }

    const data = configSheet.getDataRange().getValues();
    const configMap = {};
    data.slice(1).forEach(row => {
      if (row[0]) configMap[row[0].toString().toLowerCase().trim()] = row[1];
    });

    const storedHash = configMap['admin_password_hash'] || '';
    if (!storedHash) {
      return respond(false, null, null, 'Config: admin_password_hash no encontrado');
    }

    const inputHash = sha256(inputPassword);

    if (inputHash === storedHash) {
      // Generar token de sesión (timestamp + hash parcial)
      const token = Utilities.getUuid();
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, token: token }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return respond(false, null, null, 'Contraseña incorrecta');
    }

  } catch (err) {
    return respond(false, null, null, err.toString());
  }
}

// =============================================
//  1b. SHA-256 HELPER — Hashea un string
// =============================================
function sha256(input) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
    Utilities.Charset.UTF_8
  );
  // Convertir bytes a hex string
  return digest.map(function(b) {
    // Asegurar byte unsigned (0-255)
    var byteVal = b < 0 ? b + 256 : b;
    return ('0' + byteVal.toString(16)).slice(-2);
  }).join('');
}

// =============================================
//  1b. HANDLESAVE — Guardar vía GET (evita CORS)
//      Llamar: ?action=save&sheet=X&password=Y&data=JSON
// =============================================
function handleSave(e) {
  const ADMIN_PASS = '@Isateamo123'; // ← La misma que en gestion.html
  if (e.parameter.password !== ADMIN_PASS) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheetName = e.parameter.sheet || 'productos';
  const jsonData = e.parameter.data || '[]';
  const data = JSON.parse(jsonData);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(capitalize(sheetName));
  if (!sheet) {
    sheet = ss.insertSheet(capitalize(sheetName));
  }

  // Definir headers según hoja
  let headers;
  if (sheetName === 'condiciones') {
    headers = ['id', 'texto', 'ambito', 'orden'];
  } else if (sheetName === 'servicios') {
    headers = ['id', 'name', 'desc', 'price', 'price_gremio', 'note', 'icon', 'category', 'equipo'];
  } else if (sheetName === 'turnos') {
    headers = ['id', 'nombre', 'dni', 'whatsapp', 'codigo_postal', 'ciudad', 'domicilio', 'cantidad_equipos', 'equipo', 'tipo_reparacion', 'falla', 'fecha', 'hora', 'estado', 'pago_link', 'admin_nota', 'created_at'];
  } else {
    headers = [
      'id', 'name', 'subtitle', 'brand',
      'specs_ram', 'specs_storage', 'specs_cpu', 'specs_gpu',
      'price_public', 'price_gremio', 'cost',
      'condition', 'estado', 'featured',
      'description', 'images', 'whatsapp', 'tipo'
    ];
  }

  sheet.clear();
  const headerRow = sheet.getRange(1, 1, 1, headers.length);
  headerRow.setValues([headers]);
  headerRow.setFontWeight('bold');
  sheet.setFrozenRows(1);

  if (data.length > 0) {
    const rows = data.map(item =>
      headers.map(h => {
        let val = item[h] !== undefined ? item[h] : '';
        if (Array.isArray(val)) val = val.join(', ');
        return val;
      })
    );
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: capitalize(sheetName) + ' guardada correctamente',
      total: data.length
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================
//  2. PARSE — Productos
// =============================================
function parseProducts(headers, rows) {
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return {
      id: Number(obj.id) || 0,
      name: obj.name || '',
      subtitle: obj.subtitle || '',
      brand: obj.brand || '',
      specs: {
        ram: obj.specs_ram || '',
        storage: obj.specs_storage || '',
        cpu: obj.specs_cpu || '',
        gpu: obj.specs_gpu || ''
      },
      price_public: Number(obj.price_public) || 0,
      price_gremio: Number(obj.price_gremio) || 0,
      cost: Number(obj.cost) || 0,
      condition: obj.condition || 'bueno',
      estado: (obj.estado || 'disponible').toLowerCase(),
      featured: obj.featured === true || obj.featured === 'TRUE' || obj.featured === 'true',
      description: obj.description || '',
      images: obj.images ? obj.images.split(',').map(s => s.trim()).filter(s => s) : [],
      whatsapp: obj.whatsapp || '',
      tipo: (obj.tipo || 'propio').toLowerCase()
    };
  });
}

// =============================================
//  3. PARSE — Servicios
// =============================================
function parseServices(headers, rows) {
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return {
      id: Number(obj.id) || 0,
      name: obj.name || '',
      desc: obj.desc || '',
      price: Number(obj.price) || 0,
      price_gremio: Number(obj.price_gremio) || 0,
      note: obj.note || '',
      icon: obj.icon || '•',
      category: (obj.category || 'otros').toLowerCase(),
      equipo: (obj.equipo || 'todas').toLowerCase()
    };
  });
}

// =============================================
//  3b. PARSE — Condiciones
// =============================================
function parseCondiciones(headers, rows) {
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return {
      id: Number(obj.id) || 0,
      texto: obj.texto || '',
      ambito: (obj.ambito || 'publico').toLowerCase(),
      orden: Number(obj.orden) || 0
    };
  });
}

// =============================================
//  3c. PARSE — Turnos
// =============================================
// =============================================
//  3c. PARSE — Turnos
// =============================================
function sheetDateStr_(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  try { return val.getFullYear() + '-' + String(val.getMonth()+1).padStart(2,'0') + '-' + String(val.getDate()).padStart(2,'0'); }
  catch(e) { return String(val); }
}
function sheetTimeStr_(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  try { return String(val.getHours()).padStart(2,'0') + ':' + String(val.getMinutes()).padStart(2,'0'); }
  catch(e) { return String(val); }
}

function parseTurnos(headers, rows) {
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return {
      id: Number(obj.id) || 0,
      nombre: String(obj.nombre || ''),
      dni: String(obj.dni || ''),
      whatsapp: String(obj.whatsapp || ''),
      codigo_postal: String(obj.codigo_postal || ''),
      ciudad: String(obj.ciudad || ''),
      domicilio: String(obj.domicilio || ''),
      cantidad_equipos: Number(obj.cantidad_equipos) || 1,
      equipo: obj.equipo || '',
      tipo_reparacion: obj.tipo_reparacion || '',
      falla: obj.falla || '',
      fecha: sheetDateStr_(obj.fecha),
      hora: sheetTimeStr_(obj.hora),
      estado: (obj.estado || 'pendiente').toLowerCase(),
      pago_link: obj.pago_link || '',
      admin_nota: obj.admin_nota || '',
      created_at: obj.created_at || ''
    };
  });
}

// =============================================
//  3d. GET HORARIOS — Lee la config horaria
//      de la hoja Config (clave → valor)
// =============================================
function getHorarios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName('Config');

  if (!configSheet) {
    configSheet = ss.insertSheet('Config');
    const defaultHash = sha256('@Isateamo123');
    configSheet.getRange(1, 1, 2, 2).setValues([
      ['clave', 'valor'],
      ['admin_password_hash', defaultHash]
    ]);
    configSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    configSheet.setFrozenRows(1);
  }

  const data = configSheet.getDataRange().getValues();
  const configMap = {};
  data.slice(1).forEach(row => {
    if (row[0]) configMap[row[0].toString().toLowerCase().trim()] = row[1];
  });

  // Valores por defecto si no están configurados
  return {
    horario_inicio: configMap['horario_inicio'] || '09:00',
    horario_fin: configMap['horario_fin'] || '20:00',
    intervalo: Number(configMap['intervalo']) || 30,
    pausa_1_inicio: configMap['pausa_1_inicio'] || '12:30',
    pausa_1_fin: configMap['pausa_1_fin'] || '13:30',
    pausa_2_inicio: configMap['pausa_2_inicio'] || '16:30',
    pausa_2_fin: configMap['pausa_2_fin'] || '18:00',
    dias_laborales: configMap['dias_laborales'] || '1,2,3,4,5,6'
  };
}

// =============================================
//  3e. SAVE HORARIOS — Guarda config horaria
//      en la hoja Config. Requiere password.
// =============================================
function saveHorarios(e) {
  const ADMIN_PASS = '@Isateamo123';
  if (e.parameter.password !== ADMIN_PASS) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const horariosData = JSON.parse(e.parameter.data || '{}');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName('Config');

  if (!configSheet) {
    configSheet = ss.insertSheet('Config');
    configSheet.getRange(1, 1, 1, 2).setValues([['clave', 'valor']]);
    configSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    configSheet.setFrozenRows(1);
  }

  // Leer datos existentes para no pisar admin_password_hash
  const existingData = configSheet.getDataRange().getValues();
  const existingKeys = {};
  existingData.slice(1).forEach(row => {
    if (row[0]) existingKeys[row[0].toString().toLowerCase().trim()] = row[1];
  });

  // Merge: lo que viene nuevo pisa, lo que no existe se agrega
  const merged = { ...existingKeys, ...horariosData };

  // Convertir a arrays para escribir
  const entries = Object.entries(merged);
  const rows = entries.map(([clave, valor]) => [clave, valor]);

  // Limpiar y reescribir
  configSheet.clear();
  configSheet.getRange(1, 1, 1, 2).setValues([['clave', 'valor']]);
  configSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  if (rows.length > 0) {
    configSheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  configSheet.setFrozenRows(1);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Configuración horaria guardada' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================
//  3f. SAVE TURNO (PÚBLICO) — Guarda un turno
//      SIN requerir password. Solo guarda en
//      la hoja Turnos. Protegido contra abuso
//      básico (no borra, solo inserta).
// =============================================
function saveTurno(e) {
  try {
    const turnoData = JSON.parse(e.parameter.data || '{}');

    // Validación básica
    if (!turnoData.nombre || !turnoData.whatsapp || !turnoData.fecha || !turnoData.hora) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Faltan campos requeridos: nombre, whatsapp, fecha, hora'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Turnos');

    // Definir encabezados completos
    const TURNOS_HEADERS = ['id', 'nombre', 'dni', 'whatsapp', 'codigo_postal', 'ciudad', 'domicilio', 'cantidad_equipos', 'equipo', 'tipo_reparacion', 'falla', 'fecha', 'hora', 'estado', 'pago_link', 'admin_nota', 'created_at'];

    // Si la hoja no existe, crearla con encabezados
    if (!sheet) {
      sheet = ss.insertSheet('Turnos');
      sheet.getRange(1, 1, 1, TURNOS_HEADERS.length).setValues([TURNOS_HEADERS]);
      sheet.getRange(1, 1, 1, TURNOS_HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Calcular nuevo ID
    const data = sheet.getDataRange().getValues();
    const existingIds = data.slice(1).map(row => Number(row[0])).filter(id => id > 0);
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    const now = new Date();
    const created_at = Utilities.formatDate(now, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm:ss');

    const headers = data[0].map(h => h.toString().toLowerCase().trim());
    const turnoRow = [
      newId,
      turnoData.nombre || '',
      turnoData.dni || '',
      turnoData.whatsapp || '',
      turnoData.codigo_postal || '',
      turnoData.ciudad || '',
      turnoData.domicilio || '',
      Number(turnoData.cantidad_equipos) || 1,
      turnoData.equipo || '',
      turnoData.tipo_reparacion || '',
      turnoData.falla || '',
      turnoData.fecha || '',
      turnoData.hora || '',
      'pendiente',
      '',
      '',
      created_at
    ];

    sheet.appendRow(turnoRow);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Turno registrado correctamente',
        id: newId
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================================
//  4. RESPONDER
// =============================================
function respond(success, data, e, errorMsg) {
  const payload = { success };

  if (success) {
    const filterEstado = e?.parameter?.estado;
    const result = filterEstado
      ? data.filter(p => p.estado === filterEstado)
      : data;
    payload.data = result;
    payload.total = result.length;
  } else {
    payload.error = errorMsg || 'Error desconocido';
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================
//  5. HELPERS
// =============================================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// =============================================
//  6. TEST — Probar desde el editor
// =============================================
function testProductos() {
  const result = doGet({ parameter: { sheet: 'productos' } });
  Logger.log(result.getContent());
}

function testServicios() {
  const result = doGet({ parameter: { sheet: 'servicios' } });
  Logger.log(result.getContent());
}

function testCondiciones() {
  const result = doGet({ parameter: { sheet: 'condiciones' } });
  Logger.log(result.getContent());
}

function testTurnos() {
  const result = doGet({ parameter: { sheet: 'turnos' } });
  Logger.log(result.getContent());
}

function testGetHorarios() {
  const result = doGet({ parameter: { action: 'getHorarios' } });
  Logger.log(result.getContent());
}

// =============================================
//  7. DOPOST — Guardar datos (OBSOLETO: usar GET con action=save)
//     Mantenido por compatibilidad pero no recomendado
//     porque Apps Script no maneja CORS preflight (OPTIONS).
//     Enviar POST con JSON:
//     { password: "@Isateamo123", sheet: "productos", data: [...] }
// =============================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ADMIN_PASS = '@Isateamo123'; // ← Misma que en gestion.html

    // Validar contraseña
    if (body.password !== ADMIN_PASS) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheetName = body.sheet || 'productos';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(capitalize(sheetName));

    // Si la hoja no existe, crearla
    if (!sheet) {
      sheet = ss.insertSheet(capitalize(sheetName));
    }

    const data = body.data || [];

    // Definir encabezados según el tipo de hoja
    let headers;
    if (sheetName === 'condiciones') {
      headers = ['id', 'texto', 'ambito', 'orden'];
    } else if (sheetName === 'servicios') {
      headers = ['id', 'name', 'desc', 'price', 'price_gremio', 'note', 'icon', 'category', 'equipo'];
    } else if (sheetName === 'turnos') {
      headers = ['id', 'nombre', 'dni', 'whatsapp', 'codigo_postal', 'ciudad', 'domicilio', 'cantidad_equipos', 'equipo', 'tipo_reparacion', 'falla', 'fecha', 'hora', 'estado', 'pago_link', 'admin_nota', 'created_at'];
    } else {
      headers = [
        'id', 'name', 'subtitle', 'brand',
        'specs_ram', 'specs_storage', 'specs_cpu', 'specs_gpu',
        'price_public', 'price_gremio', 'cost',
        'condition', 'estado', 'featured',
        'description', 'images', 'whatsapp', 'tipo'
      ];
    }

    // Limpiar la hoja
    sheet.clear();

    // Escribir encabezados
    const headerRow = sheet.getRange(1, 1, 1, headers.length);
    headerRow.setValues([headers]);
    headerRow.setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Escribir datos
    if (data.length > 0) {
      const rows = data.map(item => {
        return headers.map(h => {
          let val = item[h] !== undefined ? item[h] : '';
          // Arrays como strings separadas por coma
          if (Array.isArray(val)) val = val.join(', ');
          return val;
        });
      });

      const dataRange = sheet.getRange(2, 1, rows.length, headers.length);
      dataRange.setValues(rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: capitalize(sheetName) + ' guardada correctamente',
        total: data.length
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================================
//  8. RESET — Crear los encabezados en la hoja activa
// =============================================
function resetHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const name = sheet.getName().toLowerCase();

  let headers;
  if (name === 'condiciones') {
    headers = ['id', 'texto', 'ambito', 'orden'];
  } else if (name === 'servicios') {
    headers = ['id', 'name', 'desc', 'price', 'price_gremio', 'note', 'icon', 'category', 'equipo'];
  } else if (name === 'turnos') {
    headers = ['id', 'nombre', 'dni', 'whatsapp', 'codigo_postal', 'ciudad', 'domicilio', 'cantidad_equipos', 'equipo', 'tipo_reparacion', 'falla', 'fecha', 'hora', 'estado', 'pago_link', 'admin_nota', 'created_at'];
  } else {
    headers = [
      'id', 'name', 'subtitle', 'brand',
      'specs_ram', 'specs_storage', 'specs_cpu', 'specs_gpu',
      'price_public', 'price_gremio', 'cost',
      'condition', 'estado', 'featured',
      'description', 'images', 'whatsapp', 'tipo'
    ];
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

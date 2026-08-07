/**
 * JC Electrónica — Turnos (appointment booking).
 * Uses the JC Plataforma public API: GET /turnos/horarios?fecha=, GET /turnos/fee
 * and POST /turnos (con pago de revisión vía Mercado Pago cuando está disponible).
 */
(function () {
  'use strict';

  var API = (window.JC_CONFIG && window.JC_CONFIG.API_URL) || 'https://jc-plataforma-production.up.railway.app/api/public';

  var form = document.getElementById('turno-form');
  var fechaInput = document.getElementById('fecha');
  var horaInput = document.getElementById('hora');
  var slotsGrid = document.getElementById('slots-grid');
  var submitBtn = document.getElementById('btn-submit');
  var successState = document.getElementById('success-state');
  var errorState = document.getElementById('error-state');
  var errorMsg = document.getElementById('error-msg');
  var feeNotice = document.getElementById('fee-notice');
  var feeAmount = document.getElementById('fee-amount');
  var successMsg = document.getElementById('success-msg');
  var successWhatsapp = document.getElementById('success-whatsapp');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorState.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hideError() {
    errorState.classList.add('hidden');
  }

  function formatFee(monto) {
    var n = Number(monto);
    if (isNaN(n)) return null;
    return '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }

  // Carga el costo de revisión (pago vía Mercado Pago) al abrir la página.
  // Si el endpoint falla o el monto no es válido, el aviso queda oculto.
  (async function loadFee() {
    try {
      var res = await fetch(API + '/turnos/fee');
      var data = await res.json();
      if (data && data.ok && typeof data.fee === 'number' && data.fee > 0 && feeAmount) {
        feeAmount.textContent = formatFee(data.fee);
        if (feeNotice) feeNotice.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('[TURNOS] Revisión fee no disponible:', err);
    }
  })();

  // Min date = tomorrow
  (function () {
    var today = new Date();
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var iso = tomorrow.toISOString().split('T')[0];
    fechaInput.setAttribute('min', iso);
  })();

  // Load available slots when date changes
  fechaInput.addEventListener('change', async function () {
    var fecha = fechaInput.value;
    horaInput.value = '';
    if (!fecha) return;

    slotsGrid.innerHTML = '<p class="col-span-full text-sm text-gray-400 py-2">Cargando horarios...</p>';

    try {
      var res = await fetch(API + '/turnos/horarios?fecha=' + encodeURIComponent(fecha));
      var data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        slotsGrid.innerHTML = '<p class="col-span-full text-sm text-gray-400 py-2">No hay horarios disponibles para ese día. Probá con otra fecha.</p>';
        return;
      }

      var available = data.filter(function (s) { return s.disponible; });
      if (available.length === 0) {
        slotsGrid.innerHTML = '<p class="col-span-full text-sm text-gray-400 py-2">No quedan horarios libres para ese día.</p>';
        return;
      }

      slotsGrid.innerHTML = available.map(function (s) {
        return '<button type="button" class="slot-btn text-sm font-medium border border-gray-200 rounded-lg py-2 hover:border-indigo-400 hover:text-indigo-600 transition-colors touch-target" data-time="' + s.hora + '">' + s.hora + '</button>';
      }).join('');

      slotsGrid.querySelectorAll('.slot-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          slotsGrid.querySelectorAll('.slot-btn').forEach(function (b) {
            b.classList.remove('selected', 'bg-indigo-600', 'text-white', 'border-indigo-600');
          });
          btn.classList.add('selected', 'bg-indigo-600', 'text-white', 'border-indigo-600');
          horaInput.value = btn.getAttribute('data-time');
        });
      });
    } catch (err) {
      console.error('[TURNOS] Slots error:', err);
      slotsGrid.innerHTML = '<p class="col-span-full text-sm text-gray-400 py-2">Error al cargar horarios. Intentá de nuevo.</p>';
    }
  });

  // ─── Verificación de DNI: precarga datos del cliente si ya está registrado ──
  // El turno funciona como una precarga de la orden: si el DNI ya existe en
  // el taller, se completan los datos del cliente automáticamente.
  var dniInput = document.getElementById('dni');
  var dniMsg = document.getElementById('dni-msg');
  var dniTimer = null;

  dniInput.addEventListener('input', function () {
    clearTimeout(dniTimer);
    var dni = dniInput.value.replace(/[^0-9]/g, '');
    if (dni.length < 6) {
      if (dniMsg) dniMsg.textContent = '';
      return;
    }
    dniTimer = setTimeout(function () {
      fetch(API + '/turnos/buscar-cliente?dni=' + encodeURIComponent(dni))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok && d.encontrado && d.cliente) {
            var c = d.cliente;
            if (document.getElementById('nombre') && !document.getElementById('nombre').value) {
              document.getElementById('nombre').value = c.nombre || '';
            }
            if (document.getElementById('apellido') && !document.getElementById('apellido').value) {
              document.getElementById('apellido').value = c.apellido || '';
            }
            if (document.getElementById('whatsapp') && !document.getElementById('whatsapp').value) {
              document.getElementById('whatsapp').value = c.telefono || '';
            }
            if (document.getElementById('email') && !document.getElementById('email').value) {
              document.getElementById('email').value = c.email || '';
            }
            if (document.getElementById('direccion') && !document.getElementById('direccion').value) {
              document.getElementById('direccion').value = c.direccion || '';
            }
            if (dniMsg) {
              dniMsg.textContent = '✅ Cliente registrado: completamos tus datos.';
              dniMsg.className = 'text-xs mt-1 text-green-600';
            }
          } else {
            if (dniMsg) {
              dniMsg.textContent = '';
              dniMsg.className = 'text-xs mt-1';
            }
          }
        })
        .catch(function () {});
    }, 500);
  });

  // Submit
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    if (!horaInput.value) {
      showError('Seleccioná un horario disponible.');
      return;
    }

    var acepta = document.getElementById('acepta-terminos');
    if (!acepta || !acepta.checked) {
      showError('Debés aceptar los términos y condiciones para solicitar el turno.');
      acepta.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    var equipo = document.getElementById('equipo').value;
    var payload = {
      dni: document.getElementById('dni').value.replace(/[^0-9]/g, ''),
      telefono: document.getElementById('whatsapp').value.replace(/[^0-9]/g, ''),
      email: document.getElementById('email').value.trim(),
      servicio: equipo, // API expects servicio; we send the equipo type
      fecha: fechaInput.value,
      hora: horaInput.value,
      ciudad: '',
      domicilio: document.getElementById('direccion').value.trim(),
      cantidad_equipos: parseInt(document.getElementById('cantidad_equipos').value, 10) || 1,
      tipo_reparacion: document.getElementById('tipo_reparacion').value,
      falla: document.getElementById('falla').value.trim(),
      nombre: document.getElementById('nombre').value.trim(),
      apellido: document.getElementById('apellido').value.trim(),
      marca: document.getElementById('marca').value.trim(),
      modelo: document.getElementById('modelo').value.trim(),
      numero_serie: document.getElementById('numero_serie').value.trim(),
      accesorios: document.getElementById('accesorios').value.trim(),
      acepta_terminos: acepta.checked,
    };

    try {
      var res = await fetch(API + '/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var json = await res.json();

      if (json.ok) {
        form.classList.add('hidden');
        successState.classList.remove('hidden');

        if (json.init_point) {
          // Pago iniciado: redirigimos al checkout de Mercado Pago
          successMsg.textContent = 'Te redirigimos a Mercado Pago para abonar la revisión.';
          if (successWhatsapp) successWhatsapp.classList.add('hidden');
          window.location.href = json.init_point;
        } else {
          // Sin preferencia de pago (fallback): confirmación por WhatsApp
          successMsg.textContent = 'Te contactamos por WhatsApp para confirmar.';
          if (successWhatsapp) successWhatsapp.classList.remove('hidden');
          successState.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        showError(json.error || 'Error al solicitar el turno. Intentá de nuevo.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-regular fa-calendar-check"></i> Solicitar Turno';
      }
    } catch (err) {
      console.error('[TURNOS] Submit error:', err);
      showError('Error de conexión. Intentá de nuevo.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-regular fa-calendar-check"></i> Solicitar Turno';
    }
  });
})();

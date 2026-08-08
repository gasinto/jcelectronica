/**
 * JC Electrónica — Services page + service detail pages.
 * Loads commercial conditions from the public API.
 * Also provides a helper to render a service price list by tipo_equipo.
 */
(function () {
  'use strict';

  var API = (window.JC_CONFIG && window.JC_CONFIG.API_URL) || 'https://jc-plataforma-production.up.railway.app/api/public';

  function formatPrice(n) {
    if (n === null || n === undefined || n === 0) return 'Consultar';
    return '$' + Number(n).toLocaleString('es-AR');
  }

  // ─── Condiciones de trabajo ───────────────────────────────────────────────
  async function loadCondiciones() {
    var list = document.getElementById('condiciones-list');
    if (!list) return;
    try {
      var res = await fetch(API + '/condiciones');
      var data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm">Próximamente.</p>';
        return;
      }
      list.innerHTML = data.map(function (c) {
        var icono = (c.nombre || '').toLowerCase().indexOf('garant') !== -1 ? '🛡️' : '📋';
        return '<div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">'
          + '<div class="flex items-start gap-4">'
          + '<div class="text-3xl shrink-0 mt-1">' + icono + '</div>'
          + '<div class="min-w-0">'
          + '<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-2">' + (c.nombre || '') + '</h3>'
          + '<div class="text-gray-700 leading-relaxed whitespace-pre-line" style="font-size:1rem;">' + (c.descripcion || '') + '</div>'
          + '</div>'
          + '</div>'
          + '</div>';
      }).join('');
    } catch (err) {
      console.error('[SERVICES] Condiciones error:', err);
      list.innerHTML = '<p class="text-center text-gray-400 text-sm">No se pudieron cargar las condiciones.</p>';
    }
  }

  // ─── Precios por tipo de equipo (páginas de servicio) ─────────────────────
  // Renders into #service-prices-list on service-*.html pages.
  // Expects <body data-tipo-equipo="notebook"> and container #service-prices-list.
  async function loadServicePrices() {
    var container = document.getElementById('service-prices-list');
    if (!container) return;

    var tipoEquipo = document.body.getAttribute('data-tipo-equipo');
    if (!tipoEquipo) return;

    container.innerHTML = '<div class="flex items-center justify-center py-8 text-gray-400"><i class="fa-solid fa-spinner fa-spin text-2xl mr-3"></i> Cargando precios...</div>';

    try {
      var res = await fetch(API + '/servicios?tipo_equipo=' + encodeURIComponent(tipoEquipo));
      var data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Consultá los precios por WhatsApp.</p>';
        return;
      }

      container.innerHTML = data.map(function (s) {
        var priceText = (s.precio_desde ? 'desde ' : '') + formatPrice(s.precio_base);
        var gremioText = s.precio_gremio ? '<span class="text-xs text-green-600">Gremio: ' + formatPrice(s.precio_gremio) + '</span>' : '';
        return '<div class="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">'
          + '<div class="min-w-0">'
          + '<p class="font-medium text-gray-800 text-sm">' + (s.nombre || '') + '</p>'
          + (s.descripcion ? '<p class="text-xs text-gray-500 mt-0.5">' + s.descripcion + '</p>' : '')
          + (s.destacado ? '<span class="inline-block mt-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Destacado</span>' : '')
          + '</div>'
          + '<div class="text-right shrink-0">'
          + '<p class="font-bold text-indigo-600 text-sm">' + priceText + '</p>'
          + gremioText
          + '</div>'
          + '</div>';
      }).join('');

      // CTA footer
      container.innerHTML += '<a href="https://wa.me/' + ((window.JC_CONFIG && window.JC_CONFIG.WHATSAPP_NUMBER) || '5491153348030') + '?text=' + encodeURIComponent('Hola! Quiero consultar por el servicio de ' + tipoEquipo) + '" target="_blank" rel="noopener" class="mt-4 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-3 rounded-xl transition-colors touch-target"><i class="fa-brands fa-whatsapp"></i> Consultar por WhatsApp</a>';
    } catch (err) {
      console.error('[SERVICES] Precios error:', err);
      container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">No se pudieron cargar los precios.</p>';
    }
  }

  // ─── Precios para la página central de precios (precios.html) ─────────────
  // Renders into .price-block[data-tipo-equipo] — one block per equipment type.
  async function loadAllServicePrices() {
    var blocks = document.querySelectorAll('[data-precios-tipo]');
    if (!blocks.length) return;

    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var tipoEquipo = block.getAttribute('data-precios-tipo');
      block.innerHTML = '<div class="flex items-center justify-center py-8 text-gray-400"><i class="fa-solid fa-spinner fa-spin text-2xl mr-3"></i> Cargando precios...</div>';

      try {
        var res = await fetch(API + '/servicios?tipo_equipo=' + encodeURIComponent(tipoEquipo));
        var data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          block.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Consultá los precios por WhatsApp.</p>';
          continue;
        }

        block.innerHTML = data.map(function (s) {
          var priceText = (s.precio_desde ? 'desde ' : '') + formatPrice(s.precio_base);
          var gremioText = s.precio_gremio ? '<span class="text-xs text-green-600">Gremio: ' + formatPrice(s.precio_gremio) + '</span>' : '';
          return '<div class="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">'
            + '<div class="min-w-0">'
            + '<p class="font-medium text-gray-800 text-sm">' + (s.nombre || '') + '</p>'
            + (s.descripcion ? '<p class="text-xs text-gray-500 mt-0.5">' + s.descripcion + '</p>' : '')
            + '</div>'
            + '<div class="text-right shrink-0">'
            + '<p class="font-bold text-indigo-600 text-sm">' + priceText + '</p>'
            + gremioText
            + '</div>'
            + '</div>';
        }).join('');
      } catch (err) {
        console.error('[SERVICES] Precios all error:', err);
        block.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">No se pudieron cargar los precios.</p>';
      }
    }
  }

  // ─── Precios gremio (gremio.html) ─────────────────────────────────────────
  // Shows ONLY gremio prices (or standard with a gremio badge when missing).
  async function loadGremioPrices() {
    var container = document.getElementById('gremio-prices-list');
    if (!container) return;

    container.innerHTML = '<div class="flex items-center justify-center py-8 text-gray-400"><i class="fa-solid fa-spinner fa-spin text-2xl mr-3"></i> Cargando precios del gremio...</div>';

    try {
      var res = await fetch(API + '/servicios?tipo_equipo=' + encodeURIComponent('gremio'));
      var data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        // Fallback: todos los servicios, marcando gremio donde exista
        var resAll = await fetch(API + '/servicios');
        data = await resAll.json();
        if (!Array.isArray(data) || data.length === 0) {
          container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Consultá los precios por WhatsApp.</p>';
          return;
        }
        data = data.filter(function (s) { return s.precio_gremio; });
      }

      container.innerHTML = data.map(function (s) {
        var gremio = s.precio_gremio || s.precio_base;
        return '<div class="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">'
          + '<div class="min-w-0">'
          + '<p class="font-medium text-gray-800 text-sm">' + (s.nombre || '') + '</p>'
          + (s.descripcion ? '<p class="text-xs text-gray-500 mt-0.5">' + s.descripcion + '</p>' : '')
          + '</div>'
          + '<div class="text-right shrink-0">'
          + '<p class="font-bold text-green-700 text-sm">' + formatPrice(gremio) + '</p>'
          + (s.precio_gremio ? '<span class="text-xs text-gray-400">Gremio</span>' : '')
          + '</div>'
          + '</div>';
      }).join('');
    } catch (err) {
      console.error('[SERVICES] Gremio error:', err);
      container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">No se pudieron cargar los precios.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadCondiciones();
    loadServicePrices();
    loadAllServicePrices();
    loadGremioPrices();
  });
})();

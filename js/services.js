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

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ─── Condiciones: parser de bloques + markdown inline ─────────────────────
  // Una LÍNEA EN BLANCO separa condiciones. Un ENTER simple dentro del
  // bloque se conserva como salto de línea (<br>). **negrita** y *cursiva*
  // se aplican sobre texto ya escapado (seguro).
  function bloquesCondicion(descripcion) {
    return String(descripcion || '')
      .split(/\n[ \t]*\n/)
      .map(function (b) {
        return b.split('\n').map(function (l) { return l.trim(); })
                .filter(function (l) { return l.length > 0; });
      })
      .filter(function (lineas) { return lineas.length > 0; });
  }

  function mdInline(s) {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function renderBloquesCondicion(descripcion) {
    var bloques = bloquesCondicion(descripcion);
    if (bloques.length === 0) return '';
    return '<ul class="space-y-2">' + bloques.map(function (lineas) {
      var texto = lineas.map(function (l) { return esc(l); }).join('<br>');
      return '<li class="flex items-start gap-2 text-gray-700 leading-relaxed"><span class="text-indigo-600 font-bold mt-0.5 shrink-0">✓</span><span>' + mdInline(texto) + '</span></li>';
    }).join('') + '</ul>';
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
        var cuerpo = renderBloquesCondicion(c.descripcion);
        return '<div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">'
          + '<div class="flex items-start gap-4">'
          + '<div class="text-3xl shrink-0 mt-1">' + icono + '</div>'
          + '<div class="min-w-0 flex-1">'
          + '<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-3">' + esc(c.nombre) + '</h3>'
          + cuerpo
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
        var res = await fetch(API + '/mipagina/servicios?tipo_equipo=' + encodeURIComponent(tipoEquipo));
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
      var res = await fetch(API + '/mipagina/servicios?tipo_equipo=' + encodeURIComponent(tipoEquipo));
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

  // ─── Precios para el gremio (gremio.html) ──────────────────────────────────
  // Renders into #gremio-prices-list. No-op when the container is not on the page.
  async function loadGremioPrices() {
    var list = document.getElementById('gremio-prices-list');
    if (!list) return;
    try {
      var res = await fetch(API + '/mipagina/servicios?solo_gremio=1');
      var data = await res.json();
      if (!Array.isArray(data)) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">No se pudieron cargar los precios.</p>';
        return;
      }

      var items = data.filter(function (s) { return Number(s.precio_gremio) > 0; });

      if (items.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Consultá los precios por WhatsApp.</p>';
        return;
      }

      list.innerHTML = items.map(function (s) {
        var publicoText = Number(s.precio_base) > 0 ? '<p class="text-xs text-gray-400 mt-0.5">Público: ' + formatPrice(s.precio_base) + '</p>' : '';
        return '<div class="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">'
          + '<div class="min-w-0">'
          + '<p class="font-medium text-gray-800 text-sm">' + esc(s.nombre) + '</p>'
          + (s.descripcion ? '<p class="text-xs text-gray-500 mt-0.5">' + esc(s.descripcion) + '</p>' : '')
          + '</div>'
          + '<div class="text-right shrink-0">'
          + '<p class="font-bold text-green-600 text-sm">' + formatPrice(s.precio_gremio) + '</p>'
          + publicoText
          + '</div>'
          + '</div>';
      }).join('');
    } catch (err) {
      console.error('[SERVICES] Gremio precios error:', err);
      list.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">No se pudieron cargar los precios.</p>';
    }
  }

  // ─── Condiciones de trabajo para el gremio (gremio.html) ───────────────────
  // Renders into #condiciones-gremio-list. No-op when the container is not on the page.
  async function loadCondicionesGremio() {
    var list = document.getElementById('condiciones-gremio-list');
    if (!list) return;
    try {
      var res = await fetch(API + '/condiciones-gremio');
      var data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm">Próximamente.</p>';
        return;
      }
      list.innerHTML = data.map(function (c) {
        var icono = (c.nombre || '').toLowerCase().indexOf('garant') !== -1 ? '🛡️' : '📋';
        var cuerpo = renderBloquesCondicion(c.descripcion);
        return '<div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">'
          + '<div class="flex items-start gap-4">'
          + '<div class="text-3xl shrink-0 mt-1">' + icono + '</div>'
          + '<div class="min-w-0 flex-1">'
          + '<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-3">' + esc(c.nombre) + '</h3>'
          + cuerpo
          + '</div>'
          + '</div>'
          + '</div>';
      }).join('');
    } catch (err) {
      console.error('[SERVICES] Condiciones gremio error:', err);
      list.innerHTML = '<p class="text-center text-gray-400 text-sm">No se pudieron cargar las condiciones.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadCondiciones();
    loadServicePrices();
    loadAllServicePrices();
    loadGremioPrices();
    loadCondicionesGremio();
  });
})();

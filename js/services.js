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
        return '<div class="bg-gray-50 rounded-xl border border-gray-100 p-5">'
          + '<h3 class="font-semibold text-gray-800 mb-1">' + (c.nombre || '') + '</h3>'
          + '<p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">' + (c.descripcion || '') + '</p>'
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

  document.addEventListener('DOMContentLoaded', function () {
    loadCondiciones();
    loadServicePrices();
  });
})();

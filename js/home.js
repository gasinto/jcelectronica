/**
 * JC Electrónica — Home page dynamic sections.
 * Loads featured products and testimonials from the public API.
 */
(function () {
  'use strict';

  var API = (window.JC_CONFIG && window.JC_CONFIG.API_URL) || 'https://jc-plataforma-production.up.railway.app/api/public';
  var WHATSAPP = (window.JC_CONFIG && window.JC_CONFIG.WHATSAPP_NUMBER) || '5491153348030';

  function formatPrice(n) {
    if (n === null || n === undefined || n === 0) return 'Consultar';
    return '$' + Number(n).toLocaleString('es-AR');
  }

  function firstImage(p) {
    if (Array.isArray(p.imagenes) && p.imagenes.length > 0) return p.imagenes[0];
    return (window.JC_CONFIG && window.JC_CONFIG.DEFAULT_IMAGE) || '/img/logo.jpg';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Featured products ────────────────────────────────────────────────────
  async function loadFeatured() {
    var grid = document.getElementById('featured-grid');
    if (!grid) return;
    try {
      var res = await fetch(API + '/catalogo?featured=1&per_page=4');
      var json = await res.json();
      var products = (json && json.data) || [];

      if (products.length === 0) {
        // Fallback: just show latest 4 available
        var res2 = await fetch(API + '/catalogo?estado=disponible&per_page=4');
        var json2 = await res2.json();
        products = (json2 && json2.data) || [];
      }

      if (products.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">Aún no hay productos publicados. Consultanos por WhatsApp.</div>';
        return;
      }

      grid.innerHTML = products.map(function (p) {
        var priceHtml = p.estado === 'vendido'
          ? '<span class="text-sm font-semibold text-red-500">Vendido</span>'
          : p.estado === 'reservado'
            ? '<span class="text-sm font-semibold text-amber-500">Reservado</span>'
            : '<div class="text-lg font-bold text-indigo-600">' + formatPrice(p.precio_publico) + '</div>';

        var estadoBadge = p.estado === 'disponible'
          ? '<span class="absolute top-2 left-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">disponible</span>'
          : p.estado === 'reservado'
            ? '<span class="absolute top-2 left-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">reservado</span>'
            : '<span class="absolute top-2 left-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">vendido</span>';

        var img = firstImage(p);
        return '<div class="product-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col">'
          + '<div class="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">'
          + '<img src="' + img + '" alt="' + (p.nombre || '').replace(/"/g, '&quot;') + '" class="w-full h-full object-contain p-4" loading="lazy" onerror="this.onerror=null;this.src=\'' + ((window.JC_CONFIG && window.JC_CONFIG.DEFAULT_IMAGE) || '/img/logo.jpg') + '\'">'
          + estadoBadge
          + '</div>'
          + '<div class="p-4 flex flex-col flex-1">'
          + '<h3 class="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">' + (p.nombre || '') + '</h3>'
          + (p.marca ? '<p class="text-xs text-gray-400 mt-0.5">' + p.marca + '</p>' : '')
          + '<div class="mt-auto pt-3">' + priceHtml + '</div>'
          + '<div class="flex gap-2 mt-3">'
          + '<a href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hola! Quiero consultar por ' + (p.nombre || '') + ' (id:' + p.id + ')') + '" target="_blank" rel="noopener" class="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 py-2 rounded-lg hover:bg-green-100 transition-colors"><i class="fa-brands fa-whatsapp"></i> Consultar</a>'
          + (p.estado === 'disponible'
            ? '<button class="add-to-cart-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-indigo-600 py-2 rounded-lg hover:bg-indigo-700 transition-colors" data-product-id="' + p.id + '" data-product-name="' + (p.nombre || '').replace(/'/g, "\\'") + '" data-product-price="' + (p.precio_publico || 0) + '" data-product-image="' + img + '"><i class="fa-solid fa-cart-plus"></i> Agregar</button>'
            : '')
          + '</div></div></div>';
      }).join('');
    } catch (err) {
      console.error('[HOME] Featured error:', err);
      grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">No se pudieron cargar los productos.</div>';
    }
  }

  // ─── Testimonios ─────────────────────────────────────────────────────────
  function stars(n) {
    n = parseInt(n, 10) || 5;
    var out = '';
    for (var i = 0; i < 5; i++) {
      out += i < n ? '<i class="fa-solid fa-star text-amber-400"></i>' : '<i class="fa-regular fa-star text-gray-300"></i>';
    }
    return out;
  }

  async function loadTestimonios() {
    var grid = document.getElementById('testimonios-grid');
    if (!grid) return;
    try {
      var empresaId = (window.JC_CONFIG && window.JC_CONFIG.EMPRESA_ID) || 7;
      var res = await fetch(API + '/testimonios?empresa_id=' + empresaId);
      var data = await res.json();

      // Fallback: nunca ocultar la sección — mostrar CTA si no hay reviews reales
      if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML =
          '<div class="col-span-full bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">'
          + '<div class="text-4xl mb-3">⭐</div>'
          + '<p class="font-semibold text-gray-800">¿Trabajamos con tu equipo?</p>'
          + '<p class="text-sm text-gray-500 mt-1 max-w-md mx-auto">Todavía no hay opiniones publicadas. Si te ayudamos con tu equipo, nos encantaría saber tu experiencia.</p>'
          + '<a href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hola! Quiero dejar una reseña sobre mi experiencia con JC Electrónica.') + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"><i class="fa-brands fa-whatsapp"></i> Dejá tu opinión</a>'
          + '</div>';
        return;
      }

      grid.innerHTML = data.map(function (t) {
        return '<div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">'
          + '<div class="flex items-center justify-between mb-3">'
          + '<div class="flex items-center gap-3">'
          + '<div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">' + escapeHtml((t.cliente_nombre || 'C').charAt(0).toUpperCase()) + '</div>'
          + '<div><p class="font-semibold text-gray-800 text-sm">' + escapeHtml(t.cliente_nombre || 'Cliente') + '</p>'
          + (t.cliente_empresa ? '<p class="text-xs text-gray-400">' + escapeHtml(t.cliente_empresa) + '</p>' : '')
          + '</div></div>'
          + '<div class="text-xs">' + stars(t.calificacion) + '</div>'
          + '</div>'
          + '<p class="text-sm text-gray-600 leading-relaxed">' + escapeHtml(t.texto || '') + '</p>'
          + '</div>';
      }).join('');
    } catch (err) {
      console.error('[HOME] Testimonios error:', err);
      grid.innerHTML =
        '<div class="col-span-full bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">'
        + '<div class="text-4xl mb-3">⭐</div>'
        + '<p class="font-semibold text-gray-800">¿Trabajamos con tu equipo?</p>'
        + '<p class="text-sm text-gray-500 mt-1 max-w-md mx-auto">Si te ayudamos con tu equipo, nos encantaría saber tu experiencia.</p>'
        + '<a href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hola! Quiero dejar una reseña sobre mi experiencia con JC Electrónica.') + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"><i class="fa-brands fa-whatsapp"></i> Dejá tu opinión</a>'
        + '</div>';
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    loadFeatured();
    loadTestimonios();
  });
})();

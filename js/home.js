/**
 * JC Electrónica — Home page dynamic sections.
 * Loads featured products and testimonials from the public API.
 */
(function () {
  'use strict';

  var API = (window.JC_CONFIG && window.JC_CONFIG.API_URL) || 'https://jc-plataforma-production.up.railway.app/api/public';
  var WHATSAPP = (window.JC_CONFIG && window.JC_CONFIG.WHATSAPP_NUMBER) || '5491153348030';

  // Raw products fetched for the featured grid — used by the detail modal
  var featuredProducts = [];

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

      featuredProducts = products;

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
        return '<div class="product-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col" data-product-id="' + p.id + '">'
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

  // ─── Product Detail Modal (featured) ──────────────────────────────────────
  // Mirrors catalog.js openModal but uses the raw API product fields.
  function normalizeProduct(p) {
    var images = Array.isArray(p.imagenes) ? p.imagenes : [];
    var imageObjects = images.map(function (u) { return { url: u }; });
    return {
      id: p.id,
      product_id: p.id,
      name: p.nombre || '',
      subtitle: p.subtitle || '',
      brand: p.marca || '',
      description: p.descripcion || '',
      specs: (p.specs && typeof p.specs === 'object') ? p.specs : {},
      price_public: p.precio_publico,
      price_gremio: p.precio_gremio,
      estado: p.estado || 'disponible',
      tipo: p.tipo || 'propio',
      condition: p.condition || '',
      image_url: images.length > 0 ? images[0] : '',
      images: imageObjects,
    };
  }

  function abrirProductoModal(product) {
    if (!product) return;
    var p = normalizeProduct(product);
    var modal = document.getElementById('product-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Basic info
    document.getElementById('modal-title').textContent = p.name;
    document.getElementById('modal-subtitle').textContent = p.subtitle;
    document.getElementById('modal-subtitle').style.display = p.subtitle ? '' : 'none';

    // Badges
    var estadoBadge = document.getElementById('modal-estado');
    var estadoColors = { disponible: 'bg-green-100 text-green-700', reservado: 'bg-yellow-100 text-yellow-700', vendido: 'bg-red-100 text-red-700' };
    estadoBadge.textContent = p.estado;
    estadoBadge.className = 'text-xs font-semibold px-3 py-1 rounded-full ' + (estadoColors[p.estado] || 'bg-gray-100 text-gray-600');

    var condBadge = document.getElementById('modal-condition');
    if (p.condition) {
      var condColors = { excelente: 'bg-green-100 text-green-700 border-green-200', 'muy-bueno': 'bg-blue-100 text-blue-700 border-blue-200', bueno: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      condBadge.textContent = p.condition.replace('-', ' ');
      condBadge.className = 'text-xs font-medium px-3 py-0.5 rounded border ' + (condColors[p.condition] || 'bg-gray-100 text-gray-600 border-gray-200');
      condBadge.classList.remove('hidden');
    } else {
      condBadge.classList.add('hidden');
    }

    document.getElementById('modal-tipo').textContent = p.tipo;
    var brandEl = document.getElementById('modal-brand');
    if (p.brand) {
      brandEl.textContent = p.brand;
      brandEl.style.display = '';
    } else {
      brandEl.style.display = 'none';
    }

    // Specs
    var specsEl = document.getElementById('modal-specs');
    if (p.specs && typeof p.specs === 'object') {
      specsEl.innerHTML = Object.entries(p.specs).map(function (s) {
        return '<div class="bg-gray-50 rounded-lg px-3 py-2"><span class="text-xs text-gray-400 uppercase">' + escapeHtml(s[0]) + '</span><p class="text-sm font-medium text-gray-700">' + escapeHtml(s[1]) + '</p></div>';
      }).join('');
      specsEl.classList.remove('hidden');
    } else {
      specsEl.classList.add('hidden');
    }

    // Description
    var descEl = document.getElementById('modal-description');
    descEl.textContent = p.description || '';
    descEl.style.display = p.description ? '' : 'none';

    // Price (public only — no guild toggle on the home page)
    document.getElementById('modal-price-public').textContent = formatPrice(p.price_public);
    document.getElementById('modal-price-public').style.display = '';
    var guildEl = document.getElementById('modal-price-guild');
    if (p.price_gremio) {
      guildEl.textContent = formatPrice(p.price_gremio);
    }
    guildEl.style.display = 'none';

    // Images
    var imgMain = document.getElementById('modal-img-main');
    var imgPlaceholder = document.getElementById('modal-img-placeholder');
    var imgLetter = document.getElementById('modal-img-letter');
    var imgThumbs = document.getElementById('modal-img-thumbs');

    if (p.images && p.images.length > 0) {
      imgMain.src = p.images[0].url;
      imgMain.classList.remove('hidden');
      imgPlaceholder.classList.add('hidden');

      if (p.images.length > 1) {
        imgThumbs.innerHTML = p.images.map(function (img, i) {
          return '<button class="w-10 h-10 rounded-lg border-2 overflow-hidden ' + (i === 0 ? 'border-indigo-500' : 'border-transparent') + ' hover:border-indigo-300 transition-colors"><img src="' + img.url + '" class="w-full h-full object-cover" alt=""></button>';
        }).join('');
        imgThumbs.classList.remove('hidden');

        imgThumbs.querySelectorAll('button').forEach(function (btn, i) {
          btn.addEventListener('click', function () {
            imgMain.src = p.images[i].url;
            imgThumbs.querySelectorAll('button').forEach(function (b) { b.classList.remove('border-indigo-500'); b.classList.add('border-transparent'); });
            btn.classList.remove('border-transparent');
            btn.classList.add('border-indigo-500');
          });
        });
      } else {
        imgThumbs.classList.add('hidden');
      }
    } else {
      imgMain.classList.add('hidden');
      imgPlaceholder.classList.remove('hidden');
      imgLetter.textContent = p.name.charAt(0).toUpperCase();
      imgThumbs.classList.add('hidden');
    }

    // WhatsApp
    var waLink = document.getElementById('modal-whatsapp');
    waLink.href = 'https://wa.me/' + WHATSAPP + '?text=Hola%2C%20quiero%20consultar%20por%20' + encodeURIComponent(p.name) + '%20(id%3A' + p.id + ')';

    // Add to cart
    var cartBtn = document.getElementById('modal-add-cart');
    if (p.estado === 'disponible') {
      cartBtn.disabled = false;
      cartBtn.onclick = function () { handleAddToCart(p); };
    } else {
      cartBtn.disabled = true;
      cartBtn.onclick = null;
    }
  }

  function cerrarProductoModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function handleAddToCart(product) {
    try {
      // Use Cart module if available (cart.js loaded), fall back to direct
      if (window.Cart) {
        var added = window.Cart.addItem({
          product_id: product.id || product.product_id,
          name: product.name,
          price: product.price_public,
          image: product.image_url || '',
        });
        if (window.showToast) {
          window.showToast(added ? product.name + ' agregado al carrito' : product.name + ' ya está en el carrito', added ? 'success' : 'warning');
        }
        return;
      }

      // Fallback: direct localStorage (if cart.js not loaded)
      var cart = JSON.parse(localStorage.getItem('jce_cart') || '[]');
      var existing = cart.findIndex(function (item) { return (item.product_id || item.id) === product.id; });
      if (existing >= 0) {
        if (window.showToast) window.showToast(product.name + ' ya está en el carrito', 'warning');
        return;
      }
      cart.push({
        product_id: product.id || product.product_id,
        name: product.name,
        price: product.price_public,
        quantity: 1,
        image: product.image_url || '',
      });
      localStorage.setItem('jce_cart', JSON.stringify(cart));
      if (window.showToast) window.showToast(product.name + ' agregado al carrito', 'success');
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
    } catch (e) {
      console.error('[HOME] Error adding item:', e);
      if (window.showToast) window.showToast('Error al agregar al carrito', 'error');
    }
  }

  // Featured card click (non-button area) → modal
  document.addEventListener('click', function (e) {
    var card = e.target.closest('#featured-grid .product-card');
    if (card && !e.target.closest('button, a')) {
      var id = parseInt(card.dataset.productId, 10);
      var product = featuredProducts.find(function (p) { return p.id === id; });
      if (product) abrirProductoModal(product);
    }
  });

  // Featured "Agregar" button → cart (same behavior as catalog)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#featured-grid .add-to-cart-btn');
    if (btn) {
      handleAddToCart({
        id: parseInt(btn.dataset.productId, 10),
        name: btn.dataset.productName,
        price_public: parseFloat(btn.dataset.productPrice) || 0,
        image_url: btn.dataset.productImage,
      });
    }
  });

  // Modal close: button, backdrop, Escape
  var modalClose = document.getElementById('modal-close');
  var modalBackdrop = document.getElementById('modal-backdrop');
  if (modalClose) modalClose.addEventListener('click', cerrarProductoModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', cerrarProductoModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('product-modal');
      if (modal && !modal.classList.contains('hidden')) cerrarProductoModal();
    }
  });

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

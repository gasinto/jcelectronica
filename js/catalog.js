/**
 * JC Electrónica — Catalog JavaScript
 *
 * Client-side product filtering, guild pricing toggle, add-to-cart,
 * product detail modal, and toast notifications.
 */

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────────────────
  let products = [];              // Full list of products from API
  let guildMode = false;          // Show guild prices?
  let activeFilters = {};         // Current filter values
  let currentProduct = null;      // Product shown in modal
  let searchTimeout = null;       

  // ─── DOM References ─────────────────────────────────────────────────────────
  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return document.querySelectorAll(sel); };

  const grid = $('#products-grid');
  const emptyState = $('#products-empty');
  const loading = $('#products-loading');
  const searchInput = $('#search-input');
  const searchClear = $('#search-clear');
  const guildToggle = $('#guild-toggle');
  const applyBtn = $('#apply-filters');
  const clearBtn = $('#clear-filters');
  const emptyClearBtn = $('#empty-clear-filters');
  const filterDrawerBtn = $('#filter-drawer-btn');
  const filterDrawer = $('#filter-drawer');
  const filterOverlay = $('#filter-overlay');
  const filterClose = $('#filter-close');
  const activeFilterCount = $('#active-filter-count');
  const modal = $('#product-modal');
  const modalClose = $('#modal-close');
  const modalBackdrop = $('#modal-backdrop');

  // ─── Price Formatting ───────────────────────────────────────────────────────
  function formatPrice(n) {
    if (n === null || n === undefined || n === 0) return '—';
    return '$' + Number(n).toLocaleString('es-AR');
  }

  // ─── Toast Notification ─────────────────────────────────────────────────────
  function showToast(message, type) {
    type = type || 'info';
    var colors = {
      info: 'bg-blue-500',
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500 text-gray-900',
    };

    var toast = document.createElement('div');
    toast.className =
      'toast-container fixed top-4 right-4 px-5 py-3 rounded-lg text-white text-sm shadow-lg transition-all duration-300 ' +
      (colors[type] || colors.info) +
      ' max-w-xs';
    var iconMap = {
      info: 'fa-circle-info',
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      warning: 'fa-triangle-exclamation',
    };
    toast.innerHTML =
      '<i class="fa-solid ' + (iconMap[type] || iconMap.info) + ' mr-2"></i>' +
      document.createTextNode(message).textContent;
    toast.style.transform = 'translateX(120%)';
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.transform = 'translateX(0)';
    });

    setTimeout(function () {
      toast.style.transform = 'translateX(120%)';
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // ─── API Fetch ──────────────────────────────────────────────────────────────
  async function fetchProducts(filters) {
    var params = new URLSearchParams();
    Object.entries(filters).forEach(function (e) {
      if (e[1]) params.set(e[0], e[1]);
    });
    if (!params.has('per_page')) params.set('per_page', '100');

    try {
      var base = (window.JC_CONFIG && window.JC_CONFIG.API_URL) || 'https://jc-plataforma-production.up.railway.app/api/public';
      var res = await fetch(base + '/catalogo?' + params.toString());
      var json = await res.json();
      if (json && Array.isArray(json.data)) {
        products = json.data.map(normalizeProduct);
        return products;
      }
      throw new Error(json.error || 'Error desconocido');
    } catch (err) {
      console.error('[CATALOG] API error:', err);
      showToast('Error al cargar productos', 'error');
      return [];
    }
  }

  /**
   * Normalize public API product fields to the internal render format.
   * API: precio_publico, precio_gremio, imagenes (array of URLs), marca, estado, tipo, specs.
   * Internal: price_public, price_gremio, image_url, images (array of {url}), brand, condition, subtitle.
   */
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
      featured: p.featured,
      condition: p.condition || '',
      image_url: images.length > 0 ? images[0] : '',
      images: imageObjects,
      whatsapp: (window.JC_CONFIG && window.JC_CONFIG.WHATSAPP_NUMBER) || '5491153348030',
    };
  }

  // ─── Render Products ────────────────────────────────────────────────────────
  function renderProducts(productsList) {
    if (!productsList || productsList.length === 0) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    grid.innerHTML = productsList.map(function (p) {
      var specs = p.specs && typeof p.specs === 'object' ? Object.entries(p.specs).slice(0, 3) : [];
      var estadoColors = {
        disponible: 'bg-green-100 text-green-700',
        reservado: 'bg-yellow-100 text-yellow-700',
        vendido: 'bg-red-100 text-red-700',
      };
      var conditionColors = {
        excelente: 'bg-green-100 text-green-700 border-green-200',
        'muy-bueno': 'bg-blue-100 text-blue-700 border-blue-200',
        bueno: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      };

      var priceHtml = '<div class="price-public text-lg font-bold text-indigo-600">' + formatPrice(p.price_public) + '</div>';
      if (p.price_gremio) {
        priceHtml += '<div class="price-guild hidden text-lg font-bold text-green-600">' + formatPrice(p.price_gremio) + '</div>';
      }

      var letterFallback = '<div class="img-fallback flex items-center justify-center w-full h-full absolute inset-0"><span class="text-5xl font-bold text-gray-300">' + p.name.charAt(0).toUpperCase() + '</span></div>';
      var imageHtml = p.image_url
        ? '<img src="' + p.image_url + '" alt="' + p.name.replace(/"/g, '&quot;') + '" class="w-full h-full object-contain p-4 hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null;this.classList.add(\'hidden\');var fb=this.parentElement.querySelector(\'.img-fallback\');if(fb)fb.classList.remove(\'hidden\')">' + letterFallback
        : '<div class="flex items-center justify-center w-full h-full img-fallback"><span class="text-5xl font-bold text-gray-200">' + p.name.charAt(0).toUpperCase() + '</span></div>';

      var specsHtml = specs.length > 0
        ? '<div class="flex flex-wrap gap-1.5 mt-2">' + specs.map(function (s) {
            return '<span class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">' + s[1] + '</span>';
          }).join('') + '</div>'
        : '';

      var disabledAttr = p.estado !== 'disponible' ? 'disabled' : '';
      var estadoBadge = (estadoColors[p.estado] || 'bg-gray-100 text-gray-600');
      var conditionBadge = p.condition
        ? '<span class="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded border ' + (conditionColors[p.condition] || 'bg-gray-100 text-gray-600 border-gray-200') + ' bg-white/90 backdrop-blur-sm">' + p.condition.replace('-', ' ') + '</span>'
        : '';

      var detailHref = 'producto.html?id=' + p.id;
      var nameAttr = p.name.replace(/"/g, '&quot;');

      return '<div class="product-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col cursor-pointer" data-product-id="' + p.id + '" data-price="' + p.price_public + '" data-price-guild="' + (p.price_gremio || '') + '" data-name="' + p.name.replace(/'/g, "\\'") + '">'
        + '<a href="' + detailHref + '" target="_blank" rel="noopener" aria-label="Ver ' + nameAttr + '" class="block aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">'
        + imageHtml
        + '<span class="absolute top-2 left-2 text-xs font-semibold px-2.5 py-1 rounded-full ' + estadoBadge + '">' + p.estado + '</span>'
        + conditionBadge
        + '</a>'
        + '<div class="p-4 flex flex-col flex-1">'
        + '<h3 class="font-semibold text-sm leading-tight line-clamp-2"><a href="' + detailHref + '" target="_blank" rel="noopener" class="text-gray-800 hover:text-indigo-600 transition-colors">' + p.name + '</a></h3>'
        + (p.subtitle ? '<p class="text-xs text-gray-400 mt-0.5 line-clamp-1">' + p.subtitle + '</p>' : '')
        + specsHtml
        + '<div class="mt-auto pt-3">' + priceHtml + '</div>'
        + '<div class="flex gap-2 mt-3">'
        + '<a href="https://wa.me/' + (p.whatsapp || '5491153348030') + '?text=Hola%2C%20quiero%20consultar%20por%20' + encodeURIComponent(p.name) + '%20(id%3A' + p.id + ')" target="_blank" rel="noopener" class="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 py-2 rounded-lg hover:bg-green-100 transition-colors" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp"></i> Consultar</a>'
        + '<button class="add-to-cart-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-indigo-600 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" data-product-id="' + p.id + '" data-product-name="' + p.name.replace(/'/g, "\\'") + '" data-product-price="' + p.price_public + '" ' + disabledAttr + ' onclick="event.stopPropagation()"><i class="fa-solid fa-cart-plus"></i> Agregar</button>'
        + '</div></div></div>';
    }).join('');

    // Re-apply guild mode to newly rendered prices
    applyGuildMode();
  }

  // ─── Guild Toggle ───────────────────────────────────────────────────────────
  function applyGuildMode() {
    var show = guildToggle && guildToggle.checked;
    guildMode = show;

    // Update all price elements
    document.querySelectorAll('.price-public').forEach(function (el) {
      el.style.display = show ? 'none' : '';
    });
    document.querySelectorAll('.price-guild').forEach(function (el) {
      el.style.display = show ? '' : 'none';
    });
  }

  // ─── Filters ────────────────────────────────────────────────────────────────
  function getFilterValues() {
    var filters = {};

    // Checkboxes (multiple values become comma-separated or we take first)
    $$('#filter-estado input:checked').forEach(function (cb) { filters.estado = cb.value; });
    $$('#filter-tipo input:checked').forEach(function (cb) { filters.tipo = cb.value; });
    $$('#filter-condition input:checked').forEach(function (cb) { filters.condition = cb.value; });

    var search = searchInput ? searchInput.value.trim() : '';
    if (search) filters.search = search;

    var minPrice = $('#min-price');
    var maxPrice = $('#max-price');
    if (minPrice && minPrice.value) filters.minPrice = minPrice.value;
    if (maxPrice && maxPrice.value) filters.maxPrice = maxPrice.value;

    return filters;
  }

  function updateActiveFilterCount(filters) {
    var count = Object.keys(filters).filter(function (k) { return filters[k] && k !== 'limit' && k !== 'page'; }).length;
    var el = activeFilterCount;
    if (!el) return;
    if (count > 0) {
      el.classList.remove('hidden');
      el.textContent = count;
    } else {
      el.classList.add('hidden');
    }
  }

  async function applyFilters() {
    loading.classList.remove('hidden');
    emptyState.classList.add('hidden');
    grid.classList.add('hidden');

    activeFilters = getFilterValues();
    updateActiveFilterCount(activeFilters);

    var data = await fetchProducts(activeFilters);
    renderProducts(data);

    loading.classList.add('hidden');
  }

  // ─── Product Detail Modal ────────────────────────────────────────────────────
  function openModal(product) {
    if (!product) return;
    currentProduct = product;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Basic info
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-subtitle').textContent = product.subtitle || '';
    document.getElementById('modal-subtitle').style.display = product.subtitle ? '' : 'none';

    // Badges
    var estadoBadge = document.getElementById('modal-estado');
    var estadoColors = { disponible: 'bg-green-100 text-green-700', reservado: 'bg-yellow-100 text-yellow-700', vendido: 'bg-red-100 text-red-700' };
    estadoBadge.textContent = product.estado;
    estadoBadge.className = 'text-xs font-semibold px-3 py-1 rounded-full ' + (estadoColors[product.estado] || 'bg-gray-100 text-gray-600');

    var condBadge = document.getElementById('modal-condition');
    if (product.condition) {
      var condColors = { excelente: 'bg-green-100 text-green-700 border-green-200', 'muy-bueno': 'bg-blue-100 text-blue-700 border-blue-200', bueno: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      condBadge.textContent = product.condition.replace('-', ' ');
      condBadge.className = 'text-xs font-medium px-3 py-0.5 rounded border ' + (condColors[product.condition] || 'bg-gray-100 text-gray-600 border-gray-200');
      condBadge.classList.remove('hidden');
    } else {
      condBadge.classList.add('hidden');
    }

    document.getElementById('modal-tipo').textContent = product.tipo;
    var brandEl = document.getElementById('modal-brand');
    if (product.brand) {
      brandEl.textContent = product.brand;
      brandEl.style.display = '';
    } else {
      brandEl.style.display = 'none';
    }

    // Specs
    var specsEl = document.getElementById('modal-specs');
    if (product.specs && typeof product.specs === 'object') {
      specsEl.innerHTML = Object.entries(product.specs).map(function (s) {
        return '<div class="bg-gray-50 rounded-lg px-3 py-2"><span class="text-xs text-gray-400 uppercase">' + s[0] + '</span><p class="text-sm font-medium text-gray-700">' + s[1] + '</p></div>';
      }).join('');
      specsEl.classList.remove('hidden');
    } else {
      specsEl.classList.add('hidden');
    }

    // Description
    var descEl = document.getElementById('modal-description');
    descEl.textContent = product.description || '';
    descEl.style.whiteSpace = 'pre-wrap';
    descEl.style.display = product.description ? '' : 'none';

    // Price
    document.getElementById('modal-price-public').textContent = formatPrice(product.price_public);
    document.getElementById('modal-price-public').style.display = guildMode ? 'none' : '';
    var guildEl = document.getElementById('modal-price-guild');
    if (product.price_gremio) {
      guildEl.textContent = formatPrice(product.price_gremio);
      guildEl.style.display = guildMode ? '' : 'none';
    } else {
      guildEl.style.display = 'none';
    }

    // Images
    var imgMain = document.getElementById('modal-img-main');
    var imgPlaceholder = document.getElementById('modal-img-placeholder');
    var imgLetter = document.getElementById('modal-img-letter');
    var imgThumbs = document.getElementById('modal-img-thumbs');

    if (product.images && product.images.length > 0) {
      imgMain.src = product.images[0].url;
      imgMain.classList.remove('hidden');
      imgPlaceholder.classList.add('hidden');

      if (product.images.length > 1) {
        imgThumbs.innerHTML = product.images.map(function (img, i) {
          return '<button class="w-10 h-10 rounded-lg border-2 overflow-hidden ' + (i === 0 ? 'border-indigo-500' : 'border-transparent') + ' hover:border-indigo-300 transition-colors"><img src="' + img.url + '" class="w-full h-full object-cover" alt=""></button>';
        }).join('');
        imgThumbs.classList.remove('hidden');

        imgThumbs.querySelectorAll('button').forEach(function (btn, i) {
          btn.addEventListener('click', function () {
            imgMain.src = product.images[i].url;
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
      imgLetter.textContent = product.name.charAt(0).toUpperCase();
      imgThumbs.classList.add('hidden');
    }

    // WhatsApp
    var waLink = document.getElementById('modal-whatsapp');
    waLink.href = 'https://wa.me/' + (product.whatsapp || '5491153348030') + '?text=Hola%2C%20quiero%20consultar%20por%20' + encodeURIComponent(product.name) + '%20(id%3A' + product.id + ')';

    // Add to cart
    var cartBtn = document.getElementById('modal-add-cart');
    if (product.estado === 'disponible') {
      cartBtn.disabled = false;
      cartBtn.onclick = function () { handleAddToCart(product); };
    } else {
      cartBtn.disabled = true;
    }
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentProduct = null;
  }

  // ─── Add to Cart ────────────────────────────────────────────────────────────
  function handleAddToCart(product) {
    try {
      // Use Cart module if available (cart.js loaded), fall back to direct
      if (window.Cart) {
        var price = guildMode && product.price_gremio ? product.price_gremio : product.price_public;
        var added = window.Cart.addItem({
          product_id: product.id || product.product_id,
          name: product.name,
          price: price,
          image: product.image_url || '',
        });

        if (added) {
          showToast(product.name + ' agregado al carrito', 'success');
        } else {
          showToast(product.name + ' ya está en el carrito', 'warning');
        }
        return;
      }

      // Fallback: direct localStorage (if cart.js not loaded)
      var cart = JSON.parse(localStorage.getItem('jce_cart') || '[]');
      var existing = cart.findIndex(function (item) { return (item.product_id || item.id) === product.id; });

      if (existing >= 0) {
        showToast(product.name + ' ya está en el carrito', 'warning');
        return;
      }

      var itemPrice = guildMode && product.price_gremio
        ? product.price_gremio
        : (product.price_public || product.price);

      cart.push({
        product_id: product.id || product.product_id,
        name: product.name,
        price: itemPrice,
        quantity: 1,
        image: product.image_url || '',
      });

      localStorage.setItem('jce_cart', JSON.stringify(cart));
      showToast(product.name + ' agregado al carrito', 'success');

      // Dispatch event for cart.js (Phase 4)
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
    } catch (e) {
      console.error('[CART] Error adding item:', e);
      showToast('Error al agregar al carrito', 'error');
    }
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────

  // Search with debounce
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        if (searchInput.value.trim()) {
          searchClear.classList.remove('hidden');
        } else {
          searchClear.classList.add('hidden');
        }
        applyFilters();
      }, 400);
    });
  }

  // Search clear
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      searchInput.value = '';
      searchClear.classList.add('hidden');
      applyFilters();
      searchInput.focus();
    });
  }

  // Guild toggle
  if (guildToggle) {
    guildToggle.addEventListener('change', applyGuildMode);
  }

  // Apply filters button
  if (applyBtn) {
    applyBtn.addEventListener('click', function () {
      applyFilters();
      closeFilterDrawer();
    });
  }

  // Clear filters button
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      document.querySelectorAll('#filter-estado input, #filter-tipo input, #filter-condition input').forEach(function (cb) { cb.checked = false; });
      if (searchInput) searchInput.value = '';
      if (searchClear) searchClear.classList.add('hidden');
      $('#min-price').value = '';
      $('#max-price').value = '';
      applyFilters();
      closeFilterDrawer();
    });
  }

  if (emptyClearBtn) {
    emptyClearBtn.addEventListener('click', function () {
      if (clearBtn) clearBtn.click();
    });
  }

  // ─── Filter Drawer (Mobile) ─────────────────────────────────────────────────
  function openFilterDrawer() {
    filterDrawer.classList.remove('translate-y-full');
    filterDrawer.classList.add('translate-y-0');
    filterOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeFilterDrawer() {
    filterDrawer.classList.remove('translate-y-0');
    filterDrawer.classList.add('translate-y-full');
    filterOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  if (filterDrawerBtn) filterDrawerBtn.addEventListener('click', openFilterDrawer);
  if (filterClose) filterClose.addEventListener('click', closeFilterDrawer);
  if (filterOverlay) filterOverlay.addEventListener('click', closeFilterDrawer);

  // ─── Product Card Click → Modal ─────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.product-card');
    if (card && !e.target.closest('button, a')) {
      var id = parseInt(card.dataset.productId, 10);
      var product = products.find(function (p) { return p.id === id; });
      if (product) openModal(product);
    }
  });

  // ─── Modal Events ───────────────────────────────────────────────────────────
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // ─── Cart Button Delegation ─────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.add-to-cart-btn');
    if (btn && !btn.disabled) {
      var product = {
        id: parseInt(btn.dataset.productId, 10),
        product_id: parseInt(btn.dataset.productId, 10),
        name: btn.dataset.productName,
        price: parseFloat(btn.dataset.productPrice),
      };
      handleAddToCart(product);
    }
  });

  // ─── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    // If server rendered products, bind existing data
    if (grid && grid.children.length > 0) {
      // Collect product IDs from existing cards
      var ids = Array.from(grid.querySelectorAll('.product-card')).map(function (card) {
        return parseInt(card.dataset.productId, 10);
      });

      // Fetch full product data for the modal
      var params = new URLSearchParams();
      params.set('per_page', '100');
      try {
        var base = (window.JC_CONFIG && window.JC_CONFIG.API_URL) || 'https://jc-plataforma-production.up.railway.app/api/public';
        var res = await fetch(base + '/catalogo?' + params.toString());
        var json = await res.json();
        if (json && Array.isArray(json.data)) {
          products = json.data.map(normalizeProduct);
        }
      } catch (e) {
        console.error('[CATALOG] Failed to fetch product data:', e);
      }
    } else if (grid) {
      // Página estática sin productos renderizados por el server:
      // hacer el fetch inicial para salir del estado "Cargando...".
      await applyFilters();
    }

    // Sync search clear button state
    if (searchInput && searchInput.value.trim()) {
      searchClear.classList.remove('hidden');
    }
  }

  init();
})();

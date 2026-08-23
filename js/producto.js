/**
 * JC Electrónica — Product Detail Page
 *
 * Renders a single product on producto.html?id=<id> by fetching it from the
 * public catalog API (JC Plataforma). Updates document title, meta tags and
 * JSON-LD Product schema for SEO. Reuses the shared Cart module.
 */

(function () {
  'use strict';

  var API = (window.JC_CONFIG && window.JC_CONFIG.API_URL) || 'https://jc-plataforma-production.up.railway.app/api/public';
  var WHATSAPP = (window.JC_CONFIG && window.JC_CONFIG.WHATSAPP_NUMBER) || '5491153348030';

  // ─── DOM References ─────────────────────────────────────────────────────────
  var loading = document.getElementById('producto-loading');
  var notFound = document.getElementById('producto-not-found');
  var content = document.getElementById('producto-content');

  var imgMain = document.getElementById('pd-img-main');
  var imgPlaceholder = document.getElementById('pd-img-placeholder');
  var imgLetter = document.getElementById('pd-img-letter');
  var imgThumbs = document.getElementById('pd-img-thumbs');

  var estadoBadge = document.getElementById('pd-estado');
  var conditionBadge = document.getElementById('pd-condition');
  var tipoBadge = document.getElementById('pd-tipo');
  var titleEl = document.getElementById('pd-title');
  var breadcrumbName = document.getElementById('pd-breadcrumb-name');
  var subtitleEl = document.getElementById('pd-subtitle');
  var brandEl = document.getElementById('pd-brand');
  var specsEl = document.getElementById('pd-specs');
  var descEl = document.getElementById('pd-description');
  var pricePublicEl = document.getElementById('pd-price-public');
  var priceGuildEl = document.getElementById('pd-price-guild');
  var waLink = document.getElementById('pd-whatsapp');
  var cartBtn = document.getElementById('pd-add-cart');

  function formatPrice(n) {
    if (n === null || n === undefined || n === 0) return '—';
    return '$' + Number(n).toLocaleString('es-AR');
  }

  function getProductId() {
    var raw = new URLSearchParams(window.location.search).get('id') || '';
    var id = parseInt(raw, 10);
    return isNaN(id) || id <= 0 ? null : id;
  }

  async function fetchProduct(id) {
    var res = await fetch(API + '/catalogo?id=' + id);
    var json = await res.json();
    if (!json || !Array.isArray(json.data) || json.data.length === 0) return null;
    return json.data[0];
  }

  // ─── SEO ────────────────────────────────────────────────────────────────────
  function updateSeo(p) {
    var siteUrl = 'https://www.jcelectronica.com.ar/producto.html?id=' + p.id;
    var title = p.nombre + ' — JC Electrónica | Merlo';
    var description = (p.descripcion || (p.categoria ? p.categoria + '. ' : '') + 'Producto disponible en JC Electrónica, Merlo.')
      .slice(0, 155);

    document.title = title;

    var setMeta = function (selector, attr, value) {
      var el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', siteUrl);
    if (p.imagenes && p.imagenes.length > 0) {
      setMeta('meta[property="og:image"]', 'content', p.imagenes[0]);
    }

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', siteUrl);

    var estadoOferta = p.estado === 'disponible'
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.nombre,
      description: p.descripcion || '',
      sku: p.id ? String(p.id) : undefined,
      category: p.categoria || undefined,
      image: p.imagenes || [],
      offers: {
        '@type': 'Offer',
        url: siteUrl,
        priceCurrency: 'ARS',
        price: String(p.precio_publico || 0),
        availability: estadoOferta,
        seller: { '@type': 'Organization', name: 'JC Electrónica' },
      },
    };
    var script = document.getElementById('ld-product');
    if (script) script.textContent = JSON.stringify(ld);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  function renderGallery(p) {
    var images = Array.isArray(p.imagenes) ? p.imagenes : [];

    if (images.length > 0) {
      imgMain.src = images[0];
      imgMain.alt = p.nombre;
      imgMain.classList.remove('hidden');
      imgPlaceholder.classList.add('hidden');
    } else {
      imgMain.classList.add('hidden');
      imgPlaceholder.classList.remove('hidden');
      imgLetter.textContent = p.nombre.charAt(0).toUpperCase();
    }

    if (images.length > 1) {
      imgThumbs.innerHTML = images.map(function (url, i) {
        return '<button class="w-12 h-12 rounded-lg border-2 overflow-hidden ' + (i === 0 ? 'border-indigo-500' : 'border-transparent') + ' hover:border-indigo-300 transition-colors" data-index="' + i + '"><img src="' + url + '" class="w-full h-full object-cover" alt=""></button>';
      }).join('');
      imgThumbs.classList.remove('hidden');

      imgThumbs.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          imgMain.src = images[parseInt(btn.dataset.index, 10)];
          imgThumbs.querySelectorAll('button').forEach(function (b) {
            b.classList.remove('border-indigo-500');
            b.classList.add('border-transparent');
          });
          btn.classList.remove('border-transparent');
          btn.classList.add('border-indigo-500');
        });
      });
    } else {
      imgThumbs.classList.add('hidden');
    }
  }

  function render(p) {
    renderGallery(p);

    var estadoColors = {
      disponible: 'bg-green-100 text-green-700',
      reservado: 'bg-yellow-100 text-yellow-700',
      vendido: 'bg-red-100 text-red-700',
    };

    estadoBadge.textContent = p.estado || 'disponible';
    estadoBadge.className = 'text-xs font-semibold px-3 py-1 rounded-full ' + (estadoColors[p.estado] || 'bg-gray-100 text-gray-600');

    if (p.condition) {
      conditionBadge.textContent = p.condition.replace('-', ' ');
      conditionBadge.classList.remove('hidden');
    }
    tipoBadge.textContent = p.tipo === 'consignacion' ? 'Consignación' : '';

    titleEl.textContent = p.nombre;
    breadcrumbName.textContent = p.nombre;

    if (p.categoria) subtitleEl.textContent = p.categoria;

    if (p.marca) {
      brandEl.textContent = p.marca;
      brandEl.classList.remove('hidden');
    }

    if (p.specs && typeof p.specs === 'object' && Object.keys(p.specs).length > 0) {
      specsEl.innerHTML = Object.entries(p.specs).map(function (s) {
        return '<div class="bg-gray-50 rounded-lg px-3 py-2"><span class="text-xs text-gray-400 uppercase">' + s[0] + '</span><p class="text-sm font-medium text-gray-700">' + s[1] + '</p></div>';
      }).join('');
      specsEl.classList.remove('hidden');
    }

    if (p.descripcion) {
      descEl.textContent = p.descripcion;
      descEl.classList.remove('hidden');
    }

    pricePublicEl.textContent = formatPrice(p.precio_publico);
    if (p.precio_gremio) {
      priceGuildEl.textContent = formatPrice(p.precio_gremio);
      priceGuildEl.classList.remove('hidden');
    }

    waLink.href = 'https://wa.me/' + WHATSAPP + '?text=Hola%2C%20quiero%20consultar%20por%20' + encodeURIComponent(p.nombre) + '%20(id%3A' + p.id + ')';

    if (p.estado === 'disponible' && window.Cart) {
      cartBtn.disabled = false;
      cartBtn.addEventListener('click', function () {
        var added = window.Cart.addItem({
          product_id: p.id,
          name: p.nombre,
          price: p.precio_publico,
          image: (p.imagenes && p.imagenes[0]) || '',
        });
        if (window.showToast) {
          window.showToast(added ? p.nombre + ' agregado al carrito' : p.nombre + ' ya está en el carrito', added ? 'success' : 'warning');
        }
      });
    } else {
      cartBtn.disabled = true;
    }
  }

  // ─── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    var id = getProductId();

    if (!id) {
      loading.classList.add('hidden');
      notFound.classList.remove('hidden');
      return;
    }

    try {
      var p = await fetchProduct(id);
      loading.classList.add('hidden');
      if (!p) {
        notFound.classList.remove('hidden');
        return;
      }
      render(p);
      updateSeo(p);
      content.classList.remove('hidden');
    } catch (err) {
      console.error('[PRODUCTO] Error:', err);
      loading.classList.add('hidden');
      notFound.classList.remove('hidden');
    }
  }

  init();
})();

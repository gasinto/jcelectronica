/**
 * JC Electrónica — Cart JavaScript Module (Phase 4)
 *
 * Single source of truth for cart state. Owns localStorage persistence,
 * cart drawer UI, and checkout flow.
 *
 * Communication:
 *   - Listens to `cart:updated` events from catalog.js (or anywhere)
 *   - Dispatches `cart:updated` after its own mutations
 *   - Exposes window.Cart for programmatic access
 *
 * Events detail format: Array<CartItem>
 * CartItem: { product_id, name, price, quantity, image }
 */

(function () {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'jce_cart';
  const WHATSAPP_NUMBER = '5491153348030';

  // ─── DOM References ─────────────────────────────────────────────────────────
  const $ = function (sel) { return document.querySelector(sel); };

  const drawer = $('#cart-drawer');
  const overlay = $('#cart-overlay');
  const closeBtn = $('#cart-close');
  const cartItemsList = $('#cart-items-list');
  const cartEmpty = $('#cart-empty');
  const cartFooter = $('#cart-footer');
  const cartSubtotal = $('#cart-subtotal');
  const cartTotal = $('#cart-total');
  const cartCountHeader = $('#cart-count-header');
  const checkoutBtn = $('#cart-checkout-btn');
  const browseBtn = $('#cart-browse-btn');
  const headerCartBtn = $('#cart-icon-btn');

  // Checkout modal
  const checkoutModal = $('#checkout-modal');
  const checkoutBackdrop = $('#checkout-backdrop');
  const checkoutClose = $('#checkout-close');
  const checkoutName = $('#checkout-name');
  const checkoutWhatsapp = $('#checkout-whatsapp');
  const checkoutSubmit = $('#checkout-submit');
  const checkoutError = $('#checkout-error');
  const checkoutErrorText = $('#checkout-error-text');
  const checkoutSpinner = $('#checkout-spinner');
  const checkoutSubmitText = $('#checkout-submit-text');
  const checkoutItemCount = $('#checkout-item-count');
  const checkoutTotal = $('#checkout-total');

  // ─── State ──────────────────────────────────────────────────────────────────
  let items = [];
  let isOpen = false;

  // ─── Cart Helpers ───────────────────────────────────────────────────────────

  /**
   * Normalize an item from any source to the canonical format.
   * Handles old catalog.js format (id → product_id).
   * @param {object} raw
   * @returns {object}
   */
  function normalizeItem(raw) {
    return {
      product_id: raw.product_id || raw.id,
      name: raw.name || '',
      price: parseFloat(raw.price) || 0,
      quantity: parseInt(raw.quantity, 10) || 1,
      image: raw.image || raw.image_url || '',
    };
  }

  /**
   * Load cart from localStorage.
   * @returns {Array}
   */
  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeItem) : [];
    } catch (e) {
      console.error('[CART] Load error:', e);
      return [];
    }
  }

  /**
   * Save cart to localStorage and dispatch event.
   */
  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: items.slice() }));
    } catch (e) {
      console.error('[CART] Save error:', e);
    }
  }

  // ─── Public API (window.Cart) ───────────────────────────────────────────────

  const Cart = {

    /**
     * Add a product to the cart.
     * If already present, increments quantity.
     * @param {object} product — { product_id, name, price, image? }
     * @param {number} [qty=1]
     */
    addItem: function (product, qty) {
      qty = Math.max(1, parseInt(qty, 10) || 1);

      var existing = items.findIndex(function (item) {
        return item.product_id === product.product_id;
      });

      if (existing >= 0) {
        items[existing].quantity += qty;
      } else {
        items.push({
          product_id: product.product_id,
          name: product.name,
          price: parseFloat(product.price) || 0,
          quantity: qty,
          image: product.image || product.image_url || '',
        });
      }

      saveCart();
      render();
      return true;
    },

    /**
     * Remove an item by product_id.
     * @param {number} productId
     */
    removeItem: function (productId) {
      items = items.filter(function (item) {
        return item.product_id !== productId;
      });
      saveCart();
      render();
    },

    /**
     * Update the quantity of a specific item.
     * @param {number} productId
     * @param {number} qty — If 0 or negative, removes the item
     */
    updateQuantity: function (productId, qty) {
      qty = parseInt(qty, 10);

      if (isNaN(qty) || qty <= 0) {
        this.removeItem(productId);
        return;
      }

      var item = items.find(function (i) { return i.product_id === productId; });
      if (item) {
        item.quantity = qty;
        saveCart();
        render();
      }
    },

    /**
     * Get all cart items (copy).
     * @returns {Array}
     */
    getItems: function () {
      return items.slice();
    },

    /**
     * Calculate the total price.
     * @returns {number}
     */
    getTotal: function () {
      return items.reduce(function (sum, item) {
        return sum + item.price * item.quantity;
      }, 0);
    },

    /**
     * Get the total number of items (sum of quantities).
     * @returns {number}
     */
    getCount: function () {
      return items.reduce(function (sum, item) {
        return sum + item.quantity;
      }, 0);
    },

    /**
     * Clear the cart entirely.
     */
    clear: function () {
      items = [];
      saveCart();
      render();
    },

    /**
     * Open the cart drawer.
     */
    open: function () {
      if (isOpen) return;
      isOpen = true;
      drawer.classList.remove('translate-x-full');
      drawer.classList.add('translate-x-0');
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    },

    /**
     * Close the cart drawer.
     */
    close: function () {
      if (!isOpen) return;
      isOpen = false;
      drawer.classList.remove('translate-x-0');
      drawer.classList.add('translate-x-full');
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
    },

    /**
     * Initiate checkout flow.
     * Shows the checkout modal for name/WhatsApp input.
     */
    checkout: function () {
      if (items.length === 0) {
        showToast('Agregá productos al carrito primero', 'warning');
        return;
      }

      // Pre-fill from logged-in user data if available
      var userData = window.__JC_USER__ || null;
      if (userData) {
        if (!checkoutName.value) checkoutName.value = userData.name || '';
        if (!checkoutWhatsapp.value) checkoutWhatsapp.value = userData.phone || '';
      }

      // Update summary
      checkoutItemCount.textContent = Cart.getCount() + ' producto' + (Cart.getCount() !== 1 ? 's' : '');
      checkoutTotal.textContent = '$' + Cart.getTotal().toLocaleString('es-AR');

      // Reset error & show modal
      checkoutError.classList.add('hidden');
      checkoutSubmit.disabled = false;
      checkoutSpinner.classList.add('hidden');
      checkoutSubmitText.textContent = 'Enviar pedido por WhatsApp';
      checkoutModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      // Focus name field
      setTimeout(function () { checkoutName.focus(); }, 100);
    },

    /**
     * Get the stored session_id from localStorage (if any).
     * @returns {string|null}
     */
    getSessionId: function () {
      try {
        var data = JSON.parse(localStorage.getItem(STORAGE_KEY + '_session') || 'null');
        return data && data.session_id ? data.session_id : null;
      } catch (e) {
        return null;
      }
    },
  };

  // Expose globally
  window.Cart = Cart;

  // Also expose user data for checkout pre-fill (set from layout.ejs)
  window.__JC_USER__ = null;

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
      (colors[type] || colors.info);
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  /**
   * Render the cart drawer contents and update the header badge.
   */
  function render() {
    var count = Cart.getCount();
    var total = Cart.getTotal();

    // Update header badge
    updateBadge(count);

    // Update cart count in drawer header
    if (cartCountHeader) {
      if (count > 0) {
        cartCountHeader.classList.remove('hidden');
        cartCountHeader.textContent = '(' + count + ')';
      } else {
        cartCountHeader.classList.add('hidden');
      }
    }

    // Toggle empty state vs items
    if (items.length === 0) {
      cartEmpty.classList.remove('hidden');
      cartItemsList.classList.add('hidden');
      cartItemsList.innerHTML = '';
      cartFooter.classList.add('hidden');
      return;
    }

    cartEmpty.classList.add('hidden');
    cartItemsList.classList.remove('hidden');
    cartFooter.classList.remove('hidden');

    // Update totals
    cartSubtotal.textContent = formatPrice(total);
    cartTotal.textContent = formatPrice(total);

    // Render items
    cartItemsList.innerHTML = items.map(function (item, index) {
      var subtotal = item.price * item.quantity;
      var imgHtml = item.image
        ? '<img src="' + item.image + '" alt="' + item.name.replace(/"/g, '&quot;') + '" class="w-full h-full object-contain" onerror="this.onerror=null;this.classList.add(\'hidden\')">'
        : '<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 text-lg font-bold">' + item.name.charAt(0).toUpperCase() + '</div>';

      return '<div class="cart-item flex gap-3 py-3 border-b border-gray-50 last:border-0" data-product-id="' + item.product_id + '">'
        + '<div class="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">'
        + imgHtml
        + '</div>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="text-sm font-medium text-gray-800 truncate">' + escapeHtml(item.name) + '</p>'
        + '<p class="text-sm font-semibold text-indigo-600 mt-0.5">' + formatPrice(item.price) + '</p>'
        + '<div class="flex items-center gap-2 mt-2">'
        + '<button class="cart-qty-btn w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors text-sm font-medium" data-action="decrease" data-product-id="' + item.product_id + '" aria-label="Disminuir cantidad">−</button>'
        + '<span class="w-8 text-center text-sm font-medium text-gray-800">' + item.quantity + '</span>'
        + '<button class="cart-qty-btn w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors text-sm font-medium" data-action="increase" data-product-id="' + item.product_id + '" aria-label="Aumentar cantidad">+</button>'
        + '<button class="cart-remove-btn ml-auto text-gray-400 hover:text-red-500 transition-colors p-1" data-product-id="' + item.product_id + '" aria-label="Eliminar producto">'
        + '<i class="fa-solid fa-trash-can text-xs"></i>'
        + '</button>'
        + '</div>'
        + '</div>'
        + '<div class="text-right shrink-0">'
        + '<p class="text-sm font-semibold text-gray-800">' + formatPrice(subtotal) + '</p>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  /**
   * Update the header cart icon badge (desktop + mobile).
   * @param {number} count
   */
  function updateBadge(count) {
    var displayCount = count > 99 ? '99+' : count;
    var show = count > 0;

    // Desktop badge
    if (headerCartBtn) {
      var badge = document.getElementById('cart-badge');
      if (show) {
        if (!badge) {
          badge = document.createElement('span');
          badge.id = 'cart-badge';
          badge.className = 'absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center';
          headerCartBtn.appendChild(badge);
          headerCartBtn.classList.add('relative');
        }
        badge.textContent = displayCount;
        badge.classList.remove('hidden');
      } else if (badge) {
        badge.classList.add('hidden');
      }
    }

    // Mobile badge (inside hamburger menu)
    var mobileBadge = document.getElementById('cart-badge-mobile');
    if (mobileBadge) {
      if (show) {
        mobileBadge.textContent = displayCount;
        mobileBadge.classList.remove('hidden');
      } else {
        mobileBadge.classList.add('hidden');
      }
    }

    // Mobile floating badge (always visible)
    var mobileFloatBadge = document.getElementById('cart-badge-mobile-float');
    if (mobileFloatBadge) {
      if (show) {
        mobileFloatBadge.textContent = displayCount;
        mobileFloatBadge.classList.remove('hidden');
      } else {
        mobileFloatBadge.classList.add('hidden');
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ─── Submit Checkout ─────────────────────────────────────────────────────────

  async function submitCheckout() {
    var name = checkoutName.value.trim();
    var whatsapp = checkoutWhatsapp.value.trim();

    // Validate
    if (!name) {
      showFieldError(checkoutName, 'Ingresá tu nombre');
      return;
    }
    if (!whatsapp) {
      showFieldError(checkoutWhatsapp, 'Ingresá tu número de WhatsApp');
      return;
    }
    if (!/^[\d]{6,15}$/.test(whatsapp.replace(/[^0-9]/g, ''))) {
      showFieldError(checkoutWhatsapp, 'Número de WhatsApp inválido');
      return;
    }

    // Show loading
    checkoutSubmit.disabled = true;
    checkoutSpinner.classList.remove('hidden');
    checkoutSubmitText.textContent = 'Procesando...';
    checkoutError.classList.add('hidden');

    try {
      // ── Build WhatsApp order message (100% client-side) ──────────────────
      var orderTotal = Cart.getTotal();
      var whatsappNumber = (window.JC_CONFIG && window.JC_CONFIG.WHATSAPP_NUMBER) || '5491153348030';

      var lines = ['🛒 *NUEVO PEDIDO - JC Electrónica*\n'];
      lines.push('*Cliente:* ' + name.trim());
      lines.push('*WhatsApp:* ' + whatsapp.trim() + '\n');
      lines.push('*Productos:*');

      var emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

      items.forEach(function (item, i) {
        var subtotal = item.price * item.quantity;
        var priceStr = '$' + Number(item.price).toLocaleString('es-AR');
        var subStr = '$' + Number(subtotal).toLocaleString('es-AR');
        var prefix = emojis[i] || (i + 1) + '.';
        lines.push(prefix + ' ' + item.name + ' — ' + priceStr + ' x ' + item.quantity + ' = ' + subStr);
      });

      var totalStr = '$' + Number(orderTotal).toLocaleString('es-AR');
      lines.push('\n*Total: ' + totalStr + '*');
      lines.push('\n¡Gracias por tu compra! Te contactamos a la brevedad.');

      var waMessage = lines.join('\n');
      var waLink = 'https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(waMessage);

      // Close modals
      closeCheckoutModal();
      Cart.close();

      // Show success toast
      showToast('Pedido enviado — te redirigimos a WhatsApp', 'success');

      // Open WhatsApp link in new tab
      window.open(waLink, '_blank', 'noopener');

      // Clear cart
      Cart.clear();
    } catch (err) {
      checkoutSubmit.disabled = false;
      checkoutSpinner.classList.add('hidden');
      checkoutSubmitText.textContent = 'Enviar pedido por WhatsApp';
      showCheckoutError(err.message || 'Error al procesar el pedido');
    }
  }

  function showFieldError(input, message) {
    showToast(message, 'warning');
    input.focus();
    input.classList.add('border-red-400', 'ring-red-200');
    setTimeout(function () {
      input.classList.remove('border-red-400', 'ring-red-200');
    }, 2000);
  }

  function showCheckoutError(msg) {
    checkoutError.classList.remove('hidden');
    checkoutErrorText.textContent = msg;
  }

  function closeCheckoutModal() {
    checkoutModal.classList.add('hidden');
    checkoutError.classList.add('hidden');
    checkoutSubmit.disabled = false;
    checkoutSpinner.classList.add('hidden');
    checkoutSubmitText.textContent = 'Enviar pedido por WhatsApp';
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  // ─── Event Listeners ────────────────────────────────────────────────────────

  // Open cart from header button
  if (headerCartBtn) {
    headerCartBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Cart.open();
    });
  }

  // Close drawer
  if (closeBtn) closeBtn.addEventListener('click', Cart.close);
  if (overlay) overlay.addEventListener('click', Cart.close);

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!checkoutModal.classList.contains('hidden')) {
        closeCheckoutModal();
      } else if (isOpen) {
        Cart.close();
      }
    }
  });

  // Browse catalog button
  if (browseBtn) {
    browseBtn.addEventListener('click', function () {
      Cart.close();
      window.location.href = '/catalogo';
    });
  }

  // Quantity buttons (delegated)
  cartItemsList.addEventListener('click', function (e) {
    var btn = e.target.closest('.cart-qty-btn');
    if (!btn) return;

    var productId = parseInt(btn.dataset.productId, 10);
    var action = btn.dataset.action;

    var item = items.find(function (i) { return i.product_id === productId; });
    if (!item) return;

    if (action === 'increase') {
      Cart.updateQuantity(productId, item.quantity + 1);
    } else if (action === 'decrease') {
      Cart.updateQuantity(productId, item.quantity - 1);
    }
  });

  // Remove button (delegated)
  cartItemsList.addEventListener('click', function (e) {
    var btn = e.target.closest('.cart-remove-btn');
    if (!btn) return;

    var productId = parseInt(btn.dataset.productId, 10);
    Cart.removeItem(productId);
    showToast('Producto eliminado del carrito', 'info');
  });

  // Checkout button
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', Cart.checkout);
  }

  // Checkout modal events
  if (checkoutClose) checkoutClose.addEventListener('click', closeCheckoutModal);
  if (checkoutBackdrop) checkoutBackdrop.addEventListener('click', closeCheckoutModal);

  if (checkoutSubmit) {
    checkoutSubmit.addEventListener('click', submitCheckout);
  }

  // Enter key in checkout form fields
  if (checkoutWhatsapp) {
    checkoutWhatsapp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitCheckout();
      }
    });
  }
  if (checkoutName) {
    checkoutName.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkoutWhatsapp.focus();
      }
    });
  }

  // Listen for cart:updated events from catalog.js or elsewhere
  document.addEventListener('cart:updated', function (e) {
    items = (e.detail || []).map(normalizeItem);
    render();
  });

  // ─── Init ───────────────────────────────────────────────────────────────────
  function init() {
    items = loadCart();
    render();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

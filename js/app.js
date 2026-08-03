/**
 * JC Electrónica — Global App JavaScript
 *
 * Shared behavior for all pages: logout, mobile menu, toast notifications.
 * Page-specific logic lives in separate files (catalog.js, cart.js, etc.).
 */

(function () {
  'use strict';

  // ─── Mobile Menu Toggle ────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var menuBtn = document.getElementById('mobile-menu-btn');
    var mobileMenu = document.getElementById('mobile-menu');

    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', function () {
        mobileMenu.classList.toggle('hidden');
        var icon = menuBtn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-bars');
          icon.classList.toggle('fa-xmark');
        }
      });
    }

    // Mobile cart buttons (open drawer via Cart module)
    var cartIconMobile = document.getElementById('cart-icon-mobile');
    if (cartIconMobile && window.Cart) {
      cartIconMobile.addEventListener('click', function () { window.Cart.open(); });
    }
    var mobileCartBtn = document.getElementById('cart-icon-btn-mobile');
    if (mobileCartBtn && window.Cart) {
      mobileCartBtn.addEventListener('click', function () {
        window.Cart.open();
        if (mobileMenu) mobileMenu.classList.add('hidden');
      });
    }
  });

  // ─── Toast Notification System ─────────────────────────────────────────
  function showToast(message, type) {
    type = type || 'info';

    const colors = {
      info: 'bg-blue-500',
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500 text-gray-900',
    };

    const toast = document.createElement('div');
    toast.className =
      'toast-container fixed top-4 right-4 px-5 py-3 rounded-lg text-white text-sm shadow-lg transition-all duration-300 ' +
      (colors[type] || colors.info);
    toast.textContent = message;
    toast.style.transform = 'translateX(120%)';

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(function () {
      toast.style.transform = 'translateX(0)';
    });

    // Auto-remove after 3s
    setTimeout(function () {
      toast.style.transform = 'translateX(120%)';
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // Expose globally so page-specific scripts can use it
  window.showToast = showToast;
})();

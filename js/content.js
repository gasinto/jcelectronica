/**
 * JC Electrónica — Contenido dinámico (FAQ)
 *
 * Carga secciones de contenido gestionadas desde "Mi Página" (JC Plataforma):
 *   - GET /faq     → sección de Preguntas Frecuentes (visible + JSON-LD).
 *
 * Las FALLAS COMUNES son estáticas (decision 2026-08-07): viven en el HTML
 * de cada página, no se cargan desde la API.
 *
 * Estrategia SEO-safe: si la API devuelve datos, se renderizan; si falla o
 * viene vacía, se DEJA el HTML estático existente (fallback). Así el sitio
 * nunca queda sin contenido y Google siempre ve algo indexable.
 */
(function () {
  'use strict';

  var API = (window.JC_CONFIG && window.JC_CONFIG.API_URL) || 'https://jc-plataforma-production.up.railway.app/api/public';
  var WHATSAPP = (window.JC_CONFIG && window.JC_CONFIG.WHATSAPP_NUMBER) || '5491153348030';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── FAQ ────────────────────────────────────────────────────────────────
  async function loadFaq() {
    var list = document.getElementById('faq-list');
    if (!list) return;

    // Cada página declara su bloque de FAQ con data-faq-bloque en <body>.
    // Sin atributo → bloque general (''), que es el FAQ de la home.
    var bloque = document.body.getAttribute('data-faq-bloque') || '';
    var qs = bloque ? '?bloque=' + encodeURIComponent(bloque) : '';

    try {
      var res = await fetch(API + '/faq' + qs);
      var data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return; // fallback: HTML estático

      var items = data.map(function (f) {
        return '<details class="bg-gray-50 rounded-xl border border-gray-100 p-5">'
          + '<summary class="font-semibold text-gray-900 cursor-pointer">' + esc(f.pregunta) + '</summary>'
          + '<p class="text-sm text-gray-600 mt-2 whitespace-pre-line">' + esc(f.respuesta) + '</p>'
          + '</details>';
      }).join('');
      list.innerHTML = items;

      // Regenerar JSON-LD FAQPage (para mantener consistencia con el HTML visible).
      // Si no existe ningún script FAQPage en la página, se CREA uno (las páginas
      // ya no llevan FAQ hardcodeado; todo vive en la API de la plataforma).
      var schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: data.map(function (f) {
          return {
            '@type': 'Question',
            name: f.pregunta,
            acceptedAnswer: { '@type': 'Answer', text: f.respuesta }
          };
        })
      };
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      var reemplazado = false;
      for (var i = 0; i < scripts.length; i++) {
        var raw = scripts[i].textContent || '';
        if (raw.indexOf('FAQPage') === -1) continue;
        scripts[i].textContent = JSON.stringify(schema);
        reemplazado = true;
        break;
      }
      if (!reemplazado) {
        var nuevo = document.createElement('script');
        nuevo.type = 'application/ld+json';
        nuevo.textContent = JSON.stringify(schema);
        document.head.appendChild(nuevo);
      }
    } catch (err) {
      console.error('[CONTENT] FAQ error:', err);
      // fallback: no tocar el HTML estático
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadFaq();
  });
})();

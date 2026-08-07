/**
 * JC Electrónica — Contenido dinámico (Fallas Comunes + FAQ)
 *
 * Carga secciones de contenido gestionadas desde "Mi Página" (JC Plataforma):
 *   - GET /fallas  → sección "Las Fallas Que Más Vemos" (home) y grids de
 *                    fallas por tipo de equipo en páginas de servicio.
 *   - GET /faq     → sección de Preguntas Frecuentes (visible + JSON-LD).
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

  // ─── Fallas comunes ─────────────────────────────────────────────────────
  async function loadFallas() {
    var grid = document.getElementById('fallas-grid');
    if (!grid) return;

    var tipoEquipo = document.body.getAttribute('data-tipo-equipo') || '';
    var qs = tipoEquipo ? '?tipo_equipo=' + encodeURIComponent(tipoEquipo) : '';

    try {
      var res = await fetch(API + '/fallas' + qs);
      var data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return; // fallback: HTML estático

      // Red de seguridad: deduplicar por título (evita copias repetidas
      // si la API llegara a devolver seeds duplicados).
      var vistos = {};
      data = data.filter(function (f) {
        var key = (f.titulo || '').toLowerCase().trim();
        if (!key || vistos[key]) return false;
        vistos[key] = true;
        return true;
      });

      var cards = data.map(function (f) {
        var waText = f.whatsapp_texto || ('Quiero un turno por: ' + (f.titulo || ''));
        var link = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hola! ' + waText);
        return '<div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">'
          + '<div class="text-3xl mb-3">' + esc(f.icono || '🔧') + '</div>'
          + '<h3 class="font-semibold text-gray-900">' + esc(f.titulo) + '</h3>'
          + (f.descripcion ? '<p class="text-sm text-gray-500 mt-1">' + esc(f.descripcion) + '</p>' : '')
          + '<a href="' + link + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-green-600 text-sm font-medium mt-3 hover:text-green-700 transition-colors"><i class="fa-brands fa-whatsapp"></i> Consultar por esta falla <i class="fa-solid fa-arrow-right"></i></a>'
          + '</div>';
      }).join('');

      grid.innerHTML = cards;
    } catch (err) {
      console.error('[CONTENT] Fallas error:', err);
      // fallback: no tocar el HTML estático
    }
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

      // Regenerar JSON-LD FAQPage (para mantener consistencia con el HTML visible)
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        var raw = scripts[i].textContent || '';
        if (raw.indexOf('FAQPage') === -1) continue;
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
        scripts[i].textContent = JSON.stringify(schema);
        break;
      }
    } catch (err) {
      console.error('[CONTENT] FAQ error:', err);
      // fallback: no tocar el HTML estático
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadFallas();
    loadFaq();
  });
})();

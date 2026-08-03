/**
 * JC Electrónica — Site Configuration (static site on Vercel)
 *
 * Single source of truth for API endpoints and business data.
 * The backend lives in JC Plataforma (JC SaaS) — this static site only
 * consumes its public JSON API.
 */

window.JC_CONFIG = {
  // Public API base (JC Plataforma on Railway)
  API_URL: 'https://jc-plataforma-production.up.railway.app/api/public',

  // Business data (for WhatsApp CTAs, JSON-LD, etc.)
  WHATSAPP_NUMBER: '5491153348030',
  WHATSAPP_DISPLAY: '+54 9 11 5334-8030',
  EMAIL: 'info@jcelectronica.com.ar',
  ADDRESS: 'De Colón 2270, Pontevedra, Merlo, Buenos Aires',
  HOURS: 'Lu a Sá: 10:00 - 20:00',
  MAPS_URL: 'https://maps.google.com/?q=De+Colon+2270,+Merlo,+Buenos+Aires',
  INSTAGRAM: 'https://instagram.com/',
  TIKTOK: 'https://tiktok.com/',

  // Tenant id of JC Electrónica in JC Plataforma (testimonials filter)
  EMPRESA_ID: 7,

  // Catalog default image when a product has no image
  DEFAULT_IMAGE: '/img/logo.jpg',
};

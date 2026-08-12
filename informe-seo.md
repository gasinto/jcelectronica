# Informe de Auditoría e Implementación SEO — JC Electrónica

**Fecha:** 12 de agosto de 2026
**Proyecto:** `jcelectronica-sitio` (sitio estático HTML/CSS/JS, desplegado en Vercel)
**Dominio canónico:** https://www.jcelectronica.com.ar
**Commit:** `ecb453d` — `feat: optimize technical and local SEO`

---

## Resumen ejecutivo

Se realizó una auditoría SEO técnica y local completa del sitio y se aplicaron directamente las mejoras en los archivos. El objetivo no fue garantizar posiciones, sino dejar el sitio técnicamente correcto para que Google pueda rastrear, indexar y entender los servicios y la ubicación del negocio, sin inventar información.

Resultado: migración completa del dominio canónico a `www`, sitemap y robots correctos, titles/descriptions únicos en todas las páginas públicas, structured data consistente con el contenido visible, y cero cambios sobre funcionalidad (JS, formularios, catálogo, turnos) ni diseño visual.

---

## Archivos modificados (24)

### HTML (22)
| Archivo | Cambio principal |
| --- | --- |
| `index.html` | Dominio www, title/description recortados, schema corregido (logo %20, sin `sameAs` vacío) |
| `servicios.html` | Dominio www, FAQPage agregada, diagnóstico uniformado a 24–48 hs (schema + visible) |
| `servicio-notebook.html` | Dominio www, title/description únicos |
| `servicio-pc.html` | Dominio www, `url` de schema corregida, OfferCatalog ajustado a PC |
| `servicio-consolas.html` | Dominio www, `url` de schema corregida, OfferCatalog ajustado a consolas |
| `servicio-celulares.html` | Dominio www, `url` de schema corregida, OfferCatalog ajustado a celulares |
| `servicio-tv.html` | Dominio www, `url` de schema corregida, OfferCatalog ajustado a TV |
| `servicio-parlantes.html` | Dominio www, `url` de schema corregida, OfferCatalog ajustado a parlantes |
| `reparacion-placa-madre.html` | Dominio www, description recortada a 145 caracteres |
| `reparacion-carcasa-bisagras.html` | Dominio www, title/description únicos |
| `cambio-pantalla-notebook.html` | Dominio www, title/description únicos |
| `cambio-teclado-notebook.html` | Dominio www, title/description únicos |
| `cambio-bateria-notebook.html` | Dominio www, title/description únicos |
| `cambio-ssd-notebook.html` | Dominio www, title/description únicos |
| `limpieza-pasta-termica.html` | Dominio www, title/description únicos |
| `memoria-ram-notebook.html` | Dominio www, title/description únicos |
| `que-gama-es-mi-notebook.html` | Dominio www, title/description únicos |
| `catalogo.html` | Dominio www, OG/schema corregidos |
| `precios.html` | Dominio www, OG/schema corregidos |
| `turnos.html` | Dominio www, OG/schema corregidos |
| `envios.html` | Dominio www, OG/schema corregidos |
| `condiciones.html` | Dominio www, agregada al sitemap, og:description |

### Otros (2)
- `sitemap.xml` — 22 URLs con `www`
- `robots.txt` — sitemap con `www`

### No modificados
`clasificador.html` (noindex), `gremio.html` (exclusiva, no pública), todos los `js/*`, `css/*`, `img/*`, `vercel.json`.

---

## SEO técnico

- **Dominio canónico:** migración completa de `https://jcelectronica.com.ar` a `https://www.jcelectronica.com.ar`. Verificado: **0 ocurrencias** de URL sin `www` en todo el repo (las únicas restantes son el email `info@jcelectronica.com.ar`, intencional).
- **Schema JSON-LD corregido:**
  - Las páginas de servicio de dispositivos (PC, consolas, celulares, TV, parlantes) tenían `url` apuntando a `servicio-notebook.html` — corregidas a su propia URL.
  - Los `OfferCatalog` estaban copiados de notebooks (p. ej. "cambio de teclado y batería" en la página de celulares) — reescritos con contenido apropiado a cada dispositivo, consistente con la página.
- **Inconsistencia corregida:** el diagnóstico en `servicios.html` decía "2 a 4 días hábiles" mientras el resto del sitio (index, envios) dice "24 a 48 horas". Se uniformó a **24–48 horas hábiles** tanto en el contenido visible como en el FAQPage schema.
- **Verificación:** XML del sitemap válido, JSON-LD parseable, sin links rotos, sin recursos faltantes, `lang="es"` presente.

---

## SEO local

Se integró únicamente información real existente en el proyecto:

| Dato | Valor |
| --- | --- |
| Nombre comercial | JC Electrónica |
| Dirección | De Colón 2270, Pontevedra, Merlo, Buenos Aires, Argentina |
| Teléfono/WhatsApp | +54 9 11 5334 8030 (E.164: +5491153348030) |
| Email | info@jcelectronica.com.ar |
| Horario | Lunes a sábado, 10:00–20:00 |
| Geo | -34.6553, -58.7358 |
| Garantía | 90 días reparación de placa / 30 días reparaciones generales |

Los términos locales (Merlo, Pontevedra, Buenos Aires) se integraron de forma natural en titles, descriptions y schema. **No se inventó** dirección, horarios, teléfonos, barrios, precios ni datos de contacto.

---

## Sitemap

- **22 URLs**, 100% con `https://www.jcelectronica.com.ar`.
- XML válido; cada `<loc>` fue verificado contra un archivo real existente.
- **Agregado:** `precios.html` (página real y valiosa para búsquedas locales).
- **Excluidos con criterio:**
  - `clasificador.html` — herramienta interactiva interna, marcada noindex.
  - `gremio.html` — página exclusiva para gremio (precios desde API), no es página pública.
  - `condiciones.html` — incluida (es pública e indexable) con prioridad 0.3 y frecuencia mensual.

---

## Robots.txt

- Existe y quedó correcto:
  ```
  User-agent: *
  Allow: /

  Sitemap: https://www.jcelectronica.com.ar/sitemap.xml
  ```
- Permite rastreo completo. No bloquea CSS, JS, imágenes ni páginas públicas.

---

## Canonical

- Las **22 páginas públicas** tienen `<link rel="canonical">` self-referencing con dominio `www` (verificado 22/22).
- `clasificador.html` no tiene canonical porque está noindex (herramienta interna).
- Ejemplo: `https://www.jcelectronica.com.ar/servicios.html`

---

## Structured Data (Schema.org)

| Tipo | Dónde |
| --- | --- |
| `ElectronicsStore` / `ComputerRepair` (con NAP completo: dirección, teléfono, horario, geo) | Home (`index.html`) |
| `WebSite` + `SearchAction` | Home |
| `FAQPage` | Home y `servicios.html` |
| `Service` | Páginas de servicios y subservicios |

Todas las URLs internas del schema usan `www`. El schema coincide con el contenido visible de cada página. No se incluyeron ratings, reviews ni precios falsos. Se eliminó el array `"sameAs": []` vacío y se codificó el espacio del logo (`%20`) en las URLs del schema.

---

## Titles / descriptions

- **22 páginas públicas optimizadas.**
- **Titles:** únicos, descriptivos, en español natural, 37–66 caracteres. Sin keyword stuffing. Ejemplos:
  - Home: `JC Electrónica | Servicio Técnico y Notebooks en Merlo` (54)
  - Placa madre: `Reparación de Placa Madre de Notebook | JC Electrónica` (53)
- **Meta descriptions:** únicas, ~133–164 caracteres, orientadas a la intención de búsqueda.
- Se recortaron las que excedían los límites: `index` (title y description), `reparacion-placa-madre` (description), `reparacion-carcasa-bisagras`, `cambio-ssd-notebook`, `limpieza-pasta-termica`, entre otras.

---

## Open Graph

Todas las páginas públicas tienen: `og:type`, `og:title`, `og:description`, `og:url` (absoluta con `www`), `og:image` (absoluta, usando imágenes existentes), `og:locale es_AR` y `og:site_name "JC Electrónica"`. La URL del logo usa `%20` para el espacio en `logo sin fondo.png`.

---

## Enlazado interno

- Sin links internos rotos (verificado con grep sobre todos los `href`/`src`).
- La jerarquía natural ya estaba presente: Inicio → Servicios → servicio → subservicio, con accesos a precios (con anclas), turnos, envíos y condiciones.
- No se agregaron enlaces artificiales ni "link farms".

---

## Contenido

- **Sin páginas delgadas:** todas las páginas de servicio ya cubrían síntomas, qué incluye, proceso (diagnóstico 24–48 hs, presupuesto, garantía), CTA de WhatsApp/turnos y ubicación real.
- No se generó contenido artificial ni se sobrecargó lo existente.
- Único ajuste de contenido: uniformar el plazo de diagnóstico en `servicios.html` (ver SEO técnico).

---

## Imágenes

- Todas las imágenes referenciadas existen en `img/`.
- Los `alt` ya eran descriptivos y en español; sin keyword stuffing. No se requirieron cambios.
- No se renombró ni movió ninguna imagen.

---

## Performance / SEO técnico

- Sin recursos bloqueantes evidentes introducidos.
- No se modificó `vercel.json` (solo cabeceras de caché; sin razón SEO para tocarlo).
- Sin errores HTML importantes, sin 404 internos.
- No se hizo refactorización del proyecto. Prioridad: SEO + estabilidad.

---

## Build

- No existe proceso de build (sitio estático sin framework).
- Verificaciones automatizadas realizadas:
  - XML del sitemap válido ✔
  - 22 URLs del sitemap resuelven a archivos reales ✔
  - 0 URLs sin `www` ✔
  - Titles únicos (sin duplicados) ✔
  - JSON-LD parseable ✔
  - Cero restos de "2 y 4 días" ✔

---

## Git

| Item | Detalle |
| --- | --- |
| Commit | `ecb453d` — `feat: optimize technical and local SEO` |
| Push | ✔ a `origin/main` (https://github.com/gasinto/jcelectronica) |
| Rama | `main` |

**Nota de integración:** al momento del push, el remoto contenía un commit nuevo (`efdb37a` — página gremio con precios y condiciones desde API, que agregó `gremio.html` y modificó `js/services.js`). No había solapamiento de archivos con el trabajo SEO, por lo que se realizó un **rebase limpio sin conflictos**. No se usó force push ni se alteró historial ajeno.

---

## Revisión en doble pasada

El diff completo fue revisado en contexto fresco (revisión adversarial). Hallazgos corregidos antes del commit:
1. `condiciones.html` faltaba en el sitemap (página pública indexable) → agregada.
2. Inconsistencia en plazo de diagnóstico en `servicios.html` → uniformada a 24–48 hs.
3. Meta descriptions de `index` (170) y `reparacion-placa-madre` (178) excedían 160 → recortadas.
4. Title de `index` en 68 caracteres → recortado a 54.
5. URLs del schema del logo sin codificar el espacio → `%20`.
6. Array `sameAs` vacío → eliminado.

---

## Próximos pasos (manuales, en Google Search Console)

1. Subir `https://www.jcelectronica.com.ar/sitemap.xml`.
2. Inspeccionar las URLs clave y solicitar indexación.
3. Analizar cobertura y rendimiento.
4. Monitorear la migración de dominio a `www` (idealmente configurar el dominio preferido en Search Console).

---

## Notas

- `gremio.html` llegó al repo durante la ejecución vía commit remoto. Es una página exclusiva de gremio (precios desde API) y quedó deliberadamente fuera del sitemap y sin optimizar, por no ser una página pública. Si en el futuro debe ser pública, requiere su propia pasada SEO.

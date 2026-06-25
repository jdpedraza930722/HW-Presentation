# Objetivo del proyecto

Crear una presentación ejecutiva de alto impacto utilizando el framework Reveal.js, titulada "Proyecto Nexus: El Ecosistema Jalisco". La presentación está dirigida a la junta directiva china de una empresa de movilidad eléctrica y debe alojarse en Netlify.

El proyecto no es una simple presentación, es una **Aplicación de Presentación Sincronizada y Multilingüe**.

# Arquitectura y Funcionalidades Core (¡CRÍTICO!)

1. **Landing Page de Idioma (Punto de entrada del QR):**
   - Debe existir un `index.html` inicial muy limpio con el logo de la empresa y 3 botones de selección de idioma: Español, English, y 中文 (Mandarín).
   - Al hacer clic en un idioma, el usuario es redirigido a la presentación (ej. `presentation.html?lang=zh`).

2. **Internacionalización (i18n):**
   - La presentación debe cargar los textos dinámicamente según el parámetro de la URL (`?lang=es|en|zh`).
   - Usa un archivo JSON (ej. `translations.json`) o un objeto JS centralizado con los textos en los 3 idiomas.
   - Usa atributos data en el HTML (ej. `<h1 data-i18n="slide1_title"></h1>`) para que un script de JS inyecte el texto correcto al cargar.

3. **Sincronización en Tiempo Real (Reveal.js Multiplex):**
   - Implementa el plugin `multiplex` de Reveal.js.
   - **Rol Presentador (Master):** Tendrá una URL secreta (o un token en el LocalStorage/URL) que le permitirá cambiar las diapositivas.
   - **Rol Audiencia (Client):** Los directivos que entran vía el código QR serán "Clientes". Su interfaz NO debe tener controles de navegación (flechas ocultas, teclado deshabilitado). Sus pantallas deben cambiar automáticamente cuando el Presentador cambie de diapositiva.
   - Dado que se alojará en Netlify (estático), utiliza el servidor público de multiplexing de Reveal.js (`https://reveal-multiplex.glitch.me/`) o configura un cliente de WebSockets ligero (como Socket.io-client) apuntando a un servidor público de prueba si es necesario.

# Contexto del Contenido
El contenido incluye 10 secciones (desde "La Agenda" hasta "El Impacto Financiero"). El diseño debe ser moderno, tecnológico (estilo Dark Mode / Cyber-Corporate) y minimalista.

- No satures las diapositivas con texto.
- Usa notas del orador (`<aside class="notes">`) solo para la versión del presentador.
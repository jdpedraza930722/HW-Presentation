# Paleta de colores (usar exactamente estos valores)

- Dark Space — #050505 (Fondo principal de la presentación)
- Honey Yellow — #FDCB09 (Color primario de acción / Acentos / Branding)
- Tech Glass — rgba(17, 17, 17, 0.7) (Fondo para tarjetas y paneles)
- Text Primary — #E0E0E0 (Texto general)
- Text Secondary — #A0A0A0 (Subtítulos o texto secundario)

# Tipografía

- Uso obligatorio de la familia tipográfica 'Inter', sans-serif, o alternativamente 'SF Pro Display'.
- Títulos: Bold y en mayúsculas o capitalizados, destacando palabras clave en color Honey Yellow.

# Prioridades de Desarrollo y Estructura

1. **Modularidad:** 
   - `index.html` (Landing de selección de idioma).
   - `presentation.html` (La presentación Reveal.js).
   - `js/translations.js` (Diccionario de los 3 idiomas: Español, Inglés, Mandarín).
   - `js/main.js` (Lógica de inicialización de Reveal.js, Multiplex y traducción dinámica).
2. **UX de la Audiencia:** El modo cliente debe ocultar los controles de Reveal.js (`controls: false, keyboard: false, touch: false`).
3. **No uses frameworks pesados (React/Next.js):** Mantén el proyecto en Vanilla JS, HTML y CSS para facilitar el despliegue directo y rápido en Netlify.

# Estilos Personalizados y UI (Requerido)

El diseño debe incorporar un estilo "Glassmorphism" para los contenedores, apoyándose en los siguientes estilos base:

```css
:root {
  --brand-yellow: #FDCB09;
  --dark-bg: #050505;
  --glass-bg: rgba(17, 17, 17, 0.7);
  --glass-border: rgba(253, 203, 9, 0.15);
}

body {
  background-color: var(--dark-bg);
  color: #E0E0E0;
  font-family: 'Inter', sans-serif;
}

/* Landing Page (QR Entry) Styles */
.language-selector {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.lang-btn {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}
.lang-btn:hover {
  border-color: var(--brand-yellow);
  color: var(--brand-yellow);
}

/* Glassmorphism utility para paneles de la presentación */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
  border-radius: 1rem;
  padding: 1.5rem;
}

/* Animaciones */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0; 
}
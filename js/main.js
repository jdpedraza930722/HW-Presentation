document.addEventListener('DOMContentLoaded', () => {
  // 1. Obtener idioma y rol de la URL
  const urlParams = new URLSearchParams(window.location.search);
  let rawLang = urlParams.get('lang') || 'es';
  // Limpiar si el usuario escribió mal los parámetros (ej. ?lang=es?role=master)
  if (rawLang.includes('?')) rawLang = rawLang.split('?')[0];
  if (rawLang.includes('&')) rawLang = rawLang.split('&')[0];
  
  let lang = ['es', 'en', 'zh'].includes(rawLang) ? rawLang : 'es';
  const isMaster = urlParams.get('role') === 'master' || localStorage.getItem('hw_presenter') === 'true';
  
  // 2. Función para inyectar traducciones dinámicamente
  function applyTranslations(currentLang) {
    if (typeof translations !== 'undefined' && translations[currentLang]) {
      const dict = translations[currentLang];
      
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          el.innerHTML = dict[key];
        }
      });
      
      if (dict['app_title']) {
        document.title = dict['app_title'];
        document.documentElement.lang = currentLang;
      }

      // Actualizar el UI del switcher
      document.querySelectorAll('.floating-lang-switcher a').forEach(a => {
        a.classList.remove('active');
        if(a.getAttribute('data-set-lang') === currentLang) {
          a.classList.add('active');
        }
      });
    }
  }

  // Aplicar traducciones iniciales
  applyTranslations(lang);

  // Escuchar clics en el switcher de idiomas
  document.querySelectorAll('.floating-lang-switcher a').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const selectedLang = btn.getAttribute('data-set-lang');
      applyTranslations(selectedLang);
      
      // Actualizar URL sin recargar la página
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('lang', selectedLang);
      window.history.replaceState({}, '', newUrl);
    });
  });

  // 3. Inicializar Reveal.js PRIMERO
  Reveal.initialize({
    hash: true,
    // Configuración de UX según guidelines
    controls: isMaster,
    keyboard: isMaster,
    touch: isMaster,
    // Configuración responsiva para que ocupe toda la pantalla y no se vea borroso
    width: "100%",
    height: "100%",
    margin: 0.05,
    minScale: 1,
    maxScale: 1,
    plugins: [ RevealNotes ],
    
    // Configuración de Multiplexing
    multiplex: {
      // Token secreto para el master. Para clientes debe ser null.
      secret: isMaster ? '42c84700044e4daba56236eecc78faf8' : null, 
      id: 'bdb2e4378ab5102f37916662d7f7d1da0698a0f95cb3c39e50e7ad4d4a2a9201', // Obtenido de railway.app
      url: 'https://multiplex.up.railway.app/'
    }
  });

  // 4. Helper para cargar scripts del Multiplex de manera dinámica
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // 5. Cargar Socket.io y luego el plugin de cliente o máster (después de inicializar Reveal)
  loadScript('https://multiplex.up.railway.app/socket.io/socket.io.js')
    .then(() => {
      const roleScript = isMaster ? 'https://multiplex.up.railway.app/master.js' : 'https://multiplex.up.railway.app/client.js';
      return loadScript(roleScript);
    })
    .catch(err => {
      console.warn("Fallo al cargar Multiplex script", err);
    });
});

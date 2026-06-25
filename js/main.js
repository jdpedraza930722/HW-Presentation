document.addEventListener('DOMContentLoaded', () => {
  // 1. Obtener idioma y rol de la URL
  const urlParams = new URLSearchParams(window.location.search);
  let rawLang = urlParams.get('lang') || 'es';
  // Limpiar si el usuario escribió mal los parámetros (ej. ?lang=es?role=master)
  if (rawLang.includes('?')) rawLang = rawLang.split('?')[0];
  if (rawLang.includes('&')) rawLang = rawLang.split('&')[0];
  
  let lang = ['es', 'en', 'zh'].includes(rawLang) ? rawLang : 'es';
  const isMaster = urlParams.get('role') === 'master' || localStorage.getItem('hw_presenter') === 'true';
  
  if (isMaster) {
    document.body.classList.add('is-master');
  } else {
    document.body.classList.add('is-client');
  }
  
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
      
      if (typeof updateChartLanguage === 'function') {
        updateChartLanguage(currentLang);
      }
    }
  }

  // Aplicar traducciones iniciales
  applyTranslations(lang);

  const langSwitcher = document.querySelector('.floating-lang-switcher');
  
  // Toggle expanded state on mobile
  langSwitcher.addEventListener('click', (e) => {
    // Si no se hizo clic exactamente en una etiqueta 'a', se expande/contrae
    if (e.target.tagName !== 'A') {
      langSwitcher.classList.toggle('expanded');
    }
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!langSwitcher.contains(e.target)) {
      langSwitcher.classList.remove('expanded');
    }
  });

  // Escuchar clics en el switcher de idiomas
  document.querySelectorAll('.floating-lang-switcher a').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Si hacemos clic en el idioma activo, y estamos en móvil, actuamos como toggle
      if (btn.classList.contains('active')) {
        langSwitcher.classList.toggle('expanded');
        return;
      }

      const selectedLang = btn.getAttribute('data-set-lang');
      applyTranslations(selectedLang);
      
      // Actualizar URL sin recargar la página
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('lang', selectedLang);
      window.history.replaceState({}, '', newUrl);

      // Colapsar el menú tras seleccionar
      langSwitcher.classList.remove('expanded');
    });
  });

  // 3. Inicializar Reveal.js PRIMERO
  Reveal.initialize({
    // hash solo en master; en clientes lo desactivamos para evitar
    // eventos extra de navegación que rompan la sincronización
    hash: isMaster,
    // Configuración de UX según guidelines
    controls: isMaster,
    keyboard: isMaster,
    touch: false,  // desactivado para todos — el cliente no debe poder navegar
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

  // La gráfica SOLO se inicializa/reinicializa en el maestro.
  // En el cliente NO tocamos Chart.js para evitar errores de JS que
  // interrumpirían el listener del socket del multiplex causando desync.
  if (isMaster) {
    setTimeout(() => {
      try {
        initScissorsChart();
        updateChartLanguage(lang);
      } catch(e) {
        console.warn('Chart init error:', e);
      }
    }, 500);

    // Re-animar la gráfica cada vez que se muestra ese slide
    Reveal.on('slidechanged', event => {
      try {
        if (event.currentSlide.querySelector('#scissorsChart')) {
          if (scissorsChart) scissorsChart.destroy();
          initScissorsChart();
          updateChartLanguage(lang);
        }
      } catch(e) {
        console.warn('Chart slidechanged error:', e);
      }
    });
  }
});

// --- CHART LOGIC ---
let scissorsChart;

function toChineseNumeral(num) {
  if (num === 0) return '零';
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (num < 10) return digits[num];
  if (num < 20) return '十' + (num % 10 === 0 ? '' : digits[num % 10]);
  if (num < 100) return digits[Math.floor(num / 10)] + '十' + (num % 10 === 0 ? '' : digits[num % 10]);
  if (num < 1000) {
    let result = digits[Math.floor(num / 100)] + '百';
    let rem = num % 100;
    if (rem === 0) return result;
    if (rem < 10) return result + '零' + digits[rem];
    return result + (Math.floor(rem / 10) === 1 ? '一十' : digits[Math.floor(rem / 10)] + '十') + (rem % 10 === 0 ? '' : digits[rem % 10]);
  }
  return num.toString();
}

function initScissorsChart() {
  const canvas = document.getElementById('scissorsChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5 (Regulación)', 'Q6', 'Q7', 'Q8'];
  const dataSales = [100, 105, 110, 115, 80, 60, 45, 30];
  const dataEcosystem = [10, 20, 35, 55, 85, 120, 160, 210];
  
  scissorsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Ventas sin Ecosistema (Regulación)',
          data: dataSales,
          borderColor: 'rgba(150, 150, 150, 0.8)',
          backgroundColor: 'rgba(150, 150, 150, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Ingresos por Base Propia y Postventa',
          data: dataEcosystem,
          borderColor: '#38BDF8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          borderWidth: 4,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { 
            color: 'rgba(255, 255, 255, 0.8)',
            font: { size: 14, family: "'Inter', sans-serif" }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                const isZh = document.documentElement.lang === 'zh';
                label += isZh ? toChineseNumeral(context.parsed.y) : context.parsed.y;
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: { 
          ticks: { color: 'rgba(255, 255, 255, 0.5)' }, 
          grid: { color: 'rgba(255,255,255,0.05)' } 
        },
        y: { 
          ticks: { 
            color: 'rgba(255, 255, 255, 0.5)',
            callback: function(value) {
              return document.documentElement.lang === 'zh' ? toChineseNumeral(value) : value;
            }
          }, 
          grid: { color: 'rgba(255,255,255,0.05)' } 
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

function updateChartLanguage(currentLang) {
  if (scissorsChart && typeof translations !== 'undefined' && translations[currentLang]) {
    scissorsChart.data.datasets[0].label = translations[currentLang].slide2_chart_label_1;
    scissorsChart.data.datasets[1].label = translations[currentLang].slide2_chart_label_2;
    if (translations[currentLang].slide2_chart_x_labels) {
      scissorsChart.data.labels = translations[currentLang].slide2_chart_x_labels;
    }
    scissorsChart.update();
  }
}

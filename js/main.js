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
        if (a.getAttribute('data-set-lang') === currentLang) {
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

  // 3. Inicializar Reveal.js y ESPERAR a que termine antes de conectar multiplex
  Reveal.initialize({
    hash: isMaster,
    controls: isMaster,
    keyboard: isMaster,
    touch: false,
    scrollActivationWidth: null,
    width: "100%",
    height: "100%",
    margin: 0.05,
    minScale: 1,
    maxScale: 1,
    plugins: [RevealNotes],
    multiplex: {
      secret: isMaster ? '42c84700044e4daba56236eecc78faf8' : null,
      id: 'bdb2e4378ab5102f37916662d7f7d1da0698a0f95cb3c39e50e7ad4d4a2a9201',
      url: 'https://multiplex.up.railway.app/'
    }
  }).then(() => {
    // Reveal.js está 100% listo. Ahora conectar multiplex.
    console.log('[Multiplex] Reveal ready. Role:', isMaster ? 'MASTER' : 'CLIENT');

    var multiplex = Reveal.getConfig().multiplex;
    var socket = io.connect(multiplex.url);

    socket.on('connect', () => {
      console.log('[Multiplex] Socket connected!');
    });

    if (isMaster) {
      // === MASTER: enviar estado en cada cambio ===
      var lastSentH = -1;
      var lastSentV = -1;
      var lastSentF = -1;

      function postState(evt) {
        var state = Reveal.getState();
        // Debounce: no enviar si el estado es idéntico al último enviado
        if (state.indexh === lastSentH && state.indexv === lastSentV && state.indexf === lastSentF) {
          console.log('[Master] Skipped duplicate state:', state.indexh);
          return;
        }
        lastSentH = state.indexh;
        lastSentV = state.indexv;
        lastSentF = state.indexf;

        var messageData = {
          state: state,
          secret: multiplex.secret,
          socketId: multiplex.id,
          content: (evt || {}).content
        };
        socket.emit('multiplex-statechanged', messageData);
        console.log('[Master] Sent state:', state.indexh);
      }

      Reveal.on('slidechanged', postState);
      Reveal.on('fragmentshown', postState);
      Reveal.on('fragmenthidden', postState);

      // Enviar estado inicial
      postState();

      // Re-animar gráfica al volver a su slide
      Reveal.on('slidechanged', event => {
        try {
          if (event.currentSlide.querySelector('#scissorsChart')) {
            if (scissorsChart) scissorsChart.destroy();
            initScissorsChart();
            updateChartLanguage(lang);
          }
        } catch (e) {
          console.warn('Chart slidechanged error:', e);
        }
      });

    } else {
      // === CLIENT: recibir estado del master ===
      socket.on(multiplex.id, function (message) {
        if (message.socketId !== multiplex.id) return;
        if (message.state) {
          // Solo aplicar si el slide es diferente al actual
          var currentState = Reveal.getState();
          if (message.state.indexh !== currentState.indexh ||
            message.state.indexv !== currentState.indexv ||
            message.state.indexf !== currentState.indexf) {
            console.log("State: " + message.state);
            console.log('[Client] Moving to slide:', message.state.indexh, '(was:', currentState.indexh, ')');
            Reveal.setState(message.state);
          } else {
            console.log('[Client] Already on slide:', message.state.indexh, '- skipping');
          }
        }
      });
    }

    // Inicializar gráfica en todos los dispositivos
    try {
      initScissorsChart();
      updateChartLanguage(lang);
    } catch (e) {
      console.warn('Chart init error:', e);
    }
  });
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
            label: function (context) {
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
            callback: function (value) {
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

// -----------------------------------------------------------------------------
// SCREEN WAKE LOCK API (Evita que el celular se apague durante la presentación)
// -----------------------------------------------------------------------------
let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Screen Wake Lock liberado');
      });
      console.log('Screen Wake Lock activado: Pantalla siempre encendida');
    }
  } catch (err) {
    console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
  }
}

// Solicitar al inicio
document.addEventListener('DOMContentLoaded', () => {
  requestWakeLock();
});

// Volver a solicitar si la pestaña se oculta y vuelve a mostrarse
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    requestWakeLock();
  }
});

// Reproducir video a pantalla completa
window.playFullscreenVideo = function(videoUrl) {
  const video = document.createElement('video');
  video.src = videoUrl;
  video.controls = true;
  video.style.position = 'fixed';
  video.style.top = '0';
  video.style.left = '0';
  video.style.width = '100vw';
  video.style.height = '100vh';
  video.style.backgroundColor = 'black';
  video.style.zIndex = '9999';
  
  document.body.appendChild(video);
  
  video.play().catch(e => console.error("Error reproduciendo el video:", e));
  
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) {
    video.webkitRequestFullscreen();
  } else if (video.msRequestFullscreen) {
    video.msRequestFullscreen();
  }
  
  const removeVideo = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if(video.parentNode) {
            video.parentNode.removeChild(video);
        }
    }
  };
  
  video.addEventListener('fullscreenchange', removeVideo);
  video.addEventListener('webkitfullscreenchange', removeVideo);
  video.addEventListener('ended', () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(()=>{});
    }
    if(video.parentNode) {
      video.parentNode.removeChild(video);
    }
  });
};

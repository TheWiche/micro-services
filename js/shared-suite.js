/**
 * WebTools Suite — Script Central Compartido
 * Gestión de tema (Dark/Light), navegación unificada, conmutador rápido de herramientas y recents.
 * 100% Client-Side en el Navegador
 */

(function () {
  'use strict';

  // ===========================================================================
  // CATÁLOGO MAESTRO DE HERRAMIENTAS
  // ===========================================================================
  const SUITE_TOOLS = [
    {
      id: '01',
      dir: '01-quitar-fondo',
      name: 'Eliminador de Fondos con IA',
      shortName: 'Quitar Fondo IA',
      icon: '🪄',
      category: 'imagen-ia',
      categoryLabel: 'Imágenes e IA',
      desc: 'Quita el fondo de fotos al instante con WebAssembly y ONNX.',
      keywords: 'quitar fondo background transparente ia'
    },
    {
      id: '02',
      dir: '02-conversor-imagenes',
      name: 'Conversor HEIC/WEBP a PNG/JPG',
      shortName: 'Conversor de Imágenes',
      icon: '🔄',
      category: 'imagen-ia',
      categoryLabel: 'Imágenes e IA',
      desc: 'Convierte fotos de iPhone (HEIC), WebP y AVIF a JPG o PNG.',
      keywords: 'conversor heic webp avif png jpg lote'
    },
    {
      id: '03',
      dir: '03-vectorizador-svg',
      name: 'Vectorizador PNG a SVG',
      shortName: 'Vectorizador SVG',
      icon: '📐',
      category: 'imagen-ia',
      categoryLabel: 'Imágenes e IA',
      desc: 'Convierte bitmaps, firmas y logos a vectores SVG escalables.',
      keywords: 'vectorizador svg trazar logo firma bitmap'
    },
    {
      id: '04',
      dir: '04-censurador-rostros',
      name: 'Censurador de Rostros y Datos',
      shortName: 'Censurador de Rostros',
      icon: '🛡️',
      category: 'documentos',
      categoryLabel: 'Documentos y Privacidad',
      desc: 'Detecta caras con IA y aplica pixelado o barra negra.',
      keywords: 'censurador cara rostro pixelar desenfoque matricula'
    },
    {
      id: '05',
      dir: '05-generador-favicons',
      name: 'Generador de Paquetes Favicon',
      shortName: 'Generador de Favicons',
      icon: '⭐',
      category: 'imagen-ia',
      categoryLabel: 'Imágenes e IA',
      desc: 'Crea favicons multiformato para Web, iOS y Android en ZIP.',
      keywords: 'favicon ico web icon apple touch manifest pwa'
    },
    {
      id: '06',
      dir: '06-extractor-colores',
      name: 'Extractor de Paletas y CSS',
      shortName: 'Extractor de Colores',
      icon: '🎨',
      category: 'imagen-ia',
      categoryLabel: 'Imágenes e IA',
      desc: 'Extrae colores dominantes, gradientes y cuentagotas en vivo.',
      keywords: 'extractor color paleta hex rgb hsl gradiente eyedropper'
    },
    {
      id: '07',
      dir: '07-ocr-texto',
      name: 'Extractor de Texto OCR',
      shortName: 'OCR de Texto',
      icon: '📄',
      category: 'documentos',
      categoryLabel: 'Documentos y Privacidad',
      desc: 'Reconoce texto editable en imágenes y capturas con Tesseract.',
      keywords: 'ocr texto reconocimiento optico escanear recibo documento'
    },
    {
      id: '08',
      dir: '08-limpiador-exif',
      name: 'Limpiador de Metadatos EXIF/GPS',
      shortName: 'Limpiador EXIF',
      icon: '📍',
      category: 'documentos',
      categoryLabel: 'Documentos y Privacidad',
      desc: 'Inspecciona y borra metadatos de cámara y ubicación GPS.',
      keywords: 'exif gps metadatos privacidad ubicacion borrar'
    },
    {
      id: '09',
      dir: '09-herramientas-pdf',
      name: 'Unir, Dividir y Comprimir PDF',
      shortName: 'Herramientas PDF',
      icon: '📑',
      category: 'documentos',
      categoryLabel: 'Documentos y Privacidad',
      desc: 'Fusiona, extrae páginas y optimiza documentos PDF en memoria.',
      keywords: 'pdf unir merge dividir extract split comprimir optimizar'
    },
    {
      id: '10',
      dir: '10-lector-qr',
      name: 'Escáner y Generador de QR',
      shortName: 'Lector y Generador QR',
      icon: '📱',
      category: 'documentos',
      categoryLabel: 'Documentos y Privacidad',
      desc: 'Decodifica códigos QR desde imágenes o genera nuevos.',
      keywords: 'qr lector escanear generar codigo barcode captura'
    },
    {
      id: '11',
      dir: '11-compresor-video',
      name: 'Compresor de Video (WhatsApp/Discord)',
      shortName: 'Compresor de Video',
      icon: '🎬',
      category: 'multimedia',
      categoryLabel: 'Video y Audio',
      desc: 'Reduce el peso de videos MP4/MOV con Canvas y MediaRecorder.',
      keywords: 'video compresor discord whatsapp mp4 mov webm reducir'
    },
    {
      id: '12',
      dir: '12-extractor-audio',
      name: 'Extractor de Audio MP4 a MP3',
      shortName: 'Extractor de Audio',
      icon: '🎵',
      category: 'multimedia',
      categoryLabel: 'Video y Audio',
      desc: 'Extrae pistas de sonido y codifica a MP3 ligero en el navegador.',
      keywords: 'extractor audio mp3 sonido mp4 wav lamejs web audio'
    }
  ];

  // ===========================================================================
  // DETECCIÓN DE CONTEXTO (RAÍZ VS HERRAMIENTA)
  // ===========================================================================
  const pathname = window.location.pathname.replace(/\\/g, '/');
  let currentTool = null;
  let isCatalog = true;
  let rootRelPath = './';

  for (const t of SUITE_TOOLS) {
    if (pathname.includes('/' + t.dir) || pathname.endsWith(t.dir) || pathname.includes(t.dir + '/')) {
      currentTool = t;
      isCatalog = false;
      rootRelPath = '../';
      break;
    }
  }

  // ===========================================================================
  // GESTIÓN DE TEMA (DARK / LIGHT) CON SINCRONIZACIÓN LOCALSTORAGE
  // ===========================================================================
  const LS_THEME_KEY = 'webtools-theme';

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem('webtools-theme') || localStorage.getItem('theme') || getSystemTheme();
    } catch (_) {
      return getSystemTheme();
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body && document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body && document.body.classList.remove('dark');
    }
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    try {
      localStorage.setItem('webtools-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    } catch (_) {}
    applyTheme(newTheme);
  }

  function updateThemeIcon(theme) {
    const sunIcons = document.querySelectorAll('.suite-icon-sun, #icon-sun');
    const moonIcons = document.querySelectorAll('.suite-icon-moon, #icon-moon');
    if (theme === 'dark') {
      sunIcons.forEach(el => el.classList.remove('hidden'));
      moonIcons.forEach(el => el.classList.add('hidden'));
    } else {
      sunIcons.forEach(el => el.classList.add('hidden'));
      moonIcons.forEach(el => el.classList.remove('hidden'));
    }
  }

  // Aplicar tema de inmediato para evitar flash de estilo incorrecto
  applyTheme(getStoredTheme());

  // Escuchar cambios de tema entre pestañas
  window.addEventListener('storage', (e) => {
    if (e.key === LS_THEME_KEY) {
      applyTheme(e.newValue || 'light');
    }
  });

  // ===========================================================================
  // REGISTRO AUTOMÁTICO EN "USADAS RECIENTEMENTE"
  // ===========================================================================
  const LS_RECENTS_KEY = 'webtools-recents';
  const MAX_RECENTS = 6;

  function registerCurrentInRecents() {
    if (!currentTool) return;
    try {
      let recents = [];
      const raw = localStorage.getItem(LS_RECENTS_KEY);
      if (raw) {
        recents = JSON.parse(raw);
      }
      recents = recents.filter(id => id !== currentTool.id);
      recents.unshift(currentTool.id);
      if (recents.length > MAX_RECENTS) {
        recents = recents.slice(0, MAX_RECENTS);
      }
      localStorage.setItem(LS_RECENTS_KEY, JSON.stringify(recents));
    } catch (_) {}
  }

  // ===========================================================================
  // TOAST GLOBAL UNIFICADO
  // ===========================================================================
  let toastEl = null;
  let toastTimer = null;

  function showSuiteToast(message, duration = 3000) {
    if (!toastEl) {
      toastEl = document.getElementById('toast') || document.querySelector('.suite-toast');
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'suite-toast';
        document.body.appendChild(toastEl);
      }
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  window.showSuiteToast = showSuiteToast;

  // ===========================================================================
  // HELPER PARA DESCARGAS DIRECTAS LIMPIAS (SIN SPAM REDIRECTS)
  // ===========================================================================
  function downloadBlobDirect(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showSuiteToast(`✓ Archivo descargado: ${filename}`);
  }

  window.downloadBlobDirect = downloadBlobDirect;

  // ===========================================================================
  // CONSTRUCTOR DEL CONMUTADOR RÁPIDO DE HERRAMIENTAS (QUICK SWITCHER)
  // ===========================================================================
  function buildSwitcherHtml() {
    const categories = [
      { key: 'imagen-ia', label: '🖼️ Imágenes e IA' },
      { key: 'documentos', label: '📄 Documentos y Privacidad' },
      { key: 'multimedia', label: '🎬 Video y Audio' }
    ];

    let html = `
      <div id="suite-switcher-modal" class="suite-switcher-dropdown hidden" role="dialog" aria-label="Cambiar herramienta">
        <div class="p-2 border-b border-slate-100 dark:border-slate-800 mb-2">
          <div class="relative">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input id="suite-switcher-search" type="text" placeholder="Buscar herramienta (Ctrl+K)..." 
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500">
          </div>
        </div>
        <div id="suite-switcher-items" class="space-y-3">
    `;

    categories.forEach(cat => {
      const toolsInCat = SUITE_TOOLS.filter(t => t.category === cat.key);
      html += `
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 mb-1">${cat.label}</div>
          <div class="space-y-0.5">
      `;
      toolsInCat.forEach(t => {
        const isActive = currentTool && currentTool.id === t.id;
        const href = isCatalog ? `./${t.dir}/index.html` : `../${t.dir}/index.html`;
        html += `
          <a href="${href}" class="suite-switcher-item ${isActive ? 'active' : ''}" data-keywords="${t.keywords} ${t.name.toLowerCase()}">
            <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">${t.icon}</span>
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate leading-tight">${t.shortName}</div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight">${t.desc}</div>
            </div>
            ${isActive ? '<span class="text-xs text-brand-600 dark:text-brand-400 font-bold shrink-0">Activa</span>' : ''}
          </a>
        `;
      });
      html += `</div></div>`;
    });

    html += `
        </div>
        <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2 text-[10px] text-slate-400 dark:text-slate-500">
          <span>12 Herramientas 100% Locales</span>
          <a href="${rootRelPath}index.html" class="font-semibold text-brand-600 dark:text-brand-400 hover:underline">Ver Catálogo Completo &rarr;</a>
        </div>
      </div>
    `;

    return html;
  }

  // ===========================================================================
  // INYECCIÓN O ENRIQUECIMIENTO DEL HEADER
  // ===========================================================================
  function setupSuiteNavbar() {
    const existingHeader = document.querySelector('header');
    if (!existingHeader) return;

    // En páginas de herramientas, unificamos la barra con la identidad WebTools
    if (!isCatalog && currentTool) {
      existingHeader.className = 'sticky top-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-colors duration-300';
      existingHeader.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <!-- Logo Suite & Herramienta Activa -->
          <div class="flex items-center gap-3 sm:gap-4">
            <a href="${rootRelPath}index.html" class="flex items-center gap-2 group" title="Ir al Catálogo Central de WebTools">
              <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-base shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">⚡</span>
              <div class="hidden sm:flex flex-col leading-tight">
                <span class="font-extrabold text-slate-900 dark:text-white tracking-tight text-base">Web<span class="text-indigo-600 dark:text-indigo-400">Tools</span></span>
                <span class="text-[9px] text-slate-400 dark:text-slate-500 font-medium -mt-0.5">Suite 100% Client-Side</span>
              </div>
            </a>

            <!-- Separador vertical -->
            <span class="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:inline-block"></span>

            <!-- Badge / Selector de Herramienta Activa -->
            <div class="relative" id="suite-switcher-container">
              <button id="suite-switcher-toggle" type="button" class="suite-switcher-btn group" title="Cambiar a otra herramienta">
                <span class="text-base">${currentTool.icon}</span>
                <span class="font-bold text-slate-800 dark:text-slate-100 max-w-[140px] sm:max-w-none truncate">${currentTool.shortName}</span>
                <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
              </button>
              ${buildSwitcherHtml()}
            </div>
          </div>

          <!-- Acciones Derecha -->
          <div class="flex items-center gap-2.5 sm:gap-3">
            <!-- Badge 100% Privado -->
            <span class="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              🔒 100% Client-Side
            </span>

            <!-- Botón Catálogo -->
            <a href="${rootRelPath}index.html" class="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
              <span class="hidden sm:inline">Todas las herramientas</span>
            </a>

            <!-- Toggle Modo Oscuro -->
            <button id="theme-toggle" type="button" class="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-xs" title="Cambiar modo claro / oscuro" aria-label="Cambiar tema">
              <svg id="icon-sun" class="suite-icon-sun w-[18px] h-[18px] hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <svg id="icon-moon" class="suite-icon-moon w-[18px] h-[18px] hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            </button>
          </div>
        </div>
      `;
    }

    // Inicializar eventos del Switcher
    setupSwitcherEvents();

    // Inicializar evento del Theme Toggle (en herramientas que no sean el catálogo)
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn && !isCatalog && !toggleBtn.dataset.suiteBound) {
      toggleBtn.dataset.suiteBound = 'true';
      toggleBtn.addEventListener('click', toggleTheme);
    }
    updateThemeIcon(getStoredTheme());
  }

  // ===========================================================================
  // EVENTOS DEL CONMUTADOR RÁPIDO
  // ===========================================================================
  function setupSwitcherEvents() {
    const toggleBtn = document.getElementById('suite-switcher-toggle');
    const modal = document.getElementById('suite-switcher-modal');
    const searchInput = document.getElementById('suite-switcher-search');
    const itemsContainer = document.getElementById('suite-switcher-items');

    if (!toggleBtn || !modal) return;

    const toggleOpen = () => {
      const isHidden = modal.classList.contains('hidden');
      if (isHidden) {
        modal.classList.remove('hidden');
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        filterItems('');
      } else {
        modal.classList.add('hidden');
      }
    };

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleOpen();
    });

    document.addEventListener('click', (e) => {
      if (!modal.contains(e.target) && e.target !== toggleBtn) {
        modal.classList.add('hidden');
      }
    });

    // Filtro en tiempo real dentro del modal
    function filterItems(query) {
      const q = query.toLowerCase().trim();
      const items = modal.querySelectorAll('.suite-switcher-item');
      items.forEach(it => {
        const text = it.getAttribute('data-keywords') || '';
        if (!q || text.includes(q)) {
          it.style.display = 'flex';
        } else {
          it.style.display = 'none';
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterItems(e.target.value);
      });
    }

    // Atajo de teclado: Ctrl + K o Cmd + K para abrir conmutador
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleOpen();
      } else if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
    });
  }

  // ===========================================================================
  // INYECCIÓN DE FOOTER UNIFICADO
  // ===========================================================================
  function setupSuiteFooter() {
    if (isCatalog) return; // El catálogo ya tiene su propio footer expandido
    const existingFooter = document.querySelector('footer');
    if (!existingFooter) return;

    existingFooter.className = 'bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors py-10 mt-16';
    existingFooter.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs">
          <!-- Col 1: Marca -->
          <div class="space-y-3">
            <a href="${rootRelPath}index.html" class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm">⚡</span>
              <span class="font-extrabold text-slate-900 dark:text-white text-base">Web<span class="text-indigo-600 dark:text-indigo-400">Tools</span></span>
            </a>
            <p class="text-slate-500 dark:text-slate-400 leading-relaxed">
              Suite de 12 micro-herramientas de alto rendimiento que se ejecutan 100% en tu navegador mediante WebAssembly y APIs nativas.
            </p>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
              🔒 Privacidad Total Garantizada
            </div>
          </div>

          <!-- Col 2: Imágenes e IA -->
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Imágenes e IA</h4>
            <ul class="space-y-2 text-slate-500 dark:text-slate-400">
              <li><a href="${rootRelPath}01-quitar-fondo/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">🪄 Quitar Fondo con IA</a></li>
              <li><a href="${rootRelPath}02-conversor-imagenes/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">🔄 Conversor HEIC / WebP</a></li>
              <li><a href="${rootRelPath}03-vectorizador-svg/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">📐 Vectorizador SVG</a></li>
              <li><a href="${rootRelPath}05-generador-favicons/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">⭐ Generador de Favicons</a></li>
              <li><a href="${rootRelPath}06-extractor-colores/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">🎨 Extractor de Paletas y CSS</a></li>
            </ul>
          </div>

          <!-- Col 3: Documentos y Privacidad -->
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Documentos & Privacidad</h4>
            <ul class="space-y-2 text-slate-500 dark:text-slate-400">
              <li><a href="${rootRelPath}04-censurador-rostros/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">🛡️ Censurador de Rostros</a></li>
              <li><a href="${rootRelPath}07-ocr-texto/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">📄 Extractor de Texto OCR</a></li>
              <li><a href="${rootRelPath}08-limpiador-exif/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">📍 Limpiador EXIF / GPS</a></li>
              <li><a href="${rootRelPath}09-herramientas-pdf/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">📑 Unir y Dividir PDF</a></li>
              <li><a href="${rootRelPath}10-lector-qr/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">📱 Lector y Creador QR</a></li>
            </ul>
          </div>

          <!-- Col 4: Multimedia -->
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Video y Audio</h4>
            <ul class="space-y-2 text-slate-500 dark:text-slate-400">
              <li><a href="${rootRelPath}11-compresor-video/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">🎬 Compresor de Video</a></li>
              <li><a href="${rootRelPath}12-extractor-audio/index.html" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">🎵 Extractor de Audio a MP3</a></li>
              <li class="pt-2"><a href="${rootRelPath}index.html" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Ver todas las herramientas &rarr;</a></li>
            </ul>
          </div>
        </div>

        <div class="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 dark:text-slate-500 gap-3">
          <div>&copy; 2026 WebTools Suite. Todos los derechos reservados. Procesamiento 100% Client-Side.</div>
          <div class="flex items-center gap-4">
            <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Modo Estático Activo</span>
            <a href="${rootRelPath}index.html#acerca" class="hover:underline">Acerca de la Suite</a>
          </div>
        </div>
      </div>
    `;
  }

  // ===========================================================================
  // DESACTIVACIÓN DE POPUPS SPAM DE MONETIZACIÓN (DESCARGA DIRECTA LIMPIA)
  // ===========================================================================
  function neuterSpamModals() {
    // Si alguna ventana de monetización ouo.io está en el DOM, hacer que descargue directo
    const modalIds = ['monetization-modal', 'download-modal', 'batch-ad-modal', 'bulk-modal'];
    modalIds.forEach(id => {
      const m = document.getElementById(id);
      if (m) {
        // En lugar de redirecciones ouo.io, permitir descarga inmediata
        const continueBtn = m.querySelector('#continue-download-btn, #modal-download-btn, #unlock-zip-btn, #unlock-bulk-btn');
        if (continueBtn) {
          continueBtn.disabled = false;
          continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
    });
  }

  // ===========================================================================
  // INICIALIZACIÓN AL CARGAR EL DOM
  // ===========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    registerCurrentInRecents();
    setupSuiteNavbar();
    setupSuiteFooter();
    neuterSpamModals();
  });

})();

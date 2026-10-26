/**
 * ============================================================================
 * WebTools Hub — Catálogo Central
 * Lógica de búsqueda, filtrado por categorías, herramientas recientes
 * (localStorage) y modo oscuro/claro.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Referencias al DOM ---
  const searchInput     = document.getElementById('search-input');
  const searchClear     = document.getElementById('search-clear');
  const filterBtns      = document.querySelectorAll('.filter-btn');
  const catalogGrid     = document.getElementById('catalog-grid');
  const toolCards       = catalogGrid.querySelectorAll('.tool-card:not([data-sponsored])');
  const sponsoredCard   = catalogGrid.querySelector('.tool-card-sponsored');
  const emptyState      = document.getElementById('empty-state');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const toolsCount      = document.getElementById('tools-count');
  const themeToggle     = document.getElementById('theme-toggle');
  const recentSection   = document.getElementById('recent-section');
  const recentContainer = document.getElementById('recent-tools');
  const clearRecentsBtn = document.getElementById('clear-recents');
  const footerYear      = document.getElementById('footer-year');

  // --- Estado ---
  let activeCategory = 'all';
  let searchTerm = '';

  // --- Constantes ---
  const LS_THEME_KEY = 'webtools-theme';
  const LS_RECENTS_KEY = 'webtools-recents';
  const MAX_RECENTS = 6;

  // Mapa de metadatos de herramientas para recientes
  const TOOL_META = {
    '01': { title: 'Quitar Fondo',       icon: '🪄', color: 'from-pink-500 to-rose-600',     href: './01-quitar-fondo/index.html' },
    '02': { title: 'Conversor Imágenes',  icon: '🔄', color: 'from-sky-500 to-blue-600',      href: './02-conversor-imagenes/index.html' },
    '03': { title: 'Vectorizador SVG',    icon: '📐', color: 'from-violet-500 to-purple-600',  href: './03-vectorizador-svg/index.html' },
    '04': { title: 'Censurador Rostros',  icon: '👤', color: 'from-amber-500 to-orange-600',   href: './04-censurador-rostros/index.html' },
    '05': { title: 'Generador Favicons',  icon: '⭐', color: 'from-emerald-500 to-teal-600',   href: './05-generador-favicons/index.html' },
    '06': { title: 'Extractor Colores',   icon: '🎨', color: 'from-fuchsia-500 to-pink-600',   href: './06-extractor-colores/index.html' },
    '07': { title: 'OCR de Texto',        icon: '📄', color: 'from-cyan-500 to-blue-600',      href: './07-ocr-texto/index.html' },
    '08': { title: 'Limpiador EXIF',      icon: '🛡️', color: 'from-red-500 to-rose-600',       href: './08-limpiador-exif/index.html' },
    '09': { title: 'Herramientas PDF',    icon: '📑', color: 'from-orange-500 to-amber-600',   href: './09-herramientas-pdf/index.html' },
    '10': { title: 'Lector & Gen. QR',    icon: '📱', color: 'from-indigo-500 to-brand-600',   href: './10-lector-qr/index.html' },
    '11': { title: 'Compresor Video',     icon: '🎬', color: 'from-green-500 to-emerald-600',  href: './11-compresor-video/index.html' },
    '12': { title: 'Extractor Audio',     icon: '🎵', color: 'from-purple-500 to-indigo-600',  href: './12-extractor-audio/index.html' },
  };

  // =====================================================================
  //  TEMA: MODO CLARO / OSCURO
  // =====================================================================
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('webtools-theme', theme);
      localStorage.setItem('theme', theme);
    } catch (_) {}
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(LS_THEME_KEY); } catch (_) {}

    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  }

  initTheme();

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark');
    });
  }

  // =====================================================================
  //  AÑO DINÁMICO EN FOOTER
  // =====================================================================
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  // =====================================================================
  //  BÚSQUEDA INSTANTÁNEA + FILTROS DE CATEGORÍA
  // =====================================================================
  function updateDisplay() {
    let visibleCount = 0;

    toolCards.forEach(card => {
      const title    = (card.querySelector('.tool-title')?.textContent || '').toLowerCase();
      const desc     = (card.querySelector('.tool-desc')?.textContent || '').toLowerCase();
      const keywords = (card.dataset.keywords || '').toLowerCase();
      const category = card.dataset.category || '';

      const matchesSearch = !searchTerm
        || title.includes(searchTerm)
        || desc.includes(searchTerm)
        || keywords.includes(searchTerm);

      const matchesCategory = activeCategory === 'all' || category === activeCategory;

      if (matchesSearch && matchesCategory) {
        card.classList.remove('tool-card-hidden');
        visibleCount++;
      } else {
        card.classList.add('tool-card-hidden');
      }
    });

    // Tarjeta patrocinada: visible solo si hay resultados y no hay búsqueda activa
    if (sponsoredCard) {
      if (visibleCount > 0 && !searchTerm) {
        sponsoredCard.classList.remove('tool-card-hidden');
      } else {
        sponsoredCard.classList.add('tool-card-hidden');
      }
    }

    // Contador
    if (toolsCount) {
      toolsCount.textContent = visibleCount;
    }

    // Estado vacío
    if (emptyState) {
      if (visibleCount === 0) {
        emptyState.classList.remove('hidden');
      } else {
        emptyState.classList.add('hidden');
      }
    }

    // Toggle botón limpiar búsqueda
    if (searchClear) {
      if (searchTerm) {
        searchClear.classList.remove('hidden');
      } else {
        searchClear.classList.add('hidden');
      }
    }
  }

  // Input de búsqueda
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      updateDisplay();
    });
  }

  // Botón limpiar búsqueda
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchTerm = '';
      searchInput.focus();
      updateDisplay();
    });
  }

  // Filtros de categoría
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      updateDisplay();
    });
  });

  // Botón "Ver todas" desde estado vacío
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchTerm = '';
      activeCategory = 'all';
      filterBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.category === 'all');
      });
      updateDisplay();
      searchInput.focus();
    });
  }

  // Inicializar
  updateDisplay();

  // =====================================================================
  //  HERRAMIENTAS USADAS RECIENTEMENTE (localStorage)
  // =====================================================================
  function getRecents() {
    try {
      const raw = localStorage.getItem(LS_RECENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveRecents(list) {
    try {
      localStorage.setItem(LS_RECENTS_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function addRecent(toolId) {
    let recents = getRecents();
    // Mover al inicio si ya existe
    recents = recents.filter(id => id !== toolId);
    recents.unshift(toolId);
    // Limitar
    if (recents.length > MAX_RECENTS) {
      recents = recents.slice(0, MAX_RECENTS);
    }
    saveRecents(recents);
  }

  function renderRecents() {
    if (!recentSection || !recentContainer) return;

    const recents = getRecents();
    if (recents.length === 0) {
      recentSection.classList.add('hidden');
      return;
    }

    recentSection.classList.remove('hidden');
    recentContainer.innerHTML = '';

    recents.forEach(id => {
      const meta = TOOL_META[id];
      if (!meta) return;

      const chip = document.createElement('a');
      chip.href = meta.href;
      chip.className = 'recent-chip';
      chip.setAttribute('data-tool-id', id);
      chip.innerHTML = `
        <span class="chip-icon bg-gradient-to-br ${meta.color} text-white">${meta.icon}</span>
        <span>${meta.title}</span>
      `;
      recentContainer.appendChild(chip);
    });
  }

  // Registrar clic en tarjeta como reciente
  toolCards.forEach(card => {
    card.addEventListener('click', () => {
      const toolId = card.dataset.toolId;
      if (toolId) {
        addRecent(toolId);
      }
    });
  });

  // Limpiar recientes
  if (clearRecentsBtn) {
    clearRecentsBtn.addEventListener('click', () => {
      try { localStorage.removeItem(LS_RECENTS_KEY); } catch (_) {}
      renderRecents();
    });
  }

  // Inicializar recientes
  renderRecents();

  // =====================================================================
  //  ACCESIBILIDAD: Scroll suave al hacer clic en enlaces internos
  // =====================================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

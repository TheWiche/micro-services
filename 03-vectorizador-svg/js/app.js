/**
 * Vectorizador SVG - 100% Client-Side
 * Convierte imágenes PNG/JPG en gráficos vectoriales SVG usando ImageTracerJS
 */

// =============================================================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// =============================================================================
const CONFIG = {
  monetization: {
    enabled: false, // Descarga directa 100% Client-Side
    shortenerUrl: 'https://ouo.io/qs/vector-svg?s=',
    delaySeconds: 0,
  }
};

const state = {
  originalImageBlob: null,
  originalImageUrl: null,
  fileName: 'vectorizado',
  svgString: '',
  mode: 'color', // 'color' por defecto para preservar colores y contornos
  smoothing: 'low', // 'low' (alta fidelidad sin desenfoque) | 'medium' | 'high'
  colorCount: 16,
  isProcessing: false,
  zoomLeft: 1,
  zoomRight: 1,
  currentTab: 'preview', // 'preview' | 'code'
};

// =============================================================================
// ELEMENTOS DEL DOM
// =============================================================================
const elements = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  sampleBtns: document.querySelectorAll('.sample-btn'),

  // Ajustes
  modeBwBtn: document.getElementById('mode-bw'),
  modeColorBtn: document.getElementById('mode-color'),
  smoothingSelect: document.getElementById('smoothing-select'),
  colorCountContainer: document.getElementById('color-count-container'),
  colorCountSelect: document.getElementById('color-count-select'),
  revectorizeBtn: document.getElementById('revectorize-btn'),

  // Secciones
  toolCard: document.getElementById('tool-card'),
  previewSection: document.getElementById('preview-section'),
  processingIndicator: document.getElementById('processing-indicator'),

  // Visor Dividido
  bitmapImg: document.getElementById('bitmap-img'),
  svgContainer: document.getElementById('svg-container'),
  svgCodePre: document.getElementById('svg-code-pre'),
  tabPreviewBtn: document.getElementById('tab-preview-btn'),
  tabCodeBtn: document.getElementById('tab-code-btn'),

  // Controles de Zoom
  zoomInLeft: document.getElementById('zoom-in-left'),
  zoomOutLeft: document.getElementById('zoom-out-left'),
  zoomResetLeft: document.getElementById('zoom-reset-left'),
  zoomInRight: document.getElementById('zoom-in-right'),
  zoomOutRight: document.getElementById('zoom-out-right'),
  zoomResetRight: document.getElementById('zoom-reset-right'),

  // Métricas
  bitmapSizeBadge: document.getElementById('bitmap-size-badge'),
  svgSizeBadge: document.getElementById('svg-size-badge'),
  svgPathsBadge: document.getElementById('svg-paths-badge'),

  // Acciones
  copySvgBtn: document.getElementById('copy-svg-btn'),
  downloadSvgBtn: document.getElementById('download-svg-btn'),
  newImageBtn: document.getElementById('new-image-btn'),
  toast: document.getElementById('toast'),

  // Modal Monetización
  downloadModal: document.getElementById('download-modal'),
  closeDownloadModal: document.getElementById('close-download-modal'),
  countdownDisplay: document.getElementById('countdown-display'),
  continueDownloadBtn: document.getElementById('continue-download-btn'),
  sponsorLinkBtn: document.getElementById('sponsor-link-btn'),
};

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupUploadEvents();
  setupSettingsEvents();
  setupZoomAndTabs();
  setupActionButtons();
  setupSamples();
});

// =============================================================================
// SUBIDA DE ARCHIVOS (CLICK, DRAG & DROP, CTRL+V)
// =============================================================================
function setupUploadEvents() {
  if (elements.uploadBtn && elements.fileInput) {
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
    });
  }

  if (elements.dropzone) {
    elements.dropzone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
        elements.fileInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach(evt => {
      elements.dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.add('dropzone-active');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      elements.dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.remove('dropzone-active');
      });
    });

    elements.dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name))) {
        handleImageFile(file);
        showToast('✓ Imagen cargada correctamente');
      } else if (file) {
        showToast(`⚠️ Formato no admitido ("${file.name}"). Esta herramienta solo admite imágenes (PNG, JPG, WebP, BMP).`);
      }
    });
  }

  // Escuchar pegado desde portapapeles (Ctrl + V)
  window.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    const files = e.clipboardData?.files;
    let handled = false;

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(files[i].name)) {
          handleImageFile(files[i], 'captura-pegada');
          showToast('✓ Imagen pegada desde el portapapeles');
          handled = true;
          break;
        }
      }
    } else if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file, 'captura-pegada');
            showToast('✓ Imagen pegada desde el portapapeles');
            handled = true;
            break;
          }
        }
      }
    }

    if (!handled && !e.defaultPrevented) {
      showToast('⚠️ El contenido del portapapeles no es una imagen admitida (PNG, JPG, WebP).');
    }
  });

  if (elements.newImageBtn) {
    elements.newImageBtn.addEventListener('click', () => {
      elements.previewSection.classList.add('hidden');
      elements.toolCard.classList.remove('hidden');
      elements.fileInput.value = '';
      window.scrollTo({ top: elements.toolCard.offsetTop - 80, behavior: 'smooth' });
    });
  }
}

function handleImageFile(file, customName = null) {
  state.fileName = customName || file.name.replace(/\.[^/.]+$/, '') || 'vector';
  state.originalImageBlob = file;

  if (state.originalImageUrl) URL.revokeObjectURL(state.originalImageUrl);
  state.originalImageUrl = URL.createObjectURL(file);

  elements.bitmapImg.src = state.originalImageUrl;
  elements.bitmapSizeBadge.textContent = formatBytes(file.size);

  vectorizeCurrent();
}

// =============================================================================
// AJUSTES RÁPIDOS
// =============================================================================
function setupSettingsEvents() {
  const activeClass = 'flex-1 py-2 px-3 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-xs';
  const inactiveClass = 'flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700';

  elements.modeBwBtn.addEventListener('click', () => {
    state.mode = 'bw';
    elements.modeBwBtn.className = activeClass;
    elements.modeColorBtn.className = inactiveClass;
    elements.colorCountContainer.classList.add('hidden');
    if (state.originalImageUrl) vectorizeCurrent();
  });

  elements.modeColorBtn.addEventListener('click', () => {
    state.mode = 'color';
    elements.modeColorBtn.className = activeClass;
    elements.modeBwBtn.className = inactiveClass;
    elements.colorCountContainer.classList.remove('hidden');
    if (state.originalImageUrl) vectorizeCurrent();
  });

  elements.smoothingSelect.addEventListener('change', (e) => {
    state.smoothing = e.target.value;
    if (state.originalImageUrl) vectorizeCurrent();
  });

  elements.colorCountSelect.addEventListener('change', (e) => {
    state.colorCount = parseInt(e.target.value, 10);
    if (state.originalImageUrl && state.mode === 'color') vectorizeCurrent();
  });

  if (elements.revectorizeBtn) {
    elements.revectorizeBtn.addEventListener('click', () => {
      if (state.originalImageUrl) vectorizeCurrent();
    });
  }
}

// =============================================================================
// VECTORIZACIÓN CON IMAGETRACERJS
// =============================================================================
function vectorizeCurrent() {
  if (!state.originalImageUrl || state.isProcessing) return;

  state.isProcessing = true;
  elements.processingIndicator.classList.remove('hidden');

  let tracerOptions = {};

  // Configuración de suavizado y fidelidad de contornos
  let blurRadius = 0;
  let blurDelta = 10;
  let ltres = 0.5;
  let qtres = 0.5;
  let pathomit = 1;

  if (state.smoothing === 'low') {
    // Alta fidelidad: sin desenfoque, trazado estricto
    blurRadius = 0;
    blurDelta = 10;
    ltres = 0.5;
    qtres = 0.5;
    pathomit = 1;
  } else if (state.smoothing === 'medium') {
    // Equilibrado
    blurRadius = 0;
    blurDelta = 15;
    ltres = 1;
    qtres = 1;
    pathomit = 2;
  } else if (state.smoothing === 'high') {
    // Curvas suaves
    blurRadius = 1;
    blurDelta = 20;
    ltres = 1.5;
    qtres = 1.5;
    pathomit = 3;
  }

  if (state.mode === 'bw') {
    // Modo Firma / Silueta Blanco y Negro
    tracerOptions = {
      corsenabled: false,
      ltres: ltres,
      qtres: qtres,
      pathomit: pathomit,
      roundcoords: 1,
      blurradius: blurRadius,
      blurdelta: blurDelta,
      colorsampling: 0,
      numberofcolors: 2,
      colorquantcycles: 2,
      scale: 1,
      linefilter: true,
      pal: [
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 255, g: 255, b: 255, a: 0 }
      ]
    };
  } else {
    // Modo Color / Ilustración
    tracerOptions = {
      corsenabled: false,
      ltres: ltres,
      qtres: qtres,
      pathomit: pathomit,
      roundcoords: 1,
      blurradius: blurRadius,
      blurdelta: blurDelta,
      colorsampling: 2,
      numberofcolors: state.colorCount || 16,
      colorquantcycles: 3,
      scale: 1,
      linefilter: true
    };
  }

  // Ejecución asíncrona de ImageTracer
  setTimeout(() => {
    try {
      if (typeof ImageTracer === 'undefined') {
        throw new Error('Librería ImageTracerJS no disponible');
      }

      ImageTracer.imageToSVG(
        state.originalImageUrl,
        function(svgStr) {
          state.svgString = svgStr;
          renderSvgResult(svgStr);
          state.isProcessing = false;
          elements.processingIndicator.classList.add('hidden');
        },
        tracerOptions
      );
    } catch (err) {
      console.error('Error durante la vectorización:', err);
      showToast('Error al vectorizar imagen: ' + err.message);
      state.isProcessing = false;
      elements.processingIndicator.classList.add('hidden');
    }
  }, 50);
}

function renderSvgResult(svgStr) {
  // Insertar en visor
  elements.svgContainer.innerHTML = svgStr;
  elements.svgCodePre.textContent = svgStr;

  // Calcular métricas
  const svgBytes = new Blob([svgStr], { type: 'image/svg+xml' }).size;
  elements.svgSizeBadge.textContent = formatBytes(svgBytes);

  // Contar cantidad de paths
  const matches = svgStr.match(/<path/g);
  const pathCount = matches ? matches.length : 0;
  elements.svgPathsBadge.textContent = `${pathCount} trazados`;

  // Mostrar sección de resultados
  elements.previewSection.classList.remove('hidden');
  resetZooms();

  elements.previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =============================================================================
// ZOOM & PESTAÑAS (VISTA PREVIA VS CÓDIGO)
// =============================================================================
function setupZoomAndTabs() {
  // Pestañas
  elements.tabPreviewBtn.addEventListener('click', () => {
    state.currentTab = 'preview';
    elements.tabPreviewBtn.className = 'px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs';
    elements.tabCodeBtn.className = 'px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs hover:bg-slate-200';
    elements.svgContainer.classList.remove('hidden');
    elements.svgCodePre.classList.add('hidden');
  });

  elements.tabCodeBtn.addEventListener('click', () => {
    state.currentTab = 'code';
    elements.tabCodeBtn.className = 'px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs';
    elements.tabPreviewBtn.className = 'px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs hover:bg-slate-200';
    elements.svgContainer.classList.add('hidden');
    elements.svgCodePre.classList.remove('hidden');
  });

  // Zoom Izquierda (Bitmap)
  elements.zoomInLeft.addEventListener('click', () => {
    state.zoomLeft = Math.min(state.zoomLeft + 0.25, 4);
    applyZoom('left');
  });
  elements.zoomOutLeft.addEventListener('click', () => {
    state.zoomLeft = Math.max(state.zoomLeft - 0.25, 0.5);
    applyZoom('left');
  });
  elements.zoomResetLeft.addEventListener('click', () => {
    state.zoomLeft = 1;
    applyZoom('left');
  });

  // Zoom Derecha (SVG)
  elements.zoomInRight.addEventListener('click', () => {
    state.zoomRight = Math.min(state.zoomRight + 0.25, 4);
    applyZoom('right');
  });
  elements.zoomOutRight.addEventListener('click', () => {
    state.zoomRight = Math.max(state.zoomRight - 0.25, 0.5);
    applyZoom('right');
  });
  elements.zoomResetRight.addEventListener('click', () => {
    state.zoomRight = 1;
    applyZoom('right');
  });
}

function applyZoom(side) {
  if (side === 'left') {
    elements.bitmapImg.style.transform = `scale(${state.zoomLeft})`;
  } else {
    const svgEl = elements.svgContainer.querySelector('svg');
    if (svgEl) svgEl.style.transform = `scale(${state.zoomRight})`;
  }
}

function resetZooms() {
  state.zoomLeft = 1;
  state.zoomRight = 1;
  applyZoom('left');
  applyZoom('right');
}

// =============================================================================
// BOTONES DE ACCIÓN (COPIAR & DESCARGAR CON HOOK MONETIZADO)
// =============================================================================
function setupActionButtons() {
  // Copiar código SVG al portapapeles
  elements.copySvgBtn.addEventListener('click', () => {
    if (!state.svgString) return;
    navigator.clipboard.writeText(state.svgString).then(() => {
      showToast('¡Código SVG copiado al portapapeles!');
    }).catch(err => {
      console.error('Error al copiar:', err);
      showToast('No se pudo copiar automáticamente.');
    });
  });

  // Descargar SVG con hook de monetización
  elements.downloadSvgBtn.addEventListener('click', () => {
    if (!state.svgString) return;

    if (!CONFIG.monetization.enabled) {
      triggerSvgDownload();
      return;
    }

    // Modal de descarga patrocinada
    openDownloadModal();
  });

  if (elements.closeDownloadModal) {
    elements.closeDownloadModal.addEventListener('click', () => {
      elements.downloadModal.classList.add('hidden');
    });
  }

  if (elements.continueDownloadBtn) {
    elements.continueDownloadBtn.addEventListener('click', () => {
      triggerSvgDownload();
      elements.downloadModal.classList.add('hidden');
    });
  }

  if (elements.sponsorLinkBtn) {
    elements.sponsorLinkBtn.addEventListener('click', () => {
      const shortenerTarget = `${CONFIG.monetization.shortenerUrl}${encodeURIComponent(window.location.href)}`;
      window.open(shortenerTarget, '_blank');
    });
  }
}

function openDownloadModal() {
  elements.downloadModal.classList.remove('hidden');
  elements.continueDownloadBtn.disabled = true;
  elements.continueDownloadBtn.classList.add('opacity-50', 'cursor-not-allowed');

  let remaining = CONFIG.monetization.delaySeconds;
  elements.countdownDisplay.textContent = remaining;

  const timer = setInterval(() => {
    remaining--;
    if (elements.countdownDisplay) elements.countdownDisplay.textContent = remaining;

    if (remaining <= 0) {
      clearInterval(timer);
      elements.continueDownloadBtn.disabled = false;
      elements.continueDownloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      elements.continueDownloadBtn.textContent = '✅ Descargar Archivo .SVG Ahora';
    }
  }, 1000);
}

function triggerSvgDownload() {
  const blob = new Blob([state.svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.fileName}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Descargando archivo SVG...');
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

// =============================================================================
// ICONOS DE EJEMPLO AUTO-GENERADOS CON CANVAS (100% OFFLINE)
// =============================================================================
function setupSamples() {
  elements.sampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.sampleType;
      generateSampleImage(type);
    });
  });
}

function generateSampleImage(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');

  // Fondo blanco limpio
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 300, 300);

  if (type === 'firma') {
    // Dibujar firma manuscrita fluida en negro
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(40, 160);
    ctx.bezierCurveTo(70, 70, 100, 240, 130, 140);
    ctx.bezierCurveTo(150, 100, 170, 200, 200, 150);
    ctx.bezierCurveTo(220, 120, 240, 180, 270, 140);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(60, 200);
    ctx.lineTo(260, 190);
    ctx.stroke();

    state.mode = 'bw';
    elements.modeBwBtn.click();
  } else if (type === 'logo') {
    // Dibujar logotipo geométrico estilo tech
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(150, 40);
    ctx.lineTo(250, 100);
    ctx.lineTo(250, 200);
    ctx.lineTo(150, 260);
    ctx.lineTo(50, 200);
    ctx.lineTo(50, 100);
    ctx.closePath();
    ctx.fill();

    // Hueco interno
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(150, 150, 50, 0, Math.PI * 2);
    ctx.fill();

    state.mode = 'bw';
    elements.modeBwBtn.click();
  } else if (type === 'color') {
    // Dibujar insignia multicolor
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(150, 150, 100, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(150, 70);
    ctx.lineTo(180, 130);
    ctx.lineTo(240, 140);
    ctx.lineTo(195, 185);
    ctx.lineTo(210, 245);
    ctx.lineTo(150, 210);
    ctx.lineTo(90, 245);
    ctx.lineTo(105, 185);
    ctx.lineTo(60, 140);
    ctx.lineTo(120, 130);
    ctx.closePath();
    ctx.fill();

    state.mode = 'color';
    elements.modeColorBtn.click();
  }

  canvas.toBlob((blob) => {
    handleImageFile(blob, `ejemplo-${type}`);
  }, 'image/png');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


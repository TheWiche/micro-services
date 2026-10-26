/**
 * Quitar Fondo - Aplicación Web 100% Client-Side
 * Procesamiento de IA en el navegador con WebAssembly/WebGL usando @imgly/background-removal
 */

import imglyRemoveBackground from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm';

// =============================================================================
// CONFIGURACIÓN GLOBAL (MONETIZACIÓN Y PARÁMETROS DEL MODELO IA)
// =============================================================================
export const CONFIG = {
  // Configuración de descargas directas 100% Client-Side
  monetization: {
    enabled: false, // Descarga directa inmediata limpia
    shortenerUrl: 'https://ouo.io/qs/abc12345?s=',
    delaySeconds: 0,
    mode: 'direct',
    sponsorLink: '',
  },

  // Parámetros de la librería de eliminación de fondos
  ai: {
    publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.7/dist/',
    model: 'small', // 'small' (~40MB rápido) o 'medium' (~80MB mayor precisión)
    debug: false,
  }
};

// =============================================================================
// ESTADO DE LA APLICACIÓN
// =============================================================================
const state = {
  originalImageBlob: null,
  originalImageUrl: null,
  processedImageBlob: null,
  processedImageUrl: null,
  currentFileName: 'imagen',
  isProcessing: false,
  isBulkUnlocked: localStorage.getItem('bg_removal_bulk_unlocked') === 'true',
  bulkFilesQueue: [],
};

// =============================================================================
// ELEMENTOS DEL DOM
// =============================================================================
const elements = {
  // Upload
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  sampleBtns: document.querySelectorAll('.sample-thumb'),

  // Processing & Progress
  progressSection: document.getElementById('progress-section'),
  progressBar: document.getElementById('progress-bar'),
  progressPercent: document.getElementById('progress-percent'),
  progressStatus: document.getElementById('progress-status'),

  // Results & Comparison
  resultSection: document.getElementById('result-section'),
  comparisonContainer: document.getElementById('comparison-container'),
  comparisonBefore: document.getElementById('comparison-before'),
  comparisonAfter: document.getElementById('comparison-after'),
  comparisonRange: document.getElementById('comparison-range'),
  bgOptionBtns: document.querySelectorAll('.bg-option-btn'),

  // Action Buttons
  downloadBtn: document.getElementById('download-btn'),
  newImageBtn: document.getElementById('new-image-btn'),

  // Monetization Modal
  monetizationModal: document.getElementById('monetization-modal'),
  countdownDisplay: document.getElementById('countdown-display'),
  continueDownloadBtn: document.getElementById('continue-download-btn'),
  sponsorLinkBtn: document.getElementById('sponsor-link-btn'),
  closeMonetizationModal: document.getElementById('close-monetization-modal'),

  // Bulk Upload Widget & Modal
  bulkWidgetBtn: document.getElementById('bulk-widget-btn'),
  bulkModal: document.getElementById('bulk-modal'),
  closeBulkModal: document.getElementById('close-bulk-modal'),
  bulkLockedView: document.getElementById('bulk-locked-view'),
  bulkUnlockedView: document.getElementById('bulk-unlocked-view'),
  unlockAdBtn: document.getElementById('unlock-ad-btn'),
  bulkFileInput: document.getElementById('bulk-file-input'),
  bulkList: document.getElementById('bulk-list'),
  bulkStartBtn: document.getElementById('bulk-start-btn'),
  bulkDownloadAllBtn: document.getElementById('bulk-download-all-btn'),
  adblockAlert: document.getElementById('adblock-alert'),
};

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupUploadEvents();
  setupComparisonSlider();
  setupMonetizationModal();
  setupBulkUpload();
  detectAdBlocker();
});

// =============================================================================
// MANEJO DE CARGA DE IMÁGENES (CLICK, DRAG & DROP, CTRL+V, MUESTRAS)
// =============================================================================
function setupUploadEvents() {
  // Botón principal de subida
  if (elements.uploadBtn && elements.fileInput) {
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
    });
  }

  // Click en la zona del dropzone
  if (elements.dropzone) {
    elements.dropzone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
        elements.fileInput.click();
      }
    });

    // Eventos Drag & Drop
    ['dragenter', 'dragover'].forEach(eventType => {
      elements.dropzone.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.add('dropzone-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventType => {
      elements.dropzone.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.remove('dropzone-active');
      });
    });

    elements.dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
      } else {
        alert('Por favor, arrastra un archivo de imagen válido (JPG, PNG, WebP).');
      }
    });
  }

  // Pegar con el portapapeles (Ctrl + V)
  window.addEventListener('paste', (e) => {
    // Evitar capturar si el usuario está en un input de texto
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageFile(file, 'captura-pegada');
          break;
        }
      }
    }
  });

  // Miniaturas de prueba ("¿No tienes imagen? Prueba con una de estas")
  elements.sampleBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const sampleUrl = btn.dataset.sampleUrl;
      const sampleName = btn.dataset.sampleName || 'muestra';
      if (!sampleUrl) return;

      try {
        updateProgress(5, 'Cargando imagen de prueba...');
        elements.progressSection.classList.remove('hidden');
        elements.dropzone.classList.add('hidden');
        elements.resultSection.classList.add('hidden');

        // Fetch de la imagen de muestra
        const response = await fetch(sampleUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('No se pudo cargar la imagen de muestra remota');
        const blob = await response.blob();
        handleImageFile(blob, sampleName);
      } catch (err) {
        console.warn('Fallo al obtener muestra remota, generando muestra local...', err);
        const c = document.createElement('canvas');
        c.width = 400; c.height = 400;
        const cx = c.getContext('2d');
        cx.fillStyle = '#6366f1';
        cx.fillRect(0, 0, 400, 400);
        cx.fillStyle = '#ffffff';
        cx.beginPath();
        cx.arc(200, 160, 70, 0, Math.PI * 2);
        cx.fill();
        cx.beginPath();
        cx.arc(200, 360, 130, 0, Math.PI * 2);
        cx.fill();
        c.toBlob(b => handleImageFile(b, 'muestra-local'), 'image/png');
      }
    });
  });

  // Botón para procesar una nueva imagen
  if (elements.newImageBtn) {
    elements.newImageBtn.addEventListener('click', () => {
      elements.resultSection.classList.add('hidden');
      elements.progressSection.classList.add('hidden');
      elements.dropzone.classList.remove('hidden');
      elements.fileInput.value = '';
      window.scrollTo({ top: elements.dropzone.offsetTop - 80, behavior: 'smooth' });
    });
  }
}

function handleImageFile(file, customName = null) {
  if (state.isProcessing) return;

  const fileName = customName || file.name?.replace(/\.[^/.]+$/, '') || 'imagen';
  state.currentFileName = fileName;
  state.originalImageBlob = file;

  if (state.originalImageUrl) URL.revokeObjectURL(state.originalImageUrl);
  state.originalImageUrl = URL.createObjectURL(file);

  executeBackgroundRemoval(file);
}

// =============================================================================
// EJECUCIÓN DEL MODELO DE IA (@imgly/background-removal)
// =============================================================================
async function executeBackgroundRemoval(imageSource) {
  state.isProcessing = true;

  // Cambiar vistas
  elements.dropzone.classList.add('hidden');
  elements.resultSection.classList.add('hidden');
  elements.progressSection.classList.remove('hidden');
  updateProgress(10, 'Iniciando modelo de segmentación de IA...');

  try {
    const aiConfig = {
      publicPath: CONFIG.ai.publicPath,
      model: CONFIG.ai.model,
      debug: CONFIG.ai.debug,
      progress: (key, current, total) => {
        let pct = total ? Math.min(Math.round((current / total) * 100), 100) : 50;

        if (key.includes('fetch')) {
          updateProgress(pct * 0.6, `Descargando componentes del modelo (${pct}%)...`);
        } else if (key.includes('compute')) {
          updateProgress(60 + (pct * 0.38), `Recortando sujeto y aislando fondo (${pct}%)...`);
        } else {
          updateProgress(pct, `Procesando: ${key}`);
        }
      }
    };

    const resultBlob = await imglyRemoveBackground(imageSource, aiConfig);

    updateProgress(100, '¡Recorte completado con éxito!');
    state.processedImageBlob = resultBlob;

    if (state.processedImageUrl) URL.revokeObjectURL(state.processedImageUrl);
    state.processedImageUrl = URL.createObjectURL(resultBlob);

    // Renderizar resultado en el comparador
    showResults();
  } catch (error) {
    console.error('Error al remover el fondo:', error);
    alert('Ocurrió un error al procesar la imagen: ' + (error.message || error) + '\n\nAsegúrate de tener conexión a Internet para descargar el modelo inicial.');
    elements.progressSection.classList.add('hidden');
    elements.dropzone.classList.remove('hidden');
  } finally {
    state.isProcessing = false;
  }
}

function updateProgress(percent, statusText) {
  const rounded = Math.min(100, Math.max(0, Math.round(percent)));
  if (elements.progressBar) elements.progressBar.style.width = `${rounded}%`;
  if (elements.progressPercent) elements.progressPercent.textContent = `${rounded}%`;
  if (elements.progressStatus) elements.progressStatus.textContent = statusText;
}

// =============================================================================
// COMPARADOR INTERACTIVO ANTES / DESPUÉS
// =============================================================================
function showResults() {
  elements.comparisonBefore.src = state.originalImageUrl;
  elements.comparisonAfter.src = state.processedImageUrl;

  // Reset del slider al 50%
  setSliderPosition(50);
  if (elements.comparisonRange) elements.comparisonRange.value = 50;

  // Mostrar panel de resultados con animación
  elements.progressSection.classList.add('hidden');
  elements.resultSection.classList.remove('hidden');

  elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setupComparisonSlider() {
  if (!elements.comparisonRange || !elements.comparisonContainer) return;

  elements.comparisonRange.addEventListener('input', (e) => {
    setSliderPosition(e.target.value);
  });

  // Selector de fondo de previsualización (Transparente, Blanco, Negro, Checkerboard oscuro)
  elements.bgOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.bgOptionBtns.forEach(b => b.classList.remove('ring-2', 'ring-blue-500'));
      btn.classList.add('ring-2', 'ring-blue-500');

      const bgType = btn.dataset.bg;
      elements.comparisonContainer.className = 'comparison-container rounded-xl shadow-lg';

      if (bgType === 'checkerboard') elements.comparisonContainer.classList.add('bg-checkerboard');
      else if (bgType === 'checkerboard-dark') elements.comparisonContainer.classList.add('bg-checkerboard-dark');
      else if (bgType === 'white') elements.comparisonContainer.classList.add('bg-white');
      else if (bgType === 'black') elements.comparisonContainer.classList.add('bg-slate-900');
    });
  });
}

function setSliderPosition(pos) {
  if (elements.comparisonContainer) {
    elements.comparisonContainer.style.setProperty('--split-pos', `${pos}%`);
  }
}

// =============================================================================
// MONETIZACIÓN & DESCARGA DE ARCHIVO
// =============================================================================
function setupMonetizationModal() {
  if (!elements.downloadBtn) return;

  elements.downloadBtn.addEventListener('click', () => {
    if (!state.processedImageBlob) return;

    if (!CONFIG.monetization.enabled) {
      // Descarga directa sin intermediación
      triggerDirectDownload();
      return;
    }

    if (CONFIG.monetization.mode === 'direct_redirect') {
      // Redirigir directamente al acortador mientras se entrega el archivo
      triggerDirectDownload();
      const targetShortener = `${CONFIG.monetization.shortenerUrl}${encodeURIComponent(window.location.href)}`;
      window.open(targetShortener, '_blank');
      return;
    }

    // Modo por defecto: 'modal_timer'
    openMonetizationModal();
  });

  if (elements.closeMonetizationModal) {
    elements.closeMonetizationModal.addEventListener('click', closeMonetizationModalHandler);
  }

  if (elements.continueDownloadBtn) {
    elements.continueDownloadBtn.addEventListener('click', () => {
      triggerDirectDownload();
      closeMonetizationModalHandler();
    });
  }

  if (elements.sponsorLinkBtn) {
    elements.sponsorLinkBtn.addEventListener('click', () => {
      const shortenerUrl = `${CONFIG.monetization.shortenerUrl}${encodeURIComponent(window.location.href)}`;
      window.open(shortenerUrl, '_blank');
    });
  }
}

function openMonetizationModal() {
  if (!elements.monetizationModal) return;

  elements.monetizationModal.classList.remove('hidden');
  elements.continueDownloadBtn.disabled = true;
  elements.continueDownloadBtn.classList.add('opacity-50', 'cursor-not-allowed');

  let remaining = CONFIG.monetization.delaySeconds;
  elements.countdownDisplay.textContent = remaining;

  const interval = setInterval(() => {
    remaining--;
    if (elements.countdownDisplay) {
      elements.countdownDisplay.textContent = remaining;
    }

    if (remaining <= 0) {
      clearInterval(interval);
      elements.continueDownloadBtn.disabled = false;
      elements.continueDownloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      elements.continueDownloadBtn.textContent = '✅ Descargar PNG en Alta Calidad Ahora';
    }
  }, 1000);
}

function closeMonetizationModalHandler() {
  if (elements.monetizationModal) {
    elements.monetizationModal.classList.add('hidden');
  }
}

function triggerDirectDownload() {
  if (!state.processedImageBlob) return;

  const link = document.createElement('a');
  link.href = state.processedImageUrl;
  link.download = `${state.currentFileName}-sin-fondo.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============================================================================
// WIDGET Y MODAL DE SUBIDA POR LOTES (BULK UPLOAD)
// =============================================================================
function setupBulkUpload() {
  if (!elements.bulkWidgetBtn || !elements.bulkModal) return;

  elements.bulkWidgetBtn.addEventListener('click', () => {
    elements.bulkModal.classList.remove('hidden');
    renderBulkViews();
  });

  if (elements.closeBulkModal) {
    elements.closeBulkModal.addEventListener('click', () => {
      elements.bulkModal.classList.add('hidden');
    });
  }

  // Clic en desbloquear mediante anuncio/patrocinador
  if (elements.unlockAdBtn) {
    elements.unlockAdBtn.addEventListener('click', () => {
      // Simular apertura de anuncio o patrocinador
      window.open(CONFIG.monetization.sponsorLink, '_blank');

      // Marcar desbloqueado
      state.isBulkUnlocked = true;
      localStorage.setItem('bg_removal_bulk_unlocked', 'true');

      setTimeout(() => {
        alert('¡Excelente! Has apoyado la herramienta. El modo de Subida por Lotes (Bulk Upload) ha sido desbloqueado.');
        renderBulkViews();
      }, 500);
    });
  }

  // Selección de archivos en lote
  if (elements.bulkFileInput) {
    elements.bulkFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;

      state.bulkQueue = files.map(file => ({
        file,
        status: 'pending', // 'pending' | 'processing' | 'done' | 'error'
        resultBlob: null,
      }));

      renderBulkQueueList();
      elements.bulkStartBtn.disabled = false;
      elements.bulkStartBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    });
  }

  // Iniciar procesamiento por lotes
  if (elements.bulkStartBtn) {
    elements.bulkStartBtn.addEventListener('click', async () => {
      elements.bulkStartBtn.disabled = true;
      elements.bulkStartBtn.classList.add('opacity-50', 'cursor-not-allowed');

      for (let i = 0; i < state.bulkQueue.length; i++) {
        const item = state.bulkQueue[i];
        item.status = 'processing';
        renderBulkQueueList();

        try {
          const aiConfig = {
            publicPath: CONFIG.ai.publicPath,
            model: CONFIG.ai.model,
          };
          item.resultBlob = await imglyRemoveBackground(item.file, aiConfig);
          item.status = 'done';
        } catch (err) {
          console.error(`Error procesando archivo ${item.file.name}:`, err);
          item.status = 'error';
        }
        renderBulkQueueList();
      }

      elements.bulkDownloadAllBtn.classList.remove('hidden');
    });
  }

  // Descargar todos los procesados
  if (elements.bulkDownloadAllBtn) {
    elements.bulkDownloadAllBtn.addEventListener('click', () => {
      state.bulkQueue.forEach((item, idx) => {
        if (item.status === 'done' && item.resultBlob) {
          setTimeout(() => {
            const url = URL.createObjectURL(item.resultBlob);
            const a = document.createElement('a');
            const cleanName = item.file.name.replace(/\.[^/.]+$/, '');
            a.href = url;
            a.download = `${cleanName}-sin-fondo.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }, idx * 400); // Pequeño delay secuencial para no colapsar el gestor del navegador
        }
      });
    });
  }
}

function renderBulkViews() {
  if (state.isBulkUnlocked) {
    elements.bulkLockedView.classList.add('hidden');
    elements.bulkUnlockedView.classList.remove('hidden');
  } else {
    elements.bulkLockedView.classList.remove('hidden');
    elements.bulkUnlockedView.classList.add('hidden');
  }
}

function renderBulkQueueList() {
  if (!elements.bulkList) return;
  elements.bulkList.innerHTML = '';

  state.bulkQueue.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-sm border border-slate-200';

    let statusBadge = '<span class="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">En cola</span>';
    if (item.status === 'processing') {
      statusBadge = '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded animate-pulse">⏳ Procesando...</span>';
    } else if (item.status === 'done') {
      statusBadge = '<span class="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">✓ Completado</span>';
    } else if (item.status === 'error') {
      statusBadge = '<span class="text-xs bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded">✕ Error</span>';
    }

    row.innerHTML = `
      <div class="flex items-center gap-2 truncate max-w-[70%]">
        <span class="text-slate-400 text-xs font-mono">#${index + 1}</span>
        <span class="truncate font-medium text-slate-700">${item.file.name}</span>
      </div>
      <div>${statusBadge}</div>
    `;
    elements.bulkList.appendChild(row);
  });
}

// =============================================================================
// DETECCIÓN SUAVE DE ADBLOCKER
// =============================================================================
function detectAdBlocker() {
  setTimeout(() => {
    const testAd = document.getElementById('ad-detector-test');
    if (!testAd) return;

    const isBlocked = testAd.offsetHeight === 0 || 
                      window.getComputedStyle(testAd).display === 'none' ||
                      window.getComputedStyle(testAd).visibility === 'hidden';

    if (isBlocked && elements.adblockAlert) {
      elements.adblockAlert.classList.remove('hidden');
    }
  }, 1200);
}


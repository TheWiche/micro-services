/**
 * Conversor de Imágenes Moderno (HEIC, WEBP, AVIF a PNG/JPG)
 * 100% Client-Side con HTML5 Canvas, heic2any y JSZip
 */

// =============================================================================
// ESTADO GLOBAL
// =============================================================================
const state = {
  selectedFormat: 'jpg', // 'jpg' | 'png'
  quality: 0.85, // 0.10 a 1.00
  filesQueue: [],
  isBatchUnlocked: localStorage.getItem('img_conv_batch_unlocked') === 'true',
  isProcessing: false,
};

// =============================================================================
// ELEMENTOS DEL DOM
// =============================================================================
const elements = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),

  // Configuración de salida
  formatRadios: document.querySelectorAll('input[name="output-format"]'),
  qualitySlider: document.getElementById('quality-slider'),
  qualityValueDisplay: document.getElementById('quality-value'),
  qualityContainer: document.getElementById('quality-container'),

  // Progreso y Lista de Resultados
  resultsSection: document.getElementById('results-section'),
  resultsList: document.getElementById('results-list'),
  processedCount: document.getElementById('processed-count'),
  downloadAllZipBtn: document.getElementById('download-all-zip-btn'),
  clearAllBtn: document.getElementById('clear-all-btn'),
  sampleBtn: document.getElementById('sample-btn'),

  // Modal de Monetización / Desbloqueo por Lotes
  batchAdModal: document.getElementById('batch-ad-modal'),
  closeBatchModal: document.getElementById('close-batch-modal'),
  unlockZipBtn: document.getElementById('unlock-zip-btn'),
  sponsorLinkBtn: document.getElementById('sponsor-link-btn'),
};

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupUploadEvents();
  setupConversionOptions();
  setupBatchModal();
  setupSampleButton();
});

// =============================================================================
// CONFIGURACIÓN DE OPCIONES (FORMATO Y CALIDAD)
// =============================================================================
function setupConversionOptions() {
  // Selector de formato (JPG vs PNG)
  elements.formatRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.selectedFormat = e.target.value;
      if (state.selectedFormat === 'png') {
        elements.qualityContainer.classList.add('opacity-50');
        elements.qualitySlider.disabled = true;
      } else {
        elements.qualityContainer.classList.remove('opacity-50');
        elements.qualitySlider.disabled = false;
      }
    });
  });

  // Slider de calidad (10% a 100%)
  if (elements.qualitySlider) {
    elements.qualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.quality = val / 100;
      elements.qualityValueDisplay.textContent = `${val}%`;
    });
  }

  // Limpiar lista
  if (elements.clearAllBtn) {
    elements.clearAllBtn.addEventListener('click', () => {
      state.filesQueue.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      });
      state.filesQueue = [];
      elements.resultsList.innerHTML = '';
      elements.resultsSection.classList.add('hidden');
      elements.fileInput.value = '';
    });
  }
}

// =============================================================================
// MANEJO DE SUBIDAS (INPUT, DRAG & DROP, PORTAPAPELES CTRL+V)
// =============================================================================
function setupUploadEvents() {
  if (elements.uploadBtn && elements.fileInput) {
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) handleFiles(files);
    });
  }

  if (elements.dropzone) {
    elements.dropzone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('label')) {
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
      const files = Array.from(e.dataTransfer?.files || []).filter(f => isImageOrHeic(f));
      if (files.length > 0) {
        handleFiles(files);
      } else {
        alert('Por favor, suelta archivos de imagen compatibles (HEIC, WEBP, AVIF, PNG, JPG).');
      }
    });
  }

  // Escuchar pegado desde portapapeles (Ctrl + V)
  window.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      handleFiles(files);
    }
  });
}

function isImageOrHeic(file) {
  const name = file.name.toLowerCase();
  return file.type.startsWith('image/') || 
         name.endsWith('.heic') || 
         name.endsWith('.heif') || 
         name.endsWith('.avif') || 
         name.endsWith('.webp');
}

// =============================================================================
// PROCESAMIENTO DE ARCHIVOS
// =============================================================================
async function handleFiles(newFiles) {
  if (newFiles.length === 0) return;

  elements.resultsSection.classList.remove('hidden');

  for (const file of newFiles) {
    const queueItem = {
      id: 'file-' + Math.random().toString(36).substr(2, 9),
      file: file,
      originalName: file.name,
      originalSize: file.size,
      status: 'converting', // 'converting' | 'done' | 'error'
      convertedBlob: null,
      convertedUrl: null,
      convertedSize: 0,
      previewUrl: null,
      outputFormat: state.selectedFormat,
      errorMessage: null,
    };

    state.filesQueue.push(queueItem);
    renderFileItem(queueItem);

    // Convertir el archivo
    await processFile(queueItem);
  }

  updateSummary();
}

async function processFile(item) {
  const rowElement = document.getElementById(item.id);
  const file = item.file;
  const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                 file.name.toLowerCase().endsWith('.heif') || 
                 file.type === 'image/heic' || 
                 file.type === 'image/heif';

  try {
    let sourceBlob = file;

    // Si es HEIC de iPhone, decodificar primero con heic2any
    if (isHeic) {
      updateItemStatus(item, 'Decodificando HEIC de iPhone...');
      if (typeof heic2any === 'undefined') {
        throw new Error('Librería heic2any no disponible.');
      }
      sourceBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 1.0,
      });
      // Si heic2any devuelve un array (múltiples frames), tomamos el primero
      if (Array.isArray(sourceBlob)) sourceBlob = sourceBlob[0];
    }

    // Convertir con HTML5 Canvas al formato y calidad elegidos
    updateItemStatus(item, `Convirtiendo a ${item.outputFormat.toUpperCase()}...`);
    const convertedBlob = await convertWithCanvas(sourceBlob, item.outputFormat, state.quality);

    item.convertedBlob = convertedBlob;
    item.convertedSize = convertedBlob.size;
    item.convertedUrl = URL.createObjectURL(convertedBlob);
    item.previewUrl = item.convertedUrl;
    item.status = 'done';

    updateFileItemDone(item);
  } catch (err) {
    console.error('Error al convertir archivo:', err);
    item.status = 'error';
    item.errorMessage = err.message || 'No se pudo decodificar el formato.';
    updateFileItemError(item);
  }
}

/**
 * Conversión nativa con HTML5 Canvas
 */
function convertWithCanvas(imageBlob, targetFormat, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');

      // Si el formato de salida es JPG, pintar fondo blanco para evitar áreas negras transparentes
      if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const mimeType = (targetFormat === 'jpg' || targetFormat === 'jpeg') ? 'image/jpeg' : 'image/png';

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Fallo al exportar el canvas a blob'));
        }
      }, mimeType, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar la imagen para renderizar en canvas'));
    };

    img.src = objectUrl;
  });
}

// =============================================================================
// RENDERIZADO VISUAL EN EL DOM
// =============================================================================
function renderFileItem(item) {
  const row = document.createElement('div');
  row.id = item.id;
  row.className = 'flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all gap-4';

  row.innerHTML = `
    <div class="flex items-center gap-4 w-full sm:w-auto">
      <div class="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 bg-checkerboard">
        <span class="text-2xl animate-spin" id="thumb-loader-${item.id}">⏳</span>
        <img id="thumb-img-${item.id}" class="hidden w-full h-full object-cover" alt="Preview">
      </div>
      <div class="min-w-0 flex-1">
        <h4 class="font-bold text-slate-800 text-sm truncate max-w-xs" title="${item.originalName}">${item.originalName}</h4>
        <div class="flex items-center gap-2 mt-1 text-xs text-slate-500">
          <span class="font-medium text-slate-600">${formatFileSize(item.originalSize)}</span>
          <span>&rarr;</span>
          <span id="status-text-${item.id}" class="text-blue-600 font-semibold animate-pulse">Procesando...</span>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
      <div id="diff-badge-${item.id}" class="hidden text-xs font-bold px-2.5 py-1 rounded-full"></div>
      <button id="download-btn-${item.id}" disabled class="px-4 py-2 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-not-allowed">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        <span>Descargar</span>
      </button>
    </div>
  `;

  elements.resultsList.appendChild(row);
}

function updateItemStatus(item, text) {
  const statusEl = document.getElementById(`status-text-${item.id}`);
  if (statusEl) statusEl.textContent = text;
}

function updateFileItemDone(item) {
  const loader = document.getElementById(`thumb-loader-${item.id}`);
  const thumb = document.getElementById(`thumb-img-${item.id}`);
  const statusEl = document.getElementById(`status-text-${item.id}`);
  const diffBadge = document.getElementById(`diff-badge-${item.id}`);
  const downloadBtn = document.getElementById(`download-btn-${item.id}`);

  if (loader) loader.classList.add('hidden');
  if (thumb) {
    thumb.src = item.previewUrl;
    thumb.classList.remove('hidden');
  }

  // Texto con el nuevo peso
  if (statusEl) {
    statusEl.classList.remove('animate-pulse', 'text-blue-600');
    statusEl.classList.add('text-emerald-700', 'font-bold');
    statusEl.textContent = `${formatFileSize(item.convertedSize)} (${item.outputFormat.toUpperCase()})`;
  }

  // Cálculo de diferencia de peso
  if (diffBadge) {
    const diff = item.convertedSize - item.originalSize;
    const diffPct = Math.round((diff / item.originalSize) * 100);
    diffBadge.classList.remove('hidden');

    if (diff < 0) {
      diffBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800';
      diffBadge.textContent = `${diffPct}%`;
      diffBadge.title = 'Ahorro de espacio';
    } else {
      diffBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700';
      diffBadge.textContent = `+${diffPct}%`;
      diffBadge.title = 'Mayor fidelidad o cambio de formato';
    }
  }

  // Activar botón de descarga individual (100% gratis y directo)
  if (downloadBtn) {
    downloadBtn.disabled = false;
    downloadBtn.className = 'px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer';
    downloadBtn.addEventListener('click', () => {
      downloadSingleItem(item);
    });
  }

  updateSummary();
}

function updateFileItemError(item) {
  const loader = document.getElementById(`thumb-loader-${item.id}`);
  const statusEl = document.getElementById(`status-text-${item.id}`);

  if (loader) {
    loader.textContent = '❌';
    loader.classList.remove('animate-spin');
  }

  if (statusEl) {
    statusEl.classList.remove('animate-pulse', 'text-blue-600');
    statusEl.classList.add('text-rose-600', 'font-bold');
    statusEl.textContent = item.errorMessage || 'Error en conversión';
  }

  updateSummary();
}

function updateSummary() {
  const completed = state.filesQueue.filter(f => f.status === 'done');
  if (elements.processedCount) {
    elements.processedCount.textContent = `${completed.length} de ${state.filesQueue.length} convertidos`;
  }

  if (elements.downloadAllZipBtn) {
    if (completed.length > 1) {
      elements.downloadAllZipBtn.classList.remove('hidden');
    } else {
      elements.downloadAllZipBtn.classList.add('hidden');
    }
  }
}

function downloadSingleItem(item) {
  if (!item.convertedBlob) return;
  const link = document.createElement('a');
  const baseName = item.originalName.replace(/\.[^/.]+$/, '');
  link.href = item.convertedUrl;
  link.download = `${baseName}.${item.outputFormat}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============================================================================
// DESCARGA MASIVA EN ZIP & BOTÓN DE MUESTRA 100% CLIENT-SIDE
// =============================================================================
function setupSampleButton() {
  if (!elements.sampleBtn) return;
  elements.sampleBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Degradado moderno
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(0.5, '#a855f7');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Círculo decorativo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(600, 400, 260, 0, Math.PI * 2);
    ctx.fill();

    // Texto
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WebTools Suite', 600, 380);

    ctx.font = '28px Inter, sans-serif';
    ctx.fillText('Imagen de Prueba para Conversión', 600, 435);

    ctx.font = '20px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('1200x800 • Procesamiento 100% Client-Side', 600, 490);

    canvas.toBlob(blob => {
      const file = new File([blob], 'muestra-paisaje.png', { type: 'image/png' });
      handleFiles([file]);
      if (window.showSuiteToast) window.showSuiteToast('¡Imagen de muestra cargada!');
    }, 'image/png');
  });
}

function setupBatchModal() {
  if (elements.downloadAllZipBtn) {
    elements.downloadAllZipBtn.addEventListener('click', () => {
      const completed = state.filesQueue.filter(f => f.status === 'done');
      if (completed.length === 0) return;
      generateAndDownloadZip();
    });
  }

  if (elements.closeBatchModal) {
    elements.closeBatchModal.addEventListener('click', () => {
      elements.batchAdModal.classList.add('hidden');
    });
  }

  if (elements.unlockZipBtn) {
    elements.unlockZipBtn.addEventListener('click', () => {
      generateAndDownloadZip();
      elements.batchAdModal.classList.add('hidden');
    });
  }
}

async function generateAndDownloadZip() {
  const completed = state.filesQueue.filter(f => f.status === 'done');
  if (completed.length === 0) return;

  if (typeof JSZip === 'undefined') {
    alert('Cargando librería de compresión ZIP... Por favor intenta en un segundo.');
    return;
  }

  const zip = new JSZip();
  const folder = zip.folder('imagenes_convertidas');

  completed.forEach(item => {
    const baseName = item.originalName.replace(/\.[^/.]+$/, '');
    const finalName = `${baseName}.${item.outputFormat}`;
    folder.file(finalName, item.convertedBlob);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);

  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = `imagenes_convertidas_${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
}

// Formateador de bytes a KB / MB
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


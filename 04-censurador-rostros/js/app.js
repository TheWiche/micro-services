/**
 * Censurador de Rostros y Privacidad Visual - 100% Client-Side
 * Detección de rostros con face-api.js y manipulación con HTML5 Canvas
 */

// =============================================================================
// CONFIGURACIÓN GLOBAL
// =============================================================================
const CONFIG = {
  modelsUrl: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model',
  monetization: {
    enabled: false, // Descarga directa 100% Client-Side
    shortenerUrl: 'https://ouo.io/qs/censura-privada?s=',
    delaySeconds: 0,
  }
};

// =============================================================================
// ESTADO DE LA APLICACIÓN
// =============================================================================
const state = {
  originalImage: null,
  fileName: 'foto-censurada',
  censorType: 'pixelate', // 'pixelate' | 'blur' | 'blackbar'
  toolMode: 'rect', // 'rect' | 'brush'
  intensity: 18,
  brushSize: 30,
  isDrawing: false,
  startX: 0,
  startY: 0,
  history: [], // Pila de ImageData para Undo
  maxHistory: 12,
  isModelLoaded: false,
  isDetecting: false,
};

// =============================================================================
// ELEMENTOS DEL DOM
// =============================================================================
const elements = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  sampleBtn: document.getElementById('sample-btn'),

  // Secciones
  workspace: document.getElementById('workspace-section'),
  toolCard: document.getElementById('tool-card'),

  // Canvas
  canvas: document.getElementById('image-canvas'),
  tempCanvas: document.getElementById('temp-canvas'),

  // Controles de censura
  btnPixelate: document.getElementById('btn-pixelate'),
  btnBlur: document.getElementById('btn-blur'),
  btnBlackbar: document.getElementById('btn-blackbar'),
  intensitySlider: document.getElementById('intensity-slider'),
  intensityValue: document.getElementById('intensity-value'),

  // Herramientas manuales
  toolRectBtn: document.getElementById('tool-rect-btn'),
  toolBrushBtn: document.getElementById('tool-brush-btn'),

  // Detección automática & Edición
  detectFacesBtn: document.getElementById('detect-faces-btn'),
  detectStatus: document.getElementById('detect-status'),
  undoBtn: document.getElementById('undo-btn'),
  resetBtn: document.getElementById('reset-btn'),
  newImageBtn: document.getElementById('new-image-btn'),
  downloadBtn: document.getElementById('download-btn'),

  // Modal de descarga
  downloadModal: document.getElementById('download-modal'),
  closeDownloadModal: document.getElementById('close-download-modal'),
  countdownDisplay: document.getElementById('countdown-display'),
  continueDownloadBtn: document.getElementById('continue-download-btn'),
  sponsorLinkBtn: document.getElementById('sponsor-link-btn'),
  toast: document.getElementById('toast'),
};

let ctx = null;
let tempCtx = null;

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  ctx = elements.canvas.getContext('2d');
  tempCtx = elements.tempCanvas.getContext('2d');

  setupUploadEvents();
  setupCensorControls();
  setupCanvasInteractions();
  setupActionButtons();
  loadFaceDetectionModel();
});

// =============================================================================
// CARGA DEL MODELO FACE-API.JS
// =============================================================================
async function loadFaceDetectionModel() {
  try {
    if (typeof faceapi !== 'undefined') {
      await faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.modelsUrl);
      state.isModelLoaded = true;
      if (elements.detectStatus) {
        elements.detectStatus.textContent = 'IA lista para detectar rostros';
      }
    }
  } catch (err) {
    console.warn('No se pudo pre-cargar el modelo de face-api:', err);
  }
}

// =============================================================================
// SUBIDA DE ARCHIVOS
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
      if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
      } else {
        showToast('Por favor suelta un archivo de imagen válido');
      }
    });
  }

  // Pegado directo (Ctrl + V)
  window.addEventListener('paste', (e) => {
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

  // Muestra de prueba
  if (elements.sampleBtn) {
    elements.sampleBtn.addEventListener('click', () => {
      loadSampleGroupPhoto();
    });
  }

  if (elements.newImageBtn) {
    elements.newImageBtn.addEventListener('click', () => {
      elements.workspace.classList.add('hidden');
      elements.toolCard.classList.remove('hidden');
      elements.fileInput.value = '';
      window.scrollTo({ top: elements.toolCard.offsetTop - 80, behavior: 'smooth' });
    });
  }
}

function handleImageFile(file, customName = null) {
  state.fileName = customName || file.name.replace(/\.[^/.]+$/, '') || 'foto-privada';
  const img = new Image();
  const url = URL.createObjectURL(file);

  img.onload = () => {
    URL.revokeObjectURL(url);
    setupWorkspaceImage(img);
  };
  img.src = url;
}

function setupWorkspaceImage(img) {
  state.originalImage = img;
  state.history = [];

  // Ajustar dimensiones del canvas
  const maxWidth = 1200;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  if (w > maxWidth) {
    const ratio = maxWidth / w;
    w = maxWidth;
    h = Math.round(h * ratio);
  }

  elements.canvas.width = w;
  elements.canvas.height = h;
  elements.tempCanvas.width = w;
  elements.tempCanvas.height = h;

  ctx.drawImage(img, 0, 0, w, h);
  saveHistoryState();

  elements.toolCard.classList.add('hidden');
  elements.workspace.classList.remove('hidden');
  elements.workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =============================================================================
// CONTROLES DE CENSURA Y HERRAMIENTAS
// =============================================================================
function setupCensorControls() {
  // Tipos de censura
  elements.btnPixelate.addEventListener('click', () => {
    setCensorType('pixelate');
  });

  elements.btnBlur.addEventListener('click', () => {
    setCensorType('blur');
  });

  elements.btnBlackbar.addEventListener('click', () => {
    setCensorType('blackbar');
  });

  // Selector de herramienta manual (Rectángulo vs Pincel)
  elements.toolRectBtn.addEventListener('click', () => {
    state.toolMode = 'rect';
    elements.toolRectBtn.className = 'flex-1 py-2 px-3 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs';
    elements.toolBrushBtn.className = 'flex-1 py-2 px-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200';
  });

  elements.toolBrushBtn.addEventListener('click', () => {
    state.toolMode = 'brush';
    elements.toolBrushBtn.className = 'flex-1 py-2 px-3 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs';
    elements.toolRectBtn.className = 'flex-1 py-2 px-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200';
  });

  // Regulador de intensidad
  elements.intensitySlider.addEventListener('input', (e) => {
    state.intensity = parseInt(e.target.value, 10);
    elements.intensityValue.textContent = `${state.intensity}px`;
  });
}

function setCensorType(type) {
  state.censorType = type;
  [elements.btnPixelate, elements.btnBlur, elements.btnBlackbar].forEach(btn => {
    btn.className = 'flex-1 py-2 px-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors';
  });

  if (type === 'pixelate') {
    elements.btnPixelate.className = 'flex-1 py-2 px-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs';
  } else if (type === 'blur') {
    elements.btnBlur.className = 'flex-1 py-2 px-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs';
  } else if (type === 'blackbar') {
    elements.btnBlackbar.className = 'flex-1 py-2 px-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs';
  }
}

// =============================================================================
// DETECCIÓN AUTOMÁTICA DE ROSTROS CON FACE-API.JS
// =============================================================================
async function detectAndCensorFaces() {
  if (state.isDetecting) return;
  state.isDetecting = true;
  elements.detectFacesBtn.disabled = true;
  elements.detectStatus.textContent = 'Buscando rostros con IA en el navegador...';

  try {
    if (!state.isModelLoaded) {
      await faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.modelsUrl);
      state.isModelLoaded = true;
    }

    const detections = await faceapi.detectAllFaces(
      elements.canvas,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.25 })
    );

    if (detections.length === 0) {
      showToast('No se detectaron rostros automáticamente. Usa la herramienta manual.');
      elements.detectStatus.textContent = '0 rostros encontrados';
    } else {
      saveHistoryState();

      detections.forEach(det => {
        const box = det.box;
        // Expandir un 15% el marco para tapar frente y orejas
        const padX = box.width * 0.12;
        const padY = box.height * 0.15;

        const x = Math.max(0, box.x - padX);
        const y = Math.max(0, box.y - padY);
        const w = Math.min(elements.canvas.width - x, box.width + padX * 2);
        const h = Math.min(elements.canvas.height - y, box.height + padY * 2);

        applyCensorshipToRect(x, y, w, h);
      });

      showToast(`¡${detections.length} rostro(s) censurado(s) exitosamente!`);
      elements.detectStatus.textContent = `${detections.length} rostro(s) censurado(s)`;
    }
  } catch (err) {
    console.error('Error detectando rostros:', err);
    showToast('Error en la detección: ' + err.message);
    elements.detectStatus.textContent = 'Fallo en detección automática';
  } finally {
    state.isDetecting = false;
    elements.detectFacesBtn.disabled = false;
  }
}

// =============================================================================
// INTERACCIÓN MANUAL (RECTÁNGULO Y PINCEL EN CANVAS)
// =============================================================================
function setupCanvasInteractions() {
  const c = elements.canvas;

  c.addEventListener('mousedown', startInteraction);
  window.addEventListener('mousemove', moveInteraction);
  window.addEventListener('mouseup', endInteraction);

  // Soporte táctil
  c.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startInteraction(touch);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (!state.isDrawing) return;
    const touch = e.touches[0];
    moveInteraction(touch);
  });

  window.addEventListener('touchend', endInteraction);
}

function getCanvasCoordinates(e) {
  const rect = elements.canvas.getBoundingClientRect();
  const scaleX = elements.canvas.width / rect.width;
  const scaleY = elements.canvas.height / rect.height;

  const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
  const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);

  return {
    x: Math.round((clientX - rect.left) * scaleX),
    y: Math.round((clientY - rect.top) * scaleY)
  };
}

function startInteraction(e) {
  if (!state.originalImage) return;
  state.isDrawing = true;
  saveHistoryState();

  const coords = getCanvasCoordinates(e);
  state.startX = coords.x;
  state.startY = coords.y;

  if (state.toolMode === 'brush') {
    applyBrushStroke(coords.x, coords.y);
  }
}

function moveInteraction(e) {
  if (!state.isDrawing) return;
  const coords = getCanvasCoordinates(e);

  if (state.toolMode === 'brush') {
    applyBrushStroke(coords.x, coords.y);
  } else if (state.toolMode === 'rect') {
    // Dibujar preview del rectángulo en tempCanvas
    const w = coords.x - state.startX;
    const h = coords.y - state.startY;

    tempCtx.clearRect(0, 0, elements.tempCanvas.width, elements.tempCanvas.height);
    tempCtx.strokeStyle = '#0ea5e9';
    tempCtx.lineWidth = 2;
    tempCtx.setLineDash([6, 4]);
    tempCtx.strokeRect(state.startX, state.startY, w, h);
  }
}

function endInteraction(e) {
  if (!state.isDrawing) return;
  state.isDrawing = false;
  tempCtx.clearRect(0, 0, elements.tempCanvas.width, elements.tempCanvas.height);

  if (state.toolMode === 'rect') {
    const coords = getCanvasCoordinates(e);
    let x = Math.min(state.startX, coords.x);
    let y = Math.min(state.startY, coords.y);
    let w = Math.abs(coords.x - state.startX);
    let h = Math.abs(coords.y - state.startY);

    // Ignorar clics accidentales de menos de 4 píxeles
    if (w > 4 && h > 4) {
      applyCensorshipToRect(x, y, w, h);
    }
  }
}

function applyBrushStroke(x, y) {
  const radius = state.brushSize;
  const rectX = Math.max(0, x - radius);
  const rectY = Math.max(0, y - radius);
  const rectW = Math.min(elements.canvas.width - rectX, radius * 2);
  const rectH = Math.min(elements.canvas.height - rectY, radius * 2);

  applyCensorshipToRect(rectX, rectY, rectW, rectH);
}

// =============================================================================
// ALGORITMOS DE CENSURA (PIXELADO, BLUR GAUSSIANO, BARRA NEGRA)
// =============================================================================
function applyCensorshipToRect(x, y, w, h) {
  if (w <= 0 || h <= 0) return;

  if (state.censorType === 'blackbar') {
    // Barra negra sólida
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, w, h);
  } else if (state.censorType === 'pixelate') {
    // Pixelado mediante escala directa
    const blockSize = Math.max(4, state.intensity);
    const scaledW = Math.max(1, Math.floor(w / blockSize));
    const scaledH = Math.max(1, Math.floor(h / blockSize));

    const off = document.createElement('canvas');
    off.width = scaledW;
    off.height = scaledH;
    const offCtx = off.getContext('2d');

    // Muestreo hacia abajo
    offCtx.drawImage(elements.canvas, x, y, w, h, 0, 0, scaledW, scaledH);

    // Re-escalar hacia arriba sin suavizado
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, scaledW, scaledH, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  } else if (state.censorType === 'blur') {
    // Desenfoque Gaussiano
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.filter = `blur(${Math.max(4, state.intensity)}px)`;
    ctx.drawImage(elements.canvas, 0, 0);
    ctx.restore();
  }
}

// =============================================================================
// HISTORIAL Y ACCIONES (DESHACER, RESET, DESCARGA)
// =============================================================================
function saveHistoryState() {
  const imgData = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
  state.history.push(imgData);
  if (state.history.length > state.maxHistory) {
    state.history.shift();
  }
}

function setupActionButtons() {
  // Deshacer (Undo)
  elements.undoBtn.addEventListener('click', () => {
    if (state.history.length > 1) {
      state.history.pop(); // Quitar estado actual
      const prev = state.history[state.history.length - 1];
      ctx.putImageData(prev, 0, 0);
      showToast('Acción deshecha');
    } else {
      showToast('No hay más acciones que deshacer');
    }
  });

  // Reset al original
  elements.resetBtn.addEventListener('click', () => {
    if (state.originalImage) {
      saveHistoryState();
      ctx.drawImage(state.originalImage, 0, 0, elements.canvas.width, elements.canvas.height);
      showToast('Lienzo restaurado a la foto original');
    }
  });

  // Detectar rostros
  elements.detectFacesBtn.addEventListener('click', () => {
    detectAndCensorFaces();
  });

  // Descarga con modal de monetización
  elements.downloadBtn.addEventListener('click', () => {
    if (!state.originalImage) return;

    if (!CONFIG.monetization.enabled) {
      triggerDownload();
      return;
    }

    openDownloadModal();
  });

  if (elements.closeDownloadModal) {
    elements.closeDownloadModal.addEventListener('click', () => {
      elements.downloadModal.classList.add('hidden');
    });
  }

  if (elements.continueDownloadBtn) {
    elements.continueDownloadBtn.addEventListener('click', () => {
      triggerDownload();
      elements.downloadModal.classList.add('hidden');
    });
  }

  if (elements.sponsorLinkBtn) {
    elements.sponsorLinkBtn.addEventListener('click', () => {
      window.open(CONFIG.monetization.shortenerUrl + encodeURIComponent(window.location.href), '_blank');
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
      elements.continueDownloadBtn.textContent = '✅ Descargar Foto Protegida Ahora';
    }
  }, 1000);
}

function triggerDownload() {
  const link = document.createElement('a');
  link.href = elements.canvas.toDataURL('image/jpeg', 0.92);
  link.download = `${state.fileName}-protegida.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Descargando imagen protegida...');
}

// Imagen de muestra con rostros para pruebas
function loadSampleGroupPhoto() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    setupWorkspaceImage(img);
    setTimeout(() => {
      detectAndCensorFaces();
    }, 400);
  };
  img.src = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80';
}

function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2800);
}


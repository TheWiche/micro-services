/**
 * OCR de Texto - 100% Client-Side
 * Reconocimiento óptico de caracteres con Tesseract.js en WebAssembly
 */

// =============================================================================
// ESTADO GLOBAL
// =============================================================================
const state = {
  originalImageBlob: null,
  originalImageUrl: null,
  fileName: 'documento-extraido',
  selectedLanguage: 'spa', // 'spa' | 'eng' | 'por' | 'spa+eng'
  isRecognizing: false,
};

// =============================================================================
// ELEMENTOS DEL DOM
// =============================================================================
const elements = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  sampleBtn: document.getElementById('sample-btn'),
  langSelect: document.getElementById('lang-select'),

  // Secciones
  toolCard: document.getElementById('tool-card'),
  progressSection: document.getElementById('progress-section'),
  workspace: document.getElementById('workspace-section'),

  // Progreso
  progressBar: document.getElementById('progress-bar'),
  progressPercent: document.getElementById('progress-percent'),
  progressStatus: document.getElementById('progress-status'),

  // Visor y Edición
  docPreviewImg: document.getElementById('doc-preview-img'),
  ocrTextarea: document.getElementById('ocr-textarea'),
  wordsCount: document.getElementById('words-count'),
  charsCount: document.getElementById('chars-count'),
  confidenceBadge: document.getElementById('confidence-badge'),

  // Acciones
  copyTextBtn: document.getElementById('copy-text-btn'),
  downloadTxtBtn: document.getElementById('download-txt-btn'),
  cleanLinesBtn: document.getElementById('clean-lines-btn'),
  newDocBtn: document.getElementById('new-doc-btn'),
  toast: document.getElementById('toast'),
};

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupUploadEvents();
  setupLanguageSelector();
  setupActionButtons();
  setupSampleDocument();
});

// =============================================================================
// SUBIDA DE ARCHIVOS & CAPTURA PORTAPAPELES (CTRL + V)
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
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('button') && !e.target.closest('select')) {
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
        showToast('Por favor suelta un archivo de imagen (PNG, JPG o WebP)');
      }
    });
  }

  // Pegado directo desde el portapapeles (Ctrl + V) para recortes y capturas
  window.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageFile(file, 'captura-pantalla');
          showToast('¡Captura pegada desde el portapapeles!');
          break;
        }
      }
    }
  });

  if (elements.newDocBtn) {
    elements.newDocBtn.addEventListener('click', () => {
      elements.workspace.classList.add('hidden');
      elements.progressSection.classList.add('hidden');
      elements.toolCard.classList.remove('hidden');
      elements.fileInput.value = '';
      window.scrollTo({ top: elements.toolCard.offsetTop - 80, behavior: 'smooth' });
    });
  }
}

function setupLanguageSelector() {
  if (elements.langSelect) {
    elements.langSelect.addEventListener('change', (e) => {
      state.selectedLanguage = e.target.value;
    });
  }
}

function handleImageFile(file, customName = null) {
  if (state.isRecognizing) return;

  state.fileName = customName || file.name.replace(/\.[^/.]+$/, '') || 'documento';
  state.originalImageBlob = file;

  if (state.originalImageUrl) URL.revokeObjectURL(state.originalImageUrl);
  state.originalImageUrl = URL.createObjectURL(file);

  elements.docPreviewImg.src = state.originalImageUrl;

  runOcrRecognition(file);
}

// =============================================================================
// RECONOCIMIENTO OCR CON TESSERACT.JS
// =============================================================================
async function runOcrRecognition(imageSource) {
  state.isRecognizing = true;

  elements.toolCard.classList.add('hidden');
  elements.workspace.classList.add('hidden');
  elements.progressSection.classList.remove('hidden');

  updateProgress(5, 'Iniciando motor Tesseract en WebAssembly...');

  try {
    if (typeof Tesseract === 'undefined') {
      throw new Error('Librería Tesseract.js no cargada.');
    }

    const { data } = await Tesseract.recognize(
      imageSource,
      state.selectedLanguage,
      {
        logger: (m) => {
          handleTesseractLogger(m);
        }
      }
    );

    updateProgress(100, '¡Texto extraído con éxito!');

    // Mostrar resultados
    elements.ocrTextarea.value = data.text || '';
    updateTextMetrics(data.text);

    if (elements.confidenceBadge) {
      const conf = Math.round(data.confidence || 90);
      elements.confidenceBadge.textContent = `${conf}% de precisión`;
    }

    setTimeout(() => {
      elements.progressSection.classList.add('hidden');
      elements.workspace.classList.remove('hidden');
      elements.workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 400);

  } catch (err) {
    console.error('Error en reconocimiento OCR:', err);
    alert('Error al reconocer el texto: ' + (err.message || err));
    elements.progressSection.classList.add('hidden');
    elements.toolCard.classList.remove('hidden');
  } finally {
    state.isRecognizing = false;
  }
}

function handleTesseractLogger(m) {
  const status = m.status || '';
  const progress = m.progress || 0;
  const pct = Math.min(100, Math.round(progress * 100));

  if (status.includes('loading tesseract core')) {
    updateProgress(10, 'Descargando núcleo WebAssembly...');
  } else if (status.includes('loading language')) {
    updateProgress(25 + Math.round(pct * 0.25), `Descargando diccionario (${state.selectedLanguage.toUpperCase()})...`);
  } else if (status.includes('initializing')) {
    updateProgress(55, 'Inicializando motor OCR...');
  } else if (status.includes('recognizing text')) {
    updateProgress(60 + Math.round(pct * 0.38), `Escaneando y digitalizando texto (${pct}%)...`);
  } else {
    updateProgress(pct, status);
  }
}

function updateProgress(percent, text) {
  const rounded = Math.min(100, Math.max(0, Math.round(percent)));
  if (elements.progressBar) elements.progressBar.style.width = `${rounded}%`;
  if (elements.progressPercent) elements.progressPercent.textContent = `${rounded}%`;
  if (elements.progressStatus) elements.progressStatus.textContent = text;
}

// =============================================================================
// MÉTRICAS Y EDICIÓN EN TIEMPO REAL
// =============================================================================
function updateTextMetrics(text) {
  const clean = text.trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  const chars = text.length;

  if (elements.wordsCount) elements.wordsCount.textContent = `${words} palabras`;
  if (elements.charsCount) elements.charsCount.textContent = `${chars} caracteres`;
}

// Escuchar cambios manuales en el textarea
elements.ocrTextarea.addEventListener('input', (e) => {
  updateTextMetrics(e.target.value);
});

// =============================================================================
// BOTONES DE ACCIÓN (COPIAR, DESCARGAR TXT, LIMPIAR LÍNEAS)
// =============================================================================
function setupActionButtons() {
  // Copiar texto completo
  elements.copyTextBtn.addEventListener('click', () => {
    const text = elements.ocrTextarea.value;
    if (!text) {
      showToast('No hay texto para copiar');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast('¡Texto copiado al portapapeles!');
    }).catch(() => {
      showToast('No se pudo copiar automáticamente');
    });
  });

  // Descargar archivo .TXT
  elements.downloadTxtBtn.addEventListener('click', () => {
    const text = elements.ocrTextarea.value;
    if (!text) {
      showToast('No hay texto para descargar');
      return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.fileName}-ocr.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('¡Archivo .TXT descargado!');
  });

  // Limpiar saltos de línea innecesarios
  if (elements.cleanLinesBtn) {
    elements.cleanLinesBtn.addEventListener('click', () => {
      const current = elements.ocrTextarea.value;
      // Reemplaza saltos de línea múltiples por uno solo y une palabras partidas con guión
      const cleaned = current
        .replace(/-\n/g, '')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/([^\n])\n([^\n])/g, '$1 $2');
      elements.ocrTextarea.value = cleaned;
      updateTextMetrics(cleaned);
      showToast('Formato de párrafos normalizado');
    });
  }
}

// =============================================================================
// MUESTRA DE DOCUMENTO DE PRUEBA (RECIBO / FACTURA SIMULADA EN CANVAS)
// =============================================================================
function setupSampleDocument() {
  if (!elements.sampleBtn) return;

  elements.sampleBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Fondo papel con leve textura
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 700, 800);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('RECIBO DE SERVICIOS DIGITALES', 50, 80);

    ctx.font = 'normal 18px monospace';
    ctx.fillText('Factura Nro: FAC-2026-0891', 50, 130);
    ctx.fillText('Fecha: 19 de Octubre de 2026', 50, 160);
    ctx.fillText('Cliente: Desarrollo Web SL', 50, 190);
    ctx.fillText('NIT/RUT: 900.824.112-5', 50, 220);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 250);
    ctx.lineTo(650, 250);
    ctx.stroke();

    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('DESCRIPCIÓN', 50, 290);
    ctx.fillText('CANT', 400, 290);
    ctx.fillText('TOTAL', 550, 290);

    ctx.font = 'normal 17px sans-serif';
    ctx.fillText('Servicio Cloud Hosting Premium', 50, 330);
    ctx.fillText('1', 410, 330);
    ctx.fillText('$120.00', 550, 330);

    ctx.fillText('Certificado SSL Wildcard Anual', 50, 370);
    ctx.fillText('1', 410, 370);
    ctx.fillText('$45.00', 550, 370);

    ctx.fillText('Mantenimiento y Soporte Técnico', 50, 410);
    ctx.fillText('3', 410, 410);
    ctx.fillText('$150.00', 550, 410);

    ctx.beginPath();
    ctx.moveTo(50, 450);
    ctx.lineTo(650, 450);
    ctx.stroke();

    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('TOTAL A PAGAR: $315.00 USD', 50, 500);

    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Gracias por su preferencia. Documento válido para efectos tributarios.', 50, 560);
    ctx.fillText('Procesado con Inteligencia Artificial 100% Client-Side.', 50, 590);

    canvas.toBlob((blob) => {
      handleImageFile(blob, 'factura-demo');
    }, 'image/png');
  });
}

function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2800);
}


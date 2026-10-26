/**
 * Lector y Generador de Códigos QR - 100% Client-Side
 * Decodificación con jsQR y generación con QRCode.js
 */

// =============================================================================
// ESTADO GLOBAL
// =============================================================================
const state = {
  activeTab: 'scan', // 'scan' | 'generate'
  decodedData: null,
  isUrl: false,
  originalImageUrl: null,
  generatedQrInstance: null,
};

// =============================================================================
// ELEMENTOS DEL DOM
// =============================================================================
const elements = {
  // Tabs
  tabScanBtn: document.getElementById('tab-scan-btn'),
  tabGenBtn: document.getElementById('tab-gen-btn'),
  scanSection: document.getElementById('scan-section'),
  genSection: document.getElementById('gen-section'),

  // Dropzone
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  sampleBtns: document.querySelectorAll('.sample-btn'),

  // Resultado Escaneo
  resultCard: document.getElementById('result-card'),
  qrCanvas: document.getElementById('qr-canvas'),
  qrTypeBadge: document.getElementById('qr-type-badge'),
  qrDecodedText: document.getElementById('qr-decoded-text'),
  copyContentBtn: document.getElementById('copy-content-btn'),
  openLinkBtn: document.getElementById('open-link-btn'),
  scanAgainBtn: document.getElementById('scan-again-btn'),

  // Generador QR
  genInputText: document.getElementById('gen-input-text'),
  genFgColor: document.getElementById('gen-fg-color'),
  genBgColor: document.getElementById('gen-bg-color'),
  genOutputContainer: document.getElementById('gen-output-container'),
  downloadGenQrBtn: document.getElementById('download-gen-qr-btn'),
  toast: document.getElementById('toast'),
};

let ctx = null;

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  ctx = elements.qrCanvas.getContext('2d');

  setupTabs();
  setupUploadEvents();
  setupScanActions();
  setupGeneratorEvents();
  setupSampleQrs();
});

// =============================================================================
// PESTAÑAS (ESCANEAR VS GENERAR)
// =============================================================================
function setupTabs() {
  elements.tabScanBtn.addEventListener('click', () => {
    state.activeTab = 'scan';
    elements.tabScanBtn.className = 'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white shadow-xs flex items-center justify-center gap-2';
    elements.tabGenBtn.className = 'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2';
    elements.scanSection.classList.remove('hidden');
    elements.genSection.classList.add('hidden');
  });

  elements.tabGenBtn.addEventListener('click', () => {
    state.activeTab = 'generate';
    elements.tabGenBtn.className = 'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white shadow-xs flex items-center justify-center gap-2';
    elements.tabScanBtn.className = 'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2';
    elements.scanSection.classList.add('hidden');
    elements.genSection.classList.remove('hidden');

    if (!state.generatedQrInstance) {
      generateCustomQr();
    }
  });
}

// =============================================================================
// SUBIDA DE IMÁGENES & CAPTURA PORTAPAPELES (CTRL + V)
// =============================================================================
function setupUploadEvents() {
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  });

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
      showToast('Por favor suelta una imagen que contenga un código QR');
    }
  });

  // Pegado directo desde portapapeles (Ctrl + V)
  window.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageFile(file);
          showToast('¡Captura pegada desde el portapapeles!');
          break;
        }
      }
    }
  });

  elements.scanAgainBtn.addEventListener('click', () => {
    elements.resultCard.classList.add('hidden');
    elements.dropzone.classList.remove('hidden');
    elements.fileInput.value = '';
    window.scrollTo({ top: elements.dropzone.offsetTop - 80, behavior: 'smooth' });
  });
}

function handleImageFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(url);
    scanImageForQr(img);
  };
  img.src = url;
}

// =============================================================================
// ESCANEO CON JSQR
// =============================================================================
function scanImageForQr(img) {
  const canvas = elements.qrCanvas;
  const maxW = 900;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  if (w > maxW) {
    const ratio = maxW / w;
    w = maxW;
    h = Math.round(h * ratio);
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);

  if (typeof jsQR === 'undefined') {
    showToast('Librería jsQR no disponible.');
    return;
  }

  // Intento de decodificación
  let code = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });

  if (code) {
    // Dibujar caja de detección verde sobre el código QR en la imagen
    drawQrBox(code.location);

    state.decodedData = code.data;
    displayScanResult(code.data);
  } else {
    showToast('No se encontró ningún código QR legible en esta captura.');
  }
}

function drawQrBox(location) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#22c55e'; // Verde brillante
  ctx.beginPath();
  ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
  ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
  ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
  ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
  ctx.closePath();
  ctx.stroke();

  // Esquinas
  const points = [location.topLeftCorner, location.topRightCorner, location.bottomRightCorner, location.bottomLeftCorner];
  points.forEach(p => {
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function displayScanResult(text) {
  elements.qrDecodedText.value = text;
  elements.dropzone.classList.add('hidden');
  elements.resultCard.classList.remove('hidden');

  // Detección de tipo
  const isUrl = /^https?:\/\//i.test(text.trim());
  state.isUrl = isUrl;

  if (isUrl) {
    elements.qrTypeBadge.textContent = 'Enlace Web (URL)';
    elements.qrTypeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800';
    elements.openLinkBtn.classList.remove('hidden');
    elements.openLinkBtn.href = text.trim();
  } else if (/^WIFI:/i.test(text.trim())) {
    elements.qrTypeBadge.textContent = 'Red Wi-Fi';
    elements.qrTypeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800';
    elements.openLinkBtn.classList.add('hidden');
  } else if (/^BEGIN:VCARD/i.test(text.trim())) {
    elements.qrTypeBadge.textContent = 'Contacto vCard';
    elements.qrTypeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
    elements.openLinkBtn.classList.add('hidden');
  } else {
    elements.qrTypeBadge.textContent = 'Texto Plano';
    elements.qrTypeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700';
    elements.openLinkBtn.classList.add('hidden');
  }

  elements.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast('¡Código QR decodificado con éxito!');
}

function setupScanActions() {
  elements.copyContentBtn.addEventListener('click', () => {
    if (!state.decodedData) return;
    navigator.clipboard.writeText(state.decodedData).then(() => {
      showToast('¡Contenido copiado al portapapeles!');
    }).catch(() => {
      showToast('No se pudo copiar');
    });
  });
}

// =============================================================================
// GENERADOR DE CÓDIGOS QR (QRCODE.JS)
// =============================================================================
function setupGeneratorEvents() {
  elements.genInputText.addEventListener('input', generateCustomQr);
  elements.genFgColor.addEventListener('input', generateCustomQr);
  elements.genBgColor.addEventListener('input', generateCustomQr);

  elements.downloadGenQrBtn.addEventListener('click', () => {
    const imgOrCanvas = elements.genOutputContainer.querySelector('canvas') || elements.genOutputContainer.querySelector('img');
    if (!imgOrCanvas) return;

    const link = document.createElement('a');
    link.download = `codigo-qr-${Date.now()}.png`;

    if (imgOrCanvas.tagName === 'CANVAS') {
      link.href = imgOrCanvas.toDataURL('image/png');
    } else {
      link.href = imgOrCanvas.src;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('¡Código QR descargado!');
  });
}

function generateCustomQr() {
  const text = elements.genInputText.value.trim() || 'https://antigravity.google';
  const fg = elements.genFgColor.value;
  const bg = elements.genBgColor.value;

  elements.genOutputContainer.innerHTML = '';

  if (typeof QRCode !== 'undefined') {
    state.generatedQrInstance = new QRCode(elements.genOutputContainer, {
      text: text,
      width: 240,
      height: 240,
      colorDark: fg,
      colorLight: bg,
      correctLevel: QRCode.CorrectLevel.H,
    });
  }
}

// =============================================================================
// CÓDIGOS QR DE MUESTRA PARA PRUEBAS (100% OFFLINE)
// =============================================================================
function setupSampleQrs() {
  elements.sampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.sampleType;
      let text = 'https://es.wikipedia.org/wiki/C%C3%B3digo_QR';

      if (type === 'wifi') {
        text = 'WIFI:S:MiRedHogar;T:WPA;P:SuperClaveSegura2026;;';
      } else if (type === 'text') {
        text = '¡Felicidades! Has escaneado este código QR de forma 100% privada directamente desde tu pantalla con Micro-Servicios Web.';
      }

      // Renderizar a un canvas temporal y cargar en el escáner
      const tempDiv = document.createElement('div');
      new QRCode(tempDiv, {
        text: text,
        width: 320,
        height: 320,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });

      setTimeout(() => {
        const canvas = tempDiv.querySelector('canvas');
        if (canvas) {
          canvas.toBlob(blob => {
            handleImageFile(blob);
          }, 'image/png');
        }
      }, 50);
    });
  });
}

function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2800);
}


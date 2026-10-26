/**
 * Extractor de Colores y Generador de Gradientes - 100% Client-Side
 * Análisis de píxeles con Canvas API y ColorThief
 */

// =============================================================================
// ESTADO GLOBAL
// =============================================================================
const state = {
  originalImage: null,
  fileName: 'paleta-colores',
  colors: [], // Array de { hex, rgb, hsl, isLight }
  pickedColors: [],
  gradientAngle: 135,
  gradientType: 'linear', // 'linear' | 'radial'
  selectedFormat: 'hex', // 'hex' | 'rgb' | 'hsl'
};

// =============================================================================
// ELEMENTOS DEL DOM
// =============================================================================
const elements = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  sampleBtns: document.querySelectorAll('.sample-btn'),

  // Secciones
  toolCard: document.getElementById('tool-card'),
  workspace: document.getElementById('workspace-section'),

  // Canvas y Lupa Cuentagotas
  loupeContainer: document.getElementById('loupe-container'),
  canvas: document.getElementById('image-canvas'),
  loupe: document.getElementById('loupe-cursor'),
  loupeCanvas: document.getElementById('loupe-canvas'),
  loupeTooltip: document.getElementById('loupe-tooltip'),

  // Paleta de Colores
  paletteContainer: document.getElementById('palette-container'),
  pickedContainer: document.getElementById('picked-container'),
  pickedSection: document.getElementById('picked-section'),
  formatHexBtn: document.getElementById('format-hex-btn'),
  formatRgbBtn: document.getElementById('format-rgb-btn'),
  formatHslBtn: document.getElementById('format-hsl-btn'),

  // Generador de Gradientes
  gradientBox: document.getElementById('gradient-preview-box'),
  gradientAngleSlider: document.getElementById('gradient-angle-slider'),
  gradientAngleVal: document.getElementById('gradient-angle-val'),
  gradientTypeLinear: document.getElementById('gradient-type-linear'),
  gradientTypeRadial: document.getElementById('gradient-type-radial'),
  gradientCssCode: document.getElementById('gradient-css-code'),
  copyGradientBtn: document.getElementById('copy-gradient-btn'),

  // Exportación
  exportPngBtn: document.getElementById('export-png-btn'),
  exportJsonBtn: document.getElementById('export-json-btn'),
  exportCssBtn: document.getElementById('export-css-btn'),
  newImageBtn: document.getElementById('new-image-btn'),
  toast: document.getElementById('toast'),
};

let ctx = null;
let loupeCtx = null;
let colorThief = null;

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  ctx = elements.canvas.getContext('2d');
  loupeCtx = elements.loupeCanvas.getContext('2d');

  if (typeof ColorThief !== 'undefined') {
    colorThief = new ColorThief();
  }

  setupUploadEvents();
  setupLoupeInteraction();
  setupGradientControls();
  setupExportButtons();
  setupFormatToggles();
  setupSampleImages();
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
      if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
      } else {
        showToast('Por favor suelta una imagen válida (JPG, PNG, WebP)');
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
  state.fileName = customName || file.name.replace(/\.[^/.]+$/, '') || 'paleta';
  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(url);
    processLoadedImage(img);
  };
  img.src = url;
}

function processLoadedImage(img) {
  state.originalImage = img;
  state.pickedColors = [];
  elements.pickedSection.classList.add('hidden');

  // Ajustar dimensiones del canvas
  const maxW = 1000;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  if (w > maxW) {
    const ratio = maxW / w;
    w = maxW;
    h = Math.round(h * ratio);
  }

  elements.canvas.width = w;
  elements.canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  // Extraer colores con ColorThief o muestreo directo
  extractPaletteFromImage(img);

  elements.toolCard.classList.add('hidden');
  elements.workspace.classList.remove('hidden');
  elements.workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =============================================================================
// EXTRACCIÓN DE PALETA DE 8 COLORES
// =============================================================================
function extractPaletteFromImage(img) {
  let rawPalette = [];

  try {
    if (colorThief) {
      rawPalette = colorThief.getPalette(img, 8);
    }
  } catch (err) {
    console.warn('ColorThief falló, usando muestreo nativo de Canvas:', err);
  }

  if (!rawPalette || rawPalette.length < 8) {
    rawPalette = extractColorsFromCanvas(8);
  }

  // Convertir cada RGB a HEX y HSL
  state.colors = rawPalette.map(rgbArr => {
    const r = rgbArr[0];
    const g = rgbArr[1];
    const b = rgbArr[2];
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    const isLight = isColorLight(r, g, b);
    return { r, g, b, hex, hsl, isLight };
  });

  renderPaletteCards();
  updateGradient();
}

function extractColorsFromCanvas(count) {
  const imgData = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height).data;
  const step = Math.floor(imgData.length / 4 / 300);
  const colorMap = {};

  for (let i = 0; i < imgData.length; i += step * 4) {
    const r = Math.round(imgData[i] / 16) * 16;
    const g = Math.round(imgData[i + 1] / 16) * 16;
    const b = Math.round(imgData[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;
    colorMap[key] = (colorMap[key] || 0) + 1;
  }

  const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, count).map(item => item[0].split(',').map(Number));
}

// =============================================================================
// RENDERIZADO DE TARJETAS DE COLOR
// =============================================================================
function renderPaletteCards() {
  elements.paletteContainer.innerHTML = '';

  state.colors.forEach((col, idx) => {
    const card = document.createElement('div');
    card.className = 'color-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs cursor-pointer select-none group';

    const label = getColorValueByFormat(col);

    card.innerHTML = `
      <div class="h-24 w-full relative transition-transform" style="background-color: ${col.hex};">
        <span class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/40 text-white font-mono text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          Copiar
        </span>
      </div>
      <div class="p-3 text-center">
        <span class="font-mono font-extrabold text-slate-800 text-xs block truncate" id="color-val-${idx}">${label}</span>
        <span class="text-[10px] text-slate-400 block mt-0.5 uppercase tracking-wider font-medium">Color #${idx + 1}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      const copyVal = getColorValueByFormat(col);
      copyToClipboard(copyVal);
    });

    elements.paletteContainer.appendChild(card);
  });
}

function getColorValueByFormat(col) {
  if (state.selectedFormat === 'rgb') {
    return `rgb(${col.r}, ${col.g}, ${col.b})`;
  } else if (state.selectedFormat === 'hsl') {
    return `hsl(${col.hsl.h}, ${col.hsl.s}%, ${col.hsl.l}%)`;
  }
  return col.hex.toUpperCase();
}

function setupFormatToggles() {
  const updateBtns = (activeBtn) => {
    [elements.formatHexBtn, elements.formatRgbBtn, elements.formatHslBtn].forEach(b => {
      b.className = 'px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors';
    });
    activeBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-pink-600 text-white shadow-xs';
    renderPaletteCards();
    renderPickedColors();
  };

  elements.formatHexBtn.addEventListener('click', () => {
    state.selectedFormat = 'hex';
    updateBtns(elements.formatHexBtn);
  });

  elements.formatRgbBtn.addEventListener('click', () => {
    state.selectedFormat = 'rgb';
    updateBtns(elements.formatRgbBtn);
  });

  elements.formatHslBtn.addEventListener('click', () => {
    state.selectedFormat = 'hsl';
    updateBtns(elements.formatHslBtn);
  });
}

// =============================================================================
// LUPA CUENTAGOTAS (MAGNIFIER LOUPE)
// =============================================================================
function setupLoupeInteraction() {
  const container = elements.loupeContainer;
  const canvas = elements.canvas;
  const loupe = elements.loupe;
  const loupeCanvas = elements.loupeCanvas;
  loupeCanvas.width = 90;
  loupeCanvas.height = 90;

  container.addEventListener('mouseenter', () => {
    loupe.style.display = 'block';
  });

  container.addEventListener('mouseleave', () => {
    loupe.style.display = 'none';
  });

  container.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = Math.floor((clientX - rect.left) * scaleX);
    const canvasY = Math.floor((clientY - rect.top) * scaleY);

    if (canvasX < 0 || canvasY < 0 || canvasX >= canvas.width || canvasY >= canvas.height) {
      loupe.style.display = 'none';
      return;
    }

    loupe.style.display = 'block';
    loupe.style.left = `${clientX - rect.left}px`;
    loupe.style.top = `${clientY - rect.top}px`;

    // Extraer píxel para la lupa
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    elements.loupeTooltip.textContent = hex;

    // Dibujar zoom en la lupa
    const zoomSize = 15; // 15x15 píxeles de muestra ampliados
    const sx = Math.max(0, canvasX - Math.floor(zoomSize / 2));
    const sy = Math.max(0, canvasY - Math.floor(zoomSize / 2));

    loupeCtx.imageSmoothingEnabled = false;
    loupeCtx.clearRect(0, 0, 90, 90);
    loupeCtx.drawImage(canvas, sx, sy, zoomSize, zoomSize, 0, 0, 90, 90);
  });

  // Clic para guardar color cuentagotas
  container.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = Math.floor((e.clientX - rect.left) * scaleX);
    const canvasY = Math.floor((e.clientY - rect.top) * scaleY);

    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2];
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    const isLight = isColorLight(r, g, b);

    const pickedObj = { r, g, b, hex, hsl, isLight };
    state.pickedColors.unshift(pickedObj);
    if (state.pickedColors.length > 6) state.pickedColors.pop();

    elements.pickedSection.classList.remove('hidden');
    renderPickedColors();
    copyToClipboard(getColorValueByFormat(pickedObj));
  });
}

function renderPickedColors() {
  elements.pickedContainer.innerHTML = '';
  state.pickedColors.forEach(col => {
    const pill = document.createElement('button');
    pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-pink-500 transition-colors text-xs font-mono font-bold text-slate-800';
    pill.innerHTML = `
      <span class="w-4 h-4 rounded-full border border-slate-300" style="background-color: ${col.hex};"></span>
      <span>${getColorValueByFormat(col)}</span>
    `;
    pill.addEventListener('click', () => {
      copyToClipboard(getColorValueByFormat(col));
    });
    elements.pickedContainer.appendChild(pill);
  });
}

// =============================================================================
// GENERADOR DE GRADIENTES CSS
// =============================================================================
function setupGradientControls() {
  elements.gradientAngleSlider.addEventListener('input', (e) => {
    state.gradientAngle = parseInt(e.target.value, 10);
    elements.gradientAngleVal.textContent = `${state.gradientAngle}°`;
    updateGradient();
  });

  elements.gradientTypeLinear.addEventListener('click', () => {
    state.gradientType = 'linear';
    elements.gradientTypeLinear.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-pink-600 text-white shadow-xs';
    elements.gradientTypeRadial.className = 'px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100';
    updateGradient();
  });

  elements.gradientTypeRadial.addEventListener('click', () => {
    state.gradientType = 'radial';
    elements.gradientTypeRadial.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-pink-600 text-white shadow-xs';
    elements.gradientTypeLinear.className = 'px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100';
    updateGradient();
  });

  elements.copyGradientBtn.addEventListener('click', () => {
    copyToClipboard(elements.gradientCssCode.textContent);
  });
}

function updateGradient() {
  if (state.colors.length < 2) return;

  const c1 = state.colors[0].hex;
  const c2 = state.colors[1] ? state.colors[1].hex : state.colors[0].hex;
  const c3 = state.colors[2] ? state.colors[2].hex : c2;

  let cssValue = '';
  if (state.gradientType === 'linear') {
    cssValue = `linear-gradient(${state.gradientAngle}deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
  } else {
    cssValue = `radial-gradient(circle at center, ${c1} 0%, ${c2} 60%, ${c3} 100%)`;
  }

  elements.gradientBox.style.background = cssValue;
  elements.gradientCssCode.textContent = `background: ${cssValue};`;
}

// =============================================================================
// EXPORTACIÓN DE PALETA (PNG, JSON, CSS)
// =============================================================================
function setupExportButtons() {
  // Exportar como Tarjeta PNG
  elements.exportPngBtn.addEventListener('click', () => {
    exportPaletteAsPng();
  });

  // Exportar como JSON
  elements.exportJsonBtn.addEventListener('click', () => {
    const jsonStr = JSON.stringify(state.colors, null, 2);
    downloadTextFile(jsonStr, `${state.fileName}-palette.json`, 'application/json');
  });

  // Exportar como Variables CSS
  elements.exportCssBtn.addEventListener('click', () => {
    let cssText = `/* Paleta generada con Micro-Servicios */\n:root {\n`;
    state.colors.forEach((col, i) => {
      cssText += `  --color-${i + 1}: ${col.hex};\n`;
    });
    cssText += `}\n`;
    downloadTextFile(cssText, `${state.fileName}-palette.css`, 'text/css');
  });
}

function exportPaletteAsPng() {
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 1200;
  pCanvas.height = 630;
  const pCtx = pCanvas.getContext('2d');

  // Fondo blanco con diseño limpio
  pCtx.fillStyle = '#0f172a';
  pCtx.fillRect(0, 0, 1200, 630);

  // Título
  pCtx.fillStyle = '#ffffff';
  pCtx.font = 'bold 36px system-ui, sans-serif';
  pCtx.fillText('Paleta de Colores Extraída', 80, 80);

  pCtx.fillStyle = '#94a3b8';
  pCtx.font = '18px system-ui, sans-serif';
  pCtx.fillText('Generado localmente con Micro-Servicios Web', 80, 115);

  // 8 Franjas de color
  const swatchW = 130;
  const swatchH = 340;
  const startX = 80;
  const startY = 160;

  state.colors.forEach((col, i) => {
    const x = startX + (i * swatchW);

    // Caja de color
    pCtx.fillStyle = col.hex;
    pCtx.fillRect(x, startY, swatchW, swatchH);

    // Texto HEX vertical u horizontal
    pCtx.fillStyle = col.isLight ? '#0f172a' : '#ffffff';
    pCtx.font = 'bold 16px monospace';
    pCtx.fillText(col.hex.toUpperCase(), x + 15, startY + swatchH - 25);
  });

  const a = document.createElement('a');
  a.href = pCanvas.toDataURL('image/png');
  a.download = `${state.fileName}-palette.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('¡Imagen de paleta PNG descargada!');
}

function downloadTextFile(text, filename, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Descargado ${filename}`);
}

// =============================================================================
// IMÁGENES DE PRUEBA (100% OFFLINE CON CANVAS GENERATIVO)
// =============================================================================
function setupSampleImages() {
  elements.sampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.sampleType;
      generateSampleCanvas(type);
    });
  });
}

function generateSampleCanvas(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  const sCtx = canvas.getContext('2d');

  if (type === 'sunset') {
    // Atardecer cálido: púrpuras, naranjas, dorados
    const grad = sCtx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(0.3, '#7c3aed');
    grad.addColorStop(0.6, '#f43f5e');
    grad.addColorStop(0.85, '#fb923c');
    grad.addColorStop(1, '#fde047');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 800, 500);

    // Sol
    sCtx.fillStyle = '#ffffff';
    sCtx.beginPath();
    sCtx.arc(400, 360, 60, 0, Math.PI * 2);
    sCtx.fill();

    // Silueta de montaña
    sCtx.fillStyle = '#1e1b4b';
    sCtx.beginPath();
    sCtx.moveTo(0, 500);
    sCtx.lineTo(250, 380);
    sCtx.lineTo(500, 440);
    sCtx.lineTo(800, 360);
    sCtx.lineTo(800, 500);
    sCtx.closePath();
    sCtx.fill();
  } else if (type === 'cyberpunk') {
    // Neón cyberpunk: azul oscuro, cian, magenta, amarillo
    sCtx.fillStyle = '#050510';
    sCtx.fillRect(0, 0, 800, 500);

    const grad1 = sCtx.createRadialGradient(250, 200, 10, 250, 200, 300);
    grad1.addColorStop(0, '#06b6d4');
    grad1.addColorStop(1, 'transparent');
    sCtx.fillStyle = grad1;
    sCtx.fillRect(0, 0, 800, 500);

    const grad2 = sCtx.createRadialGradient(600, 300, 10, 600, 300, 300);
    grad2.addColorStop(0, '#ec4899');
    grad2.addColorStop(1, 'transparent');
    sCtx.fillStyle = grad2;
    sCtx.fillRect(0, 0, 800, 500);
  } else if (type === 'nature') {
    // Naturaleza: verdes esmeralda, tierra y cielo
    const grad = sCtx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.4, '#e0f2fe');
    grad.addColorStop(0.45, '#15803d');
    grad.addColorStop(0.8, '#047857');
    grad.addColorStop(1, '#78350f');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 800, 500);
  }

  canvas.toBlob((blob) => {
    handleImageFile(blob, `muestra-${type}`);
  }, 'image/png');
}

// =============================================================================
// UTILIDADES DE COLOR
// =============================================================================
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function isColorLight(r, g, b) {
  // Fórmula de luminancia relativa
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copiado: ${text}`);
  }).catch(() => {
    showToast(`No se pudo copiar`);
  });
}

function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2500);
}


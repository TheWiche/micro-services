/**
 * Generador de Favicons y Web Icons - 100% Client-Side
 * Procesa tamaños para Web, iOS y Android con Canvas y JSZip
 */

// =============================================================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// =============================================================================
const CONFIG = {
  monetization: {
    enabled: false, // Descarga directa 100% Client-Side
    shortenerUrl: 'https://ouo.io/qs/favicon-zip?s=',
    delaySeconds: 0,
  },
  sizes: [
    { name: 'favicon-16x16.png', size: 16, type: 'web' },
    { name: 'favicon-32x32.png', size: 32, type: 'web' },
    { name: 'favicon-48x48.png', size: 48, type: 'web' },
    { name: 'apple-touch-icon.png', size: 180, type: 'ios' },
    { name: 'android-chrome-192x192.png', size: 192, type: 'android' },
    { name: 'android-chrome-512x512.png', size: 512, type: 'android' },
  ]
};

const state = {
  originalImage: null,
  fileName: 'favicon',
  borderRadius: 0, // 0% a 50%
  backgroundColor: 'transparent',
  isTransparentBg: true,
  innerPadding: 0, // 0% a 25%
  appName: 'Mi Sitio Web',
  appShortName: 'Sitio',
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
  toolCard: document.getElementById('tool-card'),
  workspace: document.getElementById('workspace-section'),

  // Controles
  radiusSlider: document.getElementById('radius-slider'),
  radiusValue: document.getElementById('radius-value'),
  paddingSlider: document.getElementById('padding-slider'),
  paddingValue: document.getElementById('padding-value'),
  bgColorPicker: document.getElementById('bg-color-picker'),
  bgTransparentToggle: document.getElementById('bg-transparent-toggle'),
  bgColorContainer: document.getElementById('bg-color-container'),

  // Previews
  previewTabLight: document.getElementById('preview-tab-light'),
  previewTabDark: document.getElementById('preview-tab-dark'),
  previewMobileIcon: document.getElementById('preview-mobile-icon'),
  previewGrid: document.getElementById('preview-grid'),

  // Código HTML y Acciones
  htmlCodeBlock: document.getElementById('html-code-block'),
  copyHtmlBtn: document.getElementById('copy-html-btn'),
  downloadZipBtn: document.getElementById('download-zip-btn'),
  newImageBtn: document.getElementById('new-image-btn'),

  // Modal de Descarga
  downloadModal: document.getElementById('download-modal'),
  closeDownloadModal: document.getElementById('close-download-modal'),
  countdownDisplay: document.getElementById('countdown-display'),
  continueDownloadBtn: document.getElementById('continue-download-btn'),
  sponsorLinkBtn: document.getElementById('sponsor-link-btn'),
  toast: document.getElementById('toast'),
};

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupUploadEvents();
  setupCustomizationControls();
  setupActionButtons();
  setupSample();
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
        showToast('Por favor suelta un archivo de imagen (PNG, JPG, SVG o WebP)');
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
          handleImageFile(file, 'icono-pegado');
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
  state.fileName = customName || file.name.replace(/\.[^/.]+$/, '') || 'favicon';
  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(url);
    state.originalImage = img;
    elements.toolCard.classList.add('hidden');
    elements.workspace.classList.remove('hidden');
    updateAllPreviews();
    updateHtmlCode();
    elements.workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  img.src = url;
}

// =============================================================================
// CONTROLES DE PERSONALIZACIÓN
// =============================================================================
function setupCustomizationControls() {
  // Radio de borde (esquinas redondeadas)
  elements.radiusSlider.addEventListener('input', (e) => {
    state.borderRadius = parseInt(e.target.value, 10);
    elements.radiusValue.textContent = `${state.borderRadius}%`;
    updateAllPreviews();
  });

  // Relleno interno (Padding)
  elements.paddingSlider.addEventListener('input', (e) => {
    state.innerPadding = parseInt(e.target.value, 10);
    elements.paddingValue.textContent = `${state.innerPadding}%`;
    updateAllPreviews();
  });

  // Fondo transparente toggle
  elements.bgTransparentToggle.addEventListener('change', (e) => {
    state.isTransparentBg = e.target.checked;
    if (state.isTransparentBg) {
      state.backgroundColor = 'transparent';
      elements.bgColorContainer.classList.add('opacity-40', 'pointer-events-none');
    } else {
      state.backgroundColor = elements.bgColorPicker.value;
      elements.bgColorContainer.classList.remove('opacity-40', 'pointer-events-none');
    }
    updateAllPreviews();
    updateHtmlCode();
  });

  // Selector de color
  elements.bgColorPicker.addEventListener('input', (e) => {
    state.backgroundColor = e.target.value;
    updateAllPreviews();
    updateHtmlCode();
  });
}

// =============================================================================
// PREVIEWS EN TIEMPO REAL (CANVAS RENDER)
// =============================================================================
function renderIconCanvas(targetSize) {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');

  const radiusPx = (state.borderRadius / 100) * (targetSize / 2);

  // Máscara redondeada
  ctx.save();
  ctx.beginPath();
  if (state.borderRadius >= 50) {
    ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
  } else if (state.borderRadius > 0) {
    drawRoundedRect(ctx, 0, 0, targetSize, targetSize, radiusPx);
  } else {
    ctx.rect(0, 0, targetSize, targetSize);
  }
  ctx.clip();

  // Color de fondo si no es transparente
  if (!state.isTransparentBg && state.backgroundColor !== 'transparent') {
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, targetSize, targetSize);
  }

  // Dibujar imagen centrada con padding
  if (state.originalImage) {
    const pad = (state.innerPadding / 100) * targetSize;
    const drawW = targetSize - (pad * 2);
    const drawH = targetSize - (pad * 2);
    ctx.drawImage(state.originalImage, pad, pad, drawW, drawH);
  }

  ctx.restore();
  return canvas;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function updateAllPreviews() {
  if (!state.originalImage) return;

  // 1. Preview Pestaña Navegador (Modo Claro & Oscuro: 32x32)
  const tabCanvas = renderIconCanvas(32);
  const tabDataUrl = tabCanvas.toDataURL('image/png');

  elements.previewTabLight.src = tabDataUrl;
  elements.previewTabDark.src = tabDataUrl;

  // 2. Preview Pantalla Móvil (180x180)
  const mobileCanvas = renderIconCanvas(180);
  elements.previewMobileIcon.src = mobileCanvas.toDataURL('image/png');

  // 3. Grid de tamaños
  renderSizesGrid();
}

function renderSizesGrid() {
  elements.previewGrid.innerHTML = '';

  CONFIG.sizes.forEach(item => {
    const card = document.createElement('div');
    card.className = 'flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl';

    const canvas = renderIconCanvas(Math.min(item.size, 64)); // Preview visual escala
    const imgUrl = canvas.toDataURL('image/png');

    let badgeClass = 'bg-blue-100 text-blue-800';
    if (item.type === 'ios') badgeClass = 'bg-purple-100 text-purple-800';
    if (item.type === 'android') badgeClass = 'bg-emerald-100 text-emerald-800';

    card.innerHTML = `
      <div class="w-12 h-12 flex items-center justify-center bg-checkerboard rounded-lg border border-slate-200 overflow-hidden shrink-0">
        <img src="${imgUrl}" alt="${item.name}" class="max-w-full max-h-full object-contain">
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-800 truncate">${item.name}</span>
          <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded ${badgeClass}">${item.size}x${item.size}</span>
        </div>
        <span class="text-[11px] text-slate-400 capitalize">${item.type} Icon</span>
      </div>
    `;

    elements.previewGrid.appendChild(card);
  });
}

function updateHtmlCode() {
  const themeColor = state.isTransparentBg ? '#ffffff' : state.backgroundColor;
  const htmlSnippet = `<!-- Favicon & App Icons Generados con Micro-Servicios -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${themeColor}">`;

  elements.htmlCodeBlock.textContent = htmlSnippet;
}

// =============================================================================
// EMPAQUETADO ZIP EN MEMORIA (JSZIP) & DESCARGA
// =============================================================================
async function generateFaviconZip() {
  if (typeof JSZip === 'undefined') {
    showToast('Cargando librería JSZip...');
    return;
  }

  showToast('Empaquetando iconos en archivo ZIP...');
  const zip = new JSZip();

  // 1. Añadir cada tamaño de PNG
  for (const item of CONFIG.sizes) {
    const canvas = renderIconCanvas(item.size);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    zip.file(item.name, blob);
  }

  // 2. Generar favicon.ico estándar (32x32)
  const icoCanvas = renderIconCanvas(32);
  const icoBlob = await new Promise(resolve => icoCanvas.toBlob(resolve, 'image/png'));
  zip.file('favicon.ico', icoBlob);

  // 3. Generar site.webmanifest
  const themeColor = state.isTransparentBg ? '#ffffff' : state.backgroundColor;
  const manifestContent = {
    name: state.appName,
    short_name: state.appShortName,
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ],
    theme_color: themeColor,
    background_color: themeColor,
    display: "standalone"
  };
  zip.file('site.webmanifest', JSON.stringify(manifestContent, null, 2));

  // 4. Instrucciones README.txt
  const readmeText = `INSTRUCCIONES DE INSTALACIÓN DE FAVICONS:
1. Descomprime este paquete y copia todos los archivos en la raíz pública de tu sitio web (ej. /public/ o la misma carpeta de tu index.html).
2. Pega el siguiente código dentro de la etiqueta <head> de tus páginas HTML:

<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${themeColor}">

¡Listo! Tu sitio mostrará el icono perfecto en Chrome, Safari, Firefox, iPhone y Android.`;
  zip.file('README.txt', readmeText);

  // 5. Descargar archivo .zip final
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);

  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = `favicons_package_${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
  showToast('¡Paquete de favicons descargado con éxito!');
}

// =============================================================================
// BOTONES Y ACCIONES
// =============================================================================
function setupActionButtons() {
  // Copiar código HTML
  elements.copyHtmlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.htmlCodeBlock.textContent).then(() => {
      showToast('¡Código HTML copiado al portapapeles!');
    }).catch(() => {
      showToast('No se pudo copiar automáticamente.');
    });
  });

  // Descarga con modal de monetización
  elements.downloadZipBtn.addEventListener('click', () => {
    if (!state.originalImage) return;

    if (!CONFIG.monetization.enabled) {
      generateFaviconZip();
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
      generateFaviconZip();
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
      elements.continueDownloadBtn.textContent = '✅ Descargar Paquete ZIP Ahora';
    }
  }, 1000);
}

// Muestra de prueba generada con Canvas (un isotipo moderno)
function setupSample() {
  if (!elements.sampleBtn) return;

  elements.sampleBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Gradiente de fondo
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Isotipo: Relámpago blanco
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(280, 50);
    ctx.lineTo(130, 270);
    ctx.lineTo(250, 270);
    ctx.lineTo(220, 460);
    ctx.lineTo(390, 230);
    ctx.lineTo(270, 230);
    ctx.closePath();
    ctx.fill();

    canvas.toBlob((blob) => {
      handleImageFile(blob, 'icono-demo');
    }, 'image/png');
  });
}

function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2800);
}


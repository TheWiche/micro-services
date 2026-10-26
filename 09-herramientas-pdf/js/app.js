/**
 * Herramientas PDF - 100% Client-Side
 * Manipulación y fusión de documentos con pdf-lib en memoria RAM
 */

// =============================================================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// =============================================================================
const CONFIG = {
  monetization: {
    enabled: false, // Descarga directa 100% Client-Side
    shortenerUrl: 'https://ouo.io/qs/pdf-tool?s=',
    delaySeconds: 0,
  }
};

const state = {
  activeMode: 'merge', // 'merge' | 'extract' | 'optimize'
  pdfFiles: [], // Array de { id, file, name, size, pageCount, bytes }
  resultPdfBlob: null,
  resultPdfUrl: null,
  resultFileName: 'documento-procesado.pdf',
  isProcessing: false,
};

// =============================================================================
// ELEMENTOS DEL DOM
// =============================================================================
const elements = {
  // Tabs
  tabMergeBtn: document.getElementById('tab-merge-btn'),
  tabExtractBtn: document.getElementById('tab-extract-btn'),
  tabOptimizeBtn: document.getElementById('tab-optimize-btn'),

  // Dropzone
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  sampleBtn: document.getElementById('sample-btn'),
  dropzoneHint: document.getElementById('dropzone-hint'),

  // Vistas de modo
  viewMerge: document.getElementById('view-merge'),
  viewExtract: document.getElementById('view-extract'),
  viewOptimize: document.getElementById('view-optimize'),
  workspace: document.getElementById('workspace-section'),
  toolCard: document.getElementById('tool-card'),

  // Listas y Controles
  mergeList: document.getElementById('merge-list'),
  mergeCountBadge: document.getElementById('merge-count-badge'),
  executeMergeBtn: document.getElementById('execute-merge-btn'),

  // Extraer
  extractFileName: document.getElementById('extract-file-name'),
  extractPageRange: document.getElementById('extract-page-range'),
  extractPagesTotal: document.getElementById('extract-pages-total'),
  executeExtractBtn: document.getElementById('execute-extract-btn'),

  // Optimizar
  optimizeFileName: document.getElementById('optimize-file-name'),
  optimizeOriginalSize: document.getElementById('optimize-original-size'),
  executeOptimizeBtn: document.getElementById('execute-optimize-btn'),

  // Modal Monetización
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
  setupTabs();
  setupUploadEvents();
  setupActionButtons();
  setupSampleGenerator();
});

// =============================================================================
// PESTAÑAS DE MODO (UNIR, EXTRAER, OPTIMIZAR)
// =============================================================================
function setupTabs() {
  const switchTab = (mode, activeBtn) => {
    state.activeMode = mode;
    [elements.tabMergeBtn, elements.tabExtractBtn, elements.tabOptimizeBtn].forEach(b => {
      b.className = 'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2';
    });
    activeBtn.className = 'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-red-600 text-white shadow-xs flex items-center justify-center gap-2';

    // Actualizar textos de ayuda
    if (mode === 'merge') {
      elements.dropzoneHint.textContent = 'Selecciona o arrastra 2 o más archivos PDF para unirlos';
      elements.fileInput.multiple = true;
    } else if (mode === 'extract') {
      elements.dropzoneHint.textContent = 'Sube un PDF para extraer o dividir páginas específicas';
      elements.fileInput.multiple = false;
    } else if (mode === 'optimize') {
      elements.dropzoneHint.textContent = 'Sube un PDF para optimizar su peso y estructura';
      elements.fileInput.multiple = false;
    }

    renderWorkspaceViews();
  };

  elements.tabMergeBtn.addEventListener('click', () => switchTab('merge', elements.tabMergeBtn));
  elements.tabExtractBtn.addEventListener('click', () => switchTab('extract', elements.tabExtractBtn));
  elements.tabOptimizeBtn.addEventListener('click', () => switchTab('optimize', elements.tabOptimizeBtn));
}

// =============================================================================
// SUBIDA DE ARCHIVOS
// =============================================================================
function setupUploadEvents() {
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleUploadedFiles(files);
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
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (files.length > 0) {
      handleUploadedFiles(files);
    } else {
      showToast('Por favor suelta archivos en formato .PDF');
    }
  });

  // Pegado directo (Ctrl + V)
  window.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) handleUploadedFiles(files);
  });
}

async function handleUploadedFiles(files) {
  showToast('Analizando documentos PDF...');

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      const item = {
        id: 'pdf-' + Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        pageCount,
        bytes: arrayBuffer,
      };

      if (state.activeMode === 'merge') {
        state.pdfFiles.push(item);
      } else {
        // En extract o optimize reemplazamos por el último
        state.pdfFiles = [item];
      }
    } catch (err) {
      console.warn('Error leyendo PDF:', file.name, err);
      showToast(`Error al abrir ${file.name}. ¿Está protegido con contraseña?`);
    }
  }

  renderWorkspaceViews();
  elements.workspace.classList.remove('hidden');
  elements.workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =============================================================================
// RENDERIZADO DE LAS VISTAS DE TRABAJO
// =============================================================================
function renderWorkspaceViews() {
  if (state.pdfFiles.length === 0) {
    elements.workspace.classList.add('hidden');
    return;
  }

  elements.workspace.classList.remove('hidden');
  elements.viewMerge.classList.add('hidden');
  elements.viewExtract.classList.add('hidden');
  elements.viewOptimize.classList.add('hidden');

  if (state.activeMode === 'merge') {
    elements.viewMerge.classList.remove('hidden');
    renderMergeList();
  } else if (state.activeMode === 'extract') {
    elements.viewExtract.classList.remove('hidden');
    renderExtractView();
  } else if (state.activeMode === 'optimize') {
    elements.viewOptimize.classList.remove('hidden');
    renderOptimizeView();
  }
}

function renderMergeList() {
  elements.mergeList.innerHTML = '';
  const totalPages = state.pdfFiles.reduce((acc, f) => acc + f.pageCount, 0);
  elements.mergeCountBadge.textContent = `${state.pdfFiles.length} documentos • ${totalPages} páginas totales`;

  state.pdfFiles.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'pdf-card flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-xs';

    card.innerHTML = `
      <div class="flex items-center gap-3.5 min-w-0 max-w-[65%]">
        <span class="w-8 h-8 rounded-xl bg-red-50 text-red-600 font-extrabold text-xs flex items-center justify-center shrink-0 border border-red-100">
          #${index + 1}
        </span>
        <div class="min-w-0">
          <h4 class="text-xs sm:text-sm font-bold text-slate-800 truncate" title="${item.name}">${item.name}</h4>
          <span class="text-[11px] text-slate-400 font-medium">${formatBytes(item.size)} • ${item.pageCount} pág(s)</span>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <button type="button" class="move-up-btn w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}" title="Mover arriba">↑</button>
        <button type="button" class="move-down-btn w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors ${index === state.pdfFiles.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}" title="Mover abajo">↓</button>
        <button type="button" class="delete-btn w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors ml-1" title="Eliminar">&times;</button>
      </div>
    `;

    // Botones de orden
    const upBtn = card.querySelector('.move-up-btn');
    const downBtn = card.querySelector('.move-down-btn');
    const delBtn = card.querySelector('.delete-btn');

    if (index > 0) {
      upBtn.addEventListener('click', () => {
        const temp = state.pdfFiles[index - 1];
        state.pdfFiles[index - 1] = state.pdfFiles[index];
        state.pdfFiles[index] = temp;
        renderMergeList();
      });
    }

    if (index < state.pdfFiles.length - 1) {
      downBtn.addEventListener('click', () => {
        const temp = state.pdfFiles[index + 1];
        state.pdfFiles[index + 1] = state.pdfFiles[index];
        state.pdfFiles[index] = temp;
        renderMergeList();
      });
    }

    delBtn.addEventListener('click', () => {
      state.pdfFiles.splice(index, 1);
      renderMergeList();
      if (state.pdfFiles.length === 0) elements.workspace.classList.add('hidden');
    });

    elements.mergeList.appendChild(card);
  });

  elements.executeMergeBtn.disabled = state.pdfFiles.length < 2;
  if (state.pdfFiles.length < 2) {
    elements.executeMergeBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    elements.executeMergeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

function renderExtractView() {
  const file = state.pdfFiles[0];
  if (!file) return;

  elements.extractFileName.textContent = file.name;
  elements.extractPagesTotal.textContent = `1 a ${file.pageCount}`;
  elements.extractPageRange.placeholder = `Ejemplo: 1-${Math.min(3, file.pageCount)}, ${file.pageCount}`;
}

function renderOptimizeView() {
  const file = state.pdfFiles[0];
  if (!file) return;

  elements.optimizeFileName.textContent = file.name;
  elements.optimizeOriginalSize.textContent = `${formatBytes(file.size)} • ${file.pageCount} páginas`;
}

// =============================================================================
// OPERACIONES CON PDF-LIB
// =============================================================================
function setupActionButtons() {
  // 1. UNIR PDFs
  elements.executeMergeBtn.addEventListener('click', async () => {
    if (state.pdfFiles.length < 2) return;
    showToast('Uniendo documentos en memoria...');

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();

      for (const item of state.pdfFiles) {
        const srcDoc = await PDFLib.PDFDocument.load(item.bytes);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      prepareDownload(pdfBytes, 'documentos-unidos.pdf');
    } catch (err) {
      console.error('Error al unir PDFs:', err);
      showToast('Error al fusionar documentos: ' + err.message);
    }
  });

  // 2. EXTRAER PÁGINAS
  elements.executeExtractBtn.addEventListener('click', async () => {
    const file = state.pdfFiles[0];
    if (!file) return;

    const rangeInput = elements.extractPageRange.value.trim();
    if (!rangeInput) {
      showToast('Por favor escribe el rango de páginas (ej. 1-3, 5)');
      return;
    }

    try {
      showToast('Extrayendo páginas solicitadas...');
      const pageIndices = parsePageRanges(rangeInput, file.pageCount);

      if (pageIndices.length === 0) {
        showToast('El rango de páginas indicado no es válido');
        return;
      }

      const srcDoc = await PDFLib.PDFDocument.load(file.bytes);
      const newPdf = await PDFLib.PDFDocument.create();

      const copiedPages = await newPdf.copyPages(srcDoc, pageIndices);
      copiedPages.forEach(p => newPdf.addPage(p));

      const pdfBytes = await newPdf.save();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      prepareDownload(pdfBytes, `${baseName}-extraido.pdf`);
    } catch (err) {
      console.error('Error extrayendo páginas:', err);
      showToast('Error al extraer páginas: ' + err.message);
    }
  });

  // 3. OPTIMIZAR PDF
  elements.executeOptimizeBtn.addEventListener('click', async () => {
    const file = state.pdfFiles[0];
    if (!file) return;

    showToast('Reconstruyendo y optimizando estructura del PDF...');

    try {
      // Cargamos y re-guardamos con copia limpia de páginas
      const srcDoc = await PDFLib.PDFDocument.load(file.bytes);
      const cleanDoc = await PDFLib.PDFDocument.create();

      const pages = await cleanDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      pages.forEach(p => cleanDoc.addPage(p));

      // Limpiar metadatos antiguos
      cleanDoc.setTitle('');
      cleanDoc.setAuthor('Micro-Servicios PDF');
      cleanDoc.setProducer('PDF-Lib Engine');

      const pdfBytes = await cleanDoc.save({ useObjectStreams: true });
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      prepareDownload(pdfBytes, `${baseName}-optimizado.pdf`);
    } catch (err) {
      console.error('Error optimizando PDF:', err);
      showToast('Error al optimizar PDF: ' + err.message);
    }
  });

  // Modal de descarga
  elements.closeDownloadModal.addEventListener('click', () => {
    elements.downloadModal.classList.add('hidden');
  });

  elements.continueDownloadBtn.addEventListener('click', () => {
    triggerFileDownload();
    elements.downloadModal.classList.add('hidden');
  });

  elements.sponsorLinkBtn.addEventListener('click', () => {
    window.open(CONFIG.monetization.shortenerUrl + encodeURIComponent(window.location.href), '_blank');
  });
}

function parsePageRanges(input, totalPages) {
  const indices = new Set();
  const parts = input.split(',');

  parts.forEach(part => {
    part = part.trim();
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  });

  return Array.from(indices).sort((a, b) => a - b);
}

function prepareDownload(pdfBytes, fileName) {
  state.resultPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  state.resultFileName = fileName;

  if (state.resultPdfUrl) URL.revokeObjectURL(state.resultPdfUrl);
  state.resultPdfUrl = URL.createObjectURL(state.resultPdfBlob);

  if (!CONFIG.monetization.enabled) {
    triggerFileDownload();
    return;
  }

  openDownloadModal();
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
      elements.continueDownloadBtn.textContent = '✅ Descargar PDF Procesado Ahora';
    }
  }, 1000);
}

function triggerFileDownload() {
  const a = document.createElement('a');
  a.href = state.resultPdfUrl;
  a.download = state.resultFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('¡Descargando archivo PDF!');
}

// =============================================================================
// MUESTRA DEMO GENERADA CON PDF-LIB (100% OFFLINE)
// =============================================================================
function setupSampleGenerator() {
  if (!elements.sampleBtn) return;

  elements.sampleBtn.addEventListener('click', async () => {
    showToast('Generando PDFs demo para pruebas...');

    try {
      // PDF 1: Portada
      const doc1 = await PDFLib.PDFDocument.create();
      const page1 = doc1.addPage([595, 842]);
      page1.drawText('DOCUMENTO 1: REPORTE GENERAL', { x: 50, y: 750, size: 24 });
      page1.drawText('Página 1 de introducción generada para pruebas en memoria.', { x: 50, y: 700, size: 14 });
      const bytes1 = await doc1.save();

      // PDF 2: Contenido
      const doc2 = await PDFLib.PDFDocument.create();
      const page2 = doc2.addPage([595, 842]);
      page2.drawText('DOCUMENTO 2: ANÁLISIS TÉCNICO', { x: 50, y: 750, size: 24 });
      page2.drawText('Página 2 con datos adicionales para demostrar la unión.', { x: 50, y: 700, size: 14 });
      const page3 = doc2.addPage([595, 842]);
      page3.drawText('DOCUMENTO 2: CONCLUSIONES', { x: 50, y: 750, size: 24 });
      page3.drawText('Página 3 final.', { x: 50, y: 700, size: 14 });
      const bytes2 = await doc2.save();

      state.pdfFiles = [
        {
          id: 'pdf-1',
          name: 'reporte-introduccion.pdf',
          size: bytes1.length,
          pageCount: 1,
          bytes: bytes1,
        },
        {
          id: 'pdf-2',
          name: 'analisis-tecnico.pdf',
          size: bytes2.length,
          pageCount: 2,
          bytes: bytes2,
        }
      ];

      renderWorkspaceViews();
      showToast('¡Documentos de prueba cargados!');
    } catch (err) {
      console.error('Error generando demo:', err);
    }
  });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2800);
}


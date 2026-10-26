/**
 * Limpiador de Metadatos EXIF y Privacidad Fotográfica - 100% Client-Side
 * Inspección con EXIF.js y depuración definitiva mediante Canvas API
 */

// =============================================================================
// ESTADO GLOBAL
// =============================================================================
const state = {
  currentFile: null,
  fileName: 'foto',
  originalImageUrl: null,
  cleanImageUrl: null,
  cleanImageBlob: null,
  exifTags: {},
  hasGps: false,
  gpsData: null,
  bulkQueue: [],
  isBulkUnlocked: true, // Desbloqueado para descarga directa limpia
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

  // Previsualización y Alertas
  photoPreview: document.getElementById('photo-preview'),
  fileInfoText: document.getElementById('file-info-text'),
  gpsAlertBox: document.getElementById('gps-alert-box'),
  gpsAlertTitle: document.getElementById('gps-alert-title'),
  gpsAlertDesc: document.getElementById('gps-alert-desc'),
  gpsMapLink: document.getElementById('gps-map-link'),

  // Tabla
  metadataTableBody: document.getElementById('metadata-table-body'),
  tagsCountBadge: document.getElementById('tags-count-badge'),

  // Acciones
  cleanAndDownloadBtn: document.getElementById('clean-and-download-btn'),
  newPhotoBtn: document.getElementById('new-photo-btn'),

  // Modal Lotes Masivos
  bulkModal: document.getElementById('bulk-modal'),
  closeBulkModal: document.getElementById('close-bulk-modal'),
  bulkLockedView: document.getElementById('bulk-locked-view'),
  bulkUnlockedView: document.getElementById('bulk-unlocked-view'),
  unlockBulkBtn: document.getElementById('unlock-bulk-btn'),
  bulkCountText: document.getElementById('bulk-count-text'),
  bulkDownloadZipBtn: document.getElementById('bulk-download-zip-btn'),
  toast: document.getElementById('toast'),
};

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupUploadEvents();
  setupActionButtons();
  setupBulkModal();
  setupSamplePhoto();
});

// =============================================================================
// SUBIDA DE ARCHIVOS & CAPTURA PORTAPAPELES (CTRL + V)
// =============================================================================
function setupUploadEvents() {
  if (elements.uploadBtn && elements.fileInput) {
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 1) {
        handleSinglePhoto(files[0]);
      } else if (files.length > 1) {
        handleBulkPhotos(files);
      }
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
      const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length === 1) {
        handleSinglePhoto(files[0]);
      } else if (files.length > 1) {
        handleBulkPhotos(files);
      } else {
        showToast('Por favor suelta un archivo de foto válido (JPG o PNG)');
      }
    });
  }

  // Pegado directo desde portapapeles (Ctrl + V)
  window.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleSinglePhoto(file, 'captura-pegada');
          showToast('¡Foto pegada desde el portapapeles!');
          break;
        }
      }
    }
  });

  if (elements.newPhotoBtn) {
    elements.newPhotoBtn.addEventListener('click', () => {
      elements.workspace.classList.add('hidden');
      elements.toolCard.classList.remove('hidden');
      elements.fileInput.value = '';
      window.scrollTo({ top: elements.toolCard.offsetTop - 80, behavior: 'smooth' });
    });
  }
}

// =============================================================================
// ANÁLISIS DE METADATOS EXIF (EXIF.JS)
// =============================================================================
function handleSinglePhoto(file, customName = null) {
  state.currentFile = file;
  state.fileName = customName || file.name.replace(/\.[^/.]+$/, '') || 'foto';

  if (state.originalImageUrl) URL.revokeObjectURL(state.originalImageUrl);
  state.originalImageUrl = URL.createObjectURL(file);

  elements.photoPreview.src = state.originalImageUrl;
  elements.fileInfoText.textContent = `${file.name} • ${formatBytes(file.size)}`;

  // Analizar metadatos con EXIF.js
  const img = new Image();
  img.onload = () => {
    EXIF.getData(img, function() {
      const allTags = EXIF.getAllTags(this);
      state.exifTags = allTags || {};
      processMetadataTags(state.exifTags, img);
    });
  };
  img.src = state.originalImageUrl;

  elements.toolCard.classList.add('hidden');
  elements.workspace.classList.remove('hidden');
  elements.workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function processMetadataTags(tags, img) {
  state.hasGps = false;
  state.gpsData = null;

  // Verificar si hay GPS
  if (tags.GPSLatitude && tags.GPSLongitude) {
    state.hasGps = true;
    const lat = convertDMSToDD(tags.GPSLatitude, tags.GPSLatitudeRef);
    const lon = convertDMSToDD(tags.GPSLongitude, tags.GPSLongitudeRef);
    state.gpsData = { lat, lon };
  }

  // Renderizar alerta de GPS
  renderGpsAlert();

  // Renderizar tabla de metadatos completa
  renderMetadataTable(tags, img);
}

function renderGpsAlert() {
  const box = elements.gpsAlertBox;

  if (state.hasGps && state.gpsData) {
    box.className = 'gps-alert-box p-4 rounded-2xl mb-6';
    elements.gpsAlertTitle.textContent = '🚨 ¡ALERTA DE PRIVACIDAD CRÍTICA: Ubicación GPS Detectada!';
    elements.gpsAlertTitle.className = 'font-black text-rose-800 text-sm flex items-center gap-2';

    elements.gpsAlertDesc.innerHTML = `
      Esta foto contiene coordenadas geográficas exactas incrustadas: 
      <strong>Latitud:</strong> ${state.gpsData.lat.toFixed(5)}, 
      <strong>Longitud:</strong> ${state.gpsData.lon.toFixed(5)}. 
      Cualquiera que descargue esta imagen puede saber exactamente dónde fue tomada.
    `;
    elements.gpsAlertDesc.className = 'text-xs text-rose-700 mt-1.5 leading-relaxed';

    elements.gpsMapLink.classList.remove('hidden');
    elements.gpsMapLink.href = `https://www.google.com/maps?q=${state.gpsData.lat},${state.gpsData.lon}`;
  } else {
    box.className = 'bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-600 p-4 rounded-2xl mb-6';
    elements.gpsAlertTitle.textContent = '✓ Sin Coordenadas GPS';
    elements.gpsAlertTitle.className = 'font-bold text-emerald-800 text-sm flex items-center gap-2';

    elements.gpsAlertDesc.textContent = 'No se detectaron datos de geolocalización por satélite en esta imagen.';
    elements.gpsAlertDesc.className = 'text-xs text-emerald-700 mt-1';
    elements.gpsMapLink.classList.add('hidden');
  }
}

function renderMetadataTable(tags, img) {
  const tbody = elements.metadataTableBody;
  tbody.innerHTML = '';

  const tagKeys = Object.keys(tags).filter(k => k !== 'thumbnail');
  elements.tagsCountBadge.textContent = `${tagKeys.length} etiquetas detectadas`;

  if (tagKeys.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="2" class="p-6 text-center text-xs text-slate-400">
        Esta imagen ya se encuentra limpia o no contiene metadatos EXIF legibles.
      </td>
    `;
    tbody.appendChild(emptyRow);
    return;
  }

  // Lista organizada de etiquetas clave
  const commonLabels = {
    Make: 'Fabricante de la Cámara / Teléfono',
    Model: 'Modelo del Dispositivo',
    DateTime: 'Fecha y Hora de Modificación',
    DateTimeOriginal: 'Fecha y Hora de la Toma Original',
    Software: 'Sistema Operativo / Software',
    ExposureTime: 'Tiempo de Exposición (Velocidad)',
    FNumber: 'Apertura del Diafragma (f/)',
    ISOSpeedRatings: 'Sensibilidad ISO',
    FocalLength: 'Distancia Focal',
    LensModel: 'Modelo de Lente',
    Flash: 'Estado del Flash',
    WhiteBalance: 'Balance de Blancos',
    Orientation: 'Orientación de la Foto',
    PixelXDimension: 'Ancho en Píxeles',
    PixelYDimension: 'Alto en Píxeles',
    GPSLatitude: 'Latitud GPS (Grados/Min/Seg)',
    GPSLongitude: 'Longitud GPS (Grados/Min/Seg)',
    GPSAltitude: 'Altitud sobre el nivel del mar',
  };

  tagKeys.forEach(key => {
    let rawVal = tags[key];
    let valStr = String(rawVal);

    if (typeof rawVal === 'object') {
      try { valStr = JSON.stringify(rawVal); } catch (e) { valStr = '[Datos binarios]'; }
    }

    const row = document.createElement('tr');
    row.className = 'border-b border-slate-100 text-xs';

    const isGpsTag = key.startsWith('GPS');
    const label = commonLabels[key] || key;

    row.innerHTML = `
      <td class="p-3 font-semibold ${isGpsTag ? 'text-rose-700 font-bold bg-rose-50/50' : 'text-slate-700'}">
        ${isGpsTag ? '📍 ' : ''}${label}
        <span class="text-[10px] text-slate-400 font-mono block">${key}</span>
      </td>
      <td class="p-3 font-mono ${isGpsTag ? 'text-rose-900 font-bold bg-rose-50/50' : 'text-slate-600'} break-all">
        ${valStr}
      </td>
    `;

    tbody.appendChild(row);
  });
}

// Conversión de grados, minutos y segundos (DMS) a Decimal (DD)
function convertDMSToDD(dms, ref) {
  if (!dms || dms.length < 3) return 0;
  let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
  if (ref === 'S' || ref === 'W') dd = dd * -1;
  return dd;
}

// =============================================================================
// LIMPIEZA 100% DEFINITIVA MEDIANTE HTML5 CANVAS
// =============================================================================
function setupActionButtons() {
  elements.cleanAndDownloadBtn.addEventListener('click', async () => {
    if (!state.currentFile) return;

    showToast('Depurando metadatos y recomprimiendo...');

    const cleanBlob = await cleanImageMetadataWithCanvas(state.currentFile);
    state.cleanImageBlob = cleanBlob;
    state.cleanImageUrl = URL.createObjectURL(cleanBlob);

    // Descargar
    const a = document.createElement('a');
    a.href = state.cleanImageUrl;
    a.download = `${state.fileName}-sin-exif.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(state.cleanImageUrl), 1000);
    showToast('¡Foto limpia y protegida descargada!');
  });
}

function cleanImageMetadataWithCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      // Redibujado puro: Canvas nunca copia cabeceras EXIF, XMP o IPTC
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Fallo al limpiar imagen'));
      }, 'image/jpeg', 0.94);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };

    img.src = url;
  });
}

// =============================================================================
// LIMPIEZA MASIVA (BULK PHOTOS) BLOQUEADA POR ANUNCIO
// =============================================================================
function handleBulkPhotos(files) {
  state.bulkQueue = files;
  elements.bulkCountText.textContent = `${files.length} fotos seleccionadas para depuración simultánea`;
  elements.bulkModal.classList.remove('hidden');
  renderBulkState();
}

function setupBulkModal() {
  elements.closeBulkModal.addEventListener('click', () => {
    elements.bulkModal.classList.add('hidden');
  });

  elements.unlockBulkBtn.addEventListener('click', () => {
    // Simular patrocinador / anuncio
    window.open('https://ouo.io/qs/exif-bulk?s=unlocked', '_blank');

    state.isBulkUnlocked = true;
    localStorage.setItem('exif_bulk_unlocked', 'true');
    renderBulkState();
    showToast('¡Modo de limpieza masiva desbloqueado!');
  });

  elements.bulkDownloadZipBtn.addEventListener('click', async () => {
    if (state.bulkQueue.length === 0) return;
    showToast('Procesando y empaquetando fotos...');

    if (typeof JSZip === 'undefined') {
      alert('Cargando librería JSZip...');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder('fotos_sin_metadatos');

    for (let i = 0; i < state.bulkQueue.length; i++) {
      const file = state.bulkQueue[i];
      try {
        const cleanBlob = await cleanImageMetadataWithCanvas(file);
        const cleanName = file.name.replace(/\.[^/.]+$/, '') + '-limpia.jpg';
        folder.file(cleanName, cleanBlob);
      } catch (e) {
        console.warn('Error en archivo de lote:', file.name);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);

    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `fotos_depuradas_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
    elements.bulkModal.classList.add('hidden');
    showToast('¡Archivo ZIP con todas las fotos limpias descargado!');
  });
}

function renderBulkState() {
  if (state.isBulkUnlocked) {
    elements.bulkLockedView.classList.add('hidden');
    elements.bulkUnlockedView.classList.remove('hidden');
  } else {
    elements.bulkLockedView.classList.remove('hidden');
    elements.bulkUnlockedView.classList.add('hidden');
  }
}

// =============================================================================
// MUESTRA CON METADATOS Y GPS SIMULADOS
// =============================================================================
function setupSamplePhoto() {
  if (!elements.sampleBtn) return;

  elements.sampleBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Paisaje de muestra
    const grad = ctx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#bae6fd');
    grad.addColorStop(0.51, '#15803d');
    grad.addColorStop(1, '#166534');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 600);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Fotografía con Metadatos Incrustados (Demo)', 60, 80);

    canvas.toBlob((blob) => {
      state.currentFile = blob;
      state.fileName = 'foto-con-gps-demo';

      if (state.originalImageUrl) URL.revokeObjectURL(state.originalImageUrl);
      state.originalImageUrl = URL.createObjectURL(blob);

      elements.photoPreview.src = state.originalImageUrl;
      elements.fileInfoText.textContent = `foto-con-gps-demo.jpg • 284 KB`;

      // Simular tags EXIF y GPS para visualización en vivo
      state.hasGps = true;
      state.gpsData = { lat: 40.41678, lon: -3.70379 }; // Coordenadas Puerta del Sol, Madrid

      state.exifTags = {
        Make: 'Apple',
        Model: 'iPhone 15 Pro Max',
        DateTime: '2026:10:19 13:40:22',
        DateTimeOriginal: '2026:10:19 13:40:22',
        Software: 'iOS 18.2',
        ExposureTime: '1/120',
        FNumber: 1.78,
        ISOSpeedRatings: 80,
        FocalLength: '6.86 mm',
        LensModel: 'iPhone 15 Pro Max back triple camera 6.86mm f/1.78',
        GPSLatitude: [40, 25, 0.4],
        GPSLatitudeRef: 'N',
        GPSLongitude: [3, 42, 13.6],
        GPSLongitudeRef: 'W',
        GPSAltitude: '655 m',
      };

      renderGpsAlert();
      renderMetadataTable(state.exifTags, canvas);

      elements.toolCard.classList.add('hidden');
      elements.workspace.classList.remove('hidden');
      elements.workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 'image/jpeg', 0.9);
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


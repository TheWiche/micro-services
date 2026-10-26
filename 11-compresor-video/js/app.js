/**
 * Compresor de Video 100% Client-Side
 * Recodificación adaptativa en el navegador con HTML5 Canvas y MediaRecorder API
 */

// =============================================================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// =============================================================================
const CONFIG = {
  monetization: {
    enabled: false, // Descarga directa 100% Client-Side
    shortenerUrl: 'https://ouo.io/qs/video-compress?s=',
    delaySeconds: 0,
  },
  presets: {
    discord: {
      name: 'Discord (<10MB)',
      targetMb: 8,
      maxHeight: 720,
      description: 'Ideal para compartir en canales sin Discord Nitro',
    },
    whatsapp: {
      name: 'WhatsApp (<16MB)',
      targetMb: 14,
      maxHeight: 720,
      description: 'Garantiza envío directo como archivo o video en chats',
    },
    light: {
      name: 'Compresión Ligera (720p)',
      targetMb: null,
      maxHeight: 720,
      bitrateRatio: 0.65,
      description: 'Reduce el peso manteniendo alta fidelidad visual',
    },
    extreme: {
      name: 'Máximo Ahorro (480p)',
      targetMb: 5,
      maxHeight: 480,
      description: 'Ultra ligero para conexiones lentas o correos',
    }
  }
};

const state = {
  selectedFile: null,
  fileName: 'video',
  fileSize: 0,
  duration: 0,
  videoWidth: 0,
  videoHeight: 0,
  selectedPreset: 'discord',
  compressedBlob: null,
  compressedUrl: null,
  isCompressing: false,
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
  progressSection: document.getElementById('progress-section'),

  // Barra de progreso
  progressBar: document.getElementById('progress-bar'),
  progressPercent: document.getElementById('progress-percent'),
  progressStatus: document.getElementById('progress-status'),

  // Presets
  btnPresetDiscord: document.getElementById('preset-discord'),
  btnPresetWhatsapp: document.getElementById('preset-whatsapp'),
  btnPresetLight: document.getElementById('preset-light'),
  btnPresetExtreme: document.getElementById('preset-extreme'),
  presetDescription: document.getElementById('preset-description'),

  // Previews
  originalVideo: document.getElementById('original-video'),
  compressedVideo: document.getElementById('compressed-video'),
  originalSizeBadge: document.getElementById('original-size-badge'),
  originalDurationBadge: document.getElementById('original-duration-badge'),
  compressedSizeBadge: document.getElementById('compressed-size-badge'),
  savingsBadge: document.getElementById('savings-badge'),
  resultBox: document.getElementById('result-box'),

  // Acciones
  startCompressBtn: document.getElementById('start-compress-btn'),
  downloadBtn: document.getElementById('download-btn'),
  newVideoBtn: document.getElementById('new-video-btn'),

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
  setupUploadEvents();
  setupPresets();
  setupActionButtons();
  setupSampleVideo();
});

// =============================================================================
// SUBIDA DE ARCHIVOS (CLICK, DRAG & DROP, CTRL+V)
// =============================================================================
function setupUploadEvents() {
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleVideoFile(file);
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
    if (file && (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|mkv)$/i))) {
      handleVideoFile(file);
    } else {
      showToast('Por favor suelta un archivo de video válido (MP4, MOV o WebM)');
    }
  });

  // Pegado directo (Ctrl + V)
  window.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('video/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleVideoFile(file, 'video-pegado');
          break;
        }
      }
    }
  });

  elements.newVideoBtn.addEventListener('click', () => {
    elements.workspace.classList.add('hidden');
    elements.resultBox.classList.add('hidden');
    elements.toolCard.classList.remove('hidden');
    elements.fileInput.value = '';
    window.scrollTo({ top: elements.toolCard.offsetTop - 80, behavior: 'smooth' });
  });
}

function handleVideoFile(file, customName = null) {
  state.selectedFile = file;
  state.fileName = customName || file.name.replace(/\.[^/.]+$/, '') || 'video-optimizado';
  state.fileSize = file.size;

  const url = URL.createObjectURL(file);
  elements.originalVideo.src = url;

  elements.originalVideo.onloadedmetadata = () => {
    state.duration = elements.originalVideo.duration || 10;
    state.videoWidth = elements.originalVideo.videoWidth || 1280;
    state.videoHeight = elements.originalVideo.videoHeight || 720;

    elements.originalSizeBadge.textContent = formatBytes(state.fileSize);
    elements.originalDurationBadge.textContent = `${Math.round(state.duration)}s (${state.videoWidth}x${state.videoHeight})`;

    elements.toolCard.classList.add('hidden');
    elements.workspace.classList.remove('hidden');
    elements.workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
}

// =============================================================================
// PRESETS DE COMPRESIÓN (DISCORD, WHATSAPP, 720P)
// =============================================================================
function setupPresets() {
  const presetBtns = [
    { el: elements.btnPresetDiscord, key: 'discord' },
    { el: elements.btnPresetWhatsapp, key: 'whatsapp' },
    { el: elements.btnPresetLight, key: 'light' },
    { el: elements.btnPresetExtreme, key: 'extreme' },
  ];

  presetBtns.forEach(({ el, key }) => {
    el.addEventListener('click', () => {
      state.selectedPreset = key;
      presetBtns.forEach(b => {
        b.el.className = 'py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all flex flex-col items-center justify-center gap-1';
      });
      el.className = 'py-3 px-4 rounded-xl border border-indigo-600 bg-indigo-50 text-indigo-700 text-xs font-bold shadow-xs transition-all flex flex-col items-center justify-center gap-1';
      elements.presetDescription.textContent = CONFIG.presets[key].description;
    });
  });
}

// =============================================================================
// MOTOR DE COMPRESIÓN CLIENT-SIDE (CANVAS + MEDIARECORDER)
// =============================================================================
function setupActionButtons() {
  elements.startCompressBtn.addEventListener('click', () => {
    compressVideoClientSide();
  });

  // Modal de descarga
  elements.downloadBtn.addEventListener('click', () => {
    if (!state.compressedBlob) return;

    if (!CONFIG.monetization.enabled) {
      triggerDownload();
      return;
    }

    openDownloadModal();
  });

  elements.closeDownloadModal.addEventListener('click', () => {
    elements.downloadModal.classList.add('hidden');
  });

  elements.continueDownloadBtn.addEventListener('click', () => {
    triggerDownload();
    elements.downloadModal.classList.add('hidden');
  });

  elements.sponsorLinkBtn.addEventListener('click', () => {
    window.open(CONFIG.monetization.shortenerUrl + encodeURIComponent(window.location.href), '_blank');
  });
}

async function compressVideoClientSide() {
  if (state.isCompressing || !state.selectedFile) return;
  state.isCompressing = true;

  elements.workspace.classList.add('hidden');
  elements.progressSection.classList.remove('hidden');
  elements.resultBox.classList.add('hidden');

  updateProgress(5, 'Configurando decodificador de video...');

  try {
    const preset = CONFIG.presets[state.selectedPreset];
    const duration = state.duration || 10;

    // Calcular bitrate objetivo
    let targetBitrate = 1_500_000; // 1.5 Mbps por defecto
    if (preset.targetMb) {
      // Bitrate = (TargetBytes * 8) / seconds
      const targetBytes = preset.targetMb * 1024 * 1024;
      targetBitrate = Math.max(300_000, Math.floor((targetBytes * 8) / duration * 0.85)); // 15% margen de seguridad
    } else if (preset.bitrateRatio) {
      const origBitrate = (state.fileSize * 8) / duration;
      targetBitrate = Math.max(400_000, Math.floor(origBitrate * preset.bitrateRatio));
    }

    // Calcular dimensiones escaladas
    let targetW = state.videoWidth;
    let targetH = state.videoHeight;

    if (targetH > preset.maxHeight) {
      const scale = preset.maxHeight / targetH;
      targetH = preset.maxHeight;
      targetW = Math.round(targetW * scale);
      // Asegurar números pares para códecs de video
      if (targetW % 2 !== 0) targetW--;
      if (targetH % 2 !== 0) targetH--;
    }

    updateProgress(15, `Escalando a ${targetW}x${targetH} con bitrate optimizado...`);

    // Canvas de renderizado offscreen
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { alpha: false });

    const video = document.createElement('video');
    video.src = URL.createObjectURL(state.selectedFile);
    video.muted = false; // Permitir audio
    video.playsInline = true;

    await new Promise(r => {
      video.onloadeddata = r;
      video.load();
    });

    // Capturar stream de video y audio
    const stream = canvas.captureStream(30);

    // Conectar audio
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (e) {
      console.warn('Audio pass-through no disponible en este entorno, se comprimirá solo video.');
    }

    // Elegir el mejor MIME soportado por el navegador
    let mimeType = 'video/webm;codecs=vp9';
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
      mimeType = 'video/webm;codecs=h264';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: targetBitrate,
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.start(250);

    // Reproducir video y dibujar fotogramas
    video.currentTime = 0;
    await video.play();

    await new Promise((resolve) => {
      function drawFrame() {
        if (video.paused || video.ended) {
          resolve();
          return;
        }

        ctx.drawImage(video, 0, 0, targetW, targetH);

        const currentPct = Math.min(95, Math.round((video.currentTime / duration) * 100));
        updateProgress(15 + Math.round(currentPct * 0.8), `Comprimiendo video (${currentPct}%)...`);

        requestAnimationFrame(drawFrame);
      }

      video.onended = () => {
        resolve();
      };

      drawFrame();
    });

    mediaRecorder.stop();
    await new Promise(r => mediaRecorder.onstop = r);

    const isMp4 = mimeType.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const resultBlob = new Blob(chunks, { type: mimeType });

    state.compressedBlob = resultBlob;
    if (state.compressedUrl) URL.revokeObjectURL(state.compressedUrl);
    state.compressedUrl = URL.createObjectURL(resultBlob);

    // Mostrar resultados
    elements.compressedVideo.src = state.compressedUrl;
    elements.compressedSizeBadge.textContent = formatBytes(resultBlob.size);

    const diff = state.fileSize - resultBlob.size;
    const savingsPct = Math.round((diff / state.fileSize) * 100);

    if (diff > 0) {
      elements.savingsBadge.textContent = `Ahorro del ${savingsPct}%`;
      elements.savingsBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
    } else {
      elements.savingsBadge.textContent = 'Optimizado para compatibilidad';
      elements.savingsBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700';
    }

    updateProgress(100, '¡Compresión completada con éxito!');

    setTimeout(() => {
      elements.progressSection.classList.add('hidden');
      elements.workspace.classList.remove('hidden');
      elements.resultBox.classList.remove('hidden');
      elements.resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 400);

  } catch (err) {
    console.error('Error durante la compresión:', err);
    alert('Error al comprimir video: ' + (err.message || err));
    elements.progressSection.classList.add('hidden');
    elements.workspace.classList.remove('hidden');
  } finally {
    state.isCompressing = false;
  }
}

function updateProgress(percent, text) {
  const rounded = Math.min(100, Math.max(0, Math.round(percent)));
  elements.progressBar.style.width = `${rounded}%`;
  elements.progressPercent.textContent = `${rounded}%`;
  elements.progressStatus.textContent = text;
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
      elements.continueDownloadBtn.textContent = '✅ Descargar Video Comprimido Ahora';
    }
  }, 1000);
}

function triggerDownload() {
  const a = document.createElement('a');
  a.href = state.compressedUrl;
  const ext = state.compressedBlob.type.includes('mp4') ? 'mp4' : 'webm';
  a.download = `${state.fileName}-comprimido.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('¡Descargando video comprimido!');
}

// =============================================================================
// GENERADOR DE VIDEO DEMO DE PRUEBA (100% OFFLINE CON CANVAS ANIMADO)
// =============================================================================
function setupSampleVideo() {
  if (!elements.sampleBtn) return;

  elements.sampleBtn.addEventListener('click', async () => {
    showToast('Generando video de prueba en alta definición...');

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.start();

    // Animar 4 segundos a 30 fps (120 frames)
    let frame = 0;
    const totalFrames = 120;

    function renderAnim() {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      // Fondo dinámico
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1280, 720);

      // Círculo rebotando
      const x = 200 + Math.sin(frame * 0.1) * 300 + frame * 4;
      const y = 360 + Math.cos(frame * 0.15) * 150;

      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(x % 1280, y, 60, 0, Math.PI * 2);
      ctx.fill();

      // Texto de prueba
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('VIDEO DE PRUEBA 720P (MICRO-SERVICIOS)', 100, 100);

      ctx.font = 'normal 24px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Fotograma: ${frame} / ${totalFrames} • Tiempo: ${(frame / 30).toFixed(1)}s`, 100, 150);

      frame++;
      requestAnimationFrame(renderAnim);
    }

    renderAnim();

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      handleVideoFile(blob, 'video-demo-720p');
      showToast('¡Video de prueba cargado!');
    };
  });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2800);
}


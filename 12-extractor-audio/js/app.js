/**
 * ============================================================================
 * Extractor de Audio a MP3 - Procesamiento 100% Client-Side
 * Micro-Servicios Web
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Elementos del DOM ---
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const demoBtn = document.getElementById('demo-btn');
  const toolSection = document.getElementById('tool-section');
  const optionsCard = document.getElementById('options-card');
  const resultCard = document.getElementById('result-card');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progressStage = document.getElementById('progress-stage');

  // Metadatos video cargado
  const videoNameEl = document.getElementById('video-name');
  const videoSizeEl = document.getElementById('video-size');
  const videoDurationEl = document.getElementById('video-duration');
  const videoChannelsEl = document.getElementById('video-channels');

  // Controles
  const qualitySelect = document.getElementById('quality-select');
  const channelModeSelect = document.getElementById('channel-mode-select');
  const extractBtn = document.getElementById('extract-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Resultado
  const audioPreview = document.getElementById('audio-preview');
  const resultNameEl = document.getElementById('result-name');
  const resultSizeEl = document.getElementById('result-size');
  const resultSavingsEl = document.getElementById('result-savings');
  const resultBitrateBadge = document.getElementById('result-bitrate-badge');
  const downloadMp3Btn = document.getElementById('download-mp3-btn');
  const downloadWavBtn = document.getElementById('download-wav-btn');

  // Modal de descarga monetizada
  const downloadModal = document.getElementById('download-modal');
  const modalCountdown = document.getElementById('modal-countdown');
  const modalDownloadBtn = document.getElementById('modal-download-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  // Toast
  const toast = document.getElementById('toast');

  // --- Estado de la aplicación ---
  let currentFile = null;
  let currentAudioBuffer = null;
  let generatedMp3Blob = null;
  let generatedWavBlob = null;
  let generatedMp3Url = null;
  let audioCtx = null;
  let modalTimer = null;

  // --- Helpers de Notificación Toast ---
  function showToast(message, duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // --- Helper para Formato de Bytes ---
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // --- Helper para Formato de Tiempo mm:ss ---
  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- Inicializar / Obtener AudioContext ---
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // --- Drag & Drop y Selección de Archivo ---
  if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropzone) {
    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(evtName => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dropzone-active');
      });
    });

    ['dragleave', 'drop'].forEach(evtName => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dropzone-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt.files && dt.files.length > 0) {
        handleFileSelection(dt.files[0]);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  // Soporte para Ctrl + V (Pegar archivo desde el portapapeles)
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.files) return;
    const files = e.clipboardData.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('video/') || files[i].type.startsWith('audio/')) {
        handleFileSelection(files[i]);
        showToast('¡Archivo multimedia pegado desde el portapapeles!');
        break;
      }
    }
  });

  // Botón Demo con Generación de Video y Pista Sonora Sintética
  if (demoBtn) {
    demoBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      showToast('Generando video clip de demostración en tiempo real...');

      try {
        const demoBlob = await createSyntheticDemoVideo();
        const demoFile = new File([demoBlob], 'muestra_clase_universitaria.mp4', { type: 'video/mp4' });
        handleFileSelection(demoFile);
        showToast('Video de demostración listo para extraer.');
      } catch (err) {
        console.error('Error generando demo:', err);
        showToast('Error al crear video de prueba.');
      }
    });
  }

  // Generador de video sintético en canvas con onda sonora armónica (voz + tonos)
  async function createSyntheticDemoVideo() {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      const actx = getAudioContext();
      const dest = actx.createMediaStreamDestination();

      // Oscilador armónico simulando acordes de voz / presentación
      const osc1 = actx.createOscillator();
      const osc2 = actx.createOscillator();
      const gain = actx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(220, actx.currentTime); // La3
      osc1.frequency.exponentialRampToValueAtTime(440, actx.currentTime + 3);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(330, actx.currentTime); // Mi4
      osc2.frequency.exponentialRampToValueAtTime(554.37, actx.currentTime + 3);

      gain.gain.setValueAtTime(0.3, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 3.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);

      osc1.start();
      osc2.start();
      osc1.stop(actx.currentTime + 4);
      osc2.stop(actx.currentTime + 4);

      // Combinar canvas stream con audio stream
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      let mediaRecorder;
      const mimeTypes = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
      let chosenMime = 'video/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          chosenMime = m;
          break;
        }
      }

      mediaRecorder = new MediaRecorder(combinedStream, { mimeType: chosenMime });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: chosenMime });
        resolve(finalBlob);
      };

      mediaRecorder.start();

      let startTime = performance.now();
      function drawFrame(now) {
        const elapsed = (now - startTime) / 1000;
        if (elapsed > 4) {
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
          return;
        }

        // Fondo oscuro profesional estilo clase grabada
        const grad = ctx.createLinearGradient(0, 0, 640, 360);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 360);

        // Ondas sonoras animadas
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x < 640; x += 10) {
          const y = 180 + Math.sin((x * 0.05) + elapsed * 5) * 40;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Texto informativo
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎓 Grabación de Clase: Inteligencia Artificial', 320, 90);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('Audio demo estéreo • Pista de sonido lista para extracción', 320, 130);

        ctx.fillStyle = '#c084fc';
        ctx.font = 'mono 16px sans-serif';
        ctx.fillText(`00:0${Math.floor(elapsed)} / 00:04 seg`, 320, 270);

        requestAnimationFrame(drawFrame);
      }

      requestAnimationFrame(drawFrame);
    });
  }

  // --- Procesar Selección de Archivo ---
  async function handleFileSelection(file) {
    if (!file) return;

    currentFile = file;
    currentAudioBuffer = null;
    generatedMp3Blob = null;
    generatedWavBlob = null;

    if (generatedMp3Url) {
      URL.revokeObjectURL(generatedMp3Url);
      generatedMp3Url = null;
    }

    // Reset UI
    optionsCard.classList.add('hidden');
    resultCard.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '10%';
    progressText.textContent = '10%';
    progressStage.textContent = 'Analizando y leyendo el archivo en memoria...';

    // Mostrar datos preliminares
    videoNameEl.textContent = file.name;
    videoSizeEl.textContent = formatBytes(file.size);
    videoDurationEl.textContent = 'Calculando...';
    videoChannelsEl.textContent = 'Decodificando...';

    try {
      const actx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();

      progressBar.style.width = '35%';
      progressText.textContent = '35%';
      progressStage.textContent = 'Decodificando pista de audio mediante Web Audio API...';

      // Decodificar pista de audio
      currentAudioBuffer = await actx.decodeAudioData(arrayBuffer);

      progressBar.style.width = '100%';
      progressText.textContent = '100%';
      progressStage.textContent = '¡Pista de audio extraída correctamente!';

      // Actualizar metadatos
      videoDurationEl.textContent = formatDuration(currentAudioBuffer.duration);
      const chCount = currentAudioBuffer.numberOfChannels;
      videoChannelsEl.textContent = chCount === 1 ? '1 canal (Mono)' : `${chCount} canales (Estéreo)`;

      // Ocultar barra de progreso y mostrar tarjeta de opciones
      setTimeout(() => {
        progressContainer.classList.add('hidden');
        optionsCard.classList.remove('hidden');
        optionsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);

      showToast('Audio decodificado con éxito. Ajusta la calidad y convierte.');
    } catch (err) {
      console.error('Error al decodificar audio del archivo:', err);
      progressContainer.classList.add('hidden');
      alert('No se pudo extraer la pista de audio de este archivo. Asegúrate de que el video contenga sonido legible (MP4, WebM, MOV o MKV).');
      showToast('Error: archivo sin pista de audio legible.');
    }
  }

  // --- Conversión a Int16Array PCM ---
  function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  // --- Codificación MP3 mediante lamejs ---
  function encodeAudioBufferToMp3(audioBuffer, kbps, forceMono, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof lamejs === 'undefined') {
          throw new Error('La librería lamejs no está cargada. Por favor verifica tu conexión a internet.');
        }

        const isMono = forceMono || audioBuffer.numberOfChannels === 1;
        const channels = isMono ? 1 : Math.min(audioBuffer.numberOfChannels, 2);
        const sampleRate = audioBuffer.sampleRate;

        const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
        const mp3Data = [];

        const totalSamples = audioBuffer.length;
        const sampleBlockSize = 1152 * 4; // Tamaño de bloque equilibrado para fluidez de UI

        const leftFloat = audioBuffer.getChannelData(0);
        let rightFloat = null;
        if (!isMono && audioBuffer.numberOfChannels > 1) {
          rightFloat = audioBuffer.getChannelData(1);
        }

        let sampleOffset = 0;

        function processChunk() {
          const remaining = totalSamples - sampleOffset;
          if (remaining <= 0) {
            // Vaciar búfer final
            const mp3buf = mp3encoder.flush();
            if (mp3buf.length > 0) {
              mp3Data.push(new Int8Array(mp3buf));
            }

            const blob = new Blob(mp3Data, { type: 'audio/mp3' });
            if (onProgress) onProgress(100);
            resolve(blob);
            return;
          }

          const chunkSize = Math.min(remaining, sampleBlockSize);
          const leftChunk = new Int16Array(chunkSize);
          const rightChunk = !isMono && rightFloat ? new Int16Array(chunkSize) : null;

          for (let i = 0; i < chunkSize; i++) {
            const idx = sampleOffset + i;
            const sL = Math.max(-1, Math.min(1, leftFloat[idx]));
            leftChunk[i] = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;

            if (rightChunk) {
              const sR = Math.max(-1, Math.min(1, rightFloat[idx]));
              rightChunk[i] = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
            }
          }

          let mp3buf;
          if (isMono || !rightChunk) {
            mp3buf = mp3encoder.encodeBuffer(leftChunk);
          } else {
            mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
          }

          if (mp3buf.length > 0) {
            mp3Data.push(new Int8Array(mp3buf));
          }

          sampleOffset += chunkSize;
          const pct = Math.min(99, Math.round((sampleOffset / totalSamples) * 100));
          if (onProgress) onProgress(pct);

          // Asíncrono no bloqueante
          setTimeout(processChunk, 0);
        }

        processChunk();
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- Generador de Audio WAV (Lossless) ---
  function encodeAudioBufferToWav(buffer, forceMono) {
    const isMono = forceMono || buffer.numberOfChannels === 1;
    const numOfChan = isMono ? 1 : Math.min(buffer.numberOfChannels, 2);
    const sampleRate = buffer.sampleRate;
    const totalLength = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(totalLength));

    // Cabecera RIFF / WAVE
    out.setUint32(0, 0x46464952, true); // "RIFF"
    out.setUint32(4, totalLength - 8, true);
    out.setUint32(8, 0x45564157, true); // "WAVE"
    out.setUint32(12, 0x20746d66, true); // "fmt "
    out.setUint32(16, 16, true); // Tamaño de Subchunk1 (16 PCM)
    out.setUint16(20, 1, true); // Formato de audio (1 = PCM)
    out.setUint16(22, numOfChan, true);
    out.setUint32(24, sampleRate, true);
    out.setUint32(28, sampleRate * 2 * numOfChan, true); // ByteRate
    out.setUint16(32, numOfChan * 2, true); // BlockAlign
    out.setUint16(34, 16, true); // BitsPerSample
    out.setUint32(36, 0x61746164, true); // "data"
    out.setUint32(40, totalLength - 44, true);

    const left = buffer.getChannelData(0);
    const right = !isMono && buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;

    let pos = 44;
    for (let i = 0; i < buffer.length; i++) {
      let sL = Math.max(-1, Math.min(1, left[i]));
      sL = (0.5 + sL < 0 ? sL * 32768 : sL * 32767) | 0;
      out.setInt16(pos, sL, true);
      pos += 2;

      if (numOfChan > 1) {
        let sR = Math.max(-1, Math.min(1, right[i]));
        sR = (0.5 + sR < 0 ? sR * 32768 : sR * 32767) | 0;
        out.setInt16(pos, sR, true);
        pos += 2;
      }
    }

    return new Blob([out.buffer], { type: 'audio/wav' });
  }

  // --- Botón Extraer Audio ---
  if (extractBtn) {
    extractBtn.addEventListener('click', async () => {
      if (!currentAudioBuffer) return;

      const kbps = parseInt(qualitySelect.value, 10) || 128;
      const forceMono = channelModeSelect.value === 'mono';

      // UI en estado de codificación
      optionsCard.classList.add('hidden');
      resultCard.classList.add('hidden');
      progressContainer.classList.remove('hidden');
      progressBar.style.width = '0%';
      progressText.textContent = '0%';
      progressStage.textContent = `Codificando pista a MP3 ${kbps} kbps...`;

      try {
        const mp3Blob = await encodeAudioBufferToMp3(currentAudioBuffer, kbps, forceMono, (pct) => {
          progressBar.style.width = `${pct}%`;
          progressText.textContent = `${pct}%`;
          if (pct < 50) {
            progressStage.textContent = `Procesando muestras de audio y aplicando algoritmo LAME (${pct}%)...`;
          } else {
            progressStage.textContent = `Comprimiendo flujo MP3 a ${kbps} kbps (${pct}%)...`;
          }
        });

        generatedMp3Blob = mp3Blob;
        generatedWavBlob = encodeAudioBufferToWav(currentAudioBuffer, forceMono);

        // Previsualización en el reproductor
        if (generatedMp3Url) URL.revokeObjectURL(generatedMp3Url);
        generatedMp3Url = URL.createObjectURL(generatedMp3Blob);
        audioPreview.src = generatedMp3Url;
        audioPreview.load();

        // Datos del resultado
        const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
        resultNameEl.textContent = `${baseName}.mp3`;
        resultSizeEl.textContent = formatBytes(generatedMp3Blob.size);
        resultBitrateBadge.textContent = `${kbps} kbps • ${forceMono ? 'Mono' : 'Estéreo'}`;

        // Cálculo de ahorro
        if (currentFile.size > 0) {
          const savings = Math.max(0, Math.round(((currentFile.size - generatedMp3Blob.size) / currentFile.size) * 100));
          resultSavingsEl.textContent = `-${savings}% vs Video (${formatBytes(currentFile.size)})`;
        }

        progressContainer.classList.add('hidden');
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        showToast('¡Audio MP3 extraído con éxito!');
      } catch (err) {
        console.error('Error durante la codificación MP3:', err);
        progressContainer.classList.add('hidden');
        optionsCard.classList.remove('hidden');
        alert('Ocurrió un error al codificar a MP3: ' + err.message);
        showToast('Fallo en la codificación.');
      }
    });
  }

  // --- Descarga de Archivo Helper ---
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // --- Modal de Descarga Monetizada ---
  function openMonetizedDownload(targetBlob, defaultFilename) {
    // Descarga directa 100% Client-Side limpia
    triggerDownload(targetBlob, defaultFilename);
    showToast('¡Descarga iniciada!');
    return;

    downloadModal.classList.remove('hidden');
    let timeLeft = 3;
    modalCountdown.textContent = timeLeft;
    modalDownloadBtn.disabled = true;
    modalDownloadBtn.classList.add('opacity-50', 'cursor-not-allowed');
    modalDownloadBtn.innerHTML = `<span>Espera ${timeLeft}s...</span>`;

    if (modalTimer) clearInterval(modalTimer);

    modalTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        modalCountdown.textContent = timeLeft;
        modalDownloadBtn.innerHTML = `<span>Espera ${timeLeft}s...</span>`;
      } else {
        clearInterval(modalTimer);
        modalTimer = null;
        modalCountdown.textContent = '0';
        modalDownloadBtn.disabled = false;
        modalDownloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        modalDownloadBtn.classList.add('btn-pulse-audio');
        modalDownloadBtn.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          <span>Descargar Archivo Ahora</span>
        `;
      }
    }, 1000);

    // Click en botón de descarga dentro del modal
    modalDownloadBtn.onclick = () => {
      triggerDownload(targetBlob, defaultFilename);
      downloadModal.classList.add('hidden');
      showToast('¡Descarga iniciada!');
    };
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
      if (modalTimer) clearInterval(modalTimer);
      downloadModal.classList.add('hidden');
    });
  }

  // Cerrar modal al hacer clic en el backdrop
  if (downloadModal) {
    downloadModal.addEventListener('click', (e) => {
      if (e.target === downloadModal) {
        if (modalTimer) clearInterval(modalTimer);
        downloadModal.classList.add('hidden');
      }
    });
  }

  // --- Botones de Descarga en Resultado ---
  if (downloadMp3Btn) {
    downloadMp3Btn.addEventListener('click', () => {
      if (!generatedMp3Blob) return;
      const baseName = currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') : 'audio_extraido';
      openMonetizedDownload(generatedMp3Blob, `${baseName}.mp3`);
    });
  }

  if (downloadWavBtn) {
    downloadWavBtn.addEventListener('click', () => {
      if (!generatedWavBlob) return;
      const baseName = currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') : 'audio_extraido';
      triggerDownload(generatedWavBlob, `${baseName}.wav`);
      showToast('Descargando archivo WAV sin compresión.');
    });
  }

  // --- Reiniciar para Procesar Otro Video ---
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentFile = null;
      currentAudioBuffer = null;
      generatedMp3Blob = null;
      generatedWavBlob = null;
      if (generatedMp3Url) {
        URL.revokeObjectURL(generatedMp3Url);
        generatedMp3Url = null;
      }
      if (audioPreview) {
        audioPreview.pause();
        audioPreview.src = '';
      }
      fileInput.value = '';
      resultCard.classList.add('hidden');
      optionsCard.classList.add('hidden');
      progressContainer.classList.add('hidden');
      toolSection.scrollIntoView({ behavior: 'smooth' });
      showToast('Listo para cargar un nuevo archivo.');
    });
  }
});


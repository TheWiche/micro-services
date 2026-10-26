# ⚡ WebTools Suite — 100% Client-Side

> **Suite integral de 12 micro-herramientas utilitarias para procesamiento y conversión de imágenes, documentos PDF, video, audio y códigos QR. Ejecución 100% en el navegador (Client-Side), privada y sin dependencias de backend.**

🌐 **Sitio Web en Vivo (GitHub Pages):** [https://thewiche.github.io/micro-services/](https://thewiche.github.io/micro-services/)

---

## 🔒 Privacidad y Rendimiento Total
A diferencia de servicios tradicionales que requieren subir tus archivos confidenciales a servidores externos, **WebTools Suite** procesa cada byte directamente dentro de la memoria RAM de tu dispositivo utilizando **WebAssembly (WASM)**, **HTML5 Canvas**, **Web Audio API**, **MediaRecorder API** y aceleración por **WebGL**.

* ✅ **Cero transmisiones de datos a servidores**: Tus fotos, PDFs, audios y videos nunca salen de tu equipo.
* ✅ **Sin límites artificiales ni colas**: Velocidad máxima aprovechando la CPU y GPU local.
* ✅ **Alojable en hosting 100% estático**: Totalmente compatible con GitHub Pages, Vercel, Netlify o Cloudflare Pages.

---

## 🛠️ Herramientas Disponibles

| # | Herramienta | Motor Técnico | Descripción |
|---|---|---|---|
| **01** | [🪄 Eliminador de Fondos con IA](./01-quitar-fondo/) | `@imgly/background-removal` (WASM + ONNX WebGL) | Quita fondos de retratos, productos y firmas automáticamente con inteligencia artificial local. |
| **02** | [🔄 Conversor HEIC/WEBP a JPG/PNG](./02-conversor-imagenes/) | Canvas API + `heic2any` + `JSZip` | Convierte fotos de iPhone (.heic), WebP y AVIF a formatos estándar en lote con empaquetado ZIP. |
| **03** | [📐 Vectorizador PNG/JPG a SVG](./03-vectorizador-svg/) | `ImageTracerJS` | Convierte logotipos, bocetos y firmas en mapa de bits a gráficos vectoriales escalables e infinitos. |
| **04** | [🛡️ Censurador de Rostros y Datos](./04-censurador-rostros/) | `face-api.js` (TinyFaceDetector) + Canvas | Detecta rostros automáticamente y aplica pixelado, desenfoque o barra negra para proteger identidades. |
| **05** | [⭐ Generador de Paquetes Favicon](./05-generador-favicons/) | Canvas API + `JSZip` | Genera favicons multiescala para navegadores web, iOS (Apple Touch) y Android (manifest) en un ZIP. |
| **06** | [🎨 Extractor de Paletas y CSS](./06-extractor-colores/) | `ColorThief` + Canvas API Eyedropper | Extrae los 8 colores dominantes de una foto con códigos HEX/RGB/HSL, lupa cuentagotas y CSS. |
| **07** | [📄 Extractor de Texto OCR](./07-ocr-texto/) | `Tesseract.js` (WASM) | Reconocimiento óptico de caracteres para digitalizar recibos, capturas y documentos en texto editable. |
| **08** | [📍 Limpiador de Metadatos EXIF/GPS](./08-limpiador-exif/) | `exif-js` + Depuración Canvas | Inspecciona etiquetas de cámara y coordenadas GPS por satélite, y elimínalas definitivamente. |
| **09** | [📑 Unir, Dividir y Comprimir PDF](./09-herramientas-pdf/) | `pdf-lib` (Manipulación binaria) | Fusiona múltiples PDFs, extrae rangos de páginas específicas y optimiza el tamaño de documentos. |
| **10** | [📱 Escáner y Generador QR](./010-lector-qr/) | `jsQR` + `qrcodejs` | Lee códigos QR directamente desde capturas de pantalla pegadas con `Ctrl + V` o genera nuevos QR. |
| **11** | [🎬 Compresor de Video](./11-compresor-video/) | Canvas Offscreen + `MediaRecorder` API | Reduce el peso de videos MP4/MOV para Discord (<10 MB), WhatsApp (<16 MB) o correo electrónico. |
| **12** | [🎵 Extractor de Audio a MP3](./12-extractor-audio/) | `AudioContext.decodeAudioData` + `lamejs` | Extrae la pista de sonido de grabaciones de clases o videos y la codifica en MP3 ligero (128-320k). |

---

## ✨ Características del Ecosistema Unificado

* **Sistema de Diseño Consistente**: Identidad visual unificada con paleta Índigo/Violeta, tipografía *Inter* y componentes estandarizados.
* **Modo Oscuro Universal**: Conmutación instantánea entre tema claro y oscuro sincronizada en tiempo real mediante `localStorage` en toda la suite.
* **Conmutador Rápido de Herramientas (`Ctrl + K`)**: Navbar flotante con buscador integrado y menú desplegable para saltar de una herramienta a otra sin regresar al catálogo.
* **Sección "Usadas Recientemente"**: El catálogo central almacena de forma persistente tus herramientas más utilizadas.
* **Descargas Directas**: Sin popups molestos ni acortadores; descargas directas e inmediatas.

---

## 🚀 Despliegue Local o Estático

Dado que no requiere Node.js en producción ni servidor de base de datos, puedes servirlo con cualquier servidor HTTP local:

```bash
# Con Python
python -m http.server 8080

# Con Node (npx)
npx serve .
```

Abre tu navegador en `http://localhost:8080` y ¡listo!

---

## 📄 Licencia
Este proyecto es de código abierto y de uso libre para fines personales y comerciales.


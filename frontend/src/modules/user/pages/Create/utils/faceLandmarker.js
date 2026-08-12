import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Suppress internal TensorFlow Lite / WASM info logs and warnings from browser console
if (typeof window !== 'undefined' && !window.__mediapipe_logs_filtered) {
  window.__mediapipe_logs_filtered = true;
  const isWasmNoise = (args) => {
    const msg = args.map((a) => String(a || '')).join(' ');
    return msg.includes('TensorFlow Lite') || msg.includes('XNNPACK') || msg.includes('vision_wasm') || msg.includes('Face landmarker GPU');
  };

  const origInfo = console.info;
  console.info = (...args) => {
    if (isWasmNoise(args)) return;
    origInfo.apply(console, args);
  };

  const origLog = console.log;
  console.log = (...args) => {
    if (isWasmNoise(args)) return;
    origLog.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args) => {
    if (isWasmNoise(args)) return;
    origWarn.apply(console, args);
  };
}

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let loaderPromise = null;

async function createLandmarker(delegate) {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

// Singleton loader: first caller triggers the (CDN) load, everyone else awaits the same promise.
export function getFaceLandmarker() {
  if (!loaderPromise) {
    loaderPromise = createLandmarker('GPU').catch(() => {
      return createLandmarker('CPU');
    });
  }
  return loaderPromise;
}

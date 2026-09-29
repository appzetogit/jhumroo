import { useEffect, useRef } from 'react';
import { getFaceLandmarker } from '../utils/faceLandmarker';
import { FACE_EFFECT_PRESETS } from '../utils/faceEffectPresets';

// Overlay canvas shown in place of the Instacam canvas while a face effect is active. Reads the
// raw camera MediaStream (same one Instacam already opened), runs MediaPipe Face Landmarker per
// frame, warps the active preset onto the canvas, and reports the canvas element back to the
// parent so it can be used as the recording source (canvas.captureStream(30)).
export default function FaceEffectCanvas({ mediaStream, activeEffectId, mirrored, onCanvasReady, filterCss = 'none' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const landmarkerRef = useRef(null);
  const effectIdRef = useRef(activeEffectId);
  const filterCssRef = useRef(filterCss);
  const readyCalledRef = useRef(false);

  useEffect(() => {
    effectIdRef.current = activeEffectId;
  }, [activeEffectId]);

  useEffect(() => {
    filterCssRef.current = filterCss;
  }, [filterCss]);

  useEffect(() => {
    let cancelled = false;
    getFaceLandmarker()
      .then((landmarker) => {
        if (!cancelled) landmarkerRef.current = landmarker;
      })
      .catch((err) => console.warn('Face landmarker unavailable:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !mediaStream) return undefined;

    video.srcObject = mediaStream;
    video.play().catch(() => {});
    readyCalledRef.current = false;

    let lastDetectTime = 0;
    let cachedLandmarks = null;
    let isDetecting = false;

    // Throttle ML detection to 30fps (every 33ms) while rendering canvas at full 60fps
    const DETECT_INTERVAL_MS = 33;

    const draw = () => {
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        if (!readyCalledRef.current) {
          readyCalledRef.current = true;
          onCanvasReady?.(canvas);
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';

        if (filterCssRef.current && filterCssRef.current !== 'none') {
          try {
            ctx.filter = filterCssRef.current;
          } catch (e) {
            ctx.filter = 'none';
          }
        } else {
          ctx.filter = 'none';
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        const landmarker = landmarkerRef.current;
        const effectId = effectIdRef.current;

        if (landmarker && effectId) {
          const now = performance.now();

          // Run landmark detection asynchronously / throttled to ~30 FPS
          if (!isDetecting && (now - lastDetectTime >= DETECT_INTERVAL_MS)) {
            lastDetectTime = now;
            isDetecting = true;
            try {
              const result = landmarker.detectForVideo(video, now);
              if (result?.faceLandmarks?.[0]) {
                cachedLandmarks = result.faceLandmarks[0];
              }
            } catch (err) {
              // Gracefully continue on transient frame errors
            } finally {
              isDetecting = false;
            }
          }

          // Apply face effect using latest cached landmarks
          if (cachedLandmarks) {
            try {
              const preset = FACE_EFFECT_PRESETS.find((p) => p.id === effectId);
              preset?.apply(ctx, cachedLandmarks, canvas.width, canvas.height);
            } catch (err) {
              // Prevent canvas crash
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.srcObject = null;
    };
  }, [mediaStream, onCanvasReady]);

  return (
    <>
      <video ref={videoRef} muted playsInline className="hidden" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1] h-full w-full object-cover rounded-[24px] sm:rounded-[28px]"
        style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
      />
    </>
  );
}

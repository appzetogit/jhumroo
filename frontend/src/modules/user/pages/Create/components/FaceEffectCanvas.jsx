import { useEffect, useRef } from 'react';
import { getFaceLandmarker } from '../utils/faceLandmarker';
import { FACE_EFFECT_PRESETS } from '../utils/faceEffectPresets';

// Overlay canvas shown in place of the Instacam canvas while a face effect is active. Reads the
// raw camera MediaStream (same one Instacam already opened), runs MediaPipe Face Landmarker per
// frame, warps the active preset onto the canvas, and reports the canvas element back to the
// parent so it can be used as the recording source (canvas.captureStream(30)).
export default function FaceEffectCanvas({ mediaStream, activeEffectId, mirrored, onCanvasReady }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const landmarkerRef = useRef(null);
  const effectIdRef = useRef(activeEffectId);
  const readyCalledRef = useRef(false);

  useEffect(() => {
    effectIdRef.current = activeEffectId;
  }, [activeEffectId]);

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
    let lastTimestamp = -1;

    const draw = () => {
      if (video.readyState >= 2 && video.videoWidth) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        if (!readyCalledRef.current) {
          readyCalledRef.current = true;
          onCanvasReady?.(canvas);
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const landmarker = landmarkerRef.current;
        const effectId = effectIdRef.current;
        if (landmarker && effectId) {
          const now = performance.now();
          if (now !== lastTimestamp) {
            lastTimestamp = now;
            const result = landmarker.detectForVideo(video, now);
            const landmarks = result?.faceLandmarks?.[0];
            if (landmarks) {
              const preset = FACE_EFFECT_PRESETS.find((p) => p.id === effectId);
              preset?.apply(ctx, landmarks, canvas.width, canvas.height);
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

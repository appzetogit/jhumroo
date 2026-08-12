// Generic 2D-canvas face-region warp engine. Every effect in faceEffectPresets.js is built from
// the two primitives below (radialWarp, vectorWarp) applied to a small region around a landmark.

// percent: 1 at region center, 0 at region edge. strength>0 bulges (magnifies), strength<0 pinches.
export function radialSampleFactor(percent, strength) {
  return 1 - strength * percent * percent;
}

function applyRegionWarp(ctx, centerX, centerY, radius, sampleFn) {
  const canvas = ctx.canvas;
  const left = Math.max(0, Math.floor(centerX - radius));
  const top = Math.max(0, Math.floor(centerY - radius));
  const right = Math.min(canvas.width, Math.ceil(centerX + radius));
  const bottom = Math.min(canvas.height, Math.ceil(centerY + radius));
  const w = right - left;
  const h = bottom - top;
  if (w <= 0 || h <= 0) return;

  const src = ctx.getImageData(left, top, w, h);
  const dst = ctx.createImageData(w, h);
  const srcData = src.data;
  const dstData = dst.data;
  const localCx = centerX - left;
  const localCy = centerY - top;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - localCx;
      const dy = y - localCy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      let sx = x;
      let sy = y;
      if (distance < radius) {
        const offset = sampleFn(dx, dy, distance);
        sx = localCx + offset.dx;
        sy = localCy + offset.dy;
      }

      // Clamp coordinates within bounds
      sx = Math.min(w - 1, Math.max(0, sx));
      sy = Math.min(h - 1, Math.max(0, sy));

      // Bilinear interpolation for crystal clear, smooth warping without pixelation/blur
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(w - 1, x0 + 1);
      const y1 = Math.min(h - 1, y0 + 1);

      const fx = sx - x0;
      const fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const i00 = (y0 * w + x0) * 4;
      const i10 = (y0 * w + x1) * 4;
      const i01 = (y1 * w + x0) * 4;
      const i11 = (y1 * w + x1) * 4;

      const di = (y * w + x) * 4;

      dstData[di]     = Math.round(srcData[i00]     * w00 + srcData[i10]     * w10 + srcData[i01]     * w01 + srcData[i11]     * w11);
      dstData[di + 1] = Math.round(srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11);
      dstData[di + 2] = Math.round(srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11);
      dstData[di + 3] = Math.round(srcData[i00 + 3] * w00 + srcData[i10 + 3] * w10 + srcData[i01 + 3] * w01 + srcData[i11 + 3] * w11);
    }
  }
  ctx.putImageData(dst, left, top);
}

// Bulge (strength>0) or pinch (strength<0) the region around (centerX, centerY).
export function radialWarp(ctx, centerX, centerY, radius, strength) {
  if (!radius || radius <= 0) return;
  applyRegionWarp(ctx, centerX, centerY, radius, (dx, dy, distance) => {
    const percent = 1 - distance / radius;
    const factor = radialSampleFactor(percent, strength);
    return { dx: dx * factor, dy: dy * factor };
  });
}

// Push the region's content toward (vecX, vecY), tapering to 0 at the region edge.
export function vectorWarp(ctx, centerX, centerY, radius, vecX, vecY, strength) {
  if (!radius || radius <= 0) return;
  const len = Math.hypot(vecX, vecY) || 1;
  const nx = vecX / len;
  const ny = vecY / len;
  applyRegionWarp(ctx, centerX, centerY, radius, (dx, dy, distance) => {
    const percent = 1 - distance / radius;
    const shift = radius * strength * percent * percent;
    return { dx: dx - nx * shift, dy: dy - ny * shift };
  });
}

// Unique point indices referenced by a MediaPipe connector list (e.g. FaceLandmarker.FACE_LANDMARKS_LEFT_EYE).
export function uniqueIndices(connectors) {
  const set = new Set();
  connectors.forEach((c) => {
    set.add(c.start);
    set.add(c.end);
  });
  return Array.from(set);
}

// Center + bounding radius (in pixels) of a set of landmark indices.
export function regionCenterAndRadius(landmarks, indices, canvasWidth, canvasHeight) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;
  indices.forEach((i) => {
    const p = landmarks[i];
    const x = p.x * canvasWidth;
    const y = p.y * canvasHeight;
    sumX += x;
    sumY += y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  return {
    cx: sumX / indices.length,
    cy: sumY / indices.length,
    radius: Math.max(maxX - minX, maxY - minY) / 2,
  };
}

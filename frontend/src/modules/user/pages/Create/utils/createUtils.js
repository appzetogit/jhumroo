export const formatElapsed = (value) => {
  const totalSeconds = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const parseDurationSeconds = (dur) => {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur;
  if (typeof dur === 'string') {
    const cleaned = dur.replace('s', '');
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return Number(cleaned) || 0;
  }
  return 0;
};

export const computeAdjustmentFilterCss = (adj) => {
  if (!adj) return '';

  // Check if legacy 100-based default format was used
  const rawB = adj.brightness !== undefined ? adj.brightness : 0;
  const brightness = (rawB === 100 && adj.contrast === 100 && adj.saturate === 100) ? 0 : rawB;
  const rawC = adj.contrast !== undefined ? adj.contrast : 0;
  const contrast = (rawC === 100 && rawB === 100) ? 0 : rawC;
  const rawS = adj.saturate !== undefined ? adj.saturate : 0;
  const saturate = (rawS === 100 && rawB === 100) ? 0 : rawS;

  const auto = (adj.autoAdjust || 0) / 100;
  const brilliance = adj.brilliance || 0;
  const sharpness = adj.sharpness || 0;
  const shadow = adj.shadow || 0;
  const temp = adj.temp || 0;
  const tint = adj.tint || 0;
  const fade = adj.fade || 0;
  const blur = adj.blur || 0;
  const opacity = adj.opacity !== undefined ? adj.opacity : 100;
  const grayscale = adj.grayscale || 0;
  const sepia = adj.sepia || 0;
  const invert = adj.invert || 0;
  const hueRotate = adj.hueRotate || 0;

  // Calculate composite CSS filter parameters
  const effB = Math.max(0, Math.min(200, 100 + brightness + auto * 10 + brilliance * 0.15 + shadow * 0.12 + fade * 0.15));
  const effC = Math.max(0, Math.min(200, 100 + contrast + auto * 15 + brilliance * 0.25 - shadow * 0.15 - fade * 0.35 + sharpness * 0.15));
  const effS = Math.max(0, Math.min(200, 100 + saturate + auto * 12 + brilliance * 0.15 + (temp > 0 ? temp * 0.1 : 0)));
  const effHue = hueRotate + (temp !== 0 ? (temp > 0 ? -temp * 0.08 : temp * 0.15) : 0) + (tint * 0.45);
  const effSepia = Math.max(0, Math.min(100, sepia + (temp > 0 ? temp * 0.25 : 0)));
  const effOpacity = Math.max(0, Math.min(100, opacity - fade * 0.08));

  return `brightness(${effB.toFixed(1)}%) contrast(${effC.toFixed(1)}%) saturate(${effS.toFixed(1)}%) hue-rotate(${effHue.toFixed(1)}deg) invert(${invert}%) grayscale(${grayscale}%) sepia(${effSepia.toFixed(1)}%) blur(${blur}px) opacity(${effOpacity.toFixed(1)}%)`;
};

export const readSoundFavorites = () => {
  try {
    const storedValue = localStorage.getItem('soundFavorites');
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

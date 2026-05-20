export const formatElapsed = (value) => `00:${String(Math.max(0, Math.round(value))).padStart(2, '0')}`;

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

export const readSoundFavorites = () => {
  try {
    const storedValue = localStorage.getItem('soundFavorites');
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

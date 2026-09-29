import React, { useState, useEffect } from 'react';

export const createInitialPostState = () => ({
  caption: '',
  audience: 'everyone',
  location: '',
  linkType: '',
  allowComments: true,
  allowDuet: true,
  allowStitch: true,
  highQuality: true,
  saveToDevice: true,
  autoCaptions: true,
  audienceControls: true,
  captionLanguage: 'English',
});

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

export const DynamicAudioDuration = ({ soundItem }) => {
  const [duration, setDuration] = useState(() => parseDurationSeconds(soundItem.duration));

  useEffect(() => {
    if (!duration && soundItem.url) {
      const tempAudio = new window.Audio(soundItem.url);
      tempAudio.onloadedmetadata = () => {
        setDuration(tempAudio.duration);
      };
    }
  }, [soundItem.url, duration]);

  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const formatted = duration ? `${mins}:${secs.toString().padStart(2, '0')}` : '0:00';

  return <>{formatted}</>;
};

export const readSoundFavorites = (key) => {
  try {
    const storedValue = localStorage.getItem(key);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

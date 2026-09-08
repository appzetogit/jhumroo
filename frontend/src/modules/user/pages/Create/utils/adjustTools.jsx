import React from 'react';

export const ADJUST_TOOLS = [
  {
    id: 'autoAdjust',
    label: 'Auto adjust',
    min: 0,
    max: 100,
    default: 0,
    step: 1,
    unit: '%',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
        <path d="m14 7 3 3" />
        <path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" />
      </svg>
    )
  },
  {
    id: 'brightness',
    label: 'Brightness',
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    centerOrigin: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" /><path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" /><path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
      </svg>
    )
  },
  {
    id: 'contrast',
    label: 'Contrast',
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    centerOrigin: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2V4a8 8 0 0 1 0 16z" />
      </svg>
    )
  },
  {
    id: 'saturate',
    label: 'Saturation',
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    centerOrigin: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.4" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    )
  },
  {
    id: 'brilliance',
    label: 'Brilliance',
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    centerOrigin: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 0 0 0 12 3 3 0 0 0 0-6 3 3 0 0 1 0-6z" />
      </svg>
    )
  },
  {
    id: 'sharpness',
    label: 'Sharpness',
    min: 0,
    max: 100,
    default: 0,
    step: 1,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    )
  },
  {
    id: 'hueRotate',
    label: 'HSL',
    min: -180,
    max: 180,
    default: 0,
    step: 1,
    unit: '°',
    centerOrigin: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <circle cx="12" cy="8" r="4.5" fill="currentColor" fillOpacity="0.3" />
        <circle cx="8.5" cy="14.5" r="4.5" fill="currentColor" fillOpacity="0.3" />
        <circle cx="15.5" cy="14.5" r="4.5" fill="currentColor" fillOpacity="0.3" />
      </svg>
    )
  },
  {
    id: 'shadow',
    label: 'Shadow',
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    centerOrigin: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path d="M5.5 8.5l10 10M8.5 5.5l10 10M4 12l8 8M12 4l8 8" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'temp',
    label: 'Temp',
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    centerOrigin: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
        <path d="M12 8v5" />
      </svg>
    )
  },
  {
    id: 'tint',
    label: 'Tint',
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    centerOrigin: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    )
  },
  {
    id: 'fade',
    label: 'Fade',
    min: 0,
    max: 100,
    default: 0,
    step: 1,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" strokeWidth="2" />
        <path d="M5 16h14" strokeWidth="1.5" />
        <path d="M7 19h10" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    id: 'vignette',
    label: 'Vignette',
    min: 0,
    max: 100,
    default: 0,
    step: 1,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect width="18" height="18" x="3" y="3" rx="4" />
        <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.4" />
      </svg>
    )
  },
  {
    id: 'grain',
    label: 'Grain',
    min: 0,
    max: 100,
    default: 0,
    step: 1,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="9" r="1" /><circle cx="15" cy="9" r="1" /><circle cx="12" cy="12" r="1" />
        <circle cx="8" cy="14" r="1" /><circle cx="14" cy="15" r="1" /><circle cx="11" cy="7" r="1" />
        <circle cx="16" cy="12" r="1" /><circle cx="7.5" cy="11.5" r="1" /><circle cx="12" cy="16.5" r="1" />
      </svg>
    )
  },
  {
    id: 'blur',
    label: 'Blur',
    min: 0,
    max: 20,
    default: 0,
    step: 1,
    unit: 'px',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
        <circle cx="12" cy="12" r="5" strokeDasharray="2 2" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    )
  },
  {
    id: 'opacity',
    label: 'Opacity',
    min: 0,
    max: 100,
    default: 100,
    step: 1,
    unit: '%',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5" />
        <path d="m2 12 10 5 10-5" />
      </svg>
    )
  },
  {
    id: 'grayscale',
    label: 'Grayscale',
    min: 0,
    max: 100,
    default: 0,
    step: 1,
    unit: '%',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18V4a8 8 0 0 1 0 16z" />
      </svg>
    )
  },
  {
    id: 'sepia',
    label: 'Sepia',
    min: 0,
    max: 100,
    default: 0,
    step: 1,
    unit: '%',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect width="18" height="18" x="3" y="3" rx="3" />
        <circle cx="9" cy="9" r="2" fill="currentColor" fillOpacity="0.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    )
  },
  {
    id: 'invert',
    label: 'Invert',
    min: 0,
    max: 100,
    default: 0,
    step: 1,
    unit: '%',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M16 3h5v5" />
        <path d="M4 20 21 3" />
        <path d="M21 16v5h-5" />
        <path d="M15 15l6 6" />
        <path d="M4 4l5 5" />
      </svg>
    )
  },
];

export const SOUND_FAVORITES_KEY = 'soundFavorites';

export const createInitialPostState = () => ({
  caption: '',
  audience: 'everyone',
  location: '',
  linkType: '',
  allowComments: true,
  highQuality: true,
  allowDuet: true,
  saveToDevice: true,
  autoCaptions: true,
  audienceControls: true,
  captionLanguage: 'English',
});

export const FILTER_PRESETS = {
  'Normal': 'none',
  'Clarendon': 'contrast(1.2) brightness(1.1) saturate(1.1)',
  'Gingham': 'brightness(1.05) hue-rotate(-10deg)',
  'Moon': 'grayscale(1) contrast(1.1) brightness(1.1)',
  'Lark': 'contrast(0.9) saturate(1.2) brightness(1.1)',
  'Reyes': 'sepia(0.2) contrast(0.85) brightness(1.1) saturate(0.75)',
  'Juno': 'saturate(1.2) contrast(1.1) brightness(1.1) hue-rotate(-10deg)',
  'Slumber': 'saturate(0.66) brightness(1.05)',
  'Crema': 'saturate(0.9) sepia(0.15) contrast(0.95)',
  'Ludwig': 'contrast(1.05) brightness(1.05) saturate(1.1) sepia(0.05)',
  'Aden': 'hue-rotate(20deg) saturate(0.8) brightness(1.2)',
  'Perpetua': 'saturate(1.1) brightness(1.05) hue-rotate(-20deg)',
  'Amper': 'contrast(1.1) saturate(1.1) sepia(0.3) brightness(0.9)',
  '1977': 'sepia(0.5) hue-rotate(-30deg) saturate(1.2) contrast(0.8)',
  'Amaro': 'sepia(0.35) contrast(1.1) brightness(1.1) saturate(1.3)',
  'Brannan': 'sepia(0.5) contrast(1.4)',
  'Brooklyn': 'sepia(0.25) contrast(1.25) brightness(1.25) hue-rotate(5deg)',
  'Earlybird': 'sepia(0.4) contrast(1.2) sepia(0.35)',
  'Hefe': 'contrast(1.5) saturate(1.4) sepia(0.4)',
  'Hudson': 'sepia(0.25) contrast(1.2) brightness(1.2) saturate(1.05) hue-rotate(-15deg)',
  'Inkwell': 'grayscale(1) brightness(1.1) contrast(1.1)',
  'Lo-Fi': 'contrast(1.5) saturate(1.1)',
  'Mayfair': 'contrast(1.1) brightness(1.15) saturate(1.1)',
  'Nashville': 'sepia(0.25) contrast(1.5) brightness(1.05) hue-rotate(-15deg)',
  'Rise': 'sepia(0.25) contrast(1.25) brightness(1.2) saturate(0.9)',
  'Sierra': 'sepia(0.25) contrast(1.5) brightness(0.9) hue-rotate(-15deg)',
  'Sutro': 'sepia(0.4) contrast(1.2) brightness(0.9) saturate(1.4) hue-rotate(-10deg)',
  'Toaster': 'sepia(0.4) contrast(1.5) brightness(0.9) hue-rotate(-15deg)',
  'Valencia': 'sepia(0.25) contrast(1.05) brightness(1.1)',
  'Walden': 'sepia(0.35) contrast(0.8) brightness(1.1) hue-rotate(-10deg)',
  'Willow': 'grayscale(1) contrast(1.2) brightness(0.8) sepia(0.2)',
  'B&W': 'grayscale(1) contrast(1.2)',
  'Vintage': 'sepia(0.5) contrast(1.1) brightness(0.9) saturate(1.3)'
};

export const CATEGORIZED_FILTERS = [
  {
    category: 'Portrait',
    filters: [
      { id: 'Pure', label: 'Pure', filter: 'brightness(1.1) contrast(1.08) saturate(1.15)', thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=140&q=80' },
      { id: 'Bright', label: 'Bright', filter: 'brightness(1.2) contrast(1.1) saturate(1.1)', thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=140&q=80' },
      { id: 'Quality', label: 'Quality', filter: 'contrast(1.15) saturate(1.2) sepia(0.08)', thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=140&q=80' },
      { id: 'Sunset', label: 'Sunset', filter: 'sepia(0.25) saturate(1.3) contrast(1.05) hue-rotate(-10deg)', thumb: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=140&q=80' },
      { id: 'Clean', label: 'Clean', filter: 'contrast(0.95) saturate(1.1) brightness(1.08)', thumb: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=140&q=80' },
      { id: 'Crush', label: 'Crush', filter: 'saturate(1.3) contrast(1.2) hue-rotate(-5deg)', thumb: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=140&q=80' },
      { id: 'Vivid', label: 'Vivid', filter: 'contrast(1.2) saturate(1.4) brightness(1.05)', thumb: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=140&q=80' },
      { id: 'HD', label: 'HD', filter: 'contrast(1.25) brightness(1.05) saturate(1.1)', thumb: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=140&q=80' },
      { id: 'Twilight', label: 'Twilight', filter: 'hue-rotate(15deg) saturate(1.2) brightness(0.95)', thumb: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=140&q=80' },
      { id: 'Solo', label: 'Solo', filter: 'contrast(1.1) sepia(0.15) brightness(1.02)', thumb: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=140&q=80' },
    ],
  },
  {
    category: 'Landscape',
    filters: [
      { id: 'Sunrise', label: 'Sunrise', filter: 'sepia(0.3) saturate(1.4) brightness(1.1)', thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=140&q=80' },
      { id: 'Vibrant', label: 'Vibrant', filter: 'saturate(1.5) contrast(1.2)', thumb: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=140&q=80' },
      { id: 'Cloudy', label: 'Cloudy', filter: 'contrast(0.9) brightness(1.05) saturate(0.85)', thumb: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=140&q=80' },
      { id: 'Dusk', label: 'Dusk', filter: 'hue-rotate(-20deg) saturate(1.3) brightness(0.9)', thumb: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=140&q=80' },
      { id: 'Midnight', label: 'Midnight', filter: 'contrast(1.3) brightness(0.8) hue-rotate(180deg) saturate(0.8)', thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=140&q=80' },
      { id: 'Fog', label: 'Fog', filter: 'contrast(0.8) brightness(1.15) saturate(0.7)', thumb: 'https://images.unsplash.com/photo-1485470733090-0aae1788d5af?auto=format&fit=crop&w=140&q=80' },
    ],
  },
  {
    category: 'Food',
    filters: [
      { id: 'Fresh', label: 'Fresh', filter: 'saturate(1.4) brightness(1.1) contrast(1.05)', thumb: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=140&q=80' },
      { id: 'Cheese', label: 'Cheese', filter: 'sepia(0.2) saturate(1.3) brightness(1.05)', thumb: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=140&q=80' },
      { id: 'Sea Salt', label: 'Sea Salt', filter: 'hue-rotate(10deg) saturate(1.1) brightness(1.08)', thumb: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=140&q=80' },
      { id: 'Berry', label: 'Berry', filter: 'saturate(1.5) hue-rotate(-15deg) contrast(1.1)', thumb: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=140&q=80' },
    ],
  },
  {
    category: 'Life',
    filters: [
      { id: 'Warm', label: 'Warm', filter: 'sepia(0.25) brightness(1.05) saturate(1.1)', thumb: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=140&q=80' },
      { id: 'Cozy', label: 'Cozy', filter: 'sepia(0.35) contrast(0.95) brightness(1.02)', thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=140&q=80' },
      { id: 'Urban', label: 'Urban', filter: 'contrast(1.2) saturate(0.85) brightness(0.95)', thumb: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=140&q=80' },
      { id: 'Vibe', label: 'Vibe', filter: 'hue-rotate(25deg) saturate(1.2) contrast(1.1)', thumb: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=140&q=80' },
      { id: 'Soft', label: 'Soft', filter: 'brightness(1.1) contrast(0.9) saturate(0.95)', thumb: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=140&q=80' },
    ],
  },
  {
    category: 'Retro',
    filters: [
      { id: 'Vintage', label: 'Vintage', filter: 'sepia(0.5) contrast(1.1) brightness(0.9) saturate(1.3)', thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=140&q=80' },
      { id: '1980s', label: '1980s', filter: 'hue-rotate(-30deg) saturate(1.4) contrast(1.2)', thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=140&q=80' },
      { id: 'Film', label: 'Film', filter: 'sepia(0.3) contrast(1.25) brightness(1.05) saturate(0.9)', thumb: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=140&q=80' },
      { id: 'Sepia', label: 'Sepia', filter: 'sepia(0.7) contrast(1.1)', thumb: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=140&q=80' },
      { id: 'Classic', label: 'Classic', filter: 'sepia(0.2) contrast(1.2) saturate(1.1)', thumb: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=140&q=80' },
    ],
  },
  {
    category: 'Limit',
    filters: [
      { id: 'FisheyeColor', label: 'Fisheye', filter: 'saturate(1.4) contrast(1.25) brightness(1.05)', thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=140&q=80' },
      { id: 'Cyberpunk', label: 'Cyberpunk', filter: 'hue-rotate(140deg) saturate(1.5) contrast(1.2)', thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=140&q=80' },
      { id: 'Glitch', label: 'Glitch', filter: 'contrast(1.4) hue-rotate(90deg) saturate(1.6)', thumb: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=140&q=80' },
      { id: 'Neon', label: 'Neon', filter: 'saturate(2) contrast(1.3) brightness(1.1)', thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=140&q=80' },
    ],
  },
  {
    category: 'B&W',
    filters: [
      { id: 'Fisheye', label: 'Fisheye', filter: 'grayscale(1) contrast(1.4) brightness(0.95)', thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=140&q=80' },
      { id: 'Darkroom', label: 'Darkroom', filter: 'grayscale(1) contrast(1.6) brightness(0.85)', thumb: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=140&q=80' },
      { id: 'Old Movie', label: 'Old Movie', filter: 'grayscale(1) sepia(0.2) contrast(1.3) brightness(0.9)', thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=140&q=80' },
      { id: 'Mirage', label: 'Mirage', filter: 'grayscale(1) brightness(1.15) contrast(0.9)', thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=140&q=80' },
      { id: 'Mono', label: 'Mono', filter: 'grayscale(1) contrast(1.1) brightness(1.0)', thumb: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=140&q=80' },
      { id: 'B&W', label: 'B&W', filter: 'grayscale(1) contrast(1.2)', thumb: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=140&q=80' },
      { id: 'Moon', label: 'Moon', filter: 'grayscale(1) contrast(1.1) brightness(1.1)', thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=140&q=80' },
      { id: 'Inkwell', label: 'Inkwell', filter: 'grayscale(1) brightness(1.1) contrast(1.2)', thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=140&q=80' },
      { id: 'Willow', label: 'Willow', filter: 'grayscale(1) contrast(1.2) brightness(0.8) sepia(0.2)', thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=140&q=80' },
    ],
  },
];

export const ALL_FILTERS_MAP = {
  ...FILTER_PRESETS,
  ...Object.fromEntries(
    CATEGORIZED_FILTERS.flatMap((c) => c.filters.map((f) => [f.id, f.filter]))
  ),
};

export const FONT_OPTIONS = [
  { name: 'Classic', family: 'serif' },
  { name: 'Modern', family: 'sans-serif' },
  { name: 'Serif', family: "'Source Serif Pro', serif" },
  { name: 'Bold', family: "'Outfit', sans-serif" },
  { name: 'Typewriter', family: "'Courier New', monospace" },
  { name: 'Italic', family: 'italic' },
  { name: 'Script', family: 'cursive' },
  { name: 'Impact', family: 'Impact' },
  { name: 'Cursive', family: "'Brush Script MT', cursive" },
  { name: 'Groovy', family: "'Comic Sans MS', cursive" },
  { name: 'Elegant', family: 'Georgia' },
  { name: 'Digital', family: 'monospace' },
  { name: 'Narrow', family: "'Arial Narrow', sans-serif" },
  { name: 'Wide', family: 'Verdana' },
  { name: 'Vintage', family: 'Palatino' },
  { name: 'System', family: 'system-ui' },
  { name: 'Round', family: "'Varela Round', sans-serif" },
  { name: 'Sharp', family: 'Tahoma' },
  { name: 'Soft', family: 'Trebuchet MS' },
  { name: 'Playful', family: 'Chalkboard SE' },
  { name: 'Antique', family: 'Bookman' },
  { name: 'Blocky', family: 'Arial Black' },
  { name: 'Thin', family: "'Helvetica Neue', sans-serif" },
  { name: 'Outline', family: 'sans-serif' },
  { name: 'Glowing', family: 'sans-serif' }
];

export const COLOR_OPTIONS = [
  '#ffffff', '#000000', '#fe2c55', '#ffcc00', '#4285f4', '#34a853', '#9b51e0',
  '#ff4d6d', '#ff9f1c', '#2ec4b6', '#e71d36', '#011627', '#fdfffc', '#2196f3',
  '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107'
];

export const MOCK_STICKERS = [
  '🔥', '❤️', '😂', '👍', '🎉', '🌟', '💎', '🌈', '🍦', '🍕', 
  '🐶', '🐱', '🦋', '🌸', '⚡', '🎵', '📍', '💯', '✨', '🎁',
  '🤟', '👀', '👽', '👻', '🤖', '👑', '💄', '🔥', '💥', '🎈'
];

export const PREVIEW_TOOLS = [
  { id: 'edit', label: 'Edit' },
  { id: 'text', label: 'Text' },
  { id: 'speed', label: 'Speed' },
  { id: 'mute', label: 'Mute' },
  { id: 'stickers', label: 'Stickers' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'volume', label: 'Volume' },
];

export const DEFAULT_ADJUSTMENTS = {
  autoAdjust: 0,
  brightness: 0,
  contrast: 0,
  saturate: 0,
  brilliance: 0,
  sharpness: 0,
  hueRotate: 0,
  shadow: 0,
  temp: 0,
  tint: 0,
  fade: 0,
  vignette: 0,
  grain: 0,
  blur: 0,
  opacity: 100,
  grayscale: 0,
  sepia: 0,
  invert: 0,
};


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
  { id: 'filters', label: 'Filters' },
  { id: 'speed', label: 'Speed' },
  { id: 'mute', label: 'Mute' },
  { id: 'stickers', label: 'Stickers' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'volume', label: 'Volume' },
];

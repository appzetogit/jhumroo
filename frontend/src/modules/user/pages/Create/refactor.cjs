const fs = require('fs');
const path = 'e:/Company Projects/Jhumroo/frontend/src/modules/user/pages/Create/CreatePage.jsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const newLines = [
  ...lines.slice(0, 52),
  "import { SOUND_FAVORITES_KEY, createInitialPostState, FILTER_PRESETS, FONT_OPTIONS, COLOR_OPTIONS, MOCK_STICKERS, PREVIEW_TOOLS } from './utils/createConstants';",
  "import { formatElapsed, parseDurationSeconds, readSoundFavorites } from './utils/createUtils';",
  "import { initDB, saveVideoToCache, getVideoFromCache, saveSequenceToCache, getSequenceFromCache, clearVideoCache } from './services/videoCacheService';",
  "import { sheetOverlayClass, Toggle, BottomSheet, CenterModal } from './components/SharedUI';",
  "import { DynamicAudioDuration, MediaPreview, DraggableOverlay, TimelineThumbnail } from './components/MediaComponents';",
  ...lines.slice(309, 371),
  ...lines.slice(568)
];
fs.writeFileSync(path, newLines.join('\n'));

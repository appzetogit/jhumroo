import React, { useEffect, useLayoutEffect, useMemo, useState, useRef, memo, useCallback } from 'react';
import axios from 'axios';
import Instacam from 'instacam';
import {
  BiAt,
  BiCheck,
  BiChevronDown,
  BiChevronLeft,
  BiChevronRight,
  BiImageAlt,
  BiLinkAlt,
  BiMicrophone,
  BiMusic,
  BiPlay,
  BiPlus,
  BiRefresh,
  BiSearch,
  BiSliderAlt,
  BiTrash,
  BiVolumeFull,
  BiVolumeMute,
  BiWorld,
  BiX,
  BiBookmark,
  BiSolidBookmark,
  BiDownload,
  BiUndo,
  BiRedo,
  BiPause,
  BiSlider,
  BiCrop,
  BiExpand,
} from 'react-icons/bi';
import {
  IoCameraReverseOutline,
  IoColorWandOutline,
  IoLocationOutline,
  IoOptionsOutline,
  IoPlaySkipForwardOutline,
  IoSparklesOutline,
  IoTextOutline,
  IoTimerOutline,
  IoVideocamOutline,
  IoVolumeHighOutline,
} from 'react-icons/io5';
import { FiScissors } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import reelService from '../../../../services/reelService';
import userService from '../../../../services/userService';
import followService from '../../../../services/followService';
import audioService from '../../../../services/audioService';
import { SOUND_FAVORITES_KEY, createInitialPostState, FILTER_PRESETS, FONT_OPTIONS, COLOR_OPTIONS, MOCK_STICKERS, PREVIEW_TOOLS } from './utils/createConstants';
import { formatElapsed, parseDurationSeconds, readSoundFavorites } from './utils/createUtils';
import { initDB, saveVideoToCache, getVideoFromCache, saveSequenceToCache, getSequenceFromCache, clearVideoCache } from './services/videoCacheService';
import { sheetOverlayClass, Toggle, BottomSheet, CenterModal } from './components/SharedUI';
import { DynamicAudioDuration, MediaPreview, DraggableOverlay, TimelineThumbnail } from './components/MediaComponents';
const getToolIcon = (toolId, size = 22, isMuted = false, selectedSpeed = '1x', selectedZoom = '1x') => {
  switch (toolId) {
    case 'flip':
      return <BiRefresh size={size + 1} />;
    case 'speed':
      return <span className="text-[13px] font-black leading-none tracking-tight">{selectedSpeed}</span>;
    case 'zoom':
      return <span className="text-[13px] font-black leading-none tracking-tight">{selectedZoom}</span>;
    case 'timer':
      return (
        <span className="relative flex items-center justify-center">
          <IoTimerOutline size={size} />
          <span className="absolute -bottom-[2px] -right-[5px] text-[9px] font-black leading-none">3</span>
        </span>
      );
    case 'filters':
      return (
        <span className="relative block h-[18px] w-[18px]">
          <span className="absolute left-0 top-[5px] h-2.5 w-2.5 rounded-full bg-current" />
          <span className="absolute right-0 top-[5px] h-2.5 w-2.5 rounded-full bg-current opacity-90" />
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-current opacity-80" />
        </span>
      );

    case 'text':
      return <IoTextOutline size={size} />;
    case 'stickers':
      return <IoSparklesOutline size={size} />;
    case 'effects':
      return <IoColorWandOutline size={size} />;
    case 'editor':
      return <IoVideocamOutline size={size} />;
    case 'captions':
      return <IoTextOutline size={size} />;
    case 'noise':
      return <BiVolumeFull size={size} />;
    case 'audio':
      return <BiMicrophone size={size} />;
    case 'enhance':
      return <IoSparklesOutline size={size} />;
    case 'privacy':
      return <BiWorld size={size} />;
    case 'split':
      return <FiScissors size={size - 2} />;
    case 'volume':
      return <BiVolumeFull size={size} />;
    case 'rotate':
      return <IoCameraReverseOutline size={size} />;
    case 'delete':
      return <BiTrash size={size} />;
    case 'sync':
      return <BiMusic size={size} />;
    case 'edit':
      return <BiSliderAlt size={size} />;
    case 'sound':
      return <BiMusic size={size} />;
    case 'mute':
      return isMuted ? <BiVolumeMute size={size} /> : <BiVolumeFull size={size} />;
    case 'overlay':
      return <BiImageAlt size={size} />;
    default:
      return <IoOptionsOutline size={size} />;
  }
};
const CreatePage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const [duetVideo, setDuetVideo] = useState(() => {
    return location.state?.duetVideo || null;
  });
  const [isDuetMuted, setIsDuetMuted] = useState(false);
  const duetVideoPlayerRef = useRef(null);
  const duetPreviewVideoPlayerRef = useRef(null);
  const { config } = useAppContent();
  const { user } = useAuth();
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoAction, setVideoAction] = useState('none');
  const [videoThumbnails, setVideoThumbnails] = useState([]);
  const [clipSequence, setClipSequence] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Track clipSequence changes for Undo/Redo history
  useEffect(() => {
    if (clipSequence.length === 0) return;
    setHistory(prev => {
      const currentHistoryState = prev[historyIndex];
      if (currentHistoryState && JSON.stringify(currentHistoryState) === JSON.stringify(clipSequence)) {
        return prev;
      }
      const nextHistory = prev.slice(0, historyIndex + 1);
      const updatedHistory = [...nextHistory, clipSequence];
      setHistoryIndex(updatedHistory.length - 1);
      return updatedHistory;
    });
  }, [clipSequence]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setClipSequence(history[nextIndex]);
      showToast('Undo');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setClipSequence(history[nextIndex]);
      showToast('Redo');
    }
  };
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [currentPreviewClipIndex, setCurrentPreviewClipIndex] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const editorVideoRef = useRef(null);
  const [isEditorPlaying, setIsEditorPlaying] = useState(false);
  const [editorSpeed, setEditorSpeed] = useState(1);
  const [applyToAll, setApplyToAll] = useState(false);

  const mediaRecorderRef = useRef(null);
  const autoConfirmOnStopRef = useRef(false);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const fontSizeSliderRef = useRef(null);
  const previewVideoRef = useRef(null);
  const audioRef = useRef(null);
  const overlayInputRef = useRef(null);
  const canvasRef = useRef(null);
  const instacamRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const zoomRafRef = useRef(null);
  const pressStartTimeRef = useRef(0);
  const isPressingRef = useRef(false);
  const lastTouchTimeRef = useRef(0);
  const pinchZoomRef = useRef({ active: false, startDist: 0, startZoom: 1 });
  const cameraStageRef = useRef(null);
  const cameraPinchHandlersRef = useRef(null);
  const createFlow = config?.createFlow || {};
  const DURATION_OPTIONS = createFlow.durations || ['15s', '30s', '60s'];
  const SPEED_OPTIONS = createFlow.speeds || ['0.3x', '0.5x', '1x', '2x', '3x'];
  const ZOOM_OPTIONS = createFlow.zooms || ['1x', '2x', '3x', '5x'];
  const CREATE_CANVAS_IMAGE = createFlow.canvasImage || '';
  const CREATE_GALLERY_ITEMS = createFlow.galleryItems || [];
  const CREATE_FILTER_GROUPS = (createFlow.filters && createFlow.filters.length > 0) ? createFlow.filters : [
    {
      id: 'instacam',
      label: 'Instacam',
      filters: Object.keys(FILTER_PRESETS)
    }
  ];
  const CREATE_SOUND_LIBRARY = createFlow.sounds || [];
  const CREATE_LOCATION_CHIPS = createFlow.locations?.chips || [];
  const CREATE_LOCATION_RESULTS = createFlow.locations?.results || [];
  const CREATE_HASHTAG_SUGGESTIONS = createFlow.hashtagSuggestions || [];
  const CREATE_LINK_OPTIONS = createFlow.linkOptions || [];
  const CREATE_AUDIENCE_OPTIONS = [
    { id: 'everyone', label: 'Everyone', subtitle: 'Anyone on Jhumroo can see this video' },
    { id: 'followers', label: 'Followers', subtitle: 'Only your followers can see this video' },
    { id: 'following', label: 'Following', subtitle: 'Only people you follow can see this video' },
  ];
  const CREATE_SHARE_TARGETS = createFlow.shareTargets || [];
  const CREATE_SIDE_TOOLS = createFlow.sideTools || [];
  const CREATE_PREVIEW_TOOLS = createFlow.previewTools || [];
  const CREATE_EDITOR_ACTIONS = createFlow.editorActions || [];
  const CREATE_EDITOR_PRIMARY_TABS = createFlow.editorPrimaryTabs || [];

  const PREVIEW_TOOLS = [
    { id: 'edit', label: 'Edit' },
    { id: 'text', label: 'Text' },
    { id: 'filters', label: 'Filters' },
    { id: 'speed', label: 'Speed' },
    { id: 'mute', label: 'Mute' },
    { id: 'stickers', label: 'Stickers' },
    { id: 'overlay', label: 'Overlay' },
    { id: 'volume', label: 'Volume' },
  ];
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [selectedZoom, setSelectedZoom] = useState('1x');
  const [overlayText, setOverlayText] = useState(() => {
    return localStorage.getItem('create_overlayText') || '';
  });
  const [textList, setTextList] = useState(() => {
    const saved = localStorage.getItem('create_textList');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [overlayFont, setOverlayFont] = useState(() => {
    return localStorage.getItem('create_overlayFont') || 'Classic';
  });
  const [overlayColor, setOverlayColor] = useState(() => {
    return localStorage.getItem('create_overlayColor') || '#ffffff';
  });
  const [isEditingText, setIsEditingText] = useState(false);
  const [overlayFontSize, setOverlayFontSize] = useState(() => {
    return Number(localStorage.getItem('create_overlayFontSize')) || 24;
  });
  const [textPos, setTextPos] = useState(() => {
    const saved = localStorage.getItem('create_textPos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [textRotation, setTextRotation] = useState(() => {
    return Number(localStorage.getItem('create_textRotation')) || 0;
  });

  const FONT_OPTIONS = [
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

  const COLOR_OPTIONS = [
    '#ffffff', '#000000', '#fe2c55', '#ffcc00', '#4285f4', '#34a853', '#9b51e0',
    '#ff4d6d', '#ff9f1c', '#2ec4b6', '#e71d36', '#011627', '#fdfffc', '#2196f3',
    '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107'
  ];
  const [stageStack, setStageStack] = useState(() => {
    try {
      const saved = localStorage.getItem('create_stageStack');
      const parsed = saved ? JSON.parse(saved) : ['camera'];
      const filtered = (Array.isArray(parsed) && parsed.length > 0) ? parsed : ['camera'];
      return filtered.filter(s => s !== 'sound-editor');
    } catch {
      return ['camera'];
    }
  });
  const stage = stageStack[stageStack.length - 1];
  const [activeSheet, setActiveSheet] = useState(null);
  const [activeCameraTool, setActiveCameraTool] = useState(null);
  const [recordStatus, setRecordStatus] = useState(() => {
    return localStorage.getItem('create_recordStatus') || 'idle';
  });
  const [recordedSeconds, setRecordedSeconds] = useState(() => {
    return Number(localStorage.getItem('create_recordedSeconds')) || 0;
  });
  const [selectedDuration, setSelectedDuration] = useState('15s');
  const [selectedSpeed, setSelectedSpeed] = useState('1x');
  const [activeCountdown, setActiveCountdown] = useState(null);
  const [selectedCountdown, setSelectedCountdown] = useState('3s');
  const [countdownLength, setCountdownLength] = useState(8.9);
  const [isTimerRecording, setIsTimerRecording] = useState(false);
  const [captureMode, setCaptureMode] = useState('camera');
  const [facingMode, setFacingMode] = useState('environment');
  const [activeFilterGroup, setActiveFilterGroup] = useState('instacam');
  const [selectedFilter, setSelectedFilter] = useState('Normal');
  const [filterPreviewFrame, setFilterPreviewFrame] = useState(null);
  const filterSnapshotCanvasRef = useRef(null);
  const [selectedSounds, setSelectedSounds] = useState(() => {
    const saved = localStorage.getItem('create_selectedSounds');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingSoundIndex, setEditingSoundIndex] = useState(-1);
  const selectedSound = editingSoundIndex >= 0 ? selectedSounds[editingSoundIndex] : (selectedSounds[0] || { id: 'sound-original', title: 'Original sound', artist: 'Original Audio', duration: '00:00', cover: '' });

  const [editorTab, setEditorTab] = useState('edit');
  const [editorAction, setEditorAction] = useState('speed');
  const [focusedTrack, setFocusedTrack] = useState(null); // 'video' or null
  const [cropAspectRatio, setCropAspectRatio] = useState('9:16');
  const [editorSubPanel, setEditorSubPanel] = useState(null); // 'speed' | 'crop' | null
  const [cropScale, setCropScale] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [cropRotation, setCropRotation] = useState(0);
  const [initialCropSettings, setInitialCropSettings] = useState(null);
  const initialTouchDistanceRef = useRef(0);
  const initialTouchScaleRef = useRef(1);
  const initialTouchAngleRef = useRef(0);
  const initialTouchRotationRef = useRef(0);
  const isPinchingRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const initialPanRef = useRef({ x: 0, y: 0 });
  const cropContainerRef = useRef(null);
  const cropHandlersRef = useRef(null);
  const [editorSettings, setEditorSettings] = useState({
    speed: 1,
    volume: 100,
    rotation: 0,
    clipLength: 7.2,
  });
  const [showExpandedPreviewTools, setShowExpandedPreviewTools] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [postState, setPostState] = useState(() => {
    const saved = localStorage.getItem('create_postState');
    return saved ? JSON.parse(saved) : createInitialPostState();
  });
  const [tagInfoSeen, setTagInfoSeen] = useState(false);
  const [selectedLocationQuery, setSelectedLocationQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [storyAllowComments, setStoryAllowComments] = useState(true);
  const [syncingSound, setSyncingSound] = useState(false);
  const [soundBrowserTab, setSoundBrowserTab] = useState('recommended');
  const [favoriteSoundTitles, setFavoriteSoundTitles] = useState(() => readSoundFavorites());
  const [activeStickers, setActiveStickers] = useState(() => {
    const saved = localStorage.getItem('create_activeStickers');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeOverlays, setActiveOverlays] = useState(() => {
    const saved = localStorage.getItem('create_activeOverlays');
    return saved ? JSON.parse(saved) : [];
  });
  const [libraryAudios, setLibraryAudios] = useState([]);
  const [savedAudiosList, setSavedAudiosList] = useState([]);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [editorSound, setEditorSound] = useState(null);
  const [editorSoundMaxSec, setEditorSoundMaxSec] = useState(60); // actual detected duration
  const [clipDuration, setClipDuration] = useState(15);
  const [clipStart, setClipStart] = useState(0);
  const audioPreviewRef = useRef(null);
  const secondsPickerRef = useRef(null);
  const secondsPickerDragging = useRef(false);
  const secondsPickerStartY = useRef(0);
  const secondsPickerScrollTop = useRef(0);
  const recordingAudioRef = useRef(null);
  const previewAudiosRef = useRef([]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isUploading, setUploading] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(null); // user-selected or auto-generated cover
  const [coverImageFile, setCoverImageFile] = useState(null);
  const coverInputRef = useRef(null);
  const ignoreScrollRef = useRef(false);
  const [textStartTime, setTextStartTime] = useState(0);
  const [textEndTime, setTextEndTime] = useState(5); // Default 5 seconds
  // Refs for stable access inside drag handlers (avoids stale closures)
  const textStartTimeRef = useRef(0);
  const textEndTimeRef = useRef(5);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [isTextTrackSelected, setIsTextTrackSelected] = useState(false); // timeline clip selection
  const textListRef = useRef(textList);
  useEffect(() => { textListRef.current = textList; }, [textList]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState(null);
  const [voiceRecorder, setVoiceRecorder] = useState(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState(null);
  const [isVoicePreviewPlaying, setIsVoicePreviewPlaying] = useState(false);
  const voicePreviewAudioRef = useRef(null);
  const [originalVolume, setOriginalVolume] = useState(100);
  const [addedVolume, setAddedVolume] = useState(100);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState(0);
  const [voiceMaxDuration, setVoiceMaxDuration] = useState(0);
  const [voiceClipStart, setVoiceClipStart] = useState(0);
  const voiceTimerIntervalRef = useRef(null);
  const [mergedVideoBlob, setMergedVideoBlob] = useState(null);
  const [imageAdjustments, setImageAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hueRotate: 0,
    invert: 0,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    opacity: 100
  });

  const getCombinedFilter = () => {
    const base = selectedFilter === 'Normal' ? '' : (FILTER_PRESETS[selectedFilter] || '');
    const adj = `brightness(${imageAdjustments.brightness}%) contrast(${imageAdjustments.contrast}%) saturate(${imageAdjustments.saturate}%) hue-rotate(${imageAdjustments.hueRotate}deg) invert(${imageAdjustments.invert}%) grayscale(${imageAdjustments.grayscale}%) sepia(${imageAdjustments.sepia}%) blur(${imageAdjustments.blur}px) opacity(${imageAdjustments.opacity}%)`;
    return `${base} ${adj}`.trim() || 'none';
  };

  // Ensure background audio is cleaned up on unmount
  useEffect(() => {
    return () => {
      if (recordingAudioRef.current) {
        recordingAudioRef.current.pause();
        recordingAudioRef.current = null;
      }
    };
  }, []);

  // Synchronize muting and volume for recording audio dynamically
  useEffect(() => {
    if (recordingAudioRef.current) {
      recordingAudioRef.current.muted = isMusicMuted || addedVolume === 0;
      recordingAudioRef.current.volume = addedVolume / 100;
    }
  }, [isMusicMuted, addedVolume]);

  // Camera stage background music preview (Disabled per user request - music only plays when recording starts)
  const cameraPreviewAudioRef = useRef(null);
  useEffect(() => {
    // Stop camera preview audio if it was somehow playing
    if (cameraPreviewAudioRef.current) {
      cameraPreviewAudioRef.current.pause();
      cameraPreviewAudioRef.current = null;
    }

    return () => {
      if (cameraPreviewAudioRef.current) {
        cameraPreviewAudioRef.current.pause();
        cameraPreviewAudioRef.current = null;
      }
    };
  }, [stageStack, recordStatus]);

  // Sync mute/volume for camera preview audio dynamically (no-op since preview is disabled)
  useEffect(() => {
    if (cameraPreviewAudioRef.current) {
      cameraPreviewAudioRef.current.muted = isMusicMuted || addedVolume === 0;
      cameraPreviewAudioRef.current.volume = addedVolume / 100;
    }
  }, [isMusicMuted, addedVolume]);

  // Play sound during preview
  useEffect(() => {
    const savedSound = localStorage.getItem('selectedSound');
    if (savedSound) {
      try {
        const sound = JSON.parse(savedSound);
        setSelectedSounds([sound]);
        localStorage.removeItem('selectedSound');
      } catch (err) {
        console.error('Error parsing selectedSound from localStorage:', err);
      }
    }
  }, []);

  // Play sound during preview
  useEffect(() => {
    const currentStage = stageStack[stageStack.length - 1];

    // Clear any existing preview audios
    previewAudiosRef.current.forEach(audio => {
      if (audio) audio.pause();
    });
    previewAudiosRef.current = [];

    if (currentStage === 'preview' && selectedSounds.length > 0) {
      selectedSounds.forEach((sound) => {
        const url = sound.url || sound.audioUrl;
        if (!url) return;

        const audio = new Audio(url);
        // Loop background music, but do not loop voiceover
        audio.loop = sound.title !== 'Voiceover';
        audio.muted = isMuted || (sound.title === 'Voiceover' ? false : isMusicMuted) || (sound.title === 'Voiceover' ? false : addedVolume === 0);
        audio.volume = sound.title === 'Voiceover' ? 1.0 : (addedVolume / 100);

        // Trim sound to its edited duration
        audio.addEventListener('timeupdate', () => {
          const startSec = sound.clipStart || 0;
          const durationSec = sound.clipDuration || 15;
          const endSec = startSec + durationSec;
          if (audio.currentTime >= endSec) {
            if (sound.title === 'Voiceover') {
              audio.pause();
              audio.currentTime = startSec;
            } else {
              audio.currentTime = startSec;
            }
          }
        });

        const onCanPlay = () => {
          audio.currentTime = sound.clipStart || 0;
          audio.play().catch(err => {
            if (err.name !== 'AbortError') console.error("Preview audio playback failed:", err);
          });
        };

        audio.addEventListener('canplay', onCanPlay, { once: true });
        previewAudiosRef.current.push(audio);
      });
    }

    return () => {
      previewAudiosRef.current.forEach(audio => {
        if (audio) audio.pause();
      });
      previewAudiosRef.current = [];
    };
  }, [stageStack, selectedSounds, isMuted, isMusicMuted, addedVolume]);

  // Synchronize muting for preview audio elements dynamically
  useEffect(() => {
    previewAudiosRef.current.forEach((audio, idx) => {
      const sound = selectedSounds[idx];
      if (audio && sound) {
        audio.muted = isMuted || (sound.title === 'Voiceover' ? false : isMusicMuted) || (sound.title === 'Voiceover' ? false : addedVolume === 0);
        audio.volume = sound.title === 'Voiceover' ? 1.0 : (addedVolume / 100);
      }
    });
  }, [isMuted, isMusicMuted, addedVolume, selectedSounds]);

  // Handle Editor Video Playback Safely
  useEffect(() => {
    if (stage === 'editor' && editorVideoRef.current) {
      if (isEditorPlaying) {
        editorVideoRef.current.play().catch(err => {
          if (err.name !== 'AbortError') console.warn("Editor video play failed:", err);
        });
      } else {
        editorVideoRef.current.pause();
      }
    }
  }, [isEditorPlaying, stage, currentClipIndex]);

  // Handle Preview Video Playback Safely
  useEffect(() => {
    if (stage === 'preview' && previewVideoRef.current) {
      previewVideoRef.current.play().catch(err => {
        if (err.name !== 'AbortError') console.warn("Preview video play failed:", err);
      });
    }
  }, [stage, previewUrl]);

  // Synchronize original duet video playback in preview stage
  useEffect(() => {
    const mainVideo = previewVideoRef.current;
    const duetVideoEl = duetPreviewVideoPlayerRef.current;
    if (!mainVideo || !duetVideoEl || stage !== 'preview') return;

    const handlePlay = () => {
      duetVideoEl.play().catch(err => console.warn("Failed to play duet preview video:", err));
    };

    const handlePause = () => {
      duetVideoEl.pause();
    };

    const handleTimeUpdate = () => {
      const diff = Math.abs(duetVideoEl.currentTime - mainVideo.currentTime);
      if (diff > 0.2) {
        duetVideoEl.currentTime = mainVideo.currentTime;
      }
    };

    const handleSeeking = () => {
      duetVideoEl.currentTime = mainVideo.currentTime;
    };

    mainVideo.addEventListener('play', handlePlay);
    mainVideo.addEventListener('pause', handlePause);
    mainVideo.addEventListener('timeupdate', handleTimeUpdate);
    mainVideo.addEventListener('seeking', handleSeeking);

    if (!mainVideo.paused) {
      handlePlay();
    }

    return () => {
      mainVideo.removeEventListener('play', handlePlay);
      mainVideo.removeEventListener('pause', handlePause);
      mainVideo.removeEventListener('timeupdate', handleTimeUpdate);
      mainVideo.removeEventListener('seeking', handleSeeking);
    };
  }, [stage, previewUrl, duetVideo]);

  // Sync audio playback position when clipStart changes
  useEffect(() => {
    const currentStage = stageStack[stageStack.length - 1];
    if (playingAudioId && audioPreviewRef.current && currentStage === 'sound-editor') {
      audioPreviewRef.current.currentTime = clipStart;
    }
  }, [clipStart, playingAudioId, stageStack]);

  // Auto-play music when sound-editor stage becomes active
  useEffect(() => {
    const currentStage = stageStack[stageStack.length - 1];
    if (currentStage === 'sound-editor' && editorSound) {
      // Small delay to let the stage render first
      const t = setTimeout(() => {
        if (audioPreviewRef.current) return; // already playing
        const url = editorSound.url || editorSound.audioUrl;
        if (!url) return;
        const newAudio = new Audio(url);
        newAudio.currentTime = editorSound.clipStart || 0;
        newAudio.play().catch(() => {});
        newAudio.onended = () => setPlayingAudioId(null);
        audioPreviewRef.current = newAudio;
        setPlayingAudioId(editorSound._id || editorSound.id);
      }, 200);
      return () => clearTimeout(t);
    } else {
      // Leaving sound-editor — stop any playing preview audio
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
        setPlayingAudioId(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageStack, editorSound?.id]);

  // Detect real audio duration when editorSound changes (for clip duration picker)
  useEffect(() => {
    if (!editorSound) return;
    const parsedDur = typeof editorSound.duration === 'number'
      ? editorSound.duration
      : parseDurationSeconds(editorSound.duration);
    if (parsedDur && parsedDur > 1) {
      setEditorSoundMaxSec(Math.floor(parsedDur));
      return;
    }
    // duration missing or 0 — detect from audio metadata
    const url = editorSound.url || editorSound.audioUrl;
    if (!url) { setEditorSoundMaxSec(60); return; }
    const probe = new Audio(url);
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const d = Math.floor(probe.duration);
      if (d && isFinite(d) && d > 0) {
        setEditorSoundMaxSec(d);
        setClipDuration(prev => Math.min(prev, d));
      } else {
        setEditorSoundMaxSec(60);
      }
      probe.src = '';
    };
    probe.onerror = () => { setEditorSoundMaxSec(60); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorSound?.id, editorSound?.url]);

  // Keep text timing refs in sync with state (used in drag handlers to avoid stale closures)
  useEffect(() => { textStartTimeRef.current = textStartTime; }, [textStartTime]);
  useEffect(() => { textEndTimeRef.current = textEndTime; }, [textEndTime]);

  // Prevent page zoom and scroll
  useEffect(() => {
    const preventZoom = (e) => {
      // Prevent multi-finger gestures (pinch zoom)
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleWheel = (e) => {
      // Prevent Ctrl + Wheel zoom
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', preventZoom, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', preventZoom);
    };
  }, []);

  useEffect(() => {
    let timerId;
    const fetchAudios = async () => {
      try {
        // Migrate legacy favorites from localStorage if any exist
        try {
          const legacyFavorites = JSON.parse(localStorage.getItem('soundFavorites') || '[]');
          if (Array.isArray(legacyFavorites) && legacyFavorites.length > 0) {
            for (const title of legacyFavorites) {
              const audios = await audioService.getAllAudios({ q: title }).catch(() => []);
              const match = audios.find(a => a.title.toLowerCase() === title.toLowerCase());
              if (match && !match.isSaved) {
                await audioService.toggleSaveAudio(match._id || match.id).catch(() => {});
              }
            }
            localStorage.removeItem('soundFavorites');
          }
        } catch (migrationError) {
          console.error('Failed to migrate legacy favorites:', migrationError);
        }

        // getAllAudios already returns isSaved per user (via optionalAuth on backend)
        // getSavedAudios is fetched separately as a safety fallback
        const [allAudios, savedAudios] = await Promise.all([
          audioService.getAllAudios().catch(() => []),
          audioService.getSavedAudios().catch(() => [])
        ]);
        const base = Array.isArray(allAudios) ? allAudios : [];
        const saved = Array.isArray(savedAudios) ? savedAudios : [];

        const savedIds = new Set(
          saved.map(a => (a._id || a.id)?.toString())
        );

        const mergedBase = base.map(audio => ({
          ...audio,
          isSaved: savedIds.has((audio._id || audio.id)?.toString())
        }));

        setLibraryAudios(mergedBase);
        setSavedAudiosList(saved.map(a => ({ ...a, isSaved: true })));
      } catch (err) {
        console.error('Failed to fetch audios:', err);
      }
    };
    fetchAudios();

    const fetchDuetReel = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const duetId = searchParams.get('duet');
      if (duetId && !duetVideo) {
        try {
          const res = await reelService.getReelById(duetId);
          if (res?.data?.success && res?.data?.reel) {
            setDuetVideo(res.data.reel);
          }
        } catch (err) {
          console.error("Failed to fetch duet video:", err);
        }
      }
    };
    fetchDuetReel();

    // Restore video from IndexedDB on mount
    const restoreVideo = async () => {
      try {
        const cachedSequence = await getSequenceFromCache();
        if (cachedSequence && cachedSequence.length > 0) {
          const hydratedSequence = cachedSequence.map(item => ({
            ...item,
            url: URL.createObjectURL(item.file),
            startOffset: item.startOffset !== undefined ? item.startOffset : 0,
            limitStart: item.limitStart !== undefined ? item.limitStart : 0,
            limitEnd: item.limitEnd !== undefined ? item.limitEnd : item.duration
          }));
          setClipSequence(hydratedSequence);
          setVideoDuration(hydratedSequence.reduce((a, c) => a + c.duration, 0));
          setVideoFile(hydratedSequence[0].file);
          setPreviewUrl(hydratedSequence[0].url);
          return;
        }

        const cachedVideo = await getVideoFromCache();
        if (cachedVideo) {
          setVideoFile(cachedVideo);
          setPreviewUrl(URL.createObjectURL(cachedVideo));
        } else {
          // Starting fresh (no video cache found) - Clear stale creation storage and reset state
          localStorage.removeItem('create_postState');
          localStorage.removeItem('create_activeStickers');
          localStorage.removeItem('create_activeOverlays');
          localStorage.removeItem('create_selectedSounds');
          localStorage.removeItem('create_overlayText');
          localStorage.removeItem('create_overlayFont');
          localStorage.removeItem('create_overlayColor');
          localStorage.removeItem('create_overlayFontSize');
          localStorage.removeItem('create_textPos');
          localStorage.removeItem('create_textRotation');
          localStorage.removeItem('create_textList');
          localStorage.removeItem('create_stageStack');
          localStorage.removeItem('create_recordStatus');
          localStorage.removeItem('create_recordedSeconds');

          setPostState(createInitialPostState());
          setActiveStickers([]);
          setActiveOverlays([]);
          setSelectedSounds([]);
          setOverlayText('');
          setVideoDuration(0);
        }
      } catch (err) {
        console.error("Error restoring from cache:", err);
      } finally {
        // Give React a moment to process the state updates above before triggering the safety check
        timerId = setTimeout(() => {
          setIsRestoring(false);
        }, 100);
      }
    };
    restoreVideo();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // Generate video thumbnails for editor
  useEffect(() => {
    if (previewUrl) {
      setVideoThumbnails([]); // Clear old thumbnails immediately
      const video = document.createElement('video');
      video.src = previewUrl;
      video.onloadedmetadata = () => {
        // Prefer recordedSeconds for locally recorded videos as browser blob metadata can be flaky
        const dur = (recordedSeconds > 0 && (video.duration === Infinity || Math.abs(video.duration - recordedSeconds) > 0.5)) ? recordedSeconds : video.duration;

        // Only set global videoDuration if we don't have a multi-clip sequence yet
        // This prevents refresh from overwriting the total sequence duration with just the first clip
        if (clipSequence.length <= 1) {
          setVideoDuration(dur);
        }
      };
    }
  }, [previewUrl, clipSequence.length]);

  useEffect(() => {
    if (!isRestoring && previewUrl && clipSequence.length === 0 && videoDuration > 0 && videoFile) {
      const speedVal = parseFloat(selectedSpeed) || 1;
      const clipDurationVal = videoDuration / speedVal;
      setClipSequence([{
        file: videoFile,
        url: previewUrl,
        duration: clipDurationVal,
        originalDuration: videoDuration,
        speed: speedVal,
        isImage: videoFile?.type?.startsWith('image/'),
        startOffset: 0,
        limitStart: 0,
        limitEnd: videoDuration
      }]);
    }
  }, [previewUrl, videoDuration, videoFile, isRestoring, clipSequence.length, selectedSpeed]);

  useEffect(() => {
    if (clipSequence.length > 0) {
      saveSequenceToCache(clipSequence.map(clip => ({
        file: clip.file,
        duration: clip.duration,
        originalDuration: clip.originalDuration,
        speed: clip.speed,
        isImage: clip.isImage,
        startOffset: clip.startOffset,
        limitStart: clip.limitStart,
        limitEnd: clip.limitEnd
      })));
    }
  }, [clipSequence]);

  // Handle automatic advancement for image clips
  useEffect(() => {
    let imageTimer;
    if (isEditorPlaying && stage === 'editor') {
      const currentClip = clipSequence[currentClipIndex];
      if (currentClip?.isImage) {
        imageTimer = setTimeout(() => {
          if (currentClipIndex < clipSequence.length - 1) {
            setCurrentClipIndex(prev => prev + 1);
          } else {
            setCurrentClipIndex(0);
          }
        }, (currentClip.duration || 5) * 1000);
      }
    }
    return () => clearTimeout(imageTimer);
  }, [isEditorPlaying, currentClipIndex, clipSequence, stage]);

  // Generate video thumbnails for editor
  useEffect(() => {
    let isMounted = true;
    const generate = async () => {
      // Regenerate if we have a new previewUrl and no thumbnails yet for it
      if (previewUrl && videoDuration > 0 && stage === 'editor' && videoThumbnails.length === 0) {
        console.log("Generating thumbnails for current video:", previewUrl);
        try {
          const count = Math.ceil(videoDuration / 2) || 5;
          const result = [];
          const canvas = document.createElement('canvas');
          const video = document.createElement('video');
          video.src = previewUrl;
          video.muted = true;
          video.playsInline = true;
          video.crossOrigin = 'anonymous';

          await new Promise((resolve) => {
            video.onloadedmetadata = () => {
              if (video.videoWidth > 0) resolve();
            };
            video.oncanplay = () => resolve();
            video.onerror = (e) => {
              console.error("Video error during thumbnail gen:", e);
              resolve();
            };
            setTimeout(resolve, 3000); // 3s safety timeout
          });

          if (!video.videoWidth) {
            console.warn("Video width not available for thumbnails");
            return;
          }

          canvas.width = 160;
          canvas.height = (video.videoHeight / video.videoWidth) * 160;
          const ctx = canvas.getContext('2d');

          for (let i = 0; i < count; i++) {
            if (!isMounted) break;
            const targetTime = i * 2;
            if (targetTime > videoDuration) break;
            video.currentTime = targetTime;

            await new Promise(r => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                r();
              };
              video.addEventListener('seeked', onSeeked);
              // Local blob seeking is very fast, 400ms is enough safety
              setTimeout(onSeeked, 400);
            });

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // JPEG 0.6 is good enough for tiny thumbnails and much faster/lighter
            result.push(canvas.toDataURL('image/jpeg', 0.6));
          }

          if (isMounted && result.length > 0) {
            console.log("Successfully generated", result.length, "thumbnails");
            setVideoThumbnails(result);
          }
        } catch (err) {
          console.error("Thumbnail generation error:", err);
        }
      }
    };
    generate();
    return () => { isMounted = false; };
  }, [previewUrl, videoDuration, stage, videoThumbnails.length]);

  // Safety: Reset to camera if data is lost but stage is advanced
  useEffect(() => {
    if (!isRestoring && stage !== 'camera' && stage !== 'sound-editor' && !previewUrl && !videoFile) {
      console.warn("Session data lost, resetting create flow to camera.");
      setStageStack(['camera']);
    }
  }, [isRestoring, stage, previewUrl, videoFile]);

  // Intercept browser back gesture/button to pop stage stack or close active sheet.
  // Only one guard history entry is ever kept armed at a time (historyGuardArmedRef) -
  // previously both this effect and the handler pushed a state on every stage change,
  // which piled up extra entries and left the guard out of sync with the real stack
  // depth, so a couple of back presses could blow past it into the native exit-app prompt.
  // useLayoutEffect (not useEffect) so the guard is armed before the browser paints the new
  // stage - otherwise there's a brief window where the preview/editor screen is already visible
  // but the back button isn't intercepted yet, and an immediate back press exits the app.
  const historyGuardArmedRef = useRef(false);
  useLayoutEffect(() => {
    const needsGuard = stageStack.length > 1 || activeSheet !== null;

    const handlePopState = () => {
      let stillNeedsGuard = false;
      if (activeSheet) {
        setActiveSheet(null);
        stillNeedsGuard = stageStack.length > 1;
      } else if (stageStack.length > 1) {
        popStage();
        stillNeedsGuard = stageStack.length - 1 > 1;
      } else {
        historyGuardArmedRef.current = false;
        return;
      }

      historyGuardArmedRef.current = stillNeedsGuard;
      if (stillNeedsGuard) {
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    if (needsGuard) {
      if (!historyGuardArmedRef.current) {
        window.history.pushState(null, '', window.location.pathname);
        historyGuardArmedRef.current = true;
      }
      window.addEventListener('popstate', handlePopState);
    } else {
      historyGuardArmedRef.current = false;
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [stageStack, activeSheet]);

  // Ensure preview video plays when entering stage
  useEffect(() => {
    if (stage === 'preview' && previewVideoRef.current) {
      previewVideoRef.current.play().catch(err => {
        console.warn("Preview auto-play failed, likely needs user interaction:", err);
      });
    }
  }, [stage, previewUrl]);

  // Auto-detect and update audio duration in editor if missing or default
  useEffect(() => {
    if (stage === 'editor' && selectedSound && selectedSound.url && selectedSound.id !== 'sound-original') {
      // If duration is 15 (default) or missing, try to get actual duration
      if (!selectedSound.clipDuration || selectedSound.clipDuration === 15) {
        const tempAudio = new Audio(selectedSound.url);
        tempAudio.onloadedmetadata = () => {
          if (tempAudio.duration > 0 && Math.abs(tempAudio.duration - (selectedSound.clipDuration || 0)) > 1) {
            setSelectedSounds(prev => prev.map((s, idx) => {
              if (idx === editingSoundIndex || (editingSoundIndex === -1 && idx === 0)) {
                return { ...s, clipDuration: tempAudio.duration };
              }
              return s;
            }));
          }
        };
      }
    }
  }, [stage, selectedSound?.id, selectedSound?.url]);

  // Persistence logic for UI states
  useEffect(() => {
    const cleanStack = stageStack.filter(s => s !== 'sound-editor');
    localStorage.setItem('create_stageStack', JSON.stringify(cleanStack));
    localStorage.setItem('create_recordStatus', recordStatus);
    localStorage.setItem('create_recordedSeconds', recordedSeconds.toString());
    localStorage.setItem('create_selectedSounds', JSON.stringify(selectedSounds));
    localStorage.setItem('create_postState', JSON.stringify(postState));
    localStorage.setItem('create_activeStickers', JSON.stringify(activeStickers));
    localStorage.setItem('create_activeOverlays', JSON.stringify(activeOverlays));
    localStorage.setItem('create_overlayText', overlayText);
    localStorage.setItem('create_overlayFont', overlayFont);
    localStorage.setItem('create_overlayColor', overlayColor);
    localStorage.setItem('create_overlayFontSize', overlayFontSize.toString());
    localStorage.setItem('create_textPos', JSON.stringify(textPos));
    localStorage.setItem('create_textRotation', textRotation.toString());
    localStorage.setItem('create_textList', JSON.stringify(textList));
  }, [stageStack, recordStatus, recordedSeconds, selectedSound, postState, activeStickers, activeOverlays, overlayText, overlayFont, overlayColor, overlayFontSize, textPos, textRotation, textList]);

  // Synchronize composer edits in real-time to the selected item in textList
  useEffect(() => {
    if (selectedTextId) {
      setTextList(prev => prev.map(item => {
        if (item.id === selectedTextId) {
          return {
            ...item,
            text: overlayText,
            startTime: textStartTime,
            endTime: textEndTime,
            x: textPos.x,
            y: textPos.y,
            rotation: textRotation,
            color: overlayColor,
            font: overlayFont,
            fontSize: overlayFontSize
          };
        }
        return item;
      }));
    }
  }, [overlayText, textStartTime, textEndTime, textPos.x, textPos.y, textRotation, overlayColor, overlayFont, overlayFontSize, selectedTextId]);

  // Stop editor playback when leaving the stage
  useEffect(() => {
    if (stage !== 'editor') {
      setIsEditorPlaying(false);
      if (editorVideoRef.current) editorVideoRef.current.pause();
      if (audioRef.current) {
        audioRef.current.pause();
        // Also cleanup the audio object to be safe
        audioRef.current = null;
      }
    }
  }, [stage]);

  // Pause/cleanup editor audio when selectedSounds becomes empty
  useEffect(() => {
    if (selectedSounds.length === 0 && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [selectedSounds]);

  const MOCK_STICKERS = [
    '🔥', '❤️', '😂', '👍', '🎉', '🌟', '💎', '🌈', '🍦', '🍕',
    '🐶', '🐱', '🦋', '🌸', '⚡', '🎵', '📍', '💯', '✨', '🎁',
    '🤟', '👀', '👽', '👻', '🤖', '👑', '💄', '🔥', '💥', '🎈'
  ];

  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);

  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionSearchResults, setMentionSearchResults] = useState([]);
  const [isMentionSearching, setIsMentionSearching] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);


  const isFiltersTrayOpen = activeCameraTool === 'filters';
  const themedOverlayButtonClass = 'flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur-md active:opacity-70';
  const themedFloatingPillClass = 'flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-md';
  const themedToolLabelClass = 'rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.22)] backdrop-blur-md';
  const getThemedCameraToolButtonClass = (isActive) =>
    `flex h-[38px] w-[38px] items-center justify-center rounded-full border transition-all duration-200 ${isActive
      ? 'border-white/40 bg-white/20 text-white scale-110 shadow-lg'
      : 'border-white/10 bg-black/30 text-white hover:bg-black/40'
    } backdrop-blur-md`;
  const themedFiltersTrayClass = 'mb-4 rounded-[24px] border border-white/10 bg-black/70 px-3 pb-3 pt-3 shadow-[0_14px_40px_rgba(0,0,0,0.38)] backdrop-blur-xl';
  const themedFiltersDividerClass = 'border-white/10';
  const themedFiltersTabTextClass = 'text-white/60';
  const themedFiltersActiveTextClass = 'text-white';
  const themedFiltersIndicatorClass = 'bg-white';
  const themedFiltersCloseClass = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 active:opacity-70';
  const themedBottomPanelClass = `absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1.3rem,env(safe-area-inset-bottom))] ${isDarkMode
      ? 'bg-gradient-to-t from-black via-black/80 to-transparent'
      : 'bg-gradient-to-t from-black/60 via-black/20 to-transparent'
    } ${isFiltersTrayOpen ? 'pt-7' : 'pt-12'}`;
  const themedDurationRowClass = `${isFiltersTrayOpen ? 'mb-4' : 'mb-5'} flex items-center justify-center gap-5 text-[12px] text-white/80`;
  const getDurationButtonClass = (isSelected) =>
    `rounded-full px-2 py-1 transition-colors ${isSelected
      ? 'bg-white text-black font-semibold shadow-sm'
      : 'text-white/75 hover:text-white'
    }`;

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0:15';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  const themedUtilityTextClass = 'text-white';
  const themedUtilityBadgeClass = isDarkMode
    ? 'mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-black/25 backdrop-blur-sm'
    : 'mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-black/40 shadow-[0_10px_20px_rgba(0,0,0,0.15)] backdrop-blur-sm';
  const themedModeTabsClass = `${isFiltersTrayOpen ? 'mt-5' : 'mt-7'} flex items-center justify-center gap-8 text-[14px] font-semibold text-white/60`;
  const favoriteSounds = useMemo(() => {
    // Return savedAudiosList if it has items, otherwise fall back to filtering libraryAudios
    return savedAudiosList.length > 0
      ? savedAudiosList
      : libraryAudios.filter((soundItem) => soundItem.isSaved);
  }, [savedAudiosList, libraryAudios]);

  const pushStage = (nextStage) => {
    setStageStack((currentStack) => [...currentStack, nextStage]);
    setActiveSheet(null);
  };

  const replaceStage = (nextStage) => {
    setStageStack((currentStack) => [...currentStack.slice(0, -1), nextStage]);
    setActiveSheet(null);
  };

  const popStage = (skipSheet = false) => {
    if (stageStack.length <= 1) return;

    const currentStage = stageStack[stageStack.length - 1];
    const nextStage = stageStack[stageStack.length - 2];

    if (nextStage === 'camera' && currentStage !== 'sound-editor') {
      setSelectedSounds([]);
      // Also clear any temporary recording fragments if needed
      handleDiscardClip();
    }

    setStageStack((currentStack) => currentStack.slice(0, -1));
    if (currentStage === 'sound-editor' && !skipSheet) {
      setActiveSheet('music-library');
    } else {
      setActiveSheet(null);
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
  };

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('');
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    if (recordStatus !== 'recording') {
      return undefined;
    }

    // Parse selectedDuration (e.g. "1.5m" -> 90, "60s" -> 60)
    let maxDuration = 15;
    if (isTimerRecording) {
      maxDuration = countdownLength;
    } else if (selectedDuration.includes('m')) {
      maxDuration = parseFloat(selectedDuration) * 60;
    } else if (selectedDuration.includes('s')) {
      maxDuration = parseFloat(selectedDuration);
    }

    const startAt = Date.now() - recordedSeconds * 1000;
    const intervalId = window.setInterval(() => {
      const elapsedSeconds = Math.min(maxDuration, (Date.now() - startAt) / 1000);

      if (elapsedSeconds >= maxDuration) {
        setRecordedSeconds(maxDuration);
        // Automatically stop recording and move to preview
        handleStartOrStopRecording(true);
        setIsTimerRecording(false);
        window.clearInterval(intervalId);
        return;
      }

      setRecordedSeconds(elapsedSeconds);
    }, 50); // More frequent updates for smoother timer

    return () => window.clearInterval(intervalId);
  }, [recordStatus, recordedSeconds, selectedDuration, isTimerRecording, countdownLength]);

  useEffect(() => {
    if (activeCountdown === null) return;

    if (activeCountdown === 0) {
      setActiveCountdown(null);
      handleStartOrStopRecording();
      return;
    }

    const timerId = setTimeout(() => {
      setActiveCountdown(activeCountdown - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [activeCountdown]);

  useEffect(() => {
    if (!syncingSound) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSyncingSound(false);
      showToast('Sound synced');
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [syncingSound]);

  useEffect(() => {
    if (previewVideoRef.current) {
      const speedValue = parseFloat(selectedSpeed) || 1;
      previewVideoRef.current.playbackRate = speedValue;
    }
  }, [selectedSpeed, stage]);

  // Apply speed to Instacam's internal video (drives the canvas feed) in camera stage
  useEffect(() => {
    if (stage !== 'camera') return;
    const speedValue = parseFloat(selectedSpeed) || 1;

    // Apply to Instacam internal video element
    if (instacamRef.current && instacamRef.current.v) {
      try {
        instacamRef.current.v.playbackRate = speedValue;
      } catch (e) { /* ignore if not supported */ }
    }

    // Apply to the recorded clip preview video shown after recording stops
    if (canvasRef.current) {
      const parent = canvasRef.current.closest('[data-instacam]') || canvasRef.current.parentElement;
      const internalVideo = parent?.querySelector('video');
      if (internalVideo) {
        try { internalVideo.playbackRate = speedValue; } catch (e) { /* ignore */ }
      }
    }
  }, [selectedSpeed, stage, instacamRef.current]);

  const applyZoom = useCallback(async (zoomValue) => {
    const zoomNumber = parseFloat(zoomValue) || 1.0;
    let hardwareApplied = false;
    
    if (instacamRef.current && instacamRef.current.v) {
      const videoTrack = instacamRef.current.v.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
          if (capabilities.zoom) {
            const min = capabilities.zoom.min || 1;
            const max = capabilities.zoom.max || 4;
            const targetZoom = Math.max(min, Math.min(max, zoomNumber));
            await videoTrack.applyConstraints({
              advanced: [{ zoom: targetZoom }]
            });
            hardwareApplied = true;
            console.log(`Applied hardware zoom constraint: ${targetZoom}`);
          }
        } catch (err) {
          console.warn("Failed to apply hardware zoom constraints:", err);
        }
      }
    }

    if (canvasRef.current) {
      if (hardwareApplied) {
        canvasRef.current.style.transform = 'scale(1)';
      } else {
        canvasRef.current.style.transform = `scale(${zoomNumber})`;
        canvasRef.current.style.transformOrigin = 'center';
      }
    }

    // Without hardware zoom, the CSS transform above only zooms the on-screen preview -
    // the recorded stream still comes from the raw, un-zoomed camera track. Bake the zoom
    // into a second canvas (cropped + scaled from the preview canvas) and record from that
    // instead, so the exported video actually matches what was previewed.
    if (zoomRafRef.current) {
      cancelAnimationFrame(zoomRafRef.current);
      zoomRafRef.current = null;
    }

    if (instacamRef.current?.v && streamRef.current) {
      const rawVideoTrack = instacamRef.current.v.getVideoTracks()[0];
      const audioTracks = streamRef.current.getAudioTracks();

      if (hardwareApplied || zoomNumber === 1 || !rawVideoTrack) {
        if (rawVideoTrack) {
          streamRef.current = new MediaStream([rawVideoTrack, ...audioTracks]);
        }
      } else if (canvasRef.current) {
        const srcCanvas = canvasRef.current;
        if (!zoomCanvasRef.current) {
          zoomCanvasRef.current = document.createElement('canvas');
        }
        const zoomCanvas = zoomCanvasRef.current;
        zoomCanvas.width = srcCanvas.width;
        zoomCanvas.height = srcCanvas.height;
        const ctx = zoomCanvas.getContext('2d');

        const drawZoomedFrame = () => {
          const cropW = srcCanvas.width / zoomNumber;
          const cropH = srcCanvas.height / zoomNumber;
          const cropX = (srcCanvas.width - cropW) / 2;
          const cropY = (srcCanvas.height - cropH) / 2;
          ctx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, zoomCanvas.width, zoomCanvas.height);
          zoomRafRef.current = requestAnimationFrame(drawZoomedFrame);
        };
        drawZoomedFrame();

        const zoomedVideoTrack = zoomCanvas.captureStream(30).getVideoTracks()[0];
        streamRef.current = new MediaStream([zoomedVideoTrack, ...audioTracks]);
      }
    }
  }, []);

  useEffect(() => {
    if (stage === 'camera') {
      applyZoom(selectedZoom);
    }
  }, [selectedZoom, stage, applyZoom]);

  // Filter swatches should preview real footage, not a remote placeholder photo - snapshot
  // whatever's actually on screen (camera canvas, or the editor's playing clip) periodically.
  useEffect(() => {
    if (!(isFiltersTrayOpen && stage === 'camera')) return undefined;
    const snapshot = () => {
      if (!canvasRef.current) return;
      try {
        setFilterPreviewFrame(canvasRef.current.toDataURL('image/jpeg', 0.4));
      } catch (e) { /* canvas not ready yet */ }
    };
    snapshot();
    const id = setInterval(snapshot, 500);
    return () => clearInterval(id);
  }, [isFiltersTrayOpen, stage]);

  useEffect(() => {
    if (!(activeSheet === 'filters-preview' && editorVideoRef.current)) return undefined;
    const snapshot = () => {
      const video = editorVideoRef.current;
      if (!video || video.readyState < 2) return;
      if (!filterSnapshotCanvasRef.current) filterSnapshotCanvasRef.current = document.createElement('canvas');
      const snapCanvas = filterSnapshotCanvasRef.current;
      snapCanvas.width = 100;
      snapCanvas.height = 100;
      try {
        snapCanvas.getContext('2d').drawImage(video, 0, 0, 100, 100);
        setFilterPreviewFrame(snapCanvas.toDataURL('image/jpeg', 0.5));
      } catch (e) { /* video not ready yet */ }
    };
    snapshot();
    const id = setInterval(snapshot, 500);
    return () => clearInterval(id);
  }, [activeSheet]);

  const handleCanvasDoubleClick = () => {
    setSelectedZoom((prevZoom) => {
      const currentIndex = ZOOM_OPTIONS.indexOf(prevZoom);
      const nextIndex = (currentIndex + 1) % ZOOM_OPTIONS.length;
      return ZOOM_OPTIONS[nextIndex];
    });
  };

  // Pinch-to-zoom on the camera preview: two-finger spread/pinch scrubs selectedZoom directly.
  const maxPinchZoom = Math.max(1, ...ZOOM_OPTIONS.map((z) => parseFloat(z) || 1));

  const handleCameraTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [t0, t1] = e.touches;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      pinchZoomRef.current = { active: true, startDist: dist, startZoom: parseFloat(selectedZoom) || 1 };
    }
  };

  const handleCameraTouchMove = (e) => {
    if (e.touches.length === 2 && pinchZoomRef.current.active) {
      e.preventDefault(); // Take over the gesture so the browser doesn't try its own pinch-zoom
      const [t0, t1] = e.touches;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const scale = dist / (pinchZoomRef.current.startDist || dist);
      const nextZoom = Math.max(1, Math.min(maxPinchZoom, pinchZoomRef.current.startZoom * scale));
      setSelectedZoom(`${nextZoom.toFixed(1)}x`);
    }
  };

  const handleCameraTouchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchZoomRef.current.active = false;
    }
  };

  // Keep handlers ref updated to avoid listener re-binding during an active pinch
  cameraPinchHandlersRef.current = { handleCameraTouchStart, handleCameraTouchMove, handleCameraTouchEnd };

  useEffect(() => {
    const el = cameraStageRef.current;
    if (!el || stage !== 'camera') return;

    const startHandler = (e) => cameraPinchHandlersRef.current?.handleCameraTouchStart(e);
    const moveHandler = (e) => cameraPinchHandlersRef.current?.handleCameraTouchMove(e);
    const endHandler = (e) => cameraPinchHandlersRef.current?.handleCameraTouchEnd(e);

    el.addEventListener('touchstart', startHandler, { passive: false });
    el.addEventListener('touchmove', moveHandler, { passive: false });
    el.addEventListener('touchend', endHandler, { passive: false });
    el.addEventListener('touchcancel', endHandler, { passive: false });

    return () => {
      el.removeEventListener('touchstart', startHandler);
      el.removeEventListener('touchmove', moveHandler);
      el.removeEventListener('touchend', endHandler);
      el.removeEventListener('touchcancel', endHandler);
    };
  }, [stage]);

  useEffect(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.volume = originalVolume / 100;
      previewVideoRef.current.muted = isVideoMuted || isMuted || originalVolume === 0;
    }
    if (editorVideoRef.current) {
      editorVideoRef.current.volume = originalVolume / 100;
      editorVideoRef.current.muted = isVideoMuted || originalVolume === 0;
    }
  }, [originalVolume, isVideoMuted, isMuted, stage]);

  useEffect(() => {
    let active = true;
    if (stage === 'camera' && !streamRef.current) {
      const checkAndStart = () => {
        if (!active) return;
        if (canvasRef.current) {
          startCamera();
        } else {
          requestAnimationFrame(checkAndStart);
        }
      };
      checkAndStart();
    } else if (stage !== 'camera' && streamRef.current) {
      stopCamera();
    }

    return () => {
      active = false;
      stopCamera();
    };
  }, [stage]);

  const startCamera = async (overrideMode) => {
    if (!canvasRef.current) return;

    const activeMode = overrideMode || facingMode;
    const isUser = activeMode === 'user';

    // Intercept and optimize navigator.mediaDevices.getUserMedia for portrait wide-angle video
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      // Check if mobile device or if the viewport is physically in portrait
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerHeight > window.innerWidth;

      const optimizedConstraints = {
        ...constraints,
        video: constraints.video ? {
          facingMode: isUser ? 'user' : 'environment',
          width: { ideal: isMobile ? 1080 : 1920 },
          height: { ideal: isMobile ? 1920 : 1080 },
          aspectRatio: { ideal: isMobile ? 9 / 16 : 16 / 9 }
        } : false
      };
      return originalGetUserMedia.call(navigator.mediaDevices, optimizedConstraints);
    };

    try {
      if (instacamRef.current) {
        instacamRef.current.stop();
      }

      // Use standard high-definition 9:16 portrait resolution (720x1280)
      // instead of viewport resolution to avoid digital crop/zoom by the browser.
      const streamWidth = 720;
      const streamHeight = 1280;
      const streamRatio = 9 / 16;

      instacamRef.current = new Instacam(canvasRef.current, {
        width: streamWidth,
        height: streamHeight,
        ratio: streamRatio,
        mode: isUser ? 'front' : 'back',
        mirror: isUser,
        autostart: true,
        done: async () => {
          console.log('Instacam ready');
          // Get the stream for recording
          if (instacamRef.current) {
            applyZoom(selectedZoom);
            const videoStream = instacamRef.current.v; // Accessing internal stream
            try {
              // Request microphone audio stream
              const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              // Combine video tracks from canvas and audio tracks from microphone
              const combinedStream = new MediaStream([
                ...videoStream.getVideoTracks(),
                ...audioStream.getAudioTracks()
              ]);
              streamRef.current = combinedStream;
              console.log('Successfully combined canvas video with microphone audio stream!');
            } catch (audioErr) {
              console.warn('Microphone access failed or denied, using video-only stream:', audioErr);
              streamRef.current = videoStream;
            }
          }

          // Ensure the generated wrapper is full screen
          if (canvasRef.current) {
            const wrapper = canvasRef.current.parentElement;
            if (wrapper && wrapper.hasAttribute('data-instacam')) {
              wrapper.style.width = '100%';
              wrapper.style.height = '100%';
              wrapper.style.position = 'absolute';
              wrapper.style.inset = '0';
            }
          }
        },
        fail: (err) => {
          console.error('Instacam failed:', err);
          showToast('Camera access denied');
        }
      });
    } catch (err) {
      console.error('Error starting Instacam:', err);
    } finally {
      // Restore original getUserMedia immediately after synchronous initialization
      navigator.mediaDevices.getUserMedia = originalGetUserMedia;
    }
  };

  const stopCamera = () => {
    if (zoomRafRef.current) {
      cancelAnimationFrame(zoomRafRef.current);
      zoomRafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) { }
      });
      streamRef.current = null;
    }

    if (instacamRef.current) {
      try {
        instacamRef.current.stop();
      } catch (err) {
        console.warn('Error stopping instacam:', err);
      }
      instacamRef.current = null;
    }

    // Clean up DOM elements created by Instacam to prevent nested wrapper leaks
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;

      // If the parent is the Instacam wrapper, unwrap the canvas
      if (parent && parent.hasAttribute('data-instacam')) {
        const grandParent = parent.parentElement;
        if (grandParent && grandParent.contains(parent)) {
          try {
            grandParent.insertBefore(canvas, parent);
            grandParent.removeChild(parent);
          } catch (e) {
            console.warn('Error unwrapping instacam canvas:', e);
          }
        }
      }

      // Look for any other orphaned instacam elements in the container
      const container = canvas.parentElement;
      if (container) {
        try {
          const elements = container.querySelectorAll('[data-instacam], [data-instacam-viewport], [data-instacam-stream], [data-instacam-blend]');
          elements.forEach(el => {
            if (el !== canvas && container.contains(el)) {
              el.remove();
            }
          });
        } catch (e) {
          console.warn('Error cleaning up orphaned instacam elements:', e);
        }
      }

      // Reset custom canvas styles if any
      try {
        canvas.removeAttribute('data-instacam-viewport');
        canvas.style.transform = '';
      } catch (e) {}
    }

    streamRef.current = null;
  };

  // Update Instacam filters when selectedFilter changes
  useEffect(() => {
    if (instacamRef.current && stage === 'camera') {
      const preset = FILTER_PRESETS[selectedFilter];

      // Reset all filters first
      instacamRef.current.brightness = 1;
      instacamRef.current.contrast = 1;
      instacamRef.current.saturation = 1;
      instacamRef.current.hue = 0;
      instacamRef.current.invert = 0;
      instacamRef.current.grayscale = 0;
      instacamRef.current.sepia = 0;
      instacamRef.current.blur = 0;

      if (preset && preset !== 'none') {
        // Parse the preset string like "contrast(1.1) brightness(1.05) saturate(1.1)"
        const matches = preset.match(/(\w+)\(([^)]+)\)/g);
        if (matches) {
          matches.forEach(m => {
            const parts = m.match(/(\w+)\(([^)]+)\)/);
            if (parts) {
              const name = parts[1];
              const value = parseFloat(parts[2]);

              switch (name) {
                case 'brightness': instacamRef.current.brightness = value; break;
                case 'contrast': instacamRef.current.contrast = value; break;
                case 'saturate': instacamRef.current.saturation = value; break;
                case 'hue-rotate': instacamRef.current.hue = value; break;
                case 'invert': instacamRef.current.invert = value; break;
                case 'grayscale': instacamRef.current.grayscale = value; break;
                case 'sepia': instacamRef.current.sepia = value; break;
                case 'blur': instacamRef.current.blur = value; break;
              }
            }
          });
        }
      }
    }
  }, [selectedFilter, stage]);

  useEffect(() => {
    if (activeSheet !== 'sound-browser') {
      return;
    }

    setSoundBrowserTab('recommended');
    setFavoriteSoundTitles(readSoundFavorites());
  }, [activeSheet]);

  const selectedMedia = useMemo(() => {
    return { id: 'captured', image: CREATE_CANVAS_IMAGE, duration: '00:07', type: 'video' };
  }, [CREATE_CANVAS_IMAGE]);

  // Geolocation Reverse-Geocoding on Mount or when panel opens
  useEffect(() => {
    const stageName = stageStack[stageStack.length - 1];
    if (stageName !== 'location') {
      return;
    }

    const fetchCurrentLocation = () => {
      if (!navigator.geolocation) return;

      setIsSearchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'JhumrooReelsApp/1.0 (contact@jhumroo.com)'
                }
              }
            );
            const item = await response.json();
            if (item && item.address) {
              const addr = item.address;
              const state = addr.state || '';
              const country = addr.country || '';

              const nearbyList = [];
              const addedTitles = new Set();

              const addLocation = (name, typeLabel) => {
                if (!name || name.trim().length < 2) return;

                let title = name;
                let subtitle = '';

                if (state && name !== state) {
                  subtitle = `${state}, ${country}`;
                } else {
                  subtitle = country;
                }

                // Deduplicate items based on title
                if (!addedTitles.has(title.toLowerCase())) {
                  addedTitles.add(title.toLowerCase());
                  nearbyList.push({
                    id: `nearby-${typeLabel}-${Date.now()}-${Math.random()}`,
                    title: title,
                    subtitle: subtitle,
                    isCurrent: true
                  });
                }
              };

              // 1. Point of interest / Amenity
              const poi = addr.amenity || addr.shop || addr.tourism || addr.historic || addr.leisure || addr.building;
              addLocation(poi, 'poi');

              // 2. Road name
              addLocation(addr.road, 'road');

              // 3. Suburb / Neighborhood
              addLocation(addr.neighbourhood || addr.suburb, 'suburb');

              // 4. City / Town
              addLocation(addr.city || addr.town || addr.village, 'city');

              // 5. County / District
              addLocation(addr.county || addr.state_district, 'district');

              // 6. State
              addLocation(addr.state, 'state');

              setLocationSearchResults(nearbyList);
            }
          } catch (err) {
            console.error("Reverse geocoding failed:", err);
          } finally {
            setIsSearchingLocation(false);
          }
        },
        (error) => {
          console.warn("Geolocation failed or denied:", error);
          setIsSearchingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    };

    fetchCurrentLocation();
  }, [stageStack]);

  // Debounced API search for location using Nominatim OpenStreetMap
  useEffect(() => {
    if (!selectedLocationQuery.trim()) {
      // Keep current location if populated, otherwise empty out
      setLocationSearchResults(prev => prev.some(l => l.isCurrent) ? [prev.find(l => l.isCurrent)] : []);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const query = encodeURIComponent(selectedLocationQuery.trim());
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=10`,
          {
            headers: {
              'User-Agent': 'JhumrooReelsApp/1.0 (contact@jhumroo.com)'
            }
          }
        );
        const data = await response.json();

        if (Array.isArray(data)) {
          const mapped = data.map((item) => {
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || item.name;
            const state = addr.state || '';

            let title = city;
            if (state) title += `, ${state}`;

            return {
              id: item.place_id.toString(),
              title: title || item.name,
              subtitle: item.display_name,
            };
          });

          // Filter out duplicates
          const unique = [];
          const seen = new Set();
          for (const loc of mapped) {
            if (!seen.has(loc.subtitle)) {
              seen.add(loc.subtitle);
              unique.push(loc);
            }
          }

          setLocationSearchResults(unique);
        }
      } catch (err) {
        console.error("Location search failed:", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [selectedLocationQuery]);

  useEffect(() => {
    const searchMentions = async () => {
      if (mentionSearchQuery.trim().length < 1) {
        setMentionSearchResults([]);
        return;
      }

      setIsMentionSearching(true);
      try {
        const response = await userService.searchUsers(mentionSearchQuery);
        if (response.success) {
          setMentionSearchResults(response.users);
        }
      } catch (error) {
        console.error('Mention search error:', error);
      } finally {
        setIsMentionSearching(false);
      }
    };

    const timer = setTimeout(searchMentions, 300);
    return () => clearTimeout(timer);
  }, [mentionSearchQuery]);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (stage !== 'mention' && stage !== 'tag-people') return;
      if (followingUsers.length > 0) return;
      if (!user?.id) return;

      try {
        const response = await followService.getFollowing(user.id);
        if (response.success) {
          setFollowingUsers(response.following);
        }
      } catch (error) {
        console.error('Fetch following error:', error);
      }
    };

    fetchFollowing();
  }, [stage, user?.id, followingUsers.length]);

  const activeFilterOptions =
    CREATE_FILTER_GROUPS.find((group) => group.id === activeFilterGroup)?.filters || CREATE_FILTER_GROUPS[0]?.filters || [];

  const hashtagMatch = postState.caption.match(/(^|\s)#([a-z0-9_]*)$/i);
  const hashtagSuggestions = hashtagMatch
    ? CREATE_HASHTAG_SUGGESTIONS.filter((item) =>
      item.label.toLowerCase().includes(`#${(hashtagMatch[2] || '').toLowerCase()}`),
    )
    : [];



  const formatPlaybackTime = (elapsed, total) => {
    return `${formatElapsed(Math.round(elapsed || 0))} / ${formatElapsed(Math.round(total || 0))}`;
  };

  const handleLeftQuickTrim = () => {
    if (clipSequence.length === 0 || currentClipIndex < 0 || currentClipIndex >= clipSequence.length) return;
    const clip = clipSequence[currentClipIndex];
    if (clip.isImage) return;
    const speed = clip.speed || 1;
    const startOffset = clip.startOffset || 0;
    const originalDuration = clip.originalDuration || (clip.duration * speed);
    const limitEnd = clip.limitEnd !== undefined ? clip.limitEnd : (startOffset + originalDuration);

    const newStartOffset = Math.min(limitEnd - 0.5 * speed, startOffset + 0.2 * speed);
    const newOriginalDuration = limitEnd - newStartOffset;
    const newDuration = newOriginalDuration / speed;

    setClipSequence(prev => {
      const next = [...prev];
      next[currentClipIndex] = {
        ...next[currentClipIndex],
        startOffset: newStartOffset,
        originalDuration: newOriginalDuration,
        duration: newDuration
      };
      const newTotalDur = next.reduce((sum, c) => sum + c.duration, 0);
      setVideoDuration(newTotalDur);

      const pastDuration = next.slice(0, currentClipIndex).reduce((sum, c) => sum + c.duration, 0);
      const newGlobalTime = pastDuration;
      const timeSpan = document.getElementById('editor-playback-time');
      if (timeSpan) {
        timeSpan.innerText = formatPlaybackTime(newGlobalTime, newTotalDur);
      }
      const timeline = document.getElementById('editor-timeline');
      if (timeline) {
        ignoreScrollRef.current = true;
        timeline.scrollLeft = newGlobalTime * PIXELS_PER_SECOND;
      }
      return next;
    });

    if (editorVideoRef.current) {
      editorVideoRef.current.currentTime = newStartOffset;
    }
  };

  const handleLeftQuickRevert = () => {
    if (clipSequence.length === 0 || currentClipIndex < 0 || currentClipIndex >= clipSequence.length) return;
    const clip = clipSequence[currentClipIndex];
    if (clip.isImage) return;
    const speed = clip.speed || 1;
    const startOffset = clip.startOffset || 0;
    const originalDuration = clip.originalDuration || (clip.duration * speed);
    const limitStart = clip.limitStart !== undefined ? clip.limitStart : 0;
    const limitEnd = clip.limitEnd !== undefined ? clip.limitEnd : (startOffset + originalDuration);

    const newStartOffset = Math.max(limitStart, startOffset - 0.2 * speed);
    const newOriginalDuration = limitEnd - newStartOffset;
    const newDuration = newOriginalDuration / speed;

    setClipSequence(prev => {
      const next = [...prev];
      next[currentClipIndex] = {
        ...next[currentClipIndex],
        startOffset: newStartOffset,
        originalDuration: newOriginalDuration,
        duration: newDuration
      };
      const newTotalDur = next.reduce((sum, c) => sum + c.duration, 0);
      setVideoDuration(newTotalDur);

      const pastDuration = next.slice(0, currentClipIndex).reduce((sum, c) => sum + c.duration, 0);
      const newGlobalTime = pastDuration;
      const timeSpan = document.getElementById('editor-playback-time');
      if (timeSpan) {
        timeSpan.innerText = formatPlaybackTime(newGlobalTime, newTotalDur);
      }
      const timeline = document.getElementById('editor-timeline');
      if (timeline) {
        ignoreScrollRef.current = true;
        timeline.scrollLeft = newGlobalTime * PIXELS_PER_SECOND;
      }
      return next;
    });

    if (editorVideoRef.current) {
      editorVideoRef.current.currentTime = newStartOffset;
    }
  };

  const handleRightQuickTrim = () => {
    if (clipSequence.length === 0 || currentClipIndex < 0 || currentClipIndex >= clipSequence.length) return;
    const clip = clipSequence[currentClipIndex];
    if (clip.isImage) return;
    const speed = clip.speed || 1;
    const startOffset = clip.startOffset || 0;
    const currentOriginalDuration = clip.originalDuration || (clip.duration * speed);
    const minOriginalDuration = 0.5 * speed;

    const newOriginalDuration = Math.max(minOriginalDuration, currentOriginalDuration - 0.2 * speed);
    const newDuration = newOriginalDuration / speed;

    setClipSequence(prev => {
      const next = [...prev];
      next[currentClipIndex] = {
        ...next[currentClipIndex],
        originalDuration: newOriginalDuration,
        duration: newDuration
      };
      const newTotalDur = next.reduce((sum, c) => sum + c.duration, 0);
      setVideoDuration(newTotalDur);

      const pastDuration = next.slice(0, currentClipIndex).reduce((sum, c) => sum + c.duration, 0);
      const newGlobalTime = pastDuration + newDuration - 0.01;
      const timeSpan = document.getElementById('editor-playback-time');
      if (timeSpan) {
        timeSpan.innerText = formatPlaybackTime(newGlobalTime, newTotalDur);
      }
      const timeline = document.getElementById('editor-timeline');
      if (timeline) {
        ignoreScrollRef.current = true;
        timeline.scrollLeft = newGlobalTime * PIXELS_PER_SECOND;
      }
      return next;
    });

    // Seek to clip end and pause to prevent onEnded from firing and jumping to next clip
    if (editorVideoRef.current) {
      editorVideoRef.current.pause();
      setIsEditorPlaying(false);
      editorVideoRef.current.currentTime = startOffset + newOriginalDuration - 0.01 * speed;
    }
  };

  const handleRightQuickRevert = () => {
    if (clipSequence.length === 0 || currentClipIndex < 0 || currentClipIndex >= clipSequence.length) return;
    const clip = clipSequence[currentClipIndex];
    if (clip.isImage) return;
    const speed = clip.speed || 1;
    const startOffset = clip.startOffset || 0;
    const currentOriginalDuration = clip.originalDuration || (clip.duration * speed);
    const limitEnd = clip.limitEnd !== undefined ? clip.limitEnd : (startOffset + currentOriginalDuration);
    const maxOriginalDuration = limitEnd - startOffset;

    const newOriginalDuration = Math.min(maxOriginalDuration, currentOriginalDuration + 0.2 * speed);
    const newDuration = newOriginalDuration / speed;

    setClipSequence(prev => {
      const next = [...prev];
      next[currentClipIndex] = {
        ...next[currentClipIndex],
        originalDuration: newOriginalDuration,
        duration: newDuration
      };
      const newTotalDur = next.reduce((sum, c) => sum + c.duration, 0);
      setVideoDuration(newTotalDur);

      const pastDuration = next.slice(0, currentClipIndex).reduce((sum, c) => sum + c.duration, 0);
      const newGlobalTime = pastDuration + newDuration - 0.01;
      const timeSpan = document.getElementById('editor-playback-time');
      if (timeSpan) {
        timeSpan.innerText = formatPlaybackTime(newGlobalTime, newTotalDur);
      }
      const timeline = document.getElementById('editor-timeline');
      if (timeline) {
        ignoreScrollRef.current = true;
        timeline.scrollLeft = newGlobalTime * PIXELS_PER_SECOND;
      }
      return next;
    });

    // Seek to clip end and pause to prevent onEnded from firing and jumping to next clip
    if (editorVideoRef.current) {
      editorVideoRef.current.pause();
      setIsEditorPlaying(false);
      editorVideoRef.current.currentTime = startOffset + newOriginalDuration - 0.01 * speed;
    }
  };

  const handleCloseOrBack = () => {
    if (activeSheet) {
      setActiveSheet(null);
      return;
    }

    // If in editor or preview, pop back one sub-step first (matches the browser-back handler);
    // only offer to discard the whole video once there's nowhere left to step back to.
    if (stage === 'editor' || stage === 'preview') {
      if (stageStack.length > 1) {
        popStage();
        return;
      }
      if (videoFile || recordedSeconds > 0) {
        setActiveSheet('exit-flow-confirmation');
        return;
      }
      popStage();
      return;
    }

    // Only show exit confirmation if we are at the camera stage and have content
    if (stage === 'camera' && (videoFile || recordedSeconds > 0)) {
      setActiveSheet('exit-flow-confirmation');
      return;
    }

    if (stageStack.length > 1) {
      popStage();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const handleRecordPressStart = (e) => {
    if (e && e.type === 'touchstart') {
      lastTouchTimeRef.current = Date.now();
    }

    // Ignore emulated mouse events on touch devices
    if (e && e.type === 'mousedown' && Date.now() - lastTouchTimeRef.current < 500) {
      return;
    }

    if (recordStatus === 'recorded') return;

    if (recordStatus === 'recording') {
      handleStartOrStopRecording();
      isPressingRef.current = false;
      return;
    }

    pressStartTimeRef.current = Date.now();
    isPressingRef.current = true;
    handleStartOrStopRecording();
  };

  const handleRecordPressEnd = (e) => {
    if (e && e.type === 'touchend') {
      lastTouchTimeRef.current = Date.now();
    }

    // Ignore emulated mouse events on touch devices
    if (e && e.type === 'mouseup' && Date.now() - lastTouchTimeRef.current < 500) {
      return;
    }

    if (!isPressingRef.current) return;
    isPressingRef.current = false;

    const pressDuration = Date.now() - pressStartTimeRef.current;

    if (pressDuration > 350 && recordStatus === 'recording') {
      handleStartOrStopRecording();
    }
  };

  const handleRecordPressLeave = () => {
    if (isPressingRef.current && recordStatus === 'recording') {
      isPressingRef.current = false;
      handleStartOrStopRecording();
    }
  };

  const handleStartOrStopRecording = (autoConfirm = false) => {
    if (recordStatus === 'recording') {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        autoConfirmOnStopRef.current = autoConfirm;
        mediaRecorderRef.current.stop();
      }
      setRecordStatus('recorded');
      if (duetVideoPlayerRef.current) {
        duetVideoPlayerRef.current.pause();
      }
      setIsTimerRecording(false);

      // Pause camera background audio
      if (recordingAudioRef.current) {
        recordingAudioRef.current.pause();
        recordingAudioRef.current = null;
      }
      return;
    }

    if (recordStatus === 'recorded') {
      setActiveSheet('discard-last-clip');
      return;
    }

    // Start recording
    if (!streamRef.current) {
      showToast('Camera not ready');
      return;
    }

    setRecordedSeconds(0);
    chunksRef.current = [];

    if (duetVideoPlayerRef.current) {
      duetVideoPlayerRef.current.currentTime = 0;
      duetVideoPlayerRef.current.play().catch(err => console.error("Failed to play duet original video:", err));
    }

    // Find supported mime type
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
      'video/quicktime'
    ];
    let selectedType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';

    // Cap bitrate so unedited clips (which skip the compression re-encode and upload this
    // recording directly - see handleNextClick) aren't stuck at the browser's uncapped
    // default, which is what made those uploads slow.
    const recorderOptions = { videoBitsPerSecond: 4000000 };
    if (selectedType) recorderOptions.mimeType = selectedType;
    const recorder = new MediaRecorder(streamRef.current, recorderOptions);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    autoConfirmOnStopRef.current = false;

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const file = new File([blob], 'recording.webm', { type: 'video/webm' });

      setVideoFile(file);
      setPreviewUrl(url);

      // Save to IndexedDB for persistence
      saveVideoToCache(file);

      if (autoConfirmOnStopRef.current) {
        pushStage('preview');
      }
    };

    recorder.start();
    setRecordStatus('recording');

    // Stop camera preview audio before starting recording audio (avoid double play)
    if (cameraPreviewAudioRef.current) {
      cameraPreviewAudioRef.current.pause();
      cameraPreviewAudioRef.current = null;
    }

    // Play camera background audio synchronously to bypass browser autoplay restrictions
    if (selectedSound && (selectedSound.url || selectedSound.audioUrl) && selectedSound.id !== 'sound-original') {
      const url = selectedSound.url || selectedSound.audioUrl;
      const audio = new Audio(url);
      const startSec = selectedSound.clipStart || 0;
      const durationSec = selectedSound.clipDuration || 15;
      const endSec = startSec + durationSec;

      audio.currentTime = startSec;
      audio.muted = isMusicMuted || addedVolume === 0;
      audio.volume = addedVolume / 100;

      audio.addEventListener('timeupdate', () => {
        if (audio.currentTime >= endSec) {
          audio.currentTime = startSec;
        }
      });

      audio.play().catch(err => {
        console.error("Recording background audio playback failed:", err);
      });
      recordingAudioRef.current = audio;
    }
  };

  const handleConfirmClip = () => {
    if (recordStatus !== 'recorded') {
      return;
    }

    pushStage('preview');
  };

  const handleDiscardClip = () => {
    setRecordStatus('idle');
    setRecordedSeconds(0);
    setVideoFile(null);
    setPreviewUrl(null);
    setActiveSheet(null);
    if (duetVideoPlayerRef.current) {
      duetVideoPlayerRef.current.pause();
      duetVideoPlayerRef.current.currentTime = 0;
    }
    // Clean up camera background audio
    if (recordingAudioRef.current) {
      recordingAudioRef.current.pause();
      recordingAudioRef.current = null;
    }

    // Clear cache
    clearVideoCache();
    localStorage.removeItem('create_stageStack');
    localStorage.removeItem('create_recordStatus');
    localStorage.removeItem('create_recordedSeconds');
    localStorage.removeItem('create_activeStickers');
    localStorage.removeItem('create_activeOverlays');
    localStorage.removeItem('create_overlayText');
    localStorage.removeItem('create_postState');
    localStorage.removeItem('create_selectedSounds');
    localStorage.removeItem('create_overlayFont');
    localStorage.removeItem('create_overlayColor');
    localStorage.removeItem('create_overlayFontSize');
    localStorage.removeItem('create_textPos');
    localStorage.removeItem('create_textRotation');
    localStorage.removeItem('create_textList');

    // Reset Text Overlay states
    setOverlayText('');
    setTextPos({ x: 0, y: 0 });
    setTextRotation(0);
    setOverlayFont('Classic');
    setOverlayColor('#ffffff');
    setOverlayFontSize(24);
    setIsEditingText(false);
    // Reset Preview Tool states
    setSelectedFilter('Normal');
    setSelectedSpeed('1x');
    setIsMuted(false);
    setActiveStickers([]);
    setActiveOverlays([]);
    setSelectedSounds([]);
    setPostState(createInitialPostState());
    setVideoDuration(0);
    setVideoThumbnails([]);
    setTextList([]);
    setClipSequence([]);
    setCurrentClipIndex(0);
    setLocationSearchResults([]);
    setIsSearchingLocation(false);
  };

  const handleCameraToolClick = (toolId) => {
    if (toolId === 'flip') {
      const nextMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(nextMode);
      // We need to restart camera with new facing mode
      // The startCamera will be called by useEffect if we add facingMode to deps,
      // or we can call it manually.
      startCameraManual(nextMode);
      return;
    }



    setActiveCameraTool((currentTool) => (currentTool === toolId ? null : toolId));

    if (toolId === 'timer') {
      setActiveSheet('timer');
    }
  };

  const startCameraManual = async (mode) => {
    console.log('Flipping camera to mode:', mode);
    stopCamera();
    await startCamera(mode);
  };

  const saveFile = (url, name, shouldRevoke = false) => {
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        if (shouldRevoke) window.URL.revokeObjectURL(url);
      }, 15000);
      showToast('Download started');
    } catch (err) {
      console.error("Download trigger failed:", err);
      showToast('Download failed');
    }
  };

  const handleNextClick = () => {
    const hasEdits = textList.length > 0 ||
      activeStickers.length > 0 ||
      selectedFilter !== 'Normal' ||
      editorSettings.rotation !== 0 ||
      clipSequence.length > 1 ||
      clipSequence.some(clip => {
        if (clip.isImage) return false;
        const speed = clip.speed || 1;
        const startOffset = clip.startOffset || 0;
        const limitStart = clip.limitStart !== undefined ? clip.limitStart : 0;
        const limitEnd = clip.limitEnd !== undefined ? clip.limitEnd : (startOffset + (clip.originalDuration || clip.duration * speed));
        const maxDuration = (limitEnd - limitStart) / speed;

        const isTrimmedStart = startOffset > limitStart + 0.05;
        const isTrimmedEnd = clip.duration < maxDuration - 0.05;
        const isSpeedChanged = speed !== 1;

        return isTrimmedStart || isTrimmedEnd || isSpeedChanged;
      });

    if (!hasEdits) {
      console.log('No edits detected. Bypassing canvas render for direct upload.');
      setMergedVideoBlob(null);
      pushStage('post');
    } else {
      performMergeSave(false);
    }
  };

  const performMergeSave = async (isExportOnly = true) => {
    if (isRendering) return;

    const previewAudiosToPlay = [];
    try {
      setIsRendering(true);
      setRenderProgress(0);
      showToast('Preparing your reel...');

      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');

      const renderVideo = document.createElement('video');
      renderVideo.playsInline = true;

      // Setup Web Audio routing to capture video audio and combine with background music
      let audioTrack = null;
      let audioCtx = null;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const destNode = audioCtx.createMediaStreamDestination();

        // 1. Connect recorded camera video/microphone audio track
        const sourceNode = audioCtx.createMediaElementSource(renderVideo);
        sourceNode.connect(destNode);

        // 2. Connect any selected background music/soundtracks
        selectedSounds.forEach((sound) => {
          const url = sound.url || sound.audioUrl;
          if (url && sound.title !== 'Original sound') {
            const soundAudio = new Audio(url);
            soundAudio.crossOrigin = 'anonymous'; // prevent CORS canvas taint issues
            soundAudio.muted = false;
            soundAudio.volume = sound.title === 'Voiceover' ? 1.0 : (addedVolume / 100);
            
            // Connect this audio element as a source in Web Audio context
            const soundSource = audioCtx.createMediaElementSource(soundAudio);
            soundSource.connect(destNode);

            previewAudiosToPlay.push({
              audio: soundAudio,
              startTime: sound.clipStart || 0,
              duration: sound.clipDuration || 15
            });
          }
        });

        audioTrack = destNode.stream.getAudioTracks()[0];
      } catch (err) {
        console.warn("Web Audio API failed, falling back to silent video:", err);
      }

      const stream = canvas.captureStream(30);
      const combinedTracks = [...stream.getVideoTracks()];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
      const combinedStream = new MediaStream(combinedTracks);

      // VP8 has no hardware encoder for canvas streams on most phones, but it software-encodes
      // several times faster than VP9 does - VP9 was the actual reason Save/export and
      // edited-video upload felt slow, since this recorder backs both of those actions.
      const exportMimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: exportMimeType,
        // 4Mbps is still high quality at 720x1280 and roughly halves the exported file size vs
        // the previous 8Mbps, which is most of what made upload/export feel slow (smaller file
        // to upload to S3, less data for the backend to download and re-encode to mp4).
        videoBitsPerSecond: 4000000
      });

      const recordedChunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      recorder.onstop = () => {
        // Pause all background audios
        previewAudiosToPlay.forEach(p => {
          try { p.audio.pause(); } catch(e) {}
        });

        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        if (isExportOnly) {
          saveFile(url, `jhumroo_reel_${Date.now()}.webm`, true);
        } else {
          setMergedVideoBlob(blob);
          setPreviewUrl(url);
          // Keep clipSequence and currentClipIndex intact so project is fully editable when going back
          pushStage('post');
        }

        setIsRendering(false);
      };

      recorder.start();

      if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Start playing all background music tracks in sync with exporter rendering
      previewAudiosToPlay.forEach(p => {
        p.audio.currentTime = p.startTime;
        p.audio.play().catch(err => console.warn("Failed to play background audio in exporter:", err));
      });

      for (let i = 0; i < clipSequence.length; i++) {
        const clip = clipSequence[i];
        setRenderProgress(Math.round((i / clipSequence.length) * 100));

        if (clip.isImage) {
          const startTime = Date.now();
          const durationMs = (clip.duration || 5) * 1000;
          const img = new Image();
          img.src = clip.url;
          await new Promise(resolve => { img.onload = resolve; });

          const clipStartTimeInGlobalTimeline = clipSequence.slice(0, i).reduce((acc, c) => acc + (c.duration || 5), 0);

          while (Date.now() - startTime < durationMs) {
            const elapsedInClip = (Date.now() - startTime) / 1000;
            const globalTime = clipStartTimeInGlobalTimeline + elapsedInClip;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((editorSettings.rotation * Math.PI) / 180);
            ctx.filter = getCombinedFilter();
            ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
            ctx.restore();

            textList.forEach(item => {
              if (item.text && globalTime >= item.startTime && globalTime <= item.endTime) {
                ctx.save();
                ctx.fillStyle = item.color || '#ffffff';
                ctx.font = `${(item.fontSize || 28) * 2}px ${item.font || 'Standard'}`;
                ctx.textAlign = 'center';
                ctx.translate(canvas.width / 2 + item.x * 2, canvas.height / 2 + item.y * 2);
                ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
                ctx.fillText(item.text, 0, 0);
                ctx.restore();
              }
            });

            activeStickers.forEach(sticker => {
              ctx.save();
              ctx.font = '120px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.translate(canvas.width / 2 + sticker.x * 2, canvas.height / 2 + sticker.y * 2);
              ctx.fillText(sticker.content, 0, 0);
              ctx.restore();
            });

            await new Promise(r => requestAnimationFrame(r));
          }
        } else {
          renderVideo.src = clip.url;

          // Wait for metadata to load to get duration and seek safely
          await new Promise((resolve) => {
            renderVideo.onloadedmetadata = () => resolve();
            renderVideo.oncanplay = () => resolve();
            if (renderVideo.duration) resolve();
          });

          const startOffset = clip.startOffset || 0;
          const speed = clip.speed || 1;
          const clipDuration = clip.duration || (renderVideo.duration / speed);
          const endTime = startOffset + clipDuration * speed;

          renderVideo.currentTime = startOffset;
          renderVideo.playbackRate = speed;
          await renderVideo.play();

          const clipStartTimeInGlobalTimeline = clipSequence.slice(0, i).reduce((acc, c) => acc + (c.duration || 5), 0);

          // Letterbox instead of stretching - landscape/non-9:16 source clips keep their own
          // aspect ratio and get centered with black bars, rather than being squashed to fill.
          const srcW = renderVideo.videoWidth || canvas.width;
          const srcH = renderVideo.videoHeight || canvas.height;
          const srcRatio = srcW / srcH;
          const canvasRatio = canvas.width / canvas.height;
          let drawWidth, drawHeight;
          if (srcRatio > canvasRatio) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / srcRatio;
          } else {
            drawHeight = canvas.height;
            drawWidth = canvas.height * srcRatio;
          }

          while (renderVideo.currentTime < endTime && !renderVideo.ended) {
            const elapsedInClip = (renderVideo.currentTime - startOffset) / speed;
            const globalTime = clipStartTimeInGlobalTimeline + elapsedInClip;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((editorSettings.rotation * Math.PI) / 180);
            ctx.filter = getCombinedFilter();
            ctx.drawImage(renderVideo, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();

            textList.forEach(item => {
              if (item.text && globalTime >= item.startTime && globalTime <= item.endTime) {
                ctx.save();
                ctx.fillStyle = item.color || '#ffffff';
                ctx.font = `${(item.fontSize || 28) * 2}px ${item.font || 'Standard'}`;
                ctx.textAlign = 'center';
                ctx.translate(canvas.width / 2 + item.x * 2, canvas.height / 2 + item.y * 2);
                ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
                ctx.fillText(item.text, 0, 0);
                ctx.restore();
              }
            });

            activeStickers.forEach(sticker => {
              ctx.save();
              ctx.font = '120px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.translate(canvas.width / 2 + sticker.x * 2, canvas.height / 2 + sticker.y * 2);
              ctx.fillText(sticker.content, 0, 0);
              ctx.restore();
            });

            await new Promise(r => requestAnimationFrame(r));
          }
          renderVideo.pause();
        }
      }

      recorder.stop();
      setRenderProgress(100);
      showToast('Export complete!');
    } catch (err) {
      console.error("Render failed:", err);
      // Clean up background audios
      previewAudiosToPlay.forEach(p => {
        try { p.audio.pause(); } catch(e) {}
      });
      showToast('Export failed.');
      setIsRendering(false);
    }
  };

  const handleTextCancel = () => {
    setIsEditingText(false);
    setSelectedTextId(null);
    setOverlayText('');
  };

  const handleTextDone = () => {
    if (!overlayText.trim()) {
      if (selectedTextId) {
        setTextList(prev => prev.filter(t => t.id !== selectedTextId));
      }
      setIsEditingText(false);
      setSelectedTextId(null);
      setOverlayText('');
      return;
    }

    const itemData = {
      id: selectedTextId || `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: overlayText,
      startTime: textStartTime,
      endTime: textEndTime,
      x: textPos.x,
      y: textPos.y,
      rotation: textRotation,
      color: overlayColor,
      font: overlayFont,
      fontSize: overlayFontSize
    };

    setTextList(prev => {
      const idx = prev.findIndex(t => t.id === itemData.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = itemData;
        return next;
      } else {
        return [...prev, itemData];
      }
    });

    setIsEditingText(false);
    setSelectedTextId(null);
    setOverlayText('');
  };

  const handlePreviewToolClick = (toolId) => {
    if (toolId === 'edit' || toolId === 'editor') {
      pushStage('editor');
      return;
    }
    if (toolId === 'text') {
      const maxEndTime = textList.reduce((max, t) => Math.max(max, t.endTime), 0);
      const start = Math.min(videoDuration, maxEndTime);
      const end = Math.min(videoDuration, start + 5);
      setOverlayText('');
      setTextStartTime(start);
      setTextEndTime(end);
      textStartTimeRef.current = start;
      textEndTimeRef.current = end;
      setTextPos({ x: 0, y: 0 });
      setTextRotation(0);
      setOverlayColor('#ffffff');
      setOverlayFont('Standard');
      setOverlayFontSize(28);
      setSelectedTextId(null);
      setIsEditingText(true);
      return;
    }
    if (toolId === 'filters') {
      setActiveSheet('filters-preview');
      return;
    }
    if (toolId === 'adjust') {
      setActiveSheet('adjust-preview');
      return;
    }
    if (toolId === 'speed') {
      setActiveSheet('speed-preview');
      return;
    }
    if (toolId === 'audio') {
      setActiveSheet('voiceover');
      // Reset voice state
      setRecordedVoiceBlob(null);
      return;
    }
    if (toolId === 'stickers') {
      setActiveSheet('stickers-preview');
      return;
    }
    if (toolId === 'sound') {
      setActiveSheet('music-library');
      return;
    }
    if (toolId === 'mute') {
      setIsMuted(!isMuted);
      showToast(isMuted ? 'Audio unmuted' : 'Audio muted');
      return;
    }
    if (toolId === 'volume-preview') {
      setActiveSheet('volume-preview');
      return;
    }
    if (toolId === 'overlay' || toolId === 'import') {
      overlayInputRef.current.click();
      return;
    }
    if (toolId === 'save') {
      performMergeSave(true);
      return;
    }
    if (toolId === 'captions') {
      showToast('Auto-captions generated');
      return;
    }
    showToast(`${toolId} tool active`);
  };

  const handleOverlaySelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video') ? 'video' : 'image';

    setActiveOverlays(prev => [...prev, {
      id: Date.now(),
      url,
      type,
      x: 0,
      y: -100, // Start a bit higher
      scale: 1,
      rotation: 0
    }]);

    // Clear input
    e.target.value = '';
  };

  const handlePublishUi = async () => {
    const fileToUpload = mergedVideoBlob || videoFile;
    if (!fileToUpload) {
      showToast('Please select a video first');
      return;
    }

    setUploading(true);
    showToast('Getting upload URL...');

    try {
      const fileName = fileToUpload.name || `jhumroo_reel_${Date.now()}.webm`;
      const fileType = fileToUpload.type || 'video/webm';

      let directUploadSuccess = false;
      let videoId = null;
      let key = null;

      try {
        // 1. Get Presigned URL from Backend
        const uploadUrlResponse = await reelService.getPresignedUrl(fileName, fileType);
        const { uploadUrl, key: S3Key, videoId: S3VideoId } = uploadUrlResponse;
        key = S3Key;
        videoId = S3VideoId;

        showToast('Uploading edited reel...');

        // 2. Upload Binary File directly to AWS S3
        await axios.put(uploadUrl, fileToUpload, {
          headers: {
            'Content-Type': fileType
          }
        });
        directUploadSuccess = true;
      } catch (uploadError) {
        console.warn('Direct S3 upload failed, falling back to server-side upload:', uploadError);
      }

      const firstText = textList[0];
      const editsData = {
        text: firstText ? {
          content: firstText.text,
          font: firstText.font || 'Standard',
          color: firstText.color || '#ffffff',
          fontSize: firstText.fontSize || 28,
          position: { x: firstText.x, y: firstText.y },
          rotation: firstText.rotation || 0
        } : null,
        stickers: activeStickers.map(s => ({
          id: s.id,
          content: s.content,
          position: { x: s.x, y: s.y }
        })),
        filter: selectedFilter
      };

      const editsPayload = {
        ...editsData,
        overlays: activeOverlays.map(o => ({
          id: o.id,
          url: o.url,
          type: o.type,
          position: { x: o.x, y: o.y }
        })),
        clipSequence: clipSequence.map(c => ({
          duration: c.duration,
          originalDuration: c.originalDuration,
          speed: c.speed || 1,
          startOffset: c.startOffset || 0,
          isImage: c.isImage
        })),
        cropAspectRatio: cropAspectRatio,
        cropScale: cropScale,
        cropPan: cropPan,
        cropRotation: cropRotation
      };

      const musicPayload = (selectedSound && selectedSound._id && selectedSound._id !== 'sound-original') ? {
        _id: selectedSound._id,
        title: selectedSound.title,
        author: selectedSound.author,
        url: selectedSound.url,
        duration: typeof selectedSound.duration === 'string' ? parseDurationSeconds(selectedSound.duration) : (Number(selectedSound.duration) || 0)
      } : null;

      const handleUploadSuccess = () => {
        showToast('Reel published successfully!');

        // Clear persistence cache
        clearVideoCache();
        localStorage.removeItem('create_stageStack');
        localStorage.removeItem('create_recordStatus');
        localStorage.removeItem('create_recordedSeconds');
        localStorage.removeItem('create_postState');
        localStorage.removeItem('create_activeStickers');
        localStorage.removeItem('create_activeOverlays');
        localStorage.removeItem('create_selectedSounds');
        localStorage.removeItem('create_overlayText');
        localStorage.removeItem('create_overlayFont');
        localStorage.removeItem('create_overlayColor');
        localStorage.removeItem('create_overlayFontSize');
        localStorage.removeItem('create_textPos');
        localStorage.removeItem('create_textRotation');
        localStorage.removeItem('create_textList');

        setTimeout(() => {
          navigate('/');
          // Reset state
          setRecordStatus('idle');
          setVideoFile(null);
          setPreviewUrl(null);
          setOverlayText('');
          setActiveStickers([]);
          setActiveOverlays([]);
          setSelectedFilter('Normal');
          setSelectedSounds([]);
          setPostState(createInitialPostState());
          setStageStack(['camera']);
          setVideoDuration(0);
          setVideoThumbnails([]);
          setClipSequence([]);
          setTextList([]);
          setCurrentClipIndex(0);
          setLocationSearchResults([]);
          setIsSearchingLocation(false);
          setCoverImageUrl(null);
          setCoverImageFile(null);
        }, 1500);
      };

      if (directUploadSuccess) {
        showToast('Finalizing post...');

        let finalThumbnailUrl = null;
        if (coverImageFile) {
          try {
            showToast('Uploading cover image...');
            const thumbResponse = await reelService.getPresignedUrl(
              `cover_${Date.now()}_${coverImageFile.name}`,
              coverImageFile.type
            );
            const { uploadUrl: thumbUploadUrl } = thumbResponse;
            await axios.put(thumbUploadUrl, coverImageFile, {
              headers: { 'Content-Type': coverImageFile.type }
            });
            finalThumbnailUrl = thumbUploadUrl.split('?')[0];
          } catch (thumbErr) {
            console.warn('Failed to upload cover to S3:', thumbErr);
          }
        }

        const postData = {
          videoId,
          key,
          caption: postState.caption,
          audience: postState.audience,
          allowComments: postState.allowComments,
          allowDuet: postState.allowDuet,
          highQuality: postState.highQuality,
          saveToDevice: postState.saveToDevice,
          autoCaptions: postState.autoCaptions,
          captionLanguage: postState.captionLanguage,
          isAgeRestricted: postState.audienceControls,
          location: postState.location,
          music: musicPayload,
          edits: editsPayload,
          isRemix: duetVideo ? true : false,
          originalReel: duetVideo ? duetVideo._id : undefined,
          ...(finalThumbnailUrl && { thumbnailUrl: finalThumbnailUrl })
        };

        const response = await reelService.completeUpload(postData);

        if (response.success) {
          handleUploadSuccess();
        }
      } else {
        // Fallback: Upload via backend endpoint using Multipart/FormData
        showToast('Uploading via fallback server...');

        const formData = new FormData();
        formData.append('video', fileToUpload, fileName);
        formData.append('caption', postState.caption || '');
        formData.append('audience', postState.audience || 'everyone');
        formData.append('allowComments', postState.allowComments);
        formData.append('allowDuet', postState.allowDuet);
        formData.append('highQuality', postState.highQuality);
        formData.append('saveToDevice', postState.saveToDevice);
        formData.append('autoCaptions', postState.autoCaptions);
        formData.append('captionLanguage', postState.captionLanguage || 'English');
        formData.append('isAgeRestricted', postState.audienceControls);
        if (duetVideo) {
          formData.append('isRemix', 'true');
          formData.append('originalReel', duetVideo._id);
        }

        if (postState.location) {
          formData.append('location', typeof postState.location === 'object' ? JSON.stringify(postState.location) : postState.location);
        }
        if (musicPayload) {
          formData.append('music', JSON.stringify(musicPayload));
        }
        if (editsPayload) {
          formData.append('edits', JSON.stringify(editsPayload));
        }

        const response = await reelService.createReel(formData);

        if (response.success) {
          if (coverImageFile) {
            try {
              showToast('Uploading cover image...');
              const thumbFormData = new FormData();
              thumbFormData.append('thumbnail', coverImageFile);
              await reelService.updateReel(response.reel._id, thumbFormData);
            } catch (thumbErr) {
              console.warn('Failed to upload cover via fallback PUT:', thumbErr);
            }
          }
          handleUploadSuccess();
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      showToast(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };



  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);

        if (stage === 'editor' || stage === 'preview') {
          const isImage = file.type.startsWith('image/');
          const addClip = (actualDuration) => {
            setVideoDuration(prev => prev + actualDuration);
            setClipSequence(prev => [...prev, { file, url, duration: actualDuration, isImage, startOffset: 0, limitStart: 0, limitEnd: actualDuration }]);
            showToast('Clip added to sequence');

            if (isImage) {
              setVideoThumbnails(prev => {
                const newThumbs = Array(Math.ceil(actualDuration / 2)).fill(url);
                return [...prev, ...newThumbs];
              });
            } else {
              const video = document.createElement('video');
              video.src = url;
              video.muted = true;
              video.playsInline = true;
              video.onloadedmetadata = () => {
                const count = Math.ceil(actualDuration / 2);
                const canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = (video.videoHeight / video.videoWidth) * 160 || 284;
                const ctx = canvas.getContext('2d');

                const newThumbs = [];
                let i = 0;
                const captureNext = () => {
                  if (i >= count) {
                    setVideoThumbnails(prev => [...prev, ...newThumbs]);
                    return;
                  }
                  video.currentTime = i * 2;
                  video.onseeked = () => {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    newThumbs.push(canvas.toDataURL('image/jpeg', 0.6));
                    i++;
                    captureNext();
                  };
                };
                captureNext();
              };
            }
          };

          if (!isImage) {
            const tempVideo = document.createElement('video');
            tempVideo.src = url;
            tempVideo.onloadedmetadata = () => {
              let dur = tempVideo.duration;
              if (!dur || dur === Infinity || isNaN(dur)) {
                dur = 15; // Safe fallback for blobs without duration
              }
              addClip(dur);
            };
          } else {
            addClip(15);
          }
          e.target.value = '';
          return;
        }

        setVideoFile(file);
        setPreviewUrl(url);

        if (file.type.startsWith('image/')) {
          setVideoDuration(15); // Default 15s duration for image clips
        }

        // Direct to preview/editor since we skipped the custom gallery page
        pushStage('preview');
      } else {
        showToast('Please select a video or image file');
      }
    }
    e.target.value = '';
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };



  const handleEditorTimeUpdate = () => {
    if (!editorVideoRef.current) return;
    const video = editorVideoRef.current;
    const duration = video.duration;
    if (!duration) return;

    const currentClip = clipSequence[currentClipIndex];
    if (!currentClip) return;

    const storedDuration = currentClip.duration;
    const startOffset = currentClip.startOffset || 0;
    const speed = currentClip.speed || 1;

    let startTime = startOffset;
    let endTime = startOffset + storedDuration * speed;



    // Enforce end boundary and handle sequence progression
    if (video.currentTime >= endTime - 0.08) {
      if (isEditorPlaying) {
        if (clipSequence && clipSequence.length > 1) {
          if (currentClipIndex < clipSequence.length - 1) {
            console.log("Advancing to next clip:", currentClipIndex + 1);
            setCurrentClipIndex(currentClipIndex + 1);
            // Force immediate source switch and play is handled by useEffect on currentClipIndex
            return;
          } else {
            // End of sequence -> pause and reset to start of sequence
            console.log("End of sequence, pausing video");
            setIsEditorPlaying(false);
            video.pause();
            if (audioRef.current) audioRef.current.pause();
            setCurrentClipIndex(0);
            return;
          }
        } else {
          // End of single clip -> pause and reset to start of clip
          console.log("End of clip, pausing video");
          setIsEditorPlaying(false);
          video.pause();
          if (audioRef.current) audioRef.current.pause();
          video.currentTime = startTime;
          return;
        }
      } else {
        video.currentTime = endTime;
      }
    }

    // Enforce start boundary
    if (video.currentTime < startTime) {
      video.currentTime = startTime;
    }

    // Compute absolute globalTime on timeline for audio sync
    const pastDuration = clipSequence.slice(0, currentClipIndex).reduce((sum, c) => sum + c.duration, 0);
    const globalTime = pastDuration + (video.currentTime - startOffset) / speed;

    // MULTI-SOUND SEQUENTIAL SYNC
    if (isEditorPlaying && selectedSounds.length > 0) {
      // 1. Calculate which sound should be playing at current video time
      let accumulatedTime = 0;
      let activeSound = null;
      let activeSoundOffset = 0;

      for (const sound of selectedSounds) {
        const soundDuration = sound.clipDuration || 15;
        if (globalTime >= accumulatedTime && globalTime < (accumulatedTime + soundDuration)) {
          activeSound = sound;
          activeSoundOffset = globalTime - accumulatedTime;
          break;
        }
        accumulatedTime += soundDuration;
      }

      // 2. Sync audioRef
      if (activeSound) {
        const soundUrl = activeSound.url || activeSound.audioUrl;
        if (!audioRef.current || audioRef.current.src !== soundUrl) {
          if (audioRef.current) audioRef.current.pause();
          audioRef.current = new Audio(soundUrl);
          audioRef.current.currentTime = (activeSound.clipStart || 0) + activeSoundOffset;
        }

        audioRef.current.muted = isMusicMuted || addedVolume === 0;
        audioRef.current.volume = addedVolume / 100;
        const targetTime = (activeSound.clipStart || 0) + activeSoundOffset;
        const diff = Math.abs(audioRef.current.currentTime - targetTime);

        if (diff > 0.15) {
          audioRef.current.currentTime = targetTime;
        }

        if (audioRef.current.paused) {
          audioRef.current.play().catch(e => console.warn("Sync play failed:", e));
        }
      } else {
        // No sound for this part of the video
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      }
    } else {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  };

  const handlePreviewTimeUpdate = () => {
    if (!previewVideoRef.current || stage !== 'preview') return;
    const video = previewVideoRef.current;
    if (clipSequence.length === 0) return;
    const currentClip = clipSequence[currentPreviewClipIndex];
    if (!currentClip) return;

    const startOffset = currentClip.startOffset || 0;
    const storedDuration = currentClip.duration;
    const speed = currentClip.speed || 1;

    const startTime = startOffset;
    const endTime = startOffset + storedDuration * speed;

    // Enforce end boundary and handle sequence progression
    if (video.currentTime >= endTime - 0.08) {
      if (clipSequence.length > 1) {
        if (currentPreviewClipIndex < clipSequence.length - 1) {
          console.log("Preview advancing to next clip:", currentPreviewClipIndex + 1);
          setCurrentPreviewClipIndex(currentPreviewClipIndex + 1);
        } else {
          console.log("Preview looping back to start of sequence");
          setCurrentPreviewClipIndex(0);
        }
      } else {
        video.currentTime = startTime;
      }
    }

    // Enforce start boundary
    if (video.currentTime < startTime) {
      video.currentTime = startTime;
    }

    // Show/hide preview text overlays based on globalTime vs text timing
    const pastDuration = clipSequence.slice(0, currentPreviewClipIndex).reduce((a, c) => a + c.duration, 0);
    const globalTime = pastDuration + (video.currentTime - startOffset) / speed;

    textList.forEach(item => {
      const textOverlay = document.getElementById(`preview-text-overlay-${item.id}`);
      if (textOverlay) {
        const shouldShow = globalTime >= item.startTime && globalTime <= item.endTime;
        textOverlay.style.display = shouldShow ? '' : 'none';
      }
    });
  };

  useEffect(() => {
    if (stage === 'preview') {
      setCurrentPreviewClipIndex(0);
      if (previewVideoRef.current) {
        const currentClip = clipSequence[0];
        if (currentClip) {
          previewVideoRef.current.currentTime = currentClip.startOffset || 0;
          previewVideoRef.current.playbackRate = currentClip.speed || 1;
        }
      }
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'preview' && previewVideoRef.current && clipSequence.length > 0) {
      const video = previewVideoRef.current;
      const currentClip = clipSequence[currentPreviewClipIndex];
      if (currentClip) {
        video.currentTime = currentClip.startOffset || 0;
        video.playbackRate = currentClip.speed || 1;
        video.play().catch(err => {
          if (err.name !== 'AbortError') console.warn("Failed to play preview clip:", err);
        });
      }
    }
  }, [currentPreviewClipIndex, stage, clipSequence]);

  const toggleEditorPlay = () => {
    if (editorVideoRef.current) {
      const video = editorVideoRef.current;

      const refreshClipUrl = (index) => {
        const clip = clipSequence[index];
        if (clip && clip.file) {
          const newUrl = URL.createObjectURL(clip.file);
          console.log("Re-hydrating clip URL:", index);
          setClipSequence(prev => {
            const next = [...prev];
            next[index] = { ...next[index], url: newUrl };
            return next;
          });
          return newUrl;
        }
        return null;
      };

      // Safety check: if src is missing or invalid, restore it
      if (!video.src || video.src === window.location.href) {
        const currentUrl = clipSequence.length > 0 ? clipSequence[currentClipIndex]?.url : previewUrl;
        if (currentUrl) video.src = currentUrl;
      }

      if (isEditorPlaying) {
        video.pause();
        if (audioRef.current) audioRef.current.pause();
      } else {
        const currentClip = clipSequence[currentClipIndex];
        const startTime = currentClip ? (currentClip.startOffset || 0) : 0;
        const endTime = currentClip ? (startTime + currentClip.duration * (currentClip.speed || 1)) : (video.duration || 0);

        if (video.currentTime >= endTime - 0.05 || video.currentTime < startTime) {
          video.currentTime = startTime;
        }

        video.play().catch(error => {
          console.warn("Manual playback initiation failed:", error.name);
          // Re-hydration is now handled by the video tag's onError
        });

        if (selectedSounds.length > 0) {
          let accumulatedTime = 0;
          let startSound = null;
          let startOffset = 0;

          for (const sound of selectedSounds) {
            const d = sound.clipDuration || 15;
            if (video.currentTime >= accumulatedTime && video.currentTime < (accumulatedTime + d)) {
              startSound = sound;
              startOffset = video.currentTime - accumulatedTime;
              break;
            }
            accumulatedTime += d;
          }

          if (startSound) {
            const url = startSound.url || startSound.audioUrl;
            if (!audioRef.current || audioRef.current.src !== url) {
              audioRef.current = new Audio(url);
            }
            audioRef.current.currentTime = (startSound.clipStart || 0) + startOffset;
            audioRef.current.muted = isMusicMuted || addedVolume === 0;
            audioRef.current.volume = addedVolume / 100;
            audioRef.current.play().catch(e => console.warn("Editor play audio failed:", e));
          }
        }
      }
      setIsEditorPlaying(!isEditorPlaying);
    }
  };

  const handleEditorSpeedChange = (speed) => {
    setEditorSpeed(speed);
    if (editorVideoRef.current) {
      editorVideoRef.current.playbackRate = speed;
    }
    setEditorSettings(prev => ({ ...prev, speed }));

    // Update the current clip's speed and duration in clipSequence
    if (clipSequence.length > 0) {
      setClipSequence(prev => {
        const next = [...prev];
        const c = { ...next[currentClipIndex] };
        if (!c) return prev;
        const originalSpeed = c.speed || 1;
        c.speed = speed;
        if (c.originalDuration === undefined) {
          c.originalDuration = c.duration * originalSpeed;
        }
        c.duration = c.originalDuration / speed;
        next[currentClipIndex] = c;

        // Recalculate total video duration
        const totalDur = next.reduce((sum, cl) => sum + cl.duration, 0);
        setVideoDuration(totalDur);
        return next;
      });
    }
  };

  const handleCropPointerDown = (e) => {
    if (editorSubPanel !== 'crop') return;
    if (e.pointerType === 'touch') return; // Ignore touch pointers; let native touch listeners handle it.
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPan = { ...cropPan };

    const moveHandler = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setCropPan({
        x: initialPan.x + dx,
        y: initialPan.y + dy
      });
    };

    const upHandler = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch (err) { }
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);
    };

    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  };

  const handleCropTouchStart = (e) => {
    if (editorSubPanel !== 'crop') return;
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialTouchDistanceRef.current = dist;
      initialTouchScaleRef.current = cropScale;

      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
      initialTouchAngleRef.current = angle;
      initialTouchRotationRef.current = cropRotation;

      isPinchingRef.current = true;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      initialPanRef.current = { ...cropPan };
      isPinchingRef.current = false;
    }
  };

  const handleCropTouchMove = (e) => {
    if (editorSubPanel !== 'crop') return;
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);

      if (!isPinchingRef.current) {
        // Initialize pinch on-the-fly to handle staggered touches robustly
        initialTouchDistanceRef.current = dist;
        initialTouchScaleRef.current = cropScale;
        initialTouchAngleRef.current = angle;
        initialTouchRotationRef.current = cropRotation;
        isPinchingRef.current = true;
        return;
      }

      // Scale
      if (initialTouchDistanceRef.current > 0) {
        const factor = dist / initialTouchDistanceRef.current;
        const newScale = Math.max(0.3, Math.min(4, initialTouchScaleRef.current * factor));
        setCropScale(newScale);
      }

      // Rotate
      const angleDiff = angle - initialTouchAngleRef.current;
      setCropRotation(initialTouchRotationRef.current + angleDiff);
    } else if (e.touches.length === 1 && !isPinchingRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      setCropPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy
      });
    }
  };

  const handleCropTouchEnd = (e) => {
    if (e.touches.length < 2) {
      isPinchingRef.current = false;
      initialTouchDistanceRef.current = 0;
      initialTouchAngleRef.current = 0;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      initialPanRef.current = { ...cropPan };
    }
  };

  // Keep handlers ref updated to avoid listener re-binding during active gestures
  cropHandlersRef.current = {
    handleCropTouchStart,
    handleCropTouchMove,
    handleCropTouchEnd
  };

  useEffect(() => {
    const el = cropContainerRef.current;
    if (!el) return;

    const startHandler = (e) => {
      if (editorSubPanel !== 'crop') return;
      cropHandlersRef.current?.handleCropTouchStart(e);
    };

    const moveHandler = (e) => {
      if (editorSubPanel !== 'crop') return;
      e.preventDefault(); // Lock browser scrolling and zooming gestures
      cropHandlersRef.current?.handleCropTouchMove(e);
    };

    const endHandler = (e) => {
      if (editorSubPanel !== 'crop') return;
      cropHandlersRef.current?.handleCropTouchEnd(e);
    };

    const wheelHandler = (e) => {
      if (editorSubPanel !== 'crop') return;
      e.preventDefault(); // Stop native page scroll

      const delta = -e.deltaY;
      if (e.shiftKey) {
        // Shift + Scroll: Rotate the video inside frame
        const rotationStep = delta > 0 ? 5 : -5;
        setCropRotation((prev) => prev + rotationStep);
      } else {
        // Normal Scroll: Zoom in / Zoom out the video
        const scaleStep = delta > 0 ? 0.05 : -0.05;
        setCropScale((prev) => Math.max(0.3, Math.min(4, prev + scaleStep)));
      }
    };

    el.addEventListener('touchstart', startHandler, { passive: false });
    el.addEventListener('touchmove', moveHandler, { passive: false });
    el.addEventListener('touchend', endHandler, { passive: false });
    el.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      el.removeEventListener('touchstart', startHandler);
      el.removeEventListener('touchmove', moveHandler);
      el.removeEventListener('touchend', endHandler);
      el.removeEventListener('wheel', wheelHandler);
    };
  }, [editorSubPanel]);

  const handleVideoEditToolClick = (toolId) => {
    if (toolId === 'done') {
      setFocusedTrack(null);
      setEditorSubPanel(null);
      return;
    }

    if (toolId === 'speed') {
      setEditorSubPanel(prev => prev === 'speed' ? null : 'speed');
      return;
    }

    if (toolId === 'crop') {
      setInitialCropSettings({
        scale: cropScale,
        pan: { ...cropPan },
        ratio: cropAspectRatio,
        rotation: cropRotation
      });
      setEditorSubPanel('crop');
      return;
    }

    if (toolId === 'delete') {
      setEditorSubPanel(null);
      if (clipSequence.length > 1) {
        const nextIndex = Math.max(0, currentClipIndex - 1);
        const newSequence = clipSequence.filter((_, idx) => idx !== currentClipIndex);
        setClipSequence(newSequence);
        setCurrentClipIndex(nextIndex);
        const newDuration = newSequence.reduce((sum, c) => sum + c.duration, 0);
        setVideoDuration(newDuration);
        setFocusedTrack(null);
        showToast('Clip deleted');
      } else {
        // Only 1 clip left, show exit flow confirmation to discard the video
        setActiveSheet('exit-flow-confirmation');
      }
      return;
    }

    if (toolId === 'split') {
      setEditorSubPanel(null);
      if (!editorVideoRef.current) return;
      const video = editorVideoRef.current;
      const currentClip = clipSequence[currentClipIndex];
      if (!currentClip) return;

      const splitPointRaw = video.currentTime;
      const speed = currentClip.speed || 1;
      const clipStartOffset = currentClip.startOffset || 0;
      const totalDuration = currentClip.duration;

      const initialTrimmedStart = clipStartOffset;
      const initialTrimmedEnd = clipStartOffset + totalDuration * speed;

      const elapsedRaw = splitPointRaw - initialTrimmedStart;
      const elapsedTimeline = elapsedRaw / speed;

      // Ensure we don't split too close to the beginning or end (min 0.5s)
      const totalTrimmedDurationTimeline = (initialTrimmedEnd - initialTrimmedStart) / speed;
      if (elapsedTimeline < 0.5 || (totalTrimmedDurationTimeline - elapsedTimeline) < 0.5) {
        showToast('Clip too short to split');
        return;
      }

      const c1 = {
        ...currentClip,
        startOffset: initialTrimmedStart,
        duration: elapsedTimeline,
        originalDuration: elapsedRaw,
        speed,
        limitStart: currentClip.limitStart !== undefined ? currentClip.limitStart : initialTrimmedStart,
        limitEnd: splitPointRaw
      };

      const c2 = {
        ...currentClip,
        startOffset: splitPointRaw,
        duration: totalTrimmedDurationTimeline - elapsedTimeline,
        originalDuration: (initialTrimmedEnd - splitPointRaw),
        speed,
        limitStart: splitPointRaw,
        limitEnd: currentClip.limitEnd !== undefined ? currentClip.limitEnd : initialTrimmedEnd
      };

      const newSequence = [
        ...clipSequence.slice(0, currentClipIndex),
        c1,
        c2,
        ...clipSequence.slice(currentClipIndex + 1)
      ];

      setClipSequence(newSequence);

      // Update global duration state immediately
      const newTotalDur = newSequence.reduce((sum, c) => sum + c.duration, 0);
      setVideoDuration(newTotalDur);

      showToast('Video split successfully');

      // Pause playback and keep playhead at the split position
      setIsEditorPlaying(false);
      video.pause();
    }
  };

  const handleStoryPostUi = () => {
    setActiveSheet(null);
    showToast('Story posted');
  };

  const handleSelectHashtag = (hashtagLabel) => {
    setPostState((currentState) => ({
      ...currentState,
      caption: currentState.caption.replace(/(^|\s)#[a-z0-9_]*$/i, `$1${hashtagLabel} `),
    }));
  };

  const handleSelectMention = (username) => {
    setPostState((currentState) => {
      const currentCaption = currentState.caption || '';
      // Check if we are currently in the middle of typing a mention (ends with @ or @something)
      const mentionMatch = currentCaption.match(/(^|\s)(@[a-z0-9._]*)$/i);

      let newCaption;
      if (mentionMatch) {
        // Replace the partial mention
        newCaption = currentCaption.replace(/(^|\s)@[a-z0-9._]*$/i, `$1@${username} `);
      } else {
        // Just append it with a space if needed
        const needsSpace = currentCaption.length > 0 && !currentCaption.endsWith(' ');
        newCaption = `${currentCaption}${needsSpace ? ' ' : ''}@${username} `;
      }

      return {
        ...currentState,
        caption: newCaption,
      };
    });
    setMentionSearchQuery('');
    popStage();
  };

  const handleEditorTabClick = (tabId) => {
    setEditorTab(tabId);

    if (tabId === 'sync') {
      setSyncingSound(true);
      return;
    }

    if (tabId === 'sound') {
      setActiveSheet('replace-sound');
      return;
    }

    if (tabId === 'edit') {
      setEditorAction('speed');
      return;
    }

    showToast(`${tabId.charAt(0).toUpperCase()}${tabId.slice(1)} panel ready`);
  };



  const handleEditorActionClick = (actionId) => {
    if (actionId === 'rotate') {
      setEditorSettings((currentSettings) => ({
        ...currentSettings,
        rotation: (currentSettings.rotation + 90) % 360,
      }));
      setEditorAction(actionId);
      return;
    }

    if (actionId === 'delete') {
      // Future: Implement clip deletion
      setEditorAction(actionId);
      return;
    }

    setEditorAction(actionId);
  };

  const renderCameraHeader = () => (
    <div
      className="absolute inset-x-0 top-0 z-20 px-4 pb-4"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
    >
      <div className="flex items-center justify-between">
        <button type="button" onClick={handleCloseOrBack} className={themedOverlayButtonClass}>
          <BiX size={24} />
        </button>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setActiveSheet('music-library')}
            className={`${themedFloatingPillClass} max-w-[200px] overflow-hidden flex items-center gap-2 ${selectedSound?.title && !['Original sound', 'Original audio', 'Original Audio'].includes(selectedSound.title) ? 'pr-1' : ''}`}
          >
            <BiMusic size={15} className={selectedSound?.title && !['Original sound', 'Original audio', 'Original Audio'].includes(selectedSound.title) ? 'animate-pulse text-[#fe2c55]' : ''} />
            <span className="truncate">
              {selectedSound?.title && !['Original sound', 'Original audio', 'Original Audio'].includes(selectedSound.title) ? selectedSound.title : 'Add sound'}
            </span>
            {selectedSound?.title && !['Original sound', 'Original audio', 'Original Audio'].includes(selectedSound.title) && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSounds([]);
                  showToast('Sound removed');
                }}
                className="ml-1 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <BiX size={16} className="text-white/60" />
              </div>
            )}
          </button>

        </div>
        <span className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );

  const renderCameraSideTools = () => (
    <div
      className={`absolute right-4 z-20 flex flex-col items-center gap-5 transition-all duration-300 ${isFiltersTrayOpen ? 'top-[10%]' : 'top-[14%]'
        }`}
    >
      {CREATE_SIDE_TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => handleCameraToolClick(tool.id)}
          className="group flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <span className={getThemedCameraToolButtonClass(activeCameraTool === tool.id)}>
            {getToolIcon(tool.id, 20, false, selectedSpeed, selectedZoom)}
          </span>
          <span className="text-[10px] font-bold tracking-wide uppercase text-white shadow-black drop-shadow-md">
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  );

  const renderFiltersTray = () => (
    <div className="mb-4 px-3 pb-3 pt-3">

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {activeFilterOptions.map((filterName) => (
          <button
            key={filterName}
            type="button"
            onClick={() => setSelectedFilter(filterName)}
            className="w-16 shrink-0 text-center text-white active:opacity-70"
          >
            <span
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border text-[10px] overflow-hidden ${selectedFilter === filterName
                  ? isDarkMode
                    ? 'border-white ring-2 ring-white/20'
                    : 'border-black ring-2 ring-black/10'
                  : isDarkMode
                    ? 'border-white/15'
                    : 'border-black/10'
                }`}
            >
              <div
                className="w-full h-full bg-[#2c2c2e]"
                style={{
                  filter: FILTER_PRESETS[filterName] || 'none',
                  background: filterPreviewFrame ? `url(${filterPreviewFrame}) center/cover` : undefined
                }}
              />
            </span>
            <span
              className={`mt-2 block text-[10px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${selectedFilter === filterName
                  ? 'text-white font-bold'
                  : 'text-white/80'
                }`}
            >
              {filterName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCameraBottom = () => (
    <div className={themedBottomPanelClass}>
      {activeCameraTool === 'speed' && (
        <div className="mb-5 flex items-center justify-center gap-4 text-[13px] font-medium text-white/80">
          {SPEED_OPTIONS.map((speedOption) => (
            <button
              key={speedOption}
              type="button"
              onClick={() => {
                setSelectedSpeed(speedOption);
                setActiveCameraTool(null);
              }}
              className={getDurationButtonClass(selectedSpeed === speedOption)}
            >
              {speedOption}
            </button>
          ))}
        </div>
      )}

      {activeCameraTool === 'zoom' && (
        <div className="mb-5 flex items-center justify-center gap-4 text-[13px] font-medium text-white/80">
          {ZOOM_OPTIONS.map((zoomOption) => (
            <button
              key={zoomOption}
              type="button"
              onClick={() => {
                setSelectedZoom(zoomOption);
                setActiveCameraTool(null);
              }}
              className={getDurationButtonClass(selectedZoom === zoomOption)}
            >
              {zoomOption}
            </button>
          ))}
        </div>
      )}

      <div className={themedDurationRowClass}>
        {DURATION_OPTIONS.map((durationOption) => (
          <button
            key={durationOption}
            type="button"
            onClick={() => setSelectedDuration(durationOption)}
            className={getDurationButtonClass(selectedDuration === durationOption)}
          >
            {durationOption}
          </button>
        ))}
      </div>

      {isFiltersTrayOpen && renderFiltersTray()}

      <div className="flex items-end justify-between px-2">
        {/* Left: Effects (hidden when recorded) */}
        <div className="flex w-[92px] items-center justify-start">
          {recordStatus !== 'recorded' && (
            <button
              type="button"
              onClick={() => handleCameraToolClick('filters')}
              className={`w-[74px] text-center ${themedUtilityTextClass} active:opacity-70`}
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-[radial-gradient(circle_at_30%_30%,#ffd8e6_0%,#f4abc1_48%,#d86583_100%)] shadow-[0_10px_20px_rgba(223,109,141,0.32)] backdrop-blur-sm">
                <span className="translate-y-[1px] text-[22px] leading-none drop-shadow-sm" role="img" aria-label="Effects emoji">
                  😊
                </span>
              </span>
              <span className="mt-2 block text-[11px] font-medium">Effects</span>
            </button>
          )}
        </div>

        {/* Center: Record button OR Confirm/Discard buttons */}
        <div className="flex flex-col items-center">
          {recordStatus === 'recorded' ? (
            <div className="flex flex-col items-center gap-6">
              <span className="text-[20px] font-bold tracking-[0.1em] text-white/90 drop-shadow-md">
                {formatElapsed(recordedSeconds)}
              </span>
              <div className="flex items-center gap-8">
                <button
                  type="button"
                  onClick={() => setActiveSheet('discard-last-clip')}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.3)] active:scale-90 transition-transform"
                >
                  <BiX size={32} />
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClip}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fe2c55] text-white active:scale-90 transition-transform shadow-[0_4px_20px_rgba(254,44,85,0.4)]"
                >
                  <BiCheck size={36} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="mb-2 text-[12px] font-medium tracking-[0.18em] text-white/90">
                {formatElapsed(recordedSeconds)}
              </span>
              <button
                type="button"
                onMouseDown={handleRecordPressStart}
                onMouseUp={handleRecordPressEnd}
                onMouseLeave={handleRecordPressLeave}
                onTouchStart={handleRecordPressStart}
                onTouchEnd={handleRecordPressEnd}
                className={`relative flex items-center justify-center select-none active:scale-95 ${isFiltersTrayOpen ? 'h-20 w-20' : 'h-24 w-24'
                  }`}
              >
                <span className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-md" />
                <span
                  className={`absolute rounded-full border-[4px] border-white/70 ${isFiltersTrayOpen ? 'inset-[12px]' : 'inset-[14px]'
                    }`}
                />
                <span
                  className={`relative flex items-center justify-center rounded-full bg-[#fe2c55] transition-all ${isFiltersTrayOpen ? 'h-[48px] w-[48px]' : 'h-[54px] w-[54px]'
                    } ${recordStatus === 'recording' ? 'rounded-[16px]' : ''
                    }`}
                >
                  {recordStatus === 'recording' ? (
                    <span className="h-5 w-5 rounded-[4px] bg-white" />
                  ) : (
                    <span className="h-5 w-5 rounded-full bg-white/0" />
                  )}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Right: Upload (hidden when recorded) */}
        <div className="flex w-[92px] items-center justify-end gap-2">
          {recordStatus !== 'recorded' && (
            <button
              type="button"
              onClick={triggerFilePicker}
              className={`w-[74px] text-center ${themedUtilityTextClass} active:opacity-70`}
            >
              <span className={themedUtilityBadgeClass}>
                <div className="flex h-full w-full items-center justify-center bg-white/10">
                  <BiImageAlt size={24} className="text-white/60" />
                </div>
              </span>
              <span className="mt-2 block text-[11px] font-medium">Upload</span>
            </button>
          )}
        </div>
      </div>

      {recordStatus !== 'recorded' && (
        <div className={themedModeTabsClass}>
          {['camera'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCaptureMode(mode)}
              className={`relative capitalize ${captureMode === mode ? 'text-white' : ''
                }`}
            >
              {mode}
              {captureMode === mode && (
                <span className="absolute left-1/2 top-[calc(100%+8px)] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderCameraStage = () => {
    // Parse selectedDuration for progress bar calculation
    let maxDurationSeconds = 15;
    if (selectedDuration.includes('m')) {
      maxDurationSeconds = parseFloat(selectedDuration) * 60;
    } else if (selectedDuration.includes('s')) {
      maxDurationSeconds = parseFloat(selectedDuration);
    }
    const progressPercent = (recordedSeconds / maxDurationSeconds) * 100;

    const supportsHardwareZoom = (() => {
      if (!instacamRef.current || !instacamRef.current.v) return false;
      const videoTrack = instacamRef.current.v.getVideoTracks()[0];
      if (!videoTrack || !videoTrack.getCapabilities) return false;
      try {
        return !!videoTrack.getCapabilities().zoom;
      } catch (e) {
        return false;
      }
    })();

    return (
      <div
        ref={cameraStageRef}
        className={`relative h-full w-full overflow-hidden ${isDarkMode ? 'bg-black text-white' : 'bg-[var(--theme-page-bg)] text-white'}`}
        style={{ touchAction: 'none' }}
      >
        <style>
          {`
            [data-instacam] {
              width: 100% !important;
              height: 100% !important;
              position: absolute !important;
              inset: 0 !important;
            }
            [data-instacam] canvas {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
            }
          `}
        </style>
        <div className={duetVideo ? "absolute top-1/2 -translate-y-1/2 w-full aspect-[9/8] flex flex-row bg-black z-0 overflow-hidden" : "absolute inset-0 z-0 flex flex-row"}>
          {duetVideo ? (
            <>
              {/* Left Column: Original Video */}
              <div className="w-1/2 h-full bg-black relative border-r border-white/10 flex items-center justify-center">
                <video
                  ref={duetVideoPlayerRef}
                  src={duetVideo.video.url}
                  className="w-full h-full object-cover"
                  playsInline
                  loop
                  muted={isDuetMuted}
                />
                {recordStatus === 'recorded' && previewUrl && (
                  <video
                    src={duetVideo.video.url}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    playsInline
                    loop
                    autoPlay
                    muted={isDuetMuted}
                  />
                )}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1 z-20">
                  <span className="w-1.5 h-1.5 bg-[#fe2c55] rounded-full animate-pulse"></span>
                  @{duetVideo.user?.username || 'creator'}
                </div>
              </div>
              {/* Right Column: Camera Canvas */}
              <div className="w-1/2 h-full bg-black relative">
                <canvas
                  ref={canvasRef}
                  onDoubleClick={handleCanvasDoubleClick}
                  className="w-full h-full object-cover transition-all duration-300"
                />
                {recordStatus === 'recorded' && previewUrl && (
                  <video
                    src={previewUrl}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    playsInline
                    loop
                    autoPlay
                    muted={isVideoMuted}
                    style={{
                      transform: supportsHardwareZoom ? 'none' : `scale(${parseFloat(selectedZoom) || 1.0})`,
                      transformOrigin: 'center'
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                onDoubleClick={handleCanvasDoubleClick}
                className="h-full w-full object-cover transition-all duration-300"
              />
              {recordStatus === 'recorded' && previewUrl && (
                <video
                  src={previewUrl}
                  className="absolute inset-0 h-full w-full object-cover z-10"
                  playsInline
                  loop
                  autoPlay
                  muted={isVideoMuted}
                  ref={(el) => {
                    if (el) el.playbackRate = parseFloat(selectedSpeed) || 1;
                  }}
                  style={{
                    transform: supportsHardwareZoom ? 'none' : `scale(${parseFloat(selectedZoom) || 1.0})`,
                    transformOrigin: 'center'
                  }}
                />
              )}
            </>
          )}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="hidden"
          />
        </div>

        {/* Progress Bar */}
        <div className="absolute top-0 inset-x-0 z-30 h-1.5 bg-black/20 px-1 py-1">
          <div className="h-full bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#fe2c55] transition-all duration-75 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {renderCameraHeader()}
        {renderCameraSideTools()}
        {renderCameraBottom()}

        {/* Countdown Overlay */}
        {activeCountdown !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="animate-ping-once text-[120px] font-black text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {activeCountdown}
            </div>
          </div>
        )}
      </div>
    );
  };


  const renderEditorAdjustmentPanel = () => {
    if (editorAction === 'speed') {
      return null;
    }

    if (editorAction === 'volume') {
      return (
        <div className="px-5 pb-6 pt-2 text-white">
          <div className="mb-6 text-center text-[13px] text-white/65">{editorSettings.volume}%</div>
          <input
            type="range"
            min="0"
            max="200"
            step="1"
            value={editorSettings.volume}
            onChange={(event) =>
              setEditorSettings((currentSettings) => ({
                ...currentSettings,
                volume: Number(event.target.value),
              }))
            }
            className="w-full accent-[#fe2c55]"
          />
          <div className="mt-5 flex items-center justify-between text-[15px]">
            <button type="button" className="text-white/70" onClick={() => showToast('Volume edit cancelled')}>
              Cancel
            </button>
            <span className="font-semibold">Volume</span>
            <button type="button" className="font-medium text-white" onClick={() => showToast('Volume saved')}>
              Save
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const PIXELS_PER_SECOND = 60;

  const handleTimelineScroll = (e) => {
    if (ignoreScrollRef.current) {
      ignoreScrollRef.current = false;
      return;
    }
    if (!editorVideoRef.current || isEditorPlaying) return;

    const scrollLeft = e.currentTarget.scrollLeft;
    const newGlobalTime = scrollLeft / PIXELS_PER_SECOND;

    let acc = 0;
    let foundIndex = 0;
    let localTime = 0;
    for (let i = 0; i < clipSequence.length; i++) {
      if (newGlobalTime >= acc && newGlobalTime < acc + clipSequence[i].duration) {
        foundIndex = i;
        localTime = newGlobalTime - acc;
        break;
      }
      acc += clipSequence[i].duration;
    }
    // Handle edge case for end of sequence
    if (newGlobalTime >= videoDuration && clipSequence.length > 0) {
      foundIndex = Math.max(0, clipSequence.length - 1);
      localTime = clipSequence[foundIndex].duration;
    }

    if (foundIndex !== currentClipIndex) {
      setCurrentClipIndex(foundIndex);
    }

    const currentClip = clipSequence[foundIndex];
    const startOffset = currentClip?.startOffset || 0;
    const speed = currentClip?.speed || 1;
    const targetRawTime = startOffset + localTime * speed;

    if (Math.abs(editorVideoRef.current.currentTime - targetRawTime) > 0.05) {
      editorVideoRef.current.currentTime = targetRawTime;
    }

    const timeSpan = document.getElementById('editor-playback-time');
    if (timeSpan) {
      const formatted = formatPlaybackTime(newGlobalTime, videoDuration);
      if (timeSpan.innerText !== formatted) {
        timeSpan.innerText = formatted;
      }
    }

    // Update text overlays visibility when scrubbing while paused
    textListRef.current.forEach(item => {
      const textOverlay = document.getElementById(`editor-text-overlay-${item.id}`);
      if (textOverlay) {
        const shouldShow = newGlobalTime >= item.startTime && newGlobalTime <= item.endTime;
        textOverlay.style.display = shouldShow ? '' : 'none';
      }
    });
  };

  useEffect(() => {
    let rafId;
    const updateScroll = () => {
      if (stage === 'editor' && isEditorPlaying && editorVideoRef.current) {
        const timeline = document.getElementById('editor-timeline');
        const currentClip = clipSequence[currentClipIndex];
        const startOffset = currentClip?.startOffset || 0;
        const speed = currentClip?.speed || 1;
        const pastDuration = clipSequence.slice(0, currentClipIndex).reduce((a, c) => a + c.duration, 0);
        const globalTime = pastDuration + Math.max(0, (editorVideoRef.current.currentTime - startOffset) / speed);

        if (timeline) {
          timeline.scrollLeft = globalTime * PIXELS_PER_SECOND;
        }

        const timeSpan = document.getElementById('editor-playback-time');
        if (timeSpan) {
          const formatted = formatPlaybackTime(globalTime, videoDuration);
          if (timeSpan.innerText !== formatted) {
            timeSpan.innerText = formatted;
          }
        }

        // Show/hide text overlays based on globalTime vs text timing
        textListRef.current.forEach(item => {
          const textOverlay = document.getElementById(`editor-text-overlay-${item.id}`);
          if (textOverlay) {
            const shouldShow = globalTime >= item.startTime && globalTime <= item.endTime;
            textOverlay.style.display = shouldShow ? '' : 'none';
          }
        });
      }
      rafId = requestAnimationFrame(updateScroll);
    };

    if (isEditorPlaying) {
      rafId = requestAnimationFrame(updateScroll);
    }

    return () => cancelAnimationFrame(rafId);
  }, [stage, isEditorPlaying, currentClipIndex, clipSequence]);

  const renderEditorStage = () => {
    const timelineWidth = videoDuration * PIXELS_PER_SECOND;

    return (
      <div className="flex h-full flex-col bg-black text-white overflow-hidden">
        {/* Top Header */}
        <div
          className="flex items-center justify-between px-4 pb-4"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
        >
          <button
            type="button"
            onClick={handleCloseOrBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md active:opacity-70"
          >
            <BiChevronDown size={28} />
          </button>
          <button
            type="button"
            onClick={() => popStage()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4d70ff] text-white shadow-lg active:scale-95"
          >
            <BiChevronRight size={24} />
          </button>
        </div>

        {/* Video Preview */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
          <div
            onClick={() => setFocusedTrack('video')}
            className="relative h-full max-h-[380px] overflow-hidden rounded-[16px] bg-black shadow-2xl border border-white/5 transition-all duration-300 cursor-pointer"
            style={{
              aspectRatio: cropAspectRatio === '9:16' ? '9/16' : (cropAspectRatio === '1:1' ? '1/1' : (cropAspectRatio === '16:9' ? '16/9' : (cropAspectRatio === '4:5' ? '4/5' : '9/16'))),
              height: '100%',
            }}
          >

            {/* Inner container wrapper that applies zoom and pan */}
            <div
              ref={cropContainerRef}
              className={`w-full h-full relative ${editorSubPanel === 'crop' ? 'cursor-move select-none touch-none' : ''}`}
              style={{
                transform: `scale(${cropScale}) translate(${cropPan.x}px, ${cropPan.y}px)`,
                transformOrigin: 'center center',
              }}
              onPointerDown={handleCropPointerDown}
            >
              {previewUrl ? (
                (clipSequence.length > 0 ? clipSequence[currentClipIndex]?.isImage : videoFile?.type?.startsWith('image/')) ? (
                  <img
                    src={clipSequence.length > 0 ? clipSequence[currentClipIndex].url : previewUrl}
                    className="h-full w-full object-cover"
                    alt="Preview"
                    style={{
                      transform: `rotate(${editorSettings.rotation + cropRotation}deg)`,
                      transformOrigin: 'center center',
                      filter: getCombinedFilter()
                    }}
                  />
                ) : (
                  <video
                    key={`editor-video-${currentClipIndex}-${clipSequence[currentClipIndex]?.url || 'none'}`}
                    ref={editorVideoRef}
                    src={clipSequence.length > 0 ? clipSequence[currentClipIndex].url : previewUrl}
                    className="h-full w-full object-cover"
                    muted={isVideoMuted}
                    playsInline
                    onTimeUpdate={handleEditorTimeUpdate}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      const currentClip = clipSequence[currentClipIndex];
                      const startOffset = currentClip?.startOffset || 0;
                      video.currentTime = startOffset;
                      video.playbackRate = currentClip?.speed || editorSpeed || 1;
                    }}
                    onError={() => {
                      console.log("Video error, attempting re-hydration...");
                      const currentClip = clipSequence[currentClipIndex];
                      if (currentClip && currentClip.file) {
                        const newUrl = URL.createObjectURL(currentClip.file);
                        setClipSequence(prev => {
                          const next = [...prev];
                          next[currentClipIndex] = { ...next[currentClipIndex], url: newUrl };
                          return next;
                        });
                      }
                    }}
                    onEnded={() => {
                      if (clipSequence && clipSequence.length > 1) {
                        if (currentClipIndex < clipSequence.length - 1) {
                          setCurrentClipIndex(currentClipIndex + 1);
                        } else {
                          setCurrentClipIndex(0);
                        }
                      } else {
                        const startTime = clipSequence[0]?.startOffset || 0;
                        if (editorVideoRef.current) {
                          editorVideoRef.current.currentTime = startTime;
                          editorVideoRef.current.play().catch(() => { });
                        }
                      }
                    }}
                    style={{
                      transform: `rotate(${editorSettings.rotation + cropRotation}deg)`,
                      transformOrigin: 'center center',
                      filter: getCombinedFilter()
                    }}
                  />
                )
              ) : (
                <MediaPreview image={selectedMedia.image} rotation={editorSettings.rotation + cropRotation} filter={selectedFilter} className="h-full w-full" />
              )}
            </div>

            {/* Crop guide lines & corners overlay */}
            {editorSubPanel === 'crop' && (
              <div className="absolute inset-0 z-30 pointer-events-none border border-white/80 rounded-[16px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Central Blue Crosshair Lines */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-[#3b82f6] -translate-x-1/2 opacity-90" />
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-[#3b82f6] -translate-y-1/2 opacity-90" />
              </div>
            )}

            {/* Multiple Text Overlays Display - visibility controlled by RAF loop during playback */}
            {textList.map((overlay) => {
              const pastDuration = clipSequence.slice(0, currentClipIndex).reduce((a, c) => a + c.duration, 0);
              const currentTime = editorVideoRef.current?.currentTime || 0;
              const globalTime = pastDuration + currentTime;
              const initiallyVisible = globalTime >= overlay.startTime && globalTime <= overlay.endTime;
              const isSelected = selectedTextId === overlay.id;

              return (
                <div
                  key={overlay.id}
                  id={`editor-text-overlay-${overlay.id}`}
                  className="absolute inset-0 z-30 overflow-hidden pointer-events-none"
                  style={{ display: initiallyVisible ? '' : 'none' }}
                >
                  <div
                    className={`absolute pointer-events-auto cursor-move select-none touch-none transition-all ${
                      isSelected && isTextSelected ? 'ring-2 ring-white/30 rounded-lg p-2' : ''
                    }`}
                    style={{
                      left: `calc(50% + ${overlay.x}px)`,
                      top: `calc(50% + ${overlay.y}px)`,
                      transform: `translate(-50%, -50%) rotate(${overlay.rotation || 0}deg)`,
                      padding: '10px'
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const target = e.currentTarget;
                      target.setPointerCapture(e.pointerId);
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const initialX = overlay.x;
                      const initialY = overlay.y;
                      let hasMoved = false;

                      // Synchronize composer states with this selected text item
                      setSelectedTextId(overlay.id);
                      setOverlayText(overlay.text);
                      setTextStartTime(overlay.startTime);
                      setTextEndTime(overlay.endTime);
                      textStartTimeRef.current = overlay.startTime;
                      textEndTimeRef.current = overlay.endTime;
                      setTextPos({ x: overlay.x, y: overlay.y });
                      setTextRotation(overlay.rotation || 0);
                      setOverlayColor(overlay.color || '#ffffff');
                      setOverlayFont(overlay.font || 'Standard');
                      setOverlayFontSize(overlay.fontSize || 28);

                      setIsTextSelected(true);
                      setSelectedStickerId(null);

                      const moveHandler = (moveEvent) => {
                        const dx = moveEvent.clientX - startX;
                        const dy = moveEvent.clientY - startY;
                        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
                        setTextPos({ x: initialX + dx, y: initialY + dy });
                      };

                      const upHandler = () => {
                        if (!hasMoved) {
                          setIsEditingText(true);
                        }
                        target.removeEventListener('pointermove', moveHandler);
                        target.removeEventListener('pointerup', upHandler);
                      };

                      target.addEventListener('pointermove', moveHandler);
                      target.addEventListener('pointerup', upHandler);
                    }}
                  >
                    <span
                      style={{
                        fontSize: `${overlay.fontSize || 28}px`,
                        fontFamily: FONT_OPTIONS.find(f => f.name === (overlay.font || 'Standard'))?.family || 'serif',
                        color: overlay.color || '#ffffff',
                        whiteSpace: 'pre-wrap',
                        textAlign: 'center',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        display: 'block'
                      }}
                    >
                      {overlay.text}
                    </span>

                    {/* Delete Icon for Text */}
                    {isSelected && isTextSelected && (
                      <button
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setTextList(prev => prev.filter(t => t.id !== overlay.id));
                          setSelectedTextId(null);
                          setOverlayText('');
                          setIsTextSelected(false);
                          showToast('Text deleted');
                        }}
                        className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform z-40 border-2 border-white pointer-events-auto"
                      >
                        <BiX size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Stickers Overlay Display */}
            {activeStickers.map((sticker) => (
              <div
                key={sticker.id}
                className={`absolute pointer-events-auto cursor-move select-none touch-none text-[48px] z-30 transition-all ${selectedStickerId === sticker.id ? 'scale-110 ring-2 ring-white/30 rounded-lg p-2' : ''
                  }`}
                style={{
                  left: `calc(50% + ${sticker.x}px)`,
                  top: `calc(50% + ${sticker.y}px)`,
                  transform: 'translate(-50%, -50%)',
                  lineHeight: 1
                }}
                onPointerDown={(e) => {
                  const target = e.currentTarget;
                  target.setPointerCapture(e.pointerId);
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const initialX = sticker.x;
                  const initialY = sticker.y;
                  let hasMoved = false;

                  setSelectedStickerId(sticker.id);

                  const moveHandler = (mE) => {
                    const dx = mE.clientX - startX;
                    const dy = mE.clientY - startY;
                    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;

                    setActiveStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, x: initialX + dx, y: initialY + dy } : s));

                    const screenHeight = window.innerHeight;
                    if (mE.clientY > screenHeight * 0.75) {
                      setIsOverDeleteZone(true);
                    } else {
                      setIsOverDeleteZone(false);
                    }
                  };

                  const upHandler = (uE) => {
                    const screenHeight = window.innerHeight;
                    if (uE.clientY > screenHeight * 0.75) {
                      setActiveStickers(prev => prev.filter(s => s.id !== sticker.id));
                      showToast('Sticker removed');
                      setSelectedStickerId(null);
                    }
                    setIsOverDeleteZone(false);
                    target.removeEventListener('pointermove', moveHandler);
                    target.removeEventListener('pointerup', upHandler);
                  };

                  target.addEventListener('pointermove', moveHandler);
                  target.addEventListener('pointerup', upHandler);
                }}
              >
                {sticker.content}

                {/* Delete Icon */}
                {selectedStickerId === sticker.id && (
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setActiveStickers(prev => prev.filter(s => s.id !== sticker.id));
                      setSelectedStickerId(null);
                      showToast('Sticker deleted');
                    }}
                    className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform z-40 border-2 border-white pointer-events-auto"
                  >
                    <BiX size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Quick-Trim Button Groups below the preview, above playback controls */}
        {clipSequence.length > 0 && currentClipIndex >= 0 && focusedTrack === 'video' && !clipSequence[currentClipIndex]?.isImage && (
          <div
            className="flex justify-between items-center px-6 pt-2 pb-1 w-full"
          >
            {/* Left Corner Quick-Trim Button Group */}
            <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-full backdrop-blur-md">
              <button
                type="button"
                onClick={() => { setFocusedTrack('video'); handleLeftQuickRevert(); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all"
                title="Revert Left Trim"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => { setFocusedTrack('video'); handleLeftQuickTrim(); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffcc00] text-black hover:bg-[#ffe066] active:scale-90 transition-all"
                title="Trim Left"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Center clip indicator */}
            <button
              type="button"
              onClick={() => setFocusedTrack('video')}
              className="px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-[11px] font-semibold text-[#ffcc00]/80 tabular-nums backdrop-blur-sm active:scale-95 transition-all"
            >
              Clip {currentClipIndex + 1}/{clipSequence.length}
            </button>

            {/* Right Corner Quick-Trim Button Group */}
            <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-full backdrop-blur-md">
              <button
                type="button"
                onClick={() => { setFocusedTrack('video'); handleRightQuickRevert(); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all"
                title="Extend End"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => { setFocusedTrack('video'); handleRightQuickTrim(); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffcc00] text-black hover:bg-[#ffe066] active:scale-90 transition-all"
                title="Trim End"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Playback Controls */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleEditorPlay}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black active:scale-95 shadow-md"
            >
              {isEditorPlaying ? <BiPause size={24} /> : <BiPlay size={24} className="ml-0.5" />}
            </button>

            <div className="text-[13px] font-medium text-white/80">
              <span id="editor-playback-time">
                {(() => {
                  if (clipSequence.length === 0) {
                    return formatPlaybackTime(editorVideoRef.current?.currentTime || 0, videoDuration);
                  }
                  const currentClip = clipSequence[currentClipIndex];
                  const startOffset = currentClip?.startOffset || 0;
                  const speed = currentClip?.speed || 1;
                  const pastDuration = clipSequence.slice(0, currentClipIndex).reduce((sum, c) => sum + c.duration, 0);
                  const currentOffset = editorVideoRef.current ? Math.max(0, (editorVideoRef.current.currentTime - startOffset) / speed) : 0;
                  const elapsed = Math.min(videoDuration, pastDuration + currentOffset);
                  return formatPlaybackTime(elapsed, videoDuration);
                })()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={historyIndex <= 0}
              className={`transition-colors ${historyIndex > 0 ? 'text-white active:scale-95 cursor-pointer' : 'text-white/20 cursor-default'}`}
              onClick={handleUndo}
              title="Undo"
            >
              <BiUndo size={24} />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1 || history.length === 0}
              className={`transition-colors ${historyIndex < history.length - 1 && history.length > 0 ? 'text-white active:scale-95 cursor-pointer' : 'text-white/20 cursor-default'}`}
              onClick={handleRedo}
              title="Redo"
            >
              <BiRedo size={24} />
            </button>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="relative bg-[#1a1a1c] py-2 border-t border-white/5">
          {/* Playhead line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2.5px] bg-white z-20 shadow-[0_0_15px_rgba(255,255,255,0.6)] rounded-full" />

          {/* Tracks Container */}
          <div
            id="editor-timeline"
            onScroll={handleTimelineScroll}
            onClick={() => { setFocusedTrack(null); setIsTextTrackSelected(false); }}
            className="relative overflow-x-auto no-scrollbar pb-10"
          >
            {/* Centered Playhead Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white z-40 pointer-events-none" />

            {/* Timeline Ruler Row */}
            <div className={`flex h-8 items-center border-b border-white/5 transition-opacity ${focusedTrack ? 'opacity-30' : 'opacity-100'}`}>
              <div className="sticky left-0 w-[60px] h-full border-r border-white/5 flex items-center justify-center shrink-0 bg-[#121214] z-30">
                {/* Empty corner for ruler */}
              </div>
              <div
                className="flex ml-[calc(50%-30px)] pr-[50%] pointer-events-none"
                style={{ width: timelineWidth + window.innerWidth }}
              >
                {Array.from({ length: Math.ceil(videoDuration || 3) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center shrink-0"
                    style={{ width: PIXELS_PER_SECOND }}
                  >
                    <div className={`h-1 w-[1px] mb-1 ${i % 2 === 0 ? 'bg-white/40' : 'bg-white/10'}`} />
                    {i % 2 === 0 && <span className="text-[10px] text-white/40">{i}s</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Video Track Row */}
            <div className="flex h-16 group/row">
              <div className={`sticky left-0 w-[60px] h-full bg-[#121214] border-r border-white/5 flex items-center justify-center z-30 shrink-0 transition-opacity ${focusedTrack && focusedTrack !== 'video' ? 'opacity-30' : 'opacity-100'}`}>
                <button
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className={`${isVideoMuted ? 'text-[#fe2c55]' : 'text-white/40'} hover:text-white transition-colors`}
                >
                  {isVideoMuted ? <BiVolumeMute size={20} /> : <IoVolumeHighOutline size={20} />}
                </button>
              </div>
              <div
                className={`flex ml-[calc(50%-30px)] items-center transition-all duration-300 ${focusedTrack && focusedTrack !== 'video' ? 'opacity-30' : 'opacity-100'}`}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusedTrack('video');
                  }}
                  className="relative h-12 flex rounded-[4px] bg-white/5 cursor-pointer transition-all"
                  style={{
                    width: timelineWidth,
                    marginLeft: 0
                  }}
                >
                  <div
                    className="absolute top-0 bottom-0 flex animate-fade-in"
                    style={{
                      left: 0,
                      width: timelineWidth
                    }}
                  >
                    {clipSequence.length > 0 ? (
                      clipSequence.map((clip, idx) => {
                        const clipWidth = clip.duration * PIXELS_PER_SECOND;
                        const pastDuration = clipSequence.slice(0, idx).reduce((sum, c) => sum + c.duration, 0);
                        const startThumbIdx = Math.floor(pastDuration / 2);
                        const thumbCount = Math.ceil(clip.duration / 2) || 1;

                        return (
                          <div
                            key={`clip-${idx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFocusedTrack('video');
                              setCurrentClipIndex(idx);
                              setIsTextTrackSelected(false);
                            }}
                            className={`h-full flex shrink-0 relative transition-all ${focusedTrack === 'video' && currentClipIndex === idx
                                ? 'border-y-4 border-[#ffcc00] z-10 bg-white/5 shadow-lg'
                                : 'border-r-2 border-black/90 opacity-80'
                              }`}
                            style={{ width: clipWidth }}
                          >
                            {Array.from({ length: thumbCount }).map((_, i) => {
                              const thumbIdx = startThumbIdx + i;
                              return (
                                <div key={i} className="h-full border-r border-white/5 shrink-0" style={{ width: Math.min(clipWidth - i * PIXELS_PER_SECOND * 2, PIXELS_PER_SECOND * 2) }}>
                                  <TimelineThumbnail
                                    src={videoThumbnails.length > thumbIdx ? videoThumbnails[thumbIdx] : (selectedMedia.image || previewUrl)}
                                    isVideo={videoThumbnails.length === 0 && !selectedMedia.image && !!previewUrl}
                                    i={i}
                                    videoDuration={videoDuration}
                                  />
                                </div>
                              );
                            })}

                            {/* Duration badge overlay */}
                            <div className={`clip-duration-badge absolute top-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-black text-white pointer-events-none select-none z-20 ${focusedTrack === 'video' && currentClipIndex === idx ? 'left-[22px]' : 'left-2'
                              }`}>
                              {clip.duration.toFixed(1)}s
                            </div>

                            {/* Trimmer Handles */}
                            <div
                              className={`absolute z-50 cursor-col-resize flex items-center justify-center transition-all duration-150 ${focusedTrack === 'video' && currentClipIndex === idx
                                  ? '-top-[4px] -bottom-[4px] -left-[4px] w-[18px] bg-[#ffcc00] rounded-l-[8px] opacity-100 pointer-events-auto'
                                  : 'top-0 bottom-0 left-0 w-[18px] bg-transparent opacity-0 hover:opacity-20 hover:bg-[#ffcc00] rounded-l-[8px] pointer-events-auto'
                                }`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const targetHandle = e.currentTarget;
                                targetHandle.setPointerCapture(e.pointerId);

                                // Snapshot clip values — do NOT call setState here,
                                // that would trigger a re-render which destroys the
                                // element and loses pointer capture mid-drag.
                                const startX = e.clientX;
                                const initialStartOffset = clip.startOffset || 0;
                                const initialOriginalDuration = clip.originalDuration || (clip.duration * (clip.speed || 1));
                                const limitStart = clip.limitStart !== undefined ? clip.limitStart : 0;
                                const speed = clip.speed || 1;

                                // Get DOM element references
                                const clipEl = targetHandle.parentElement;
                                const flexContainerEl = clipEl?.parentElement;
                                const outerTrackEl = flexContainerEl?.parentElement;
                                const badgeEl = clipEl?.querySelector('.clip-duration-badge');
                                const timeSpan = document.getElementById('editor-playback-time');

                                // Instantly style clip + handle as active via DOM (no re-render)
                                if (clipEl) {
                                  clipEl.classList.add('border-y-4', 'border-[#ffcc00]', 'z-10', 'shadow-lg');
                                  clipEl.classList.remove('border-r-2', 'border-black/90', 'opacity-80');
                                }
                                targetHandle.style.cssText = 'top:-4px;bottom:-4px;left:-4px;width:18px;background:#ffcc00;border-radius:8px 0 0 8px;opacity:1;';

                                // Pause playback so the playhead-follow scroll loop doesn't fight the drag
                                setIsEditorPlaying(false);
                                if (editorVideoRef.current) {
                                  editorVideoRef.current.pause();
                                  editorVideoRef.current.currentTime = initialStartOffset;
                                }

                                document.body.style.cursor = 'col-resize';

                                let finalStartOffset = initialStartOffset;
                                let finalOriginalDuration = initialOriginalDuration;
                                let finalDuration = clip.duration;

                                const moveHandler = (moveEvent) => {
                                  const deltaX = moveEvent.clientX - startX;
                                  const deltaTimeline = deltaX / PIXELS_PER_SECOND;
                                  const deltaRaw = deltaTimeline * speed;

                                  let newStartOffset = initialStartOffset + deltaRaw;
                                  newStartOffset = Math.max(limitStart, Math.min((initialStartOffset + initialOriginalDuration) - (0.5 * speed), newStartOffset));
                                  const newOriginalDuration = (initialStartOffset + initialOriginalDuration) - newStartOffset;
                                  const newDuration = newOriginalDuration / speed;

                                  finalStartOffset = newStartOffset;
                                  finalOriginalDuration = newOriginalDuration;
                                  finalDuration = newDuration;

                                  // 1. Seek the video player
                                  if (editorVideoRef.current) {
                                    editorVideoRef.current.currentTime = newStartOffset;
                                  }

                                  // 2. Update playback time display in DOM
                                  const otherClipsDurationLeft = clipSequence.reduce((sum, c, i) => i !== idx ? sum + c.duration : sum, 0);
                                  const totalDurLeft = otherClipsDurationLeft + newDuration;
                                  const elapsed = pastDuration + (newStartOffset - limitStart) / speed;
                                  if (timeSpan) timeSpan.innerText = formatPlaybackTime(elapsed, totalDurLeft);

                                  // 3. Update clip width & marginLeft in DOM
                                  const clampedDeltaRaw = newStartOffset - initialStartOffset;
                                  const clampedDeltaTimeline = clampedDeltaRaw / speed;
                                  const clampedDeltaX = clampedDeltaTimeline * PIXELS_PER_SECOND;
                                  if (clipEl) {
                                    clipEl.style.width = (newDuration * PIXELS_PER_SECOND) + 'px';
                                    clipEl.style.marginLeft = clampedDeltaX + 'px';
                                  }

                                  // 4. Update duration badge in DOM
                                  if (badgeEl) badgeEl.innerText = newDuration.toFixed(1) + 's';

                                  // 5. Update flex container & track width in DOM
                                  const otherClipsDuration = clipSequence.reduce((sum, c, i) => i !== idx ? sum + c.duration : sum, 0);
                                  const totalDur = otherClipsDuration + newDuration;
                                  if (flexContainerEl) flexContainerEl.style.width = (totalDur * PIXELS_PER_SECOND) + 'px';
                                  if (outerTrackEl) outerTrackEl.style.width = (totalDur * PIXELS_PER_SECOND) + 'px';
                                };

                                const upHandler = () => {
                                  document.body.style.cursor = '';
                                  try {
                                    if (targetHandle.hasPointerCapture(e.pointerId)) {
                                      targetHandle.releasePointerCapture(e.pointerId);
                                    }
                                  } catch (err) {
                                    console.warn("Failed to release pointer capture:", err);
                                  }
                                  if (clipEl) clipEl.style.marginLeft = '';
                                  // Reset inline style so React class takes over after re-render
                                  targetHandle.style.cssText = '';
                                  window.removeEventListener('pointermove', moveHandler);
                                  window.removeEventListener('pointerup', upHandler);

                                  // NOW commit React state (safe — drag is over, element is stable)
                                  setCurrentClipIndex(idx);
                                  setFocusedTrack('video');
                                  setClipSequence(prev => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      startOffset: finalStartOffset,
                                      originalDuration: finalOriginalDuration,
                                      duration: finalDuration
                                    };
                                    const newTotalDur = next.reduce((sum, c) => sum + c.duration, 0);
                                    setVideoDuration(newTotalDur);
                                    return next;
                                  });
                                };

                                window.addEventListener('pointermove', moveHandler);
                                window.addEventListener('pointerup', upHandler);
                              }}
                            >
                              {focusedTrack === 'video' && currentClipIndex === idx && (
                                <svg className="w-3 h-3 text-white font-black" fill="none" stroke="currentColor" strokeWidth="4.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                              )}
                            </div>

                            {/* Right Trimmer Handle */}
                            <div
                              className={`absolute z-50 cursor-col-resize flex items-center justify-center transition-all duration-150 ${focusedTrack === 'video' && currentClipIndex === idx
                                  ? '-top-[4px] -bottom-[4px] -right-[4px] w-[18px] bg-[#ffcc00] rounded-r-[8px] opacity-100 pointer-events-auto'
                                  : 'top-0 bottom-0 right-0 w-[18px] bg-transparent opacity-0 hover:opacity-20 hover:bg-[#ffcc00] rounded-r-[8px] pointer-events-auto'
                                }`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const targetHandle = e.currentTarget;
                                targetHandle.setPointerCapture(e.pointerId);

                                // Snapshot clip values — do NOT call setState here,
                                // that would trigger a re-render which destroys the
                                // element and loses pointer capture mid-drag.
                                const startX = e.clientX;
                                const initialOriginalDuration = clip.originalDuration || (clip.duration * (clip.speed || 1));
                                const startOffset = clip.startOffset || 0;
                                const limitEnd = clip.limitEnd !== undefined ? clip.limitEnd : (startOffset + initialOriginalDuration);
                                const speed = clip.speed || 1;

                                // Get DOM element references
                                const clipEl = targetHandle.parentElement;
                                const flexContainerEl = clipEl?.parentElement;
                                const outerTrackEl = flexContainerEl?.parentElement;
                                const badgeEl = clipEl?.querySelector('.clip-duration-badge');
                                const timeSpan = document.getElementById('editor-playback-time');

                                // Instantly style clip + handle as active via DOM (no re-render)
                                if (clipEl) {
                                  clipEl.classList.add('border-y-4', 'border-[#ffcc00]', 'z-10', 'shadow-lg');
                                  clipEl.classList.remove('border-r-2', 'border-black/90', 'opacity-80');
                                }
                                targetHandle.style.cssText = 'top:-4px;bottom:-4px;right:-4px;width:18px;background:#ffcc00;border-radius:0 8px 8px 0;opacity:1;';

                                // Pause playback so the playhead-follow scroll loop doesn't fight the drag
                                setIsEditorPlaying(false);
                                if (editorVideoRef.current) {
                                  editorVideoRef.current.pause();
                                  editorVideoRef.current.currentTime = startOffset + initialOriginalDuration;
                                }

                                document.body.style.cursor = 'col-resize';

                                let finalOriginalDuration = initialOriginalDuration;
                                let finalDuration = clip.duration;

                                const moveHandler = (moveEvent) => {
                                  const deltaX = moveEvent.clientX - startX;
                                  const deltaTimeline = deltaX / PIXELS_PER_SECOND;
                                  const deltaRaw = deltaTimeline * speed;

                                  let newOriginalDuration = initialOriginalDuration + deltaRaw;
                                  newOriginalDuration = Math.max(0.5 * speed, Math.min(limitEnd - startOffset, newOriginalDuration));
                                  const newDuration = newOriginalDuration / speed;

                                  finalOriginalDuration = newOriginalDuration;
                                  finalDuration = newDuration;

                                  // 1. Seek the video player
                                  if (editorVideoRef.current) {
                                    editorVideoRef.current.currentTime = startOffset + newOriginalDuration;
                                  }

                                  // 2. Update playback time display in DOM
                                  const otherClipsDurationRight = clipSequence.reduce((sum, c, i) => i !== idx ? sum + c.duration : sum, 0);
                                  const totalDurRight = otherClipsDurationRight + newDuration;
                                  const elapsed = pastDuration + (startOffset + newOriginalDuration - (clip.limitStart || 0)) / speed;
                                  if (timeSpan) timeSpan.innerText = formatPlaybackTime(elapsed, totalDurRight);

                                  // 3. Update clip width in DOM
                                  if (clipEl) clipEl.style.width = (newDuration * PIXELS_PER_SECOND) + 'px';

                                  // 4. Update duration badge in DOM
                                  if (badgeEl) badgeEl.innerText = newDuration.toFixed(1) + 's';

                                  // 5. Update flex container & track width in DOM
                                  const otherClipsDuration = clipSequence.reduce((sum, c, i) => i !== idx ? sum + c.duration : sum, 0);
                                  const totalDur = otherClipsDuration + newDuration;
                                  if (flexContainerEl) flexContainerEl.style.width = (totalDur * PIXELS_PER_SECOND) + 'px';
                                  if (outerTrackEl) outerTrackEl.style.width = (totalDur * PIXELS_PER_SECOND) + 'px';
                                };

                                const upHandler = () => {
                                  document.body.style.cursor = '';
                                  try {
                                    if (targetHandle.hasPointerCapture(e.pointerId)) {
                                      targetHandle.releasePointerCapture(e.pointerId);
                                    }
                                  } catch (err) {
                                    console.warn("Failed to release pointer capture:", err);
                                  }
                                  // Reset inline style so React class takes over after re-render
                                  targetHandle.style.cssText = '';
                                  window.removeEventListener('pointermove', moveHandler);
                                  window.removeEventListener('pointerup', upHandler);

                                  // NOW commit React state (safe - drag is over)
                                  setCurrentClipIndex(idx);
                                  setFocusedTrack('video');
                                  setClipSequence(prev => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      originalDuration: finalOriginalDuration,
                                      duration: finalDuration
                                    };
                                    const newTotalDur = next.reduce((sum, c) => sum + c.duration, 0);
                                    setVideoDuration(newTotalDur);
                                    return next;
                                  });
                                };

                                window.addEventListener('pointermove', moveHandler);
                                window.addEventListener('pointerup', upHandler);
                              }}
                            >
                              {focusedTrack === 'video' && currentClipIndex === idx && (
                                <svg className="w-3 h-3 text-white font-black" fill="none" stroke="currentColor" strokeWidth="4.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      Array.from({ length: Math.ceil(videoDuration / 2) || 3 }).map((_, i) => (
                        <div key={i} className="h-full border-r border-white/5 shrink-0" style={{ width: PIXELS_PER_SECOND * 2 }}>
                          <TimelineThumbnail
                            src={videoThumbnails.length > i ? videoThumbnails[i] : (selectedMedia.image || previewUrl)}
                            isVideo={videoThumbnails.length === 0 && !selectedMedia.image && !!previewUrl}
                            i={i}
                            videoDuration={videoDuration}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Clip Button */}
                <button
                  onClick={() => triggerFilePicker()}
                  className="h-10 px-4 ml-2 rounded-[4px] bg-white/5 border border-white/5 flex items-center shrink-0 active:bg-white/10 transition-colors"
                >
                  <BiPlus size={18} className="text-white/60 mr-1" />
                  <span className="text-[11px] font-medium text-white/60">Add</span>
                </button>

                {/* Scroll Spacer */}
                <div style={{ width: '50vw' }} className="shrink-0 pointer-events-none" />
              </div>
            </div>

            {/* Audio Track Row */}
            <div className="flex h-12 mt-2">
              <div className="sticky left-0 w-[60px] h-full bg-[#121214] border-r border-white/5 flex items-center justify-center z-30 shrink-0">
                <button
                  onClick={() => setIsMusicMuted(!isMusicMuted)}
                  className={`${isMusicMuted ? 'text-[#fe2c55]' : 'text-white/40'} hover:text-white transition-colors`}
                >
                  {isMusicMuted ? <BiVolumeMute size={20} /> : <IoVolumeHighOutline size={20} />}
                </button>
              </div>
              <div className="flex ml-[calc(50%-30px)] items-center">
                {selectedSounds.length > 0 ? (
                  <div className="flex items-center gap-3">
                    {selectedSounds.map((sound, idx) => (
                      <div
                        key={idx}
                        className="h-10 rounded-[4px] bg-gradient-to-r from-[#f800d3] to-[#ff4ed8] px-4 flex items-center shadow-lg active:scale-[0.98] transition-transform cursor-pointer relative group overflow-hidden"
                        style={{ width: (sound.clipDuration || 15) * PIXELS_PER_SECOND }}
                        onClick={() => {
                          setEditorSound(sound);
                          setEditingSoundIndex(idx);
                          setClipStart(sound.clipStart || 0);
                          setClipDuration(sound.clipDuration || 15);
                          pushStage('sound-editor');
                        }}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <BiMusic size={14} className="mr-2 text-white" />
                        <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
                          {sound.title}
                        </span>

                        {/* Delete Sound Icon */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSounds(prev => prev.filter((_, i) => i !== idx));
                            showToast(`${sound.title} removed`);
                          }}
                          className="absolute right-1 top-1 w-5 h-5 rounded-full bg-black/20 hover:bg-red-500 text-white flex items-center justify-center transition-colors z-10"
                        >
                          <BiX size={14} />
                        </button>
                      </div>
                    ))}
                    {/* Add Another/Change Music Button */}
                    <button
                      onClick={() => {
                        setEditingSoundIndex(-1); // -1 means adding new
                        setActiveSheet('music-library');
                      }}
                      className="h-10 w-10 shrink-0 flex items-center justify-center bg-white/5 rounded-[4px] border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-95"
                      title="Add another sound"
                    >
                      <BiPlus size={20} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingSoundIndex(-1);
                      setActiveSheet('music-library');
                    }}
                    className="h-10 flex items-center gap-2 text-white/40 px-3 bg-white/5 rounded-[4px] hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                  >
                    <BiPlus size={18} />
                    <span className="text-[11px] font-medium">Add music</span>
                  </button>
                )}
              </div>
            </div>

            {/* Text Track Row */}
            <div className="flex h-12 mt-2" onClick={(e) => {
              // Clicking outside text clip deselects
              if (e.target === e.currentTarget) {
                setIsTextTrackSelected(false);
                setSelectedTextId(null);
              }
            }}>
              <div className="sticky left-0 w-[60px] h-full bg-[#121214] border-r border-white/5 flex items-center justify-center z-30 shrink-0">
                {/* Text Icon */}
                <IoTextOutline size={18} className={isTextTrackSelected ? 'text-white' : 'text-white/20'} />
              </div>
              <div className="flex ml-[calc(50%-30px)] items-center relative h-full">
                {textList.map((item) => {
                  const isSelected = selectedTextId === item.id;
                  return (
                    <div key={item.id} className="relative">
                      {/* Clip Bar */}
                      <div
                        className={`absolute h-10 rounded-[4px] flex items-center px-3 shadow-lg cursor-pointer transition-all ${
                          isSelected && isTextTrackSelected
                            ? 'border-y-4 border-[#ffcc00] z-10 bg-white/5 shadow-lg animate-pulse-subtle'
                            : 'bg-white/20 border border-white/30'
                        }`}
                        style={{
                          left: item.startTime * PIXELS_PER_SECOND,
                          width: (item.endTime - item.startTime) * PIXELS_PER_SECOND,
                          top: '-20px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Ignore click if it was a drag gesture
                          if (e.currentTarget.dataset.dragged === 'true') {
                            e.currentTarget.removeAttribute('data-dragged');
                            return;
                          }

                          // Select this item and sync states
                          setSelectedTextId(item.id);
                          setOverlayText(item.text);
                          setTextStartTime(item.startTime);
                          setTextEndTime(item.endTime);
                          textStartTimeRef.current = item.startTime;
                          textEndTimeRef.current = item.endTime;
                          setTextPos({ x: item.x, y: item.y });
                          setTextRotation(item.rotation || 0);
                          setOverlayColor(item.color || '#ffffff');
                          setOverlayFont(item.font || 'Standard');
                          setOverlayFontSize(item.fontSize || 28);

                          setIsTextTrackSelected(prev => {
                            const next = !prev || selectedTextId !== item.id;
                            if (next) {
                              setFocusedTrack('text');
                            } else {
                              setFocusedTrack(null);
                            }
                            return next;
                          });
                        }}
                        onPointerDown={(e) => {
                          const target = e.currentTarget;
                          target.setPointerCapture(e.pointerId);
                          const startX = e.clientX;
                          const initialStart = item.startTime;
                          const initialEnd = item.endTime;
                          const width = initialEnd - initialStart;
                          let hasMoved = false;

                          const moveHandler = (mE) => {
                            const dx = Math.abs(mE.clientX - startX);
                            if (dx > 4) {
                              hasMoved = true;
                              target.dataset.dragged = 'true';
                            }
                            if (!hasMoved) return;
                            const delta = (mE.clientX - startX) / PIXELS_PER_SECOND;
                            const newStart = Math.max(0, Math.min(videoDuration - width, initialStart + delta));
                            const newEnd = newStart + width;
                            
                            // Update this item directly in state
                            setTextList(prev => prev.map(t => {
                              if (t.id === item.id) {
                                return { ...t, startTime: newStart, endTime: newEnd };
                              }
                              return t;
                            }));

                            if (isSelected) {
                              textStartTimeRef.current = newStart;
                              textEndTimeRef.current = newEnd;
                              setTextStartTime(newStart);
                              setTextEndTime(newEnd);
                            }
                          };

                          const upHandler = () => {
                            try {
                              if (target.hasPointerCapture(e.pointerId)) {
                                target.releasePointerCapture(e.pointerId);
                              }
                            } catch (err) {}
                            window.removeEventListener('pointermove', moveHandler);
                            window.removeEventListener('pointerup', upHandler);
                          };

                          window.addEventListener('pointermove', moveHandler);
                          window.addEventListener('pointerup', upHandler);
                        }}
                      >
                        <span className={`text-[10px] font-bold text-white truncate pointer-events-none flex-1 transition-all ${isSelected && isTextTrackSelected ? 'pl-4' : ''}`}>
                          {item.text}
                        </span>
                        <span className={`text-[9px] text-white/50 pointer-events-none ml-1 shrink-0 transition-all ${isSelected && isTextTrackSelected ? 'pr-4' : ''}`}>
                          {(item.endTime - item.startTime).toFixed(1)}s
                        </span>

                        {/* Start Handle */}
                        <div
                          className={`absolute z-50 cursor-col-resize flex items-center justify-center transition-all duration-150 ${isSelected && isTextTrackSelected
                              ? '-top-[4px] -bottom-[4px] -left-[4px] w-[18px] bg-[#ffcc00] rounded-l-[8px] opacity-100 pointer-events-auto'
                              : 'top-0 bottom-0 left-0 w-[18px] bg-transparent opacity-0 hover:opacity-20 hover:bg-[#ffcc00] rounded-l-[8px] pointer-events-auto'
                            }`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const target = e.currentTarget;
                            target.setPointerCapture(e.pointerId);
                            const startX = e.clientX;
                            const initialStart = item.startTime;
                            const moveHandler = (mE) => {
                              const delta = (mE.clientX - startX) / PIXELS_PER_SECOND;
                              const newStart = Math.max(0, Math.min(item.endTime - 0.5, initialStart + delta));
                              
                              setTextList(prev => prev.map(t => {
                                if (t.id === item.id) {
                                  return { ...t, startTime: newStart };
                                }
                                return t;
                              }));

                              if (isSelected) {
                                textStartTimeRef.current = newStart;
                                setTextStartTime(newStart);
                              }
                            };
                            const upHandler = () => {
                              target.removeEventListener('pointermove', moveHandler);
                              target.removeEventListener('pointerup', upHandler);
                            };
                            target.addEventListener('pointermove', moveHandler);
                            target.addEventListener('pointerup', upHandler);
                          }}
                        >
                          {isSelected && isTextTrackSelected && (
                            <svg className="w-3 h-3 text-white font-black" fill="none" stroke="currentColor" strokeWidth="4.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                          )}
                        </div>

                        {/* End Handle */}
                        <div
                          className={`absolute z-50 cursor-col-resize flex items-center justify-center transition-all duration-150 ${isSelected && isTextTrackSelected
                              ? '-top-[4px] -bottom-[4px] -right-[4px] w-[18px] bg-[#ffcc00] rounded-r-[8px] opacity-100 pointer-events-auto'
                              : 'top-0 bottom-0 right-0 w-[18px] bg-transparent opacity-0 hover:opacity-20 hover:bg-[#ffcc00] rounded-r-[8px] pointer-events-auto'
                            }`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const target = e.currentTarget;
                            target.setPointerCapture(e.pointerId);
                            const startX = e.clientX;
                            const initialEnd = item.endTime;
                            const moveHandler = (mE) => {
                              const delta = (mE.clientX - startX) / PIXELS_PER_SECOND;
                              const newEnd = Math.min(videoDuration, Math.max(item.startTime + 0.5, initialEnd + delta));
                              
                              setTextList(prev => prev.map(t => {
                                if (t.id === item.id) {
                                  return { ...t, endTime: newEnd };
                                }
                                return t;
                              }));

                              if (isSelected) {
                                textEndTimeRef.current = newEnd;
                                setTextEndTime(newEnd);
                              }
                            };
                            const upHandler = () => {
                              target.removeEventListener('pointermove', moveHandler);
                              target.removeEventListener('pointerup', upHandler);
                            };
                            target.addEventListener('pointermove', moveHandler);
                            target.addEventListener('pointerup', upHandler);
                          }}
                        >
                          {isSelected && isTextTrackSelected && (
                            <svg className="w-3 h-3 text-white font-black" fill="none" stroke="currentColor" strokeWidth="4.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add text button - always positioned after the last text clip */}
                <button
                  onClick={() => {
                    const maxEndTime = textList.reduce((max, t) => Math.max(max, t.endTime), 0);
                    const start = Math.min(videoDuration, maxEndTime);
                    const end = Math.min(videoDuration, start + 5);
                    setOverlayText('');
                    setTextStartTime(start);
                    setTextEndTime(end);
                    textStartTimeRef.current = start;
                    textEndTimeRef.current = end;
                    setSelectedTextId(null);
                    setIsTextTrackSelected(false);
                    setIsEditingText(true);
                  }}
                  className="absolute h-10 flex items-center gap-2 text-white/40 px-3 bg-white/5 rounded-[4px] hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 shrink-0 pointer-events-auto whitespace-nowrap"
                  style={{
                    left: (textList.reduce((max, t) => Math.max(max, t.endTime), 0) * PIXELS_PER_SECOND) + 12,
                    top: '4px'
                  }}
                >
                  <BiPlus size={18} />
                  <span className="text-[11px] font-medium">Add text</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Toolbar */}
        <div className="bg-black border-t border-white/5 pt-4 pb-[max(1.2rem,env(safe-area-inset-bottom))]">
          {isTextTrackSelected ? (
            <div className="flex justify-around items-center w-full px-6 py-2">
              {[
                { id: 'edit', label: 'Edit', icon: <IoTextOutline size={24} /> },
                { id: 'delete', label: 'Delete', icon: <BiTrash size={24} className="text-red-500" /> },
                { id: 'done', label: 'Done', icon: <BiCheck size={26} className="text-green-500" /> },
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    if (tool.id === 'edit') {
                      const item = textList.find(t => t.id === selectedTextId);
                      if (item) {
                        setOverlayText(item.text);
                        setTextStartTime(item.startTime);
                        setTextEndTime(item.endTime);
                        textStartTimeRef.current = item.startTime;
                        textEndTimeRef.current = item.endTime;
                        setTextPos({ x: item.x, y: item.y });
                        setTextRotation(item.rotation || 0);
                        setOverlayColor(item.color || '#ffffff');
                        setOverlayFont(item.font || 'Standard');
                        setOverlayFontSize(item.fontSize || 28);
                        setIsEditingText(true);
                      }
                      setIsTextTrackSelected(false);
                      setFocusedTrack(null);
                    } else if (tool.id === 'delete') {
                      setTextList(prev => prev.filter(t => t.id !== selectedTextId));
                      setSelectedTextId(null);
                      setOverlayText('');
                      setIsTextTrackSelected(false);
                      setFocusedTrack(null);
                      showToast('Text deleted');
                    } else if (tool.id === 'done') {
                      setIsTextTrackSelected(false);
                      setFocusedTrack(null);
                      setSelectedTextId(null);
                    }
                  }}
                  className="flex flex-col items-center gap-2 active:opacity-70"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[12px] ${tool.id === 'done' ? 'bg-green-500/10 border border-green-500/20' : (
                      tool.id === 'delete' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/5'
                    )
                    }`}>
                    {tool.icon}
                  </div>
                  <span className="text-[11px] font-medium text-white/60">{tool.label}</span>
                </button>
              ))}
            </div>
          ) : focusedTrack === 'video' ? (
            <div className="flex flex-col gap-3">
              {/* Speed selection overlay */}
              {editorSubPanel === 'speed' && (
                <div className="flex items-center justify-center gap-4 bg-white/5 backdrop-blur-md py-3 px-6 rounded-full mx-6 border border-white/10 animate-fade-in">
                  <span className="text-xs text-white/40 font-bold mr-2">Speed:</span>
                  {['0.5x', '1x', '1.5x', '2x'].map((spdStr) => {
                    const spdVal = parseFloat(spdStr);
                    const isActive = (clipSequence[currentClipIndex]?.speed || 1) === spdVal;
                    return (
                      <button
                        key={spdStr}
                        type="button"
                        onClick={() => handleEditorSpeedChange(spdVal)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all active:scale-90 ${isActive
                            ? 'bg-[#fe2c55] text-white shadow-[0_0_12px_rgba(254,44,85,0.6)]'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                          }`}
                      >
                        {spdStr}
                      </button>
                    );
                  })}
                </div>
              )}



              {/* Video Edit Tools List or Cancel/Reset/Done buttons */}
              {editorSubPanel === 'crop' ? (
                <div className="flex justify-between items-center w-full px-8 py-3 bg-black">
                  <button
                    type="button"
                    onClick={() => {
                      if (initialCropSettings) {
                        setCropScale(initialCropSettings.scale);
                        setCropPan(initialCropSettings.pan);
                        setCropAspectRatio(initialCropSettings.ratio);
                        setCropRotation(initialCropSettings.rotation ?? 0);
                      }
                      setEditorSubPanel(null);
                      showToast('Crop cancelled');
                    }}
                    className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-sm font-bold text-white transition-all active:scale-95 border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCropScale(1);
                      setCropPan({ x: 0, y: 0 });
                      setCropAspectRatio('9:16');
                      setCropRotation(0);
                      showToast('Crop reset');
                    }}
                    className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-sm font-bold text-white transition-all active:scale-95 border border-white/5"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorSubPanel(null);
                      showToast('Crop applied');
                    }}
                    className="px-8 py-2.5 rounded-full bg-white hover:bg-white/90 text-black text-sm font-black transition-all active:scale-95 shadow-lg"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex justify-around items-center w-full px-6 py-2">
                  {[
                    { id: 'split', label: 'Split', icon: <FiScissors size={24} /> },
                    { id: 'speed', label: 'Speed', icon: <IoTimerOutline size={24} /> },
                    { id: 'crop', label: 'Crop', icon: <BiCrop size={24} /> },
                    { id: 'delete', label: 'Delete', icon: <BiTrash size={24} className="text-red-500" /> },
                    { id: 'done', label: 'Done', icon: <BiCheck size={26} className="text-green-500" /> },
                  ].map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => handleVideoEditToolClick(tool.id)}
                      className="flex flex-col items-center gap-2 active:opacity-70"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-[12px] ${tool.id === 'done' ? 'bg-green-500/10 border border-green-500/20' : (
                          tool.id === 'delete' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/5'
                        )
                        }`}>
                        {tool.icon}
                      </div>
                      <span className="text-[11px] font-medium text-white/60">{tool.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto px-6 no-scrollbar">
              {[
                { id: 'text', label: 'Text', icon: <IoTextOutline size={26} /> },
                { id: 'stickers', label: 'Stickers', icon: <IoSparklesOutline size={26} /> },
                { id: 'audio', label: 'Voice', icon: <BiMicrophone size={26} /> },
                { id: 'filters', label: 'Filters', icon: <IoOptionsOutline size={26} /> },
                { id: 'adjust', label: 'Adjust', icon: <BiSlider size={26} /> },
                { id: 'save', label: 'Save', icon: <BiDownload size={26} /> },
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handlePreviewToolClick(tool.id)}
                  className="flex shrink-0 flex-col items-center gap-2 active:opacity-70"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/5 border border-white/5">
                    {tool.icon}
                  </div>
                  <span className="text-[11px] font-medium text-white/60">{tool.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPreviewStage = () => (
    <div className={`relative h-full overflow-hidden ${isDarkMode ? 'bg-black text-white' : 'bg-[var(--theme-page-bg)] text-white'}`}>
      <div className={duetVideo ? "absolute top-1/2 -translate-y-1/2 w-full aspect-[9/8] flex flex-row bg-black z-0 overflow-hidden" : "absolute inset-0 z-0 flex flex-row"}>
        {duetVideo ? (
          <>
            {/* Left Side: Original Duet Video */}
            <div className="w-1/2 h-full bg-black relative border-r border-white/10 flex items-center justify-center">
              <video
                ref={duetPreviewVideoPlayerRef}
                src={duetVideo.video.url}
                className="w-full h-full object-cover"
                loop
                muted={isDuetMuted || isMuted}
                playsInline
              />
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1 z-10">
                <span className="w-1.5 h-1.5 bg-[#fe2c55] rounded-full animate-pulse"></span>
                @{duetVideo.user?.username || 'creator'}
              </div>
            </div>
            {/* Right Side: Recorded Video */}
            <div className="w-1/2 h-full bg-black relative flex items-center justify-center overflow-hidden">
              <div
                className="w-full h-full relative"
                style={{
                  transform: `scale(${cropScale}) translate(${cropPan.x}px, ${cropPan.y}px)`,
                  transformOrigin: 'center center'
                }}
              >
                {previewUrl ? (
                  <video
                    key={`preview-video-${currentPreviewClipIndex}-${clipSequence[currentPreviewClipIndex]?.url || 'none'}`}
                    ref={(el) => {
                      previewVideoRef.current = el;
                      if (el && stage === 'preview') {
                        const currentClip = clipSequence[currentPreviewClipIndex];
                        const startOffset = currentClip?.startOffset || 0;
                        const speed = currentClip?.speed || 1;
                        if (el.currentTime !== startOffset) {
                          el.currentTime = startOffset;
                        }
                        el.playbackRate = speed;
                        el.play().catch(() => { });
                      }
                    }}
                    src={clipSequence.length > 0 ? clipSequence[currentPreviewClipIndex]?.url : previewUrl}
                    className="h-full w-full object-cover transition-all duration-500"
                    muted={isVideoMuted || isMuted}
                    playsInline
                    autoPlay
                    onTimeUpdate={handlePreviewTimeUpdate}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      const currentClip = clipSequence[currentPreviewClipIndex];
                      const startOffset = currentClip?.startOffset || 0;
                      video.currentTime = startOffset;
                      video.playbackRate = currentClip?.speed || 1;
                    }}
                    style={{
                      transform: `rotate(${editorSettings.rotation + cropRotation}deg)`,
                      transformOrigin: 'center center',
                      filter: getCombinedFilter()
                    }}
                  />
                ) : (
                  <MediaPreview
                    image={selectedMedia.image}
                    rotation={editorSettings.rotation + cropRotation}
                    filter={selectedFilter}
                    className="h-full w-full"
                    adjustments={imageAdjustments}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div
            className="relative overflow-hidden transition-all duration-300 mx-auto"
            style={{
              aspectRatio: cropAspectRatio === '9:16' ? '9/16' : (cropAspectRatio === '1:1' ? '1/1' : (cropAspectRatio === '16:9' ? '16/9' : (cropAspectRatio === '4:5' ? '4/5' : '9/16'))),
              width: '100%',
              height: '100%',
              maxHeight: '100%',
            }}
          >
            <div
              className="w-full h-full relative"
              style={{
                transform: `scale(${cropScale}) translate(${cropPan.x}px, ${cropPan.y}px)`,
                transformOrigin: 'center center'
              }}
            >
              {previewUrl ? (
                videoFile?.type?.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    className="h-full w-full object-cover transition-all duration-500"
                    alt="Preview"
                    style={{
                      transform: `rotate(${editorSettings.rotation + cropRotation}deg)`,
                      transformOrigin: 'center center',
                      filter: getCombinedFilter()
                    }}
                  />
                ) : (
                  <video
                    key={`preview-video-${currentPreviewClipIndex}-${clipSequence[currentPreviewClipIndex]?.url || 'none'}`}
                    ref={(el) => {
                      previewVideoRef.current = el;
                      if (el && stage === 'preview') {
                        const currentClip = clipSequence[currentPreviewClipIndex];
                        const startOffset = currentClip?.startOffset || 0;
                        const speed = currentClip?.speed || 1;
                        if (el.currentTime !== startOffset) {
                          el.currentTime = startOffset;
                        }
                        el.playbackRate = speed;
                        el.play().catch(() => { });
                      }
                    }}
                    src={clipSequence.length > 0 ? clipSequence[currentPreviewClipIndex]?.url : previewUrl}
                    className="h-full w-full object-cover transition-all duration-500"
                    muted={isVideoMuted || isMuted}
                    playsInline
                    autoPlay
                    onTimeUpdate={handlePreviewTimeUpdate}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      const currentClip = clipSequence[currentPreviewClipIndex];
                      const startOffset = currentClip?.startOffset || 0;
                      video.currentTime = startOffset;
                      video.playbackRate = currentClip?.speed || 1;
                    }}
                    style={{
                      transform: `rotate(${editorSettings.rotation + cropRotation}deg)`,
                      transformOrigin: 'center center',
                      filter: getCombinedFilter()
                    }}
                  />
                )
              ) : (
                <MediaPreview
                  image={selectedMedia.image}
                  rotation={editorSettings.rotation + cropRotation}
                  filter={selectedFilter}
                  className="h-full w-full"
                  adjustments={imageAdjustments}
                />
              )}
            </div>
          </div>
        )}
      </div>
      {/* Text Overlay Display with Drag & Rotate */}
      {overlayText && (
        <div
          className="absolute inset-0 z-30 overflow-hidden pointer-events-none"
        >
          <div
            className="absolute pointer-events-auto cursor-move select-none touch-none"
            style={{
              left: `calc(50% + ${textPos.x}px)`,
              top: `calc(50% + ${textPos.y}px)`,
              transform: `translate(-50%, -50%) rotate(${textRotation}deg)`,
              padding: '20px' // Increased hit area
            }}
            onPointerDown={(e) => {
              const target = e.currentTarget;
              target.setPointerCapture(e.pointerId);
              const startX = e.clientX;
              const startY = e.clientY;
              const initialX = textPos.x;
              const initialY = textPos.y;
              let hasMoved = false;
              setIsDraggingAny(true);

              const moveHandler = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                  hasMoved = true;
                }
                setTextPos({ x: initialX + dx, y: initialY + dy });

                const screenHeight = window.innerHeight;
                if (moveEvent.clientY > screenHeight * 0.7) {
                  setIsOverDeleteZone(true);
                } else {
                  setIsOverDeleteZone(false);
                }
              };

              const upHandler = (upEvent) => {
                const screenHeight = window.innerHeight;
                if (upEvent.clientY > screenHeight * 0.7) {
                  setOverlayText('');
                  showToast('Text deleted');
                } else if (!hasMoved) {
                  setIsEditingText(true);
                }
                setIsDraggingAny(false);
                setIsOverDeleteZone(false);
                target.removeEventListener('pointermove', moveHandler);
                target.removeEventListener('pointerup', upHandler);
              };

              target.addEventListener('pointermove', moveHandler);
              target.addEventListener('pointerup', upHandler);
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                // Rotation logic
                const angle = Math.atan2(
                  touch2.clientY - touch1.clientY,
                  touch2.clientX - touch1.clientX
                ) * (180 / Math.PI);

                if (window.lastAngle !== undefined) {
                  const deltaAngle = angle - window.lastAngle;
                  setTextRotation((prev) => prev + deltaAngle);
                }
                window.lastAngle = angle;
              }
            }}
            onTouchEnd={() => {
              window.lastAngle = undefined;
            }}
          >
            <p
              className={`whitespace-nowrap px-4 text-center font-black drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] transition-all duration-200 ${isOverDeleteZone && isDraggingAny ? 'scale-50 opacity-50 blur-sm' : 'active:scale-105'
                }`}
              style={{
                fontSize: `${overlayFontSize}px`,
                color: overlayColor,
                fontFamily: FONT_OPTIONS.find(f => f.name === overlayFont)?.family || 'inherit',
                whiteSpace: 'pre',
                textShadow: overlayFont === 'Outline' ? `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000` : (overlayFont === 'Glowing' ? `0 0 20px ${overlayColor}` : 'none')
              }}
            >
              {overlayText}
            </p>
          </div>
        </div>
      )}

      {/* Multiple Text Overlays Display in Preview */}
      {textList.map((overlay) => (
        <div
          key={overlay.id}
          id={`preview-text-overlay-${overlay.id}`}
          className="absolute inset-0 z-30 overflow-hidden pointer-events-none"
          style={{ display: 'none' }}
        >
          <div
            className="absolute select-none pointer-events-none"
            style={{
              left: `calc(50% + ${overlay.x}px)`,
              top: `calc(50% + ${overlay.y}px)`,
              transform: `translate(-50%, -50%) rotate(${overlay.rotation || 0}deg)`,
              padding: '10px'
            }}
          >
            <p
              className="whitespace-nowrap px-4 text-center font-black drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
              style={{
                fontSize: `${overlay.fontSize || 28}px`,
                color: overlay.color || '#ffffff',
                fontFamily: FONT_OPTIONS.find(f => f.name === (overlay.font || 'Standard'))?.family || 'inherit',
                whiteSpace: 'pre',
                textShadow: overlay.font === 'Outline' ? `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000` : (overlay.font === 'Glowing' ? `0 0 20px ${overlay.color}` : 'none')
              }}
            >
              {overlay.text}
            </p>
          </div>
        </div>
      ))}

      {/* Stickers Overlay */}
      {activeStickers.map((sticker, index) => (
        <div
          key={`${sticker.id}-${index}`}
          className="absolute z-30 pointer-events-auto cursor-move select-none touch-none"
          style={{
            left: `calc(50% + ${sticker.x}px)`,
            top: `calc(50% + ${sticker.y}px)`,
            transform: 'translate(-50%, -50%)',
            fontSize: '60px',
            padding: '20px'
          }}
          onPointerDown={(e) => {
            const target = e.currentTarget;
            target.setPointerCapture(e.pointerId);
            const startX = e.clientX;
            const startY = e.clientY;
            const initialX = sticker.x;
            const initialY = sticker.y;
            setIsDraggingAny(true);

            const moveHandler = (moveEvent) => {
              const dx = moveEvent.clientX - startX;
              const dy = moveEvent.clientY - startY;
              setActiveStickers(prev => prev.map((s, i) =>
                i === index ? { ...s, x: initialX + dx, y: initialY + dy } : s
              ));

              const screenHeight = window.innerHeight;
              if (moveEvent.clientY > screenHeight * 0.7) {
                setIsOverDeleteZone(true);
              } else {
                setIsOverDeleteZone(false);
              }
            };

            const upHandler = (upEvent) => {
              const screenHeight = window.innerHeight;
              if (upEvent.clientY > screenHeight * 0.7) {
                setActiveStickers(prev => prev.filter((_, i) => i !== index));
                showToast('Sticker deleted');
              }
              setIsDraggingAny(false);
              setIsOverDeleteZone(false);
              target.removeEventListener('pointermove', moveHandler);
              target.removeEventListener('pointerup', upHandler);
            };

            target.addEventListener('pointermove', moveHandler);
            target.addEventListener('pointerup', upHandler);
          }}
        >
          <span className={`transition-all duration-200 block ${isOverDeleteZone && isDraggingAny ? 'scale-50 opacity-50 blur-sm' : ''}`}>
            {sticker.content}
          </span>
        </div>
      ))}

      {/* Overlays (PIP) */}
      {activeOverlays.map((overlay, index) => (
        <DraggableOverlay
          key={`${overlay.id}-${index}`}
          overlay={overlay}
          index={index}
          setActiveOverlays={setActiveOverlays}
          setIsDraggingAny={setIsDraggingAny}
          setIsOverDeleteZone={setIsOverDeleteZone}
          showToast={showToast}
        />
      ))}

      {/* Delete Zone */}
      {isDraggingAny && (
        <div
          className={`absolute bottom-[18%] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center gap-2 transition-all duration-300 pointer-events-none ${isOverDeleteZone ? 'scale-110' : 'scale-90 opacity-80'
            }`}
        >
          <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 ${isOverDeleteZone ? 'border-red-500 bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'border-white bg-white/10 backdrop-blur-md'
            }`}>
            <BiTrash size={28} className={`transition-transform duration-300 ${isOverDeleteZone ? 'text-red-500 scale-110' : 'text-white'}`} />
          </div>
          <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${isOverDeleteZone ? 'text-red-500' : 'text-white shadow-black drop-shadow-md'
            }`}>
            Drag to delete
          </span>
        </div>
      )}

      {/* Top Header */}
      <div
        className="absolute inset-x-0 top-0 z-20 px-4 pb-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleCloseOrBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md active:opacity-70"
          >
            <BiChevronLeft size={28} />
          </button>
          
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveSheet('music-library')}
              className={`${themedFloatingPillClass} max-w-[200px] overflow-hidden flex items-center gap-2 ${selectedSound?.title && !['Original sound', 'Original audio', 'Original Audio'].includes(selectedSound.title) ? 'pr-1' : ''} cursor-pointer pointer-events-auto active:opacity-90`}
            >
              <BiMusic size={15} className={selectedSound?.title && !['Original sound', 'Original audio', 'Original Audio'].includes(selectedSound.title) ? 'animate-pulse text-[#fe2c55]' : ''} />
              <span className="truncate">
                {selectedSound?.title && !['Original sound', 'Original audio', 'Original Audio'].includes(selectedSound.title) ? selectedSound.title : 'Add sound'}
              </span>
              {selectedSound?.title && !['Original sound', 'Original audio', 'Original Audio'].includes(selectedSound.title) && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSounds([]);
                    showToast('Sound removed');
                  }}
                  className="ml-1 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <BiX size={16} className="text-white/60" />
                </div>
              )}
            </button>

          </div>

          <div className="w-10" />
        </div>
      </div>

      {/* Bottom Tools & Buttons */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 pb-[max(1.2rem,env(safe-area-inset-bottom))] pt-32 ${isDarkMode ? 'bg-gradient-to-t from-black via-black/60 to-transparent' : 'bg-gradient-to-t from-black/80 via-black/40 to-transparent'
          }`}
      >
        {/* Horizontal Tools List */}
        <div className="mb-6 flex gap-6 overflow-x-auto px-6 no-scrollbar">
          {[
            { id: 'text', label: 'Text', icon: <IoTextOutline size={26} /> },
            { id: 'stickers', label: 'Stickers', icon: <IoSparklesOutline size={26} /> },
            { id: 'audio', label: 'Voice', icon: <BiMicrophone size={26} /> },
            { id: 'filters', label: 'Filters', icon: <IoOptionsOutline size={26} /> },
            { id: 'volume-preview', label: 'Volume', icon: <BiVolumeFull size={26} /> },
            { id: 'save', label: 'Save', icon: <BiDownload size={26} /> },
          ].map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => handlePreviewToolClick(tool.id)}
              className="flex shrink-0 flex-col items-center gap-2 active:opacity-70"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/10 backdrop-blur-md">
                {tool.icon}
              </div>
              <span className="text-[11px] font-medium text-white/90">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-6">
          <button
            type="button"
            onClick={() => pushStage('editor')}
            className="flex h-[48px] items-center justify-center rounded-full bg-white/10 px-6 text-[15px] font-bold text-white backdrop-blur-md transition-all active:scale-95"
          >
            Edit video
          </button>
          <button
            type="button"
            onClick={handleNextClick}
            className="flex h-[48px] items-center justify-center gap-2 rounded-full bg-[#4d70ff] px-8 text-[15px] font-bold text-white shadow-lg transition-all active:scale-95"
          >
            <span>Next</span>
            <BiChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPostStage = () => (
    <div className="flex h-full flex-col bg-white text-black">
      <div
        className="flex items-center justify-between border-b border-black/5 px-4 pb-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
      >
        <button type="button" onClick={handleCloseOrBack} className="active:opacity-60">
          <BiChevronLeft size={22} />
        </button>
        <h2 className="text-[18px] font-semibold">Post</h2>
        <span className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="border-b border-black/5 px-4 py-4">
          <div className="flex gap-4">
            <textarea
              value={postState.caption}
              onChange={(event) =>
                setPostState((currentState) => ({
                  ...currentState,
                  caption: event.target.value,
                }))
              }
              placeholder="Describe your post"
              className="min-h-[110px] flex-1 resize-none border-none bg-transparent text-[15px] outline-none placeholder:text-black/35"
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="relative h-[110px] w-[82px] overflow-hidden rounded-[6px] border border-black/10"
            >
              {/* Hidden file input */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setCoverImageUrl(url);
                  setCoverImageFile(file);
                  e.target.value = '';
                }}
              />
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Cover" className="h-full w-full object-cover" />
              ) : previewUrl ? (
                <video src={previewUrl} className="h-full w-full object-cover" />
              ) : (
                selectedMedia?.image && <img src={selectedMedia.image} alt="Cover" className="h-full w-full object-cover" />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-2 text-left text-[11px] font-medium text-white">
                {coverImageUrl ? 'Change cover' : 'Select cover'}
              </span>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPostState((currentState) => ({
                  ...currentState,
                  caption: `${currentState.caption}${currentState.caption ? ' ' : ''}#`,
                }))
              }
              className="rounded-[4px] border border-black/10 px-2.5 py-1.5 text-[12px] font-medium active:opacity-70"
            >
              Hashtags
            </button>
            <button
              type="button"
              onClick={() => {
                setMentionSearchQuery('');
                pushStage('mention');
              }}
              className="rounded-[4px] border border-black/10 px-2.5 py-1.5 text-[12px] font-medium active:opacity-70"
            >
              Mention
            </button>
          </div>

          {hashtagSuggestions.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-[12px] border border-black/5">
              {hashtagSuggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectHashtag(item.label)}
                  className="flex w-full items-center justify-between border-b border-black/5 px-4 py-3 text-left last:border-b-0 active:bg-black/[0.03]"
                >
                  <span className="text-[15px] text-black/80">{item.label}</span>
                  <span className="text-[13px] text-black/40">{item.views}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1 bg-[#f5f5f5] px-4 py-4">
          <button
            type="button"
            onClick={() => {
              setMentionSearchQuery('');
              if (tagInfoSeen) {
                pushStage('tag-people');
                return;
              }
              setActiveSheet('tag-info');
            }}
            className="flex w-full items-center justify-between rounded-[10px] bg-white px-4 py-4 active:opacity-80"
          >
            <div className="flex items-center gap-3">
              <span className="text-black/45">
                <BiAt size={18} />
              </span>
              <span className="text-[15px]">Tag people</span>
            </div>
            <BiChevronRight size={18} className="text-black/35" />
          </button>

          <button
            type="button"
            onClick={() => pushStage('location')}
            className="flex w-full items-center justify-between rounded-[10px] bg-white px-4 py-4 active:opacity-80"
          >
            <div className="flex items-center gap-3">
              <span className="text-black/45">
                <IoLocationOutline size={18} />
              </span>
              <span className="text-[15px]">Location</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-black/35">
              <span>{postState.location || 'Add'}</span>
              <BiChevronRight size={18} />
            </div>
          </button>



        </div>

        <div className="space-y-1 px-4 py-4">
          <button
            type="button"
            onClick={() => setActiveSheet('audience')}
            className="flex w-full items-center justify-between rounded-[10px] px-0 py-3 active:opacity-80"
          >
            <div className="flex items-center gap-3">
              <BiWorld size={18} className="text-black/45" />
              <span className="text-[15px]">Who can watch this video</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-black/40">
              <span>{CREATE_AUDIENCE_OPTIONS.find((item) => item.id === postState.audience)?.label || 'Everyone'}</span>
              <BiChevronRight size={18} />
            </div>
          </button>

          {[
            {
              key: 'allowComments',
              label: 'Allow comments',
            },
            {
              key: 'highQuality',
              label: 'Allow high-quality uploads',
            },
            {
              key: 'allowDuet',
              label: 'Allow Duet',
            },
          ].map((toggleItem) => (
            <div key={toggleItem.key} className="flex items-center justify-between py-3">
              <span className="text-[15px]">{toggleItem.label}</span>
              <Toggle
                enabled={postState[toggleItem.key]}
                isDarkMode={isDarkMode}
                onToggle={() =>
                  setPostState((currentState) => ({
                    ...currentState,
                    [toggleItem.key]: !currentState[toggleItem.key],
                  }))
                }
              />
            </div>
          ))}


        </div>

        <div className="px-4 pb-28">
          <div className="mt-3 flex items-center gap-3">
            {CREATE_SHARE_TARGETS.map((targetLabel) => (
              <button
                key={targetLabel}
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-[11px] text-black/40"
              >
                {targetLabel[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-black/5 bg-white px-4 py-4">
        <button
          type="button"
          onClick={handlePublishUi}
          className="w-full rounded-[10px] bg-[#fe2c55] py-3 text-[15px] font-semibold text-white active:opacity-80"
        >
          Post
        </button>
      </div>
    </div>
  );

  const renderMentionStage = (title) => {
    const isTagging = title === 'Tag people';
    const displayResults = mentionSearchQuery.trim() ? mentionSearchResults : followingUsers;

    return (
      <div className="flex h-full flex-col bg-white text-black">
        <div
          className="border-b border-black/5 px-4 pb-4"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setMentionSearchQuery('');
                popStage();
              }}
              className="active:opacity-60"
            >
              <BiX size={22} />
            </button>
            <h2 className="text-[18px] font-semibold">{title}</h2>
            <span className="w-6" />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-[10px] bg-[#f4f5f7] px-3 py-2 text-black/35">
            <BiSearch size={18} />
            <input
              type="text"
              placeholder="Search"
              value={mentionSearchQuery}
              onChange={(e) => setMentionSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-black/30"
            />
            {isMentionSearching && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#fe2c55] border-t-transparent" />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {displayResults.length > 0 ? (
            <div className="py-2">
              {displayResults.map((u) => (
                <button
                  key={u.id || u._id}
                  type="button"
                  onClick={() => u.username && handleSelectMention(u.username)}
                  className="flex w-full items-center gap-3 px-4 py-3 active:bg-black/[0.03]"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-black/5 relative">
                    {u.profilePicture?.url ? (
                      <img
                        src={u.profilePicture.url}
                        alt={u.username}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.nextSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="flex h-full w-full items-center justify-center bg-[#fe2c55]/10 text-[14px] font-bold text-[#fe2c55]"
                      style={{ display: u.profilePicture?.url ? 'none' : 'flex' }}
                    >
                      {u.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col items-start overflow-hidden text-left">
                    <span className="truncate text-[15px] font-semibold">{u.username}</span>
                    <span className="truncate text-[13px] text-black/45">{u.fullName || u.name || 'User'}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : mentionSearchQuery.trim() && !isMentionSearching ? (
            <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
              <p className="text-[16px] font-medium text-black/40">No users found for "{mentionSearchQuery}"</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-black/25 text-black/35">
                <BiAt size={32} />
              </div>
              <p className="mt-6 text-[20px] font-semibold">Not following anyone yet</p>
              <p className="mt-2 text-[14px] text-black/40">Search for an account to {isTagging ? 'tag' : 'mention'}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLocationStage = () => (
    <div className={`flex h-full flex-col ${isDarkMode ? 'bg-[#121212] text-white' : 'bg-white text-black'}`}>
      <div
        className={`border-b ${isDarkMode ? 'border-white/10' : 'border-black/5'} px-4 pb-4`}
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
      >
        <div className="flex items-center justify-between">
          <button type="button" onClick={handleCloseOrBack} className="active:opacity-60">
            <BiX size={22} className={isDarkMode ? 'text-white' : 'text-black'} />
          </button>
          <h2 className="text-[18px] font-semibold">Add location</h2>
          <span className="w-6" />
        </div>
        <div className={`mt-4 flex items-center gap-3 rounded-[10px] ${isDarkMode ? 'bg-white/10 text-white/50' : 'bg-[#f4f5f7] text-black/35'} px-3 py-2`}>
          <BiSearch size={18} className={isDarkMode ? 'text-white/60' : 'text-black/40'} />
          <input
            type="text"
            placeholder="Search locations"
            value={selectedLocationQuery}
            onChange={(event) => setSelectedLocationQuery(event.target.value)}
            className={`w-full bg-transparent text-[14px] outline-none ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {isSearchingLocation ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#fe2c55] border-r-[#fe2c55] animate-spin mb-3" />
            <p className={`text-[14px] font-medium animate-pulse ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>Searching locations...</p>
          </div>
        ) : locationSearchResults.length > 0 ? (
          <>
            <p className={`mb-4 text-[12px] font-medium ${isDarkMode ? 'text-white/40' : 'text-black/35'}`}>
              {selectedLocationQuery.trim() ? 'Search Results' : 'Nearby Location'}
            </p>
            <div className="space-y-5 animate-fadeIn">
              {locationSearchResults.map((locationItem) => (
                <button
                  key={locationItem.id}
                  type="button"
                  onClick={() => {
                    setPostState((currentState) => ({
                      ...currentState,
                      location: locationItem.title,
                    }));
                    popStage();
                  }}
                  className={`block w-full text-left active:opacity-70 border-b ${isDarkMode ? 'border-white/10' : 'border-black/[0.04]'} pb-3`}
                >
                  <p className={`text-[16px] font-semibold flex items-center gap-1.5 ${isDarkMode ? 'text-white/95' : 'text-black/90'}`}>
                    {locationItem.isCurrent && <IoLocationOutline className="text-[#fe2c55] shrink-0 animate-bounce" size={18} />}
                    <span>{locationItem.title}</span>
                  </p>
                  <p className={`mt-1 text-[13px] leading-normal line-clamp-2 ${isDarkMode ? 'text-white/50' : 'text-black/40'}`}>{locationItem.subtitle}</p>
                </button>
              ))}
            </div>
          </>
        ) : selectedLocationQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
            <IoLocationOutline size={36} className={`mb-3 ${isDarkMode ? 'text-white/30' : 'text-black/20'}`} />
            <p className={`text-[15px] font-bold ${isDarkMode ? 'text-white/80' : 'text-black/80'}`}>No matches found</p>
            <p className={`text-[13px] mt-1 mb-5 px-6 leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-black/45'}`}>
              We couldn't find any location matching "{selectedLocationQuery}".
            </p>
            <button
              type="button"
              onClick={() => {
                setPostState((currentState) => ({
                  ...currentState,
                  location: selectedLocationQuery.trim(),
                }));
                popStage();
              }}
              className="px-6 py-2.5 rounded-full bg-[#fe2c55] text-white text-[14px] font-semibold shadow-md active:scale-95 transition-transform"
            >
              Use "{selectedLocationQuery.trim()}"
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
            <IoLocationOutline size={40} className={`mb-3 ${isDarkMode ? 'text-white/20' : 'text-black/15'}`} />
            <p className={`text-[15px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Search for a location</p>
            <p className={`text-[13px] mt-1 max-w-[220px] leading-relaxed ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
              Type the name of a city, region, landmark, or country above to search.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMoreOptionsStage = () => (
    <div className="flex h-full flex-col bg-white text-black">
      <div
        className="flex items-center justify-between border-b border-black/5 px-4 pb-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
      >
        <button type="button" onClick={handleCloseOrBack} className="active:opacity-60">
          <BiX size={22} />
        </button>
        <h2 className="text-[18px] font-semibold">More options</h2>
        <span className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
        <div className="flex items-center justify-between py-4">
          <span className="text-[15px]">Save to device</span>
          <Toggle
            enabled={postState.saveToDevice}
            isDarkMode={isDarkMode}
            onToggle={() =>
              setPostState((currentState) => ({
                ...currentState,
                saveToDevice: !currentState.saveToDevice,
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between py-4">
          <span className="text-[15px]">Allow auto-generated captions</span>
          <Toggle
            enabled={postState.autoCaptions}
            isDarkMode={isDarkMode}
            onToggle={() =>
              setPostState((currentState) => ({
                ...currentState,
                autoCaptions: !currentState.autoCaptions,
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-[15px]">Audience controls</p>
            <p className="mt-1 text-[12px] text-black/35">This video is limited to those aged 18 years and older</p>
          </div>
          <Toggle
            enabled={postState.audienceControls}
            isDarkMode={isDarkMode}
            onToggle={() =>
              setPostState((currentState) => ({
                ...currentState,
                audienceControls: !currentState.audienceControls,
              }))
            }
          />
        </div>
      </div>
    </div>
  );

  const renderActiveStage = () => {
    const currentStage = (Array.isArray(stageStack) && stageStack.length > 0)
      ? stageStack[stageStack.length - 1]
      : 'camera';

    switch (currentStage) {

      case 'editor':
        return renderEditorStage();
      case 'preview':
        return renderPreviewStage();
      case 'post':
        return renderPostStage();
      case 'mention':
        return renderMentionStage('@Mention');
      case 'tag-people':
        return renderMentionStage('Tag people');
      case 'location':
        return renderLocationStage();
      case 'more-options':
        return renderMoreOptionsStage();
      case 'sound-editor':
        return renderSoundEditorStage();
      default:
        return renderCameraStage();
    }
  };

  const togglePreviewAudio = (soundItem) => {
    if (playingAudioId === (soundItem._id || soundItem.id)) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }

    const audioUrl = soundItem.url || soundItem.audioUrl;
    if (!audioUrl) {
      showToast('No audio URL found');
      return;
    }

    const currentStage = stageStack[stageStack.length - 1];
    const newAudio = new Audio(audioUrl);

    // If in sound editor, start from the selected clipStart
    if (currentStage === 'sound-editor') {
      newAudio.currentTime = clipStart;

      newAudio.ontimeupdate = () => {
        if (newAudio.currentTime >= clipStart + clipDuration) {
          newAudio.currentTime = clipStart;
        }
      };
    }

    newAudio.play().catch(err => {
      console.error('Playback error:', err);
      showToast('Failed to play audio');
    });

    newAudio.onended = () => {
      setPlayingAudioId(null);
    };

    audioPreviewRef.current = newAudio;
    setPlayingAudioId(soundItem._id || soundItem.id);
  };

  useEffect(() => {
    // Stop audio when leaving the stage
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  const ITEM_H = 52; // px per row in scroll picker
  const MIN_SEC = 1;
  const MAX_SEC = editorSoundMaxSec > 1 ? editorSoundMaxSec : 60;

  // Ref to track clipDuration without stale closure in scroll handler
  const clipDurationRef = useRef(clipDuration);
  useEffect(() => { clipDurationRef.current = clipDuration; }, [clipDuration]);

  // Sync scroll position whenever clipDuration changes from outside
  const syncPickerScroll = (dur) => {
    if (secondsPickerRef.current) {
      secondsPickerRef.current.scrollTop = (dur - MIN_SEC) * ITEM_H;
    }
  };

  const handlePickerScroll = () => {
    if (!secondsPickerRef.current) return;
    const idx = Math.round(secondsPickerRef.current.scrollTop / ITEM_H);
    const newVal = Math.min(MAX_SEC, Math.max(MIN_SEC, idx + MIN_SEC));
    if (newVal !== clipDurationRef.current) setClipDuration(newVal);
  };

  const renderDurationSheet = () => (
    <div className={sheetOverlayClass} onClick={() => setActiveSheet(null)}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-t-[24px] text-white flex flex-col items-center shadow-2xl pb-[max(2rem,env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-white/20 rounded-full my-4" />
        <h3 className="text-[17px] font-bold mb-2 text-white">Clip Duration</h3>
        <p className="text-[13px] text-white/40 mb-4">Scroll to select seconds</p>

        {/* Scroll Wheel */}
        <div className="relative w-full h-[210px] overflow-hidden">
          {/* Selection highlight band */}
          <div className="absolute left-0 right-0 top-[79px] h-[52px] bg-gradient-to-r from-[#ffcc00]/15 via-[#ff3366]/15 to-[#9933ff]/15 border-y border-white/15 pointer-events-none z-10" />
          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#1c1c1e] to-transparent pointer-events-none z-20" />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1c1c1e] to-transparent pointer-events-none z-20" />

          <div
            ref={(el) => {
              if (el && !secondsPickerRef.current) {
                secondsPickerRef.current = el;
                setTimeout(() => { el.scrollTop = (clipDuration - MIN_SEC) * ITEM_H; }, 50);
              } else if (!el) {
                secondsPickerRef.current = null;
              }
            }}
            onScroll={handlePickerScroll}
            className="h-full overflow-y-scroll no-scrollbar"
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {/* top padding */}
            <div style={{ height: ITEM_H * 1.5 }} />
            {Array.from({ length: MAX_SEC - MIN_SEC + 1 }, (_, i) => i + MIN_SEC).map((sec) => (
              <div
                key={sec}
                onClick={() => { setClipDuration(sec); syncPickerScroll(sec); }}
                className="flex items-center justify-center cursor-pointer"
                style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
              >
                <span
                  className={`font-black transition-all duration-150 ${sec === clipDuration
                      ? 'text-[30px] bg-gradient-to-r from-[#ffcc00] via-[#ff3366] to-[#9933ff] bg-clip-text text-transparent'
                      : Math.abs(sec - clipDuration) === 1
                        ? 'text-[20px] text-white/45'
                        : 'text-[14px] text-white/15'
                    }`}
                >
                  {sec} sec
                </span>
              </div>
            ))}
            {/* bottom padding */}
            <div style={{ height: ITEM_H * 1.5 }} />
          </div>
        </div>

        <button
          onClick={() => setActiveSheet(null)}
          className="mx-6 w-[calc(100%-3rem)] bg-gradient-to-r from-[#ffcc00] via-[#ff3366] to-[#9933ff] text-white py-4 rounded-[16px] font-bold text-[17px] active:scale-[0.98] transition-transform mt-4 shadow-lg"
        >
          Done
        </button>
      </div>
    </div>
  );

  const renderSoundEditorStage = () => {
    if (!editorSound) return null;

    // Auto-play when sound editor opens (so user hears the clip immediately)
    // This is handled declaratively via togglePreviewAudio called from useEffect below

    // Blurred bg art url
    const artUrl = editorSound.thumbnail || editorSound.cover;

    return (
      <div className="flex h-full flex-col text-white relative overflow-hidden" style={{ background: '#0d0d12' }}>

        {/* Blurred album art background */}
        {artUrl && (
          <>
            <img
              src={artUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20 scale-110 pointer-events-none"
              style={{ filter: 'blur(40px) saturate(1.5)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80 pointer-events-none" />
          </>
        )}

        {/* Header */}
        <div
          className="relative z-10 flex items-center justify-between px-5 pb-4 shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
        >
          {/* Left: back + cover + title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                console.log('Trimmer back clicked');
                popStage();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white active:opacity-70 cursor-pointer"
            >
              <BiChevronLeft size={24} />
            </button>
            <div className="w-11 h-11 rounded-[10px] overflow-hidden border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] shrink-0">
              {artUrl ? (
                <img src={artUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <BiMusic size={20} className="text-white/40" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-white leading-tight truncate max-w-[160px]">{editorSound.title}</p>
              <p className="text-[12px] text-white/50 mt-0.5 truncate max-w-[160px]">{editorSound.artist}</p>
            </div>
          </div>

          {/* Done pill */}
          <button
            type="button"
            onClick={() => {
              console.log('Trimmer Done clicked. editorSound:', editorSound, 'clipStart:', clipStart, 'clipDuration:', clipDuration, 'editingSoundIndex:', editingSoundIndex);
              try {
                // Stop preview audio
                if (audioPreviewRef.current) {
                  audioPreviewRef.current.pause();
                }
                setPlayingAudioId(null);

                const updatedSound = {
                  ...editorSound,
                  clipStart: clipStart,
                  clipDuration: clipDuration
                };

                if (editingSoundIndex >= 0) {
                  setSelectedSounds(prev => prev.map((s, idx) => idx === editingSoundIndex ? updatedSound : s));
                } else if (editingSoundIndex === -1) {
                  setSelectedSounds(prev => [...prev, updatedSound]);
                } else {
                  setSelectedSounds([updatedSound]);
                }

                setEditingSoundIndex(-1); // Reset
                popStage(true);
                showToast('Sound applied');
              } catch (e) {
                console.error('Error inside trimmer Done handler:', e);
              }
            }}
            className="shrink-0 px-5 py-2 rounded-full text-[14px] font-bold text-black active:scale-95 transition-transform shadow-lg cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #ffcc00, #ff3366)' }}
          >
            Done
          </button>
        </div>

        {/* Center: large rotating vinyl disc */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3">
          {/* Vinyl disc */}
          <div className="relative w-32 h-32">
            {/* Outer ring glow */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #ffcc00, #ff3366, #9933ff, #4d96ff, #ffcc00)',
                padding: '3px',
                borderRadius: '50%',
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#111]">
                {artUrl ? (
                  <img src={artUrl} alt="" className={`w-full h-full object-cover transition-all duration-500 ${playingAudioId === (editorSound._id || editorSound.id) ? 'animate-spin' : ''}`}
                    style={{ animationDuration: '4s' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
                    <BiMusic size={36} className="text-white/30" />
                  </div>
                )}
              </div>
            </div>
            {/* Center hole */}
            <div className="absolute inset-0 m-auto w-5 h-5 rounded-full bg-[#0d0d12] border-2 border-white/20 shadow-inner" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          </div>

          {/* Clip duration label */}
          <div
            className="px-5 py-1.5 rounded-full text-[13px] font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <span style={{ background: 'linear-gradient(90deg, #ffcc00, #ff3366, #9933ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {clipDuration}s
            </span>
            <span className="text-white/40 ml-1">clip</span>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="relative z-10 pb-[max(2rem,env(safe-area-inset-bottom))] px-5 shrink-0">

          <div
            className="rounded-[18px] p-4 mb-5 relative"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Draggable Waveform Container */}
            <div
              className="h-16 flex items-end gap-[2.5px] cursor-grab active:cursor-grabbing select-none relative"
              onPointerDown={(e) => {
                const startX = e.clientX;
                const initialStart = clipStart;
                const containerWidth = e.currentTarget.offsetWidth;

                const handleMove = (moveEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  // Convert pixels to seconds. 
                  // Total width represents MAX_SEC (60s).
                  const deltaSec = (deltaX / containerWidth) * MAX_SEC;
                  let newStart = initialStart - deltaSec;

                  // Constrain newStart
                  newStart = Math.max(0, Math.min(MAX_SEC - clipDuration, newStart));
                  setClipStart(newStart);
                };

                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };

                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
              }}
            >
              {[...Array(64)].map((_, i) => {
                const h = Math.abs(Math.sin(i * 0.55 + 0.8) * 38 + Math.cos(i * 0.28 + 1) * 18 + 40);

                // Calculate if this bar is within the selection window
                const barTime = (i / 64) * MAX_SEC;
                const isSelected = barTime >= clipStart && barTime < (clipStart + clipDuration);

                const zone = Math.floor(i / 13) % 5;
                const gradients = [
                  'linear-gradient(to top, #ffcc00, #ffaa00)',
                  'linear-gradient(to top, #ff9500, #ff5533)',
                  'linear-gradient(to top, #ff3366, #dd2277)',
                  'linear-gradient(to top, #c33fff, #7722dd)',
                  'linear-gradient(to top, #4d96ff, #2255dd)',
                ];
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-all duration-200"
                    style={{
                      height: `${Math.min(100, h)}%`,
                      background: isSelected ? gradients[zone] : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? '0 0 4px rgba(255,120,60,0.3)' : 'none',
                    }}
                  />
                );
              })}
            </div>

            {/* Selection Bracket overlay (shows where the clip is) */}
            <div className="absolute inset-x-4 top-4 bottom-4 pointer-events-none">
              <div
                className="absolute h-full border-2 border-white/60 rounded-lg transition-all duration-300 cursor-move pointer-events-auto"
                style={{
                  left: `${(clipStart / MAX_SEC) * 100}%`,
                  width: `${(clipDuration / MAX_SEC) * 100}%`,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const initialStart = clipStart;
                  const parentWidth = e.currentTarget.parentElement.offsetWidth;

                  const handleMove = (moveEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaSec = (deltaX / parentWidth) * MAX_SEC;
                    let newStart = initialStart + deltaSec;
                    newStart = Math.max(0, Math.min(MAX_SEC - clipDuration, newStart));
                    setClipStart(newStart);
                  };

                  const handleUp = () => {
                    window.removeEventListener('pointermove', handleMove);
                    window.removeEventListener('pointerup', handleUp);
                  };

                  window.addEventListener('pointermove', handleMove);
                  window.addEventListener('pointerup', handleUp);
                }}
              >
                {/* Visual grabbers */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-6 bg-white rounded-full shadow-lg" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-1.5 h-6 bg-white rounded-full shadow-lg" />
              </div>
            </div>

            {/* Time labels */}
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-white/30">{Math.floor(clipStart)}s</span>
              <span className="text-[10px] text-white/30">{Math.floor(clipStart + clipDuration)}s</span>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-3">
            {/* Seconds tap button */}
            <button
              onClick={() => setActiveSheet('choose-duration')}
              className="shrink-0 h-11 px-4 rounded-full flex items-center gap-1.5 active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)' }}
            >
              <span
                className="text-[20px] font-black leading-none"
                style={{ background: 'linear-gradient(90deg,#ffcc00,#ff3366)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {clipDuration}
              </span>
              <span className="text-[11px] text-white/40 font-semibold">sec</span>
            </button>

            {/* Gradient progress track */}
            <div className="flex-1 h-[4px] bg-white/10 rounded-full relative overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (clipDuration / MAX_SEC) * 100)}%`,
                  background: 'linear-gradient(90deg, #ffcc00, #ff3366, #9933ff)',
                  boxShadow: '0 0 8px rgba(255,51,102,0.6)',
                }}
              />
              {/* Handle dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg transition-all duration-300 border-2 border-white"
                style={{
                  left: `calc(${Math.min(96, (clipDuration / MAX_SEC) * 100)}% - 7px)`,
                  boxShadow: '0 0 10px rgba(255,255,255,0.7)',
                }}
              />
            </div>

            {/* Play / Pause */}
            <button
              onClick={() => togglePreviewAudio(editorSound)}
              className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
              style={{ background: 'linear-gradient(135deg, #ffcc00, #ff3366)' }}
            >
              {playingAudioId === (editorSound._id || editorSound.id) ? (
                <BiVolumeFull size={22} className="text-white" />
              ) : (
                <BiPlay size={26} className="ml-0.5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };


  const renderMusicLibrarySheet = () => (
    <div className={sheetOverlayClass} onClick={() => setActiveSheet(null)}>
      <div
        className="music-sheet-content fixed bottom-0 left-0 right-0 z-[501] flex max-h-[88%] w-full flex-col overflow-hidden rounded-t-[16px] bg-[#1c1c1e] text-white shadow-2xl transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ height: '80vh' }}
      >
        {/* Handle Area - Drag to Dismiss */}
        <div
          className="pt-3 pb-5 shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => {
            const startY = e.clientY;
            const sheet = e.currentTarget.closest('.music-sheet-content');

            const handlePointerMove = (moveEvent) => {
              const deltaY = moveEvent.clientY - startY;
              if (deltaY > 0) {
                sheet.style.transform = `translateY(${deltaY}px)`;
                sheet.style.transition = 'none';
              }
            };

            const handlePointerUp = (upEvent) => {
              const deltaY = upEvent.clientY - startY;
              sheet.style.transition = 'transform 0.2s ease-out';
              if (deltaY > 120) {
                setActiveSheet(null);
              } else {
                sheet.style.transform = 'translateY(0)';
              }
              window.removeEventListener('pointermove', handlePointerMove);
              window.removeEventListener('pointerup', handlePointerUp);
            };

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
          }}
        >
          <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto" />
        </div>

        <div className="px-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3 rounded-[12px] bg-[#2c2c2e] px-4 py-2 text-[#8e8e93] mb-4">
            <BiSearch size={20} />
            <input
              type="text"
              placeholder="Search"
              value={mentionSearchQuery}
              onChange={(e) => setMentionSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[16px] outline-none placeholder:text-[#8e8e93]"
            />
          </div>

          {/* Pill Navigation */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
            {['For you', 'Trending', 'Saved', 'Original audio'].map((tab) => {
              const tabId = tab.toLowerCase().replace(' ', '-');
              const isActive = soundBrowserTab === tabId || (soundBrowserTab === 'recommended' && tab === 'For you');
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSoundBrowserTab(tabId === 'for-you' ? 'recommended' : tabId)}
                  className={`shrink-0 px-4 py-1.5 rounded-[8px] text-[14px] font-bold transition-all ${isActive ? 'bg-white text-black' : 'bg-[#2c2c2e] text-white'
                    }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-[env(safe-area-inset-bottom,20px)] no-scrollbar">
          <div className="space-y-6">
            {selectedSounds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSounds([]);
                  setActiveSheet(null);
                  showToast('Background sound removed');
                }}
                className="flex w-full items-center gap-4 py-3 px-3 hover:bg-white/5 bg-white/[0.02] border border-white/5 rounded-xl transition-all mb-4"
              >
                <div className="h-[52px] w-[52px] rounded-[6px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <BiTrash size={24} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[15px] font-bold text-red-500">Remove background sound</p>
                  <p className="text-[13px] text-white/40 mt-1 truncate">Currently: {selectedSound.title}</p>
                </div>
              </button>
            )}
            {(soundBrowserTab === 'favorites' || soundBrowserTab === 'saved' ? favoriteSounds : libraryAudios)
              .filter(s => s.title.toLowerCase().includes(mentionSearchQuery.toLowerCase()) || s.artist.toLowerCase().includes(mentionSearchQuery.toLowerCase()))
              .map((soundItem) => (
                <div
                  key={soundItem._id || soundItem.id}
                  onClick={() => {
                    const actualDuration = parseDurationSeconds(soundItem.duration) || 15;
                    const newSound = { ...soundItem, clipStart: 0, clipDuration: actualDuration };

                    // Stop library preview audio if it is playing
                    if (audioPreviewRef.current) {
                      audioPreviewRef.current.pause();
                      audioPreviewRef.current = null;
                    }
                    setPlayingAudioId(null);

                    // Open sound editor trimmer so user can choose kahan se kahan tak play ho
                    setEditorSound(newSound);
                    setClipStart(0);
                    setClipDuration(actualDuration);

                    if (stage === 'editor' || stage === 'preview') {
                      setEditingSoundIndex(editingSoundIndex >= 0 ? editingSoundIndex : -1);
                    } else {
                      setEditingSoundIndex(-2); // -2 = camera single select
                    }

                    pushStage('sound-editor');
                    setActiveSheet(null);
                  }}
                  className="flex w-full cursor-pointer items-center gap-4"
                >
                  <div className="relative shrink-0">
                    {(soundItem.cover || soundItem.thumbnail) ? (
                      <img src={soundItem.cover || soundItem.thumbnail} alt={soundItem.title} className="h-[52px] w-[52px] rounded-[6px] object-cover" />
                    ) : (
                      <div className="h-[52px] w-[52px] rounded-[6px] bg-[#2c2c2e] flex items-center justify-center text-[#8e8e93]">
                        <BiMusic size={24} />
                      </div>
                    )}
                    {playingAudioId === (soundItem._id || soundItem.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[6px]">
                        <div className="flex gap-0.5 items-end h-4">
                          <div className="w-1 bg-white animate-music-bar-1" />
                          <div className="w-1 bg-white animate-music-bar-2" />
                          <div className="w-1 bg-white animate-music-bar-3" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-white leading-tight">{soundItem.title}</p>
                    <div className="flex items-center gap-1.5 text-[13px] text-[#8e8e93] mt-1">
                      <BiVolumeFull size={12} />
                      <span className="truncate">{soundItem.artist} • <DynamicAudioDuration soundItem={soundItem} /></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await audioService.toggleSaveAudio(soundItem._id || soundItem.id);
                          // Update local state to reflect change immediately using server truth
                          const newIsSaved = response?.isSaved ?? !soundItem.isSaved;
                          
                          // 1. Update libraryAudios with safe ID checks (prevent undefined === undefined matching all items)
                          setLibraryAudios(prev => prev.map(a => {
                            const aId = a._id || a.id;
                            const sId = soundItem._id || soundItem.id;
                            return (aId && sId && aId === sId)
                              ? { ...a, isSaved: newIsSaved }
                              : a;
                          }));

                          // 2. Update savedAudiosList
                          if (newIsSaved) {
                            setSavedAudiosList(prev => {
                              const exists = prev.some(a => {
                                const aId = a._id || a.id;
                                const sId = soundItem._id || soundItem.id;
                                return aId && sId && aId === sId;
                              });
                              if (exists) return prev;
                              return [...prev, { ...soundItem, isSaved: true }];
                            });
                          } else {
                            setSavedAudiosList(prev => prev.filter(a => {
                              const aId = a._id || a.id;
                              const sId = soundItem._id || soundItem.id;
                              return !(aId && sId && aId === sId);
                            }));
                          }

                          showToast(response.message);
                        } catch (err) {
                          console.error('Failed to toggle save:', err);
                          showToast('Failed to save audio');
                        }
                      }}
                      className={`p-2 transition-all active:scale-75 ${soundItem.isSaved ? 'text-white scale-110' : 'text-white/60'}`}
                    >
                      {soundItem.isSaved ? (
                        <BiSolidBookmark size={24} />
                      ) : (
                        <BiBookmark size={24} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePreviewAudio(soundItem);
                      }}
                      className="p-2 text-white"
                    >
                      {playingAudioId === (soundItem._id || soundItem.id) ? (
                        <BiVolumeFull size={24} />
                      ) : (
                        <BiPlay size={28} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderExitFlowConfirmation = () => (
    <div className={sheetOverlayClass} onClick={() => setActiveSheet(null)}>
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-[32px] bg-[#1c1c1e] px-6 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] text-white shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          <div className="w-10 h-1 bg-white/10 rounded-full mt-2 mb-8" />
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <BiTrash size={32} className="text-[#fe2c55]" />
          </div>
          <h3 className="text-[20px] font-bold mb-2">Discard video?</h3>
          <p className="text-[14px] text-white/50 text-center mb-8 px-4 leading-relaxed">
            If you go back now, your video edits will be lost. You can't undo this action.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              clearVideoCache();
              localStorage.removeItem('create_stageStack');
              localStorage.removeItem('create_recordStatus');
              localStorage.removeItem('create_recordedSeconds');
              localStorage.removeItem('create_previewUrl');
              localStorage.removeItem('create_postState');
              localStorage.removeItem('create_activeStickers');
              localStorage.removeItem('create_activeOverlays');
              localStorage.removeItem('create_selectedSounds');
              localStorage.removeItem('create_overlayText');
              localStorage.removeItem('create_overlayFont');
              localStorage.removeItem('create_overlayColor');
              localStorage.removeItem('create_overlayFontSize');
              localStorage.removeItem('create_textPos');
              localStorage.removeItem('create_textRotation');
              localStorage.removeItem('create_textList');

              // Reset local state
              setVideoFile(null);
              setPreviewUrl(null);
              setRecordStatus('idle');
              setRecordedSeconds(0);
              setStageStack(['camera']);
              setActiveStickers([]);
              setActiveOverlays([]);
              setSelectedFilter('Normal');
              setSelectedSounds([]);
              setPostState(createInitialPostState());
              setVideoDuration(0);
              setVideoThumbnails([]);
              setClipSequence([]);
              setTextList([]);
              setCurrentClipIndex(0);
              setLocationSearchResults([]);
              setIsSearchingLocation(false);

              setActiveSheet(null);
              navigate(-1);
            }}
            className="h-[56px] w-full rounded-[16px] bg-[#fe2c55] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(254,44,85,0.3)] active:scale-[0.98] transition-all"
          >
            Discard
          </button>
          <button
            onClick={() => setActiveSheet(null)}
            className="h-[56px] w-full rounded-[16px] bg-white/5 text-[16px] font-bold text-white hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            Keep
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`theme-create-page relative h-full min-h-screen w-full overflow-hidden select-none ${isDarkMode ? 'bg-black' : 'bg-[var(--theme-page-bg)]'}`}
      style={{ touchAction: 'none' }}
    >
      {renderActiveStage()}
      {activeSheet === 'music-library' && renderMusicLibrarySheet()}
      {activeSheet === 'choose-duration' && renderDurationSheet()}
      {activeSheet === 'exit-flow-confirmation' && renderExitFlowConfirmation()}

      <input
        type="file"
        ref={overlayInputRef}
        className="hidden"
        accept="image/*,video/*"
        onChange={handleOverlaySelect}
      />
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="video/*,image/*"
        onChange={handleFileChange}
      />

      {toastMessage && (
        <div
          className="absolute left-1/2 top-5 z-50 -translate-x-1/2 rounded-[8px] bg-[#5c554f] px-5 py-2 text-[13px] font-medium text-white shadow-xl"
          style={{ top: 'max(env(safe-area-inset-top), 14px)' }}
        >
          {toastMessage}
        </div>
      )}

      {syncingSound && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35">
          <div className="rounded-[18px] bg-[#4d4d55] px-6 py-5 text-center text-white shadow-xl">
            <BiMusic size={20} className="mx-auto mb-3 animate-pulse" />
            <p className="text-[15px] font-medium">Syncing sounds...</p>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl">
          <div className="relative flex flex-col items-center">
            {/* The circular double orbital loader */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Outer Orbit Loader (Vibrant Neon Pink) */}
              <div className="absolute w-36 h-36 rounded-full border-2 border-transparent border-t-[#fe2c55] border-r-[#fe2c55] animate-spin" style={{ animationDuration: '1.4s' }} />
              {/* Inner Orbit Loader (Glowing Purple - Reversed) */}
              <div className="absolute w-28 h-28 rounded-full border-2 border-transparent border-b-[#9b51e0] border-l-[#9b51e0] animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />

              {/* Center Thumbnail with Neon Pulsing Glow */}
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#fe2c55] shadow-[0_0_20px_rgba(254,44,85,0.5)] flex items-center justify-center bg-black/40 animate-pulse">
                {previewUrl ? (
                  videoFile?.type?.startsWith('image/') ? (
                    <img src={previewUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <video src={previewUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                  )
                ) : (
                  <BiMusic size={28} className="text-white animate-bounce" />
                )}
              </div>
            </div>

            {/* Posting title with bouncy dots */}
            <h2 className="mt-8 text-[22px] font-black text-white tracking-wide text-center flex items-center gap-1.5 justify-center">
              <span>Posting your reel</span>
              <span className="flex gap-1 items-end h-5 pb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fe2c55] animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#9b51e0] animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#fe2c55] animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
              </span>
            </h2>

            {/* Subtitle */}
            <p className="mt-2 text-[14px] text-white/50 px-8 text-center max-w-[280px] leading-relaxed">
              Uploading your masterpiece to Jhumroo. Please do not close the app.
            </p>

            {/* Glowing blur effects behind the loader */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#fe2c55]/10 filter blur-[80px] pointer-events-none -z-10 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-[#9b51e0]/10 filter blur-[80px] pointer-events-none -z-10 animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>
      )}

      {activeSheet === 'timer' && (
        <BottomSheet title="Set countdown" onClose={() => setActiveSheet(null)}>
          <div className="px-5">
            <div className="grid grid-cols-2 gap-3">
              {['3s', '10s'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedCountdown(option)}
                  className={`rounded-[10px] py-4 text-[18px] font-semibold ${selectedCountdown === option ? 'bg-black text-white' : 'bg-black/5 text-black/65'
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="mt-5 text-[13px] text-black/55">Drag to adjust clip length</p>
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between text-[12px] text-black/35">
                <span>0s</span>
                <span>{countdownLength.toFixed(1)}s</span>
                <span>15s</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.1"
                value={countdownLength}
                onChange={(event) => setCountdownLength(Number(event.target.value))}
                className="w-full accent-[#fe2c55]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSheet(null);
                const seconds = parseInt(selectedCountdown);
                setActiveCountdown(seconds);
                setIsTimerRecording(true);
              }}
              className="mb-2 mt-6 w-full rounded-[10px] bg-[#fe2c55] py-3 text-[15px] font-semibold text-white active:scale-95 transition-transform"
            >
              Start recording
            </button>
          </div>
        </BottomSheet>
      )}

      {activeSheet === 'discard-last-clip' && (
        <CenterModal
          title="Discard the last clip?"
          description="This is a UI-only create flow. You can keep the clip for preview or discard it here."
          primaryLabel="Discard"
          secondaryLabel="Keep"
          isDarkMode={isDarkMode}
          onPrimary={handleDiscardClip}
          onSecondary={() => setActiveSheet(null)}
        />
      )}


      {activeSheet === 'replace-sound' && (
        <BottomSheet title="Replace sound" onClose={() => setActiveSheet(null)}>
          <div className="px-4 pb-3">
            <div className="mb-4 rounded-[12px] bg-black/5 p-3 text-[13px] text-black/55">
              Current sound: <span className="font-semibold text-black">{selectedSound.title}</span>
            </div>
            <div className="space-y-3">
              {CREATE_SOUND_LIBRARY.map((soundItem) => (
                <button
                  key={soundItem.id}
                  type="button"
                  onClick={() => {
                    setSelectedSounds([soundItem]);
                    setActiveSheet(null);
                    showToast('Sound replaced');
                  }}
                  className="flex w-full items-center gap-3 rounded-[12px] px-1 py-1 text-left active:bg-black/[0.03]"
                >
                  {soundItem.cover && <img src={soundItem.cover} alt={soundItem.title} className="h-12 w-12 rounded-[8px] object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{soundItem.title}</p>
                    <p className="text-[13px] text-black/45">
                      {soundItem.artist} - {soundItem.duration}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>
      )}

      {activeSheet === 'story-post' && (
        <CenterModal
          title="Post Story publicly?"
          description="Your account is public and your public videos will be visible to everyone. You can make this video private, or switch to a private account in your privacy settings."
          primaryLabel="Post Now"
          secondaryLabel="Cancel"
          isDarkMode={isDarkMode}
          onPrimary={handleStoryPostUi}
          onSecondary={() => setActiveSheet(null)}
        />
      )}

      {activeSheet === 'story-privacy' && (
        <BottomSheet title="Privacy settings" onClose={() => setActiveSheet(null)} compact>
          <div className="px-5 pb-2">
            <h4 className="text-[15px] font-semibold">Who can watch this</h4>
            <div className="mt-3 space-y-4">
              {CREATE_AUDIENCE_OPTIONS.map((audienceItem) => (
                <button
                  key={audienceItem.id}
                  type="button"
                  onClick={() =>
                    setPostState((currentState) => ({
                      ...currentState,
                      audience: audienceItem.id,
                    }))
                  }
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="text-[15px]">{audienceItem.label}</p>
                    {audienceItem.subtitle && (
                      <p className="mt-1 text-[12px] text-black/35">{audienceItem.subtitle}</p>
                    )}
                  </div>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${postState.audience === audienceItem.id
                        ? 'border-[#fe2c55] text-[#fe2c55]'
                        : 'border-black/15 text-transparent'
                      }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-current" />
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-black/5 py-4">
              <span className="text-[15px]">Allow comments</span>
              <Toggle
                enabled={storyAllowComments}
                isDarkMode={isDarkMode}
                onToggle={() => setStoryAllowComments((currentValue) => !currentValue)}
              />
            </div>
          </div>
        </BottomSheet>
      )}

      {activeSheet === 'tag-info' && (
        <BottomSheet title="Tag people in this video" onClose={() => setActiveSheet(null)}>
          <div className="px-5 pb-3">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-black/5 text-black/45">
              <BiAt size={28} />
            </div>
            <div className="space-y-4 text-[14px] text-black/60">
              <p>People you tag are visible to anyone who can watch this video.</p>
              <p>You can edit tagged people after the video is posted. People you tag can also remove themselves.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTagInfoSeen(true);
                setActiveSheet(null);
                pushStage('tag-people');
              }}
              className="mt-6 w-full rounded-[10px] bg-[#fe2c55] py-3 text-[15px] font-semibold text-white"
            >
              OK
            </button>
          </div>
        </BottomSheet>
      )}

      {activeSheet === 'add-link' && (
        <BottomSheet title="Add link" onClose={() => setActiveSheet(null)}>
          <div className="space-y-1 px-4 pb-2">
            {CREATE_LINK_OPTIONS.map((linkItem) => (
              <button
                key={linkItem.id}
                type="button"
                onClick={() => {
                  setPostState((currentState) => ({
                    ...currentState,
                    linkType: linkItem.title,
                  }));
                  setActiveSheet(null);
                  showToast(`${linkItem.title} link selected`);
                }}
                className="flex w-full items-center gap-3 rounded-[12px] px-2 py-3 text-left active:bg-black/[0.03]"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${linkItem.accent} text-white`}>
                  <BiLinkAlt size={18} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">{linkItem.title}</p>
                  <p className="mt-1 text-[12px] text-black/40">{linkItem.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {activeSheet === 'audience' && (
        <BottomSheet title="Who can watch this video" onClose={() => setActiveSheet(null)} compact>
          <div className="px-5 pb-2">
            {CREATE_AUDIENCE_OPTIONS.map((audienceItem) => (
              <button
                key={audienceItem.id}
                type="button"
                onClick={() => {
                  setPostState((currentState) => ({
                    ...currentState,
                    audience: audienceItem.id,
                  }));
                  setActiveSheet(null);
                }}
                className="flex w-full items-center justify-between py-4 text-left"
              >
                <div>
                  <p className="text-[15px]">{audienceItem.label}</p>
                  {audienceItem.subtitle && (
                    <p className="mt-1 text-[12px] text-black/35">{audienceItem.subtitle}</p>
                  )}
                </div>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border ${postState.audience === audienceItem.id
                      ? 'border-[#fe2c55] text-[#fe2c55]'
                      : 'border-black/15 text-transparent'
                    }`}
                >
                  <span className="h-3 w-3 rounded-full bg-current" />
                </span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
      {activeSheet === 'stickers-preview' && (
        <BottomSheet
          title="Stickers"
          onClose={() => setActiveSheet(null)}
          scrollable={true}
        >
          <div className="grid grid-cols-5 gap-4 p-5 max-h-[300px]">
            {MOCK_STICKERS.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                onClick={() => {
                  setActiveStickers((prev) => [
                    ...prev,
                    {
                      id: `${Date.now()}-${index}`,
                      content: emoji,
                      x: 0,
                      y: 0,
                    },
                  ]);
                  setActiveSheet(null);
                  showToast('Sticker added');
                }}
                className="flex items-center justify-center text-[36px] hover:scale-125 transition-transform active:scale-95 py-2"
              >
                {emoji}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
      {activeSheet === 'filters-preview' && (
        <div className="absolute inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-500">
          <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 rounded-t-[32px] pt-4 pb-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between px-6 mb-6">
              <h3 className="text-white text-[17px] font-bold tracking-tight">Filters</h3>
              <button
                onClick={() => setActiveSheet(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 active:scale-90 transition-transform"
              >
                <BiX size={20} />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto px-6 no-scrollbar pb-2">
              {Object.keys(FILTER_PRESETS).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(filter);
                    showToast(`${filter} filter applied`);
                  }}
                  className="flex flex-col items-center gap-3 shrink-0 group"
                >
                  <div
                    className={`relative h-20 w-20 rounded-2xl overflow-hidden transition-all duration-300 ${selectedFilter === filter
                        ? 'ring-4 ring-[#fe2c55] ring-offset-4 ring-offset-black scale-105 shadow-[0_0_30px_rgba(254,44,85,0.4)]'
                        : 'ring-1 ring-white/20 opacity-70 group-hover:opacity-100 group-hover:scale-105'
                      }`}
                  >
                    {filterPreviewFrame ? (
                      <img
                        src={filterPreviewFrame}
                        className="h-full w-full object-cover"
                        style={{ filter: FILTER_PRESETS[filter] }}
                        alt={filter}
                      />
                    ) : (
                      <div className="h-full w-full bg-[#2c2c2e]" style={{ filter: FILTER_PRESETS[filter] }} />
                    )}
                    {selectedFilter === filter && (
                      <div className="absolute inset-0 bg-[#fe2c55]/10 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg">
                          <BiCheck size={18} className="text-[#fe2c55]" />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`text-[12px] font-semibold tracking-wide transition-colors ${selectedFilter === filter ? 'text-[#fe2c55]' : 'text-white/50'
                    }`}>
                    {filter}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSheet === 'speed-preview' && (
        <BottomSheet title="Playback speed" onClose={() => setActiveSheet(null)}>
          <div className="px-5 pb-8">
            <div className="flex items-center gap-3">
              {['0.5x', '1x', '2x', '3x'].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => {
                    setSelectedSpeed(speed);
                    showToast(`Speed set to ${speed}`);
                  }}
                  className={`flex-1 rounded-[10px] py-4 text-[16px] font-bold ${selectedSpeed === speed ? 'bg-black text-white' : 'bg-black/5 text-black/65'
                    }`}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>
      )}

      {activeSheet === 'volume-preview' && (
        <BottomSheet title="Volume" onClose={() => setActiveSheet(null)}>
          <div className="space-y-8 px-6 pb-10 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-white">Original sound</span>
                <span className="text-[13px] text-white/50 font-bold">{originalVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={originalVolume}
                onChange={(e) => setOriginalVolume(Number(e.target.value))}
                className="w-full accent-[#fe2c55] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            {selectedSounds.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-white">Added sound ({selectedSound.title})</span>
                  <span className="text-[13px] text-white/50 font-bold">{addedVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={addedVolume}
                  onChange={(e) => setAddedVolume(Number(e.target.value))}
                  className="w-full accent-[#fe2c55] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSounds([]);
                    showToast('Background sound removed');
                    setActiveSheet(null);
                  }}
                  className="w-full mt-6 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[14px] font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border border-red-500/10"
                >
                  <BiTrash size={16} />
                  Remove Added Sound
                </button>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {activeSheet === 'voiceover' && (
        <BottomSheet
          title="Voiceover"
          onClose={() => {
            if (isRecordingVoice && voiceRecorder) voiceRecorder.stop();
            if (voicePreviewAudioRef.current) {
              voicePreviewAudioRef.current.pause();
              voicePreviewAudioRef.current = null;
            }
            if (voiceTimerIntervalRef.current) {
              clearInterval(voiceTimerIntervalRef.current);
              voiceTimerIntervalRef.current = null;
            }
            setIsVoicePreviewPlaying(false);
            setActiveSheet(null);
          }}
        >
          <div className="flex flex-col items-center gap-6 px-6 pb-12 pt-8">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-bold mb-2">Record your voice</h2>
              <p className="text-[13px] text-black/40">
                Tap to record voiceover (Max duration: {((videoDuration && videoDuration > 0) ? videoDuration : (recordedSeconds || 15)).toFixed(1)}s)
              </p>
            </div>

            {/* Live Recording Duration / Preview Duration Counter */}
            <div className="h-8 flex items-center justify-center">
              {isRecordingVoice ? (
                <div className="text-3xl font-black text-[#fe2c55] animate-pulse drop-shadow-[0_0_10px_rgba(254,44,85,0.4)]">
                  {voiceRecordingSeconds.toFixed(1)}s / {((videoDuration && videoDuration > 0) ? videoDuration : (recordedSeconds || 15)).toFixed(1)}s
                </div>
              ) : voicePreviewUrl ? (
                <div className="text-[14px] font-bold text-white/60 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00f2ea]"></span>
                  <span>Recorded: {voiceRecordingSeconds.toFixed(1)}s</span>
                </div>
              ) : (
                <div className="text-[13px] text-white/35 font-semibold italic">Ready to record</div>
              )}
            </div>

            <div className="relative flex items-center justify-center h-40 w-40">
              {/* Waveform Animation */}
              {isRecordingVoice && (
                <div className="absolute inset-0 flex items-center justify-center gap-1">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-[#fe2c55] rounded-full animate-pulse"
                      style={{
                        height: `${20 + Math.random() * 60}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.5s'
                      }}
                    />
                  ))}
                </div>
              )}

              <button
                className={`relative z-10 h-32 w-32 rounded-full border-[6px] transition-all duration-300 flex items-center justify-center shadow-2xl ${isRecordingVoice
                    ? 'border-[#fe2c55] bg-[#fe2c55]/10 scale-110'
                    : 'border-black/5 bg-black/5 hover:bg-black/10'
                  }`}
                onClick={async () => {
                  // Calculate exact reel video duration limit
                  let reelMaxDuration = 15;
                  if (videoDuration && videoDuration > 0) {
                    reelMaxDuration = videoDuration;
                  } else if (clipSequence && clipSequence.length > 0) {
                    const total = clipSequence.reduce((acc, c) => {
                      const dur = ((c.limitEnd || c.originalDuration || c.duration || 0) - (c.limitStart || 0)) / (c.speed || 1);
                      return acc + dur;
                    }, 0);
                    if (total > 0) reelMaxDuration = total;
                  } else if (recordedSeconds && recordedSeconds > 0) {
                    reelMaxDuration = recordedSeconds;
                  } else if (selectedDuration.includes('m')) {
                    reelMaxDuration = parseFloat(selectedDuration) * 60;
                  } else if (selectedDuration.includes('s')) {
                    reelMaxDuration = parseFloat(selectedDuration);
                  }

                  if (isRecordingVoice) {
                    if (voiceRecorder && voiceRecorder.state !== 'inactive') {
                      voiceRecorder.stop();
                      setIsRecordingVoice(false);
                      showToast('Recording finished');
                    }
                    if (voiceTimerIntervalRef.current) {
                      clearInterval(voiceTimerIntervalRef.current);
                      voiceTimerIntervalRef.current = null;
                    }
                    setVoiceMaxDuration(Math.min(voiceRecordingSeconds, reelMaxDuration));
                  } else {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      const recorder = new MediaRecorder(stream);
                      const chunks = [];
                      recorder.ondataavailable = (e) => chunks.push(e.data);
                      recorder.onstop = () => {
                        const mime = recorder.mimeType || 'audio/webm';
                        const blob = new Blob(chunks, { type: mime });
                        setRecordedVoiceBlob(blob);
                        const url = URL.createObjectURL(blob);
                        setVoicePreviewUrl(url);
                        stream.getTracks().forEach(t => t.stop());
                      };
                      setVoiceRecordingSeconds(0);
                      setVoiceMaxDuration(0);
                      setVoiceClipStart(0);
                      
                      voiceTimerIntervalRef.current = setInterval(() => {
                        setVoiceRecordingSeconds(prev => {
                          const next = prev + 0.1;
                          if (next >= reelMaxDuration) {
                            if (voiceTimerIntervalRef.current) {
                              clearInterval(voiceTimerIntervalRef.current);
                              voiceTimerIntervalRef.current = null;
                            }
                            if (recorder && recorder.state !== 'inactive') {
                              recorder.stop();
                            }
                            setIsRecordingVoice(false);
                            setVoiceMaxDuration(reelMaxDuration);
                            showToast(`Maximum voiceover duration reached (${reelMaxDuration.toFixed(1)}s)`);
                            return reelMaxDuration;
                          }
                          return next;
                        });
                      }, 100);
                      recorder.start();
                      setVoiceRecorder(recorder);
                      setIsRecordingVoice(true);
                      showToast('Recording...');
                    } catch (err) {
                      console.error("Mic access failed:", err);
                      showToast('Microphone access denied');
                    }
                  }
                }}
              >
                <BiMicrophone size={48} className={isRecordingVoice ? 'text-[#fe2c55]' : 'text-black/20'} />
              </button>
            </div>

            {/* Voiceover Clip Duration Editor */}
            {recordedVoiceBlob && voiceMaxDuration > 0 && (
              <div className="w-full space-y-3 px-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-bold text-white">Trim Start</span>
                  <span className="font-black text-[#00f2ea]">{voiceClipStart.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, voiceMaxDuration - 0.5)}
                  step="0.1"
                  value={voiceClipStart}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setVoiceClipStart(val);
                    setVoiceRecordingSeconds(prev => Math.min(prev, voiceMaxDuration - val));
                    if (voicePreviewAudioRef.current) {
                      voicePreviewAudioRef.current.pause();
                      setIsVoicePreviewPlaying(false);
                    }
                  }}
                  className="w-full accent-[#00f2ea] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-bold text-white">Clip Duration</span>
                  <span className="font-black text-[#00f2ea]">
                    {voiceRecordingSeconds.toFixed(1)}s <span className="text-white/40 text-[12px]">/ {(voiceMaxDuration - voiceClipStart).toFixed(1)}s</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max={Math.max(0.5, voiceMaxDuration - voiceClipStart)}
                  step="0.1"
                  value={voiceRecordingSeconds}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setVoiceRecordingSeconds(val);
                    if (voicePreviewAudioRef.current) {
                      voicePreviewAudioRef.current.pause();
                      setIsVoicePreviewPlaying(false);
                    }
                  }}
                  className="w-full accent-[#00f2ea] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[11px] text-white/40 text-center font-medium">
                  Drag to trim the start point or the duration of your voiceover clip
                </p>
              </div>
            )}

            <div className="flex w-full items-center justify-center gap-8">
              {voicePreviewUrl && (
                <button
                  onClick={() => {
                    if (isVoicePreviewPlaying) {
                      if (voicePreviewAudioRef.current) {
                        voicePreviewAudioRef.current.pause();
                        voicePreviewAudioRef.current.currentTime = voiceClipStart;
                      }
                      setIsVoicePreviewPlaying(false);
                    } else {
                      if (voicePreviewAudioRef.current) {
                        voicePreviewAudioRef.current.pause();
                      }
                      const audio = new Audio(voicePreviewUrl);
                      voicePreviewAudioRef.current = audio;
                      audio.currentTime = voiceClipStart;

                      // Stop playing once it reaches the edited end point
                      audio.addEventListener('timeupdate', () => {
                        if (audio.currentTime >= voiceClipStart + voiceRecordingSeconds) {
                          audio.pause();
                          audio.currentTime = voiceClipStart;
                          setIsVoicePreviewPlaying(false);
                        }
                      });

                      audio.addEventListener('ended', () => {
                        setIsVoicePreviewPlaying(false);
                      });
                      setIsVoicePreviewPlaying(true);
                      audio.play().catch(e => {
                        console.error("Preview play failed:", e);
                        showToast('Playback failed');
                        setIsVoicePreviewPlaying(false);
                      });
                    }
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md ${
                    isVoicePreviewPlaying 
                      ? 'bg-[#fe2c55] text-white shadow-[#fe2c55]/30' 
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}>
                    {isVoicePreviewPlaying ? <BiPause size={28} /> : <BiPlay size={28} />}
                  </div>
                  <span className={`text-[11px] font-bold ${isVoicePreviewPlaying ? 'text-[#fe2c55]' : 'text-white/60'}`}>
                    {isVoicePreviewPlaying ? 'Playing' : 'Preview'}
                  </span>
                </button>
              )}

              {recordedVoiceBlob && (
                <button
                  onClick={() => {
                    if (voicePreviewAudioRef.current) {
                      voicePreviewAudioRef.current.pause();
                      voicePreviewAudioRef.current = null;
                    }
                    setIsVoicePreviewPlaying(false);
                    const url = URL.createObjectURL(recordedVoiceBlob);
                    setSelectedSounds(prev => [...prev, {
                      id: Date.now(),
                      title: 'Voiceover',
                      url: url,
                      clipDuration: voiceRecordingSeconds,
                      clipStart: voiceClipStart,
                      duration: voiceMaxDuration
                    }]);
                    setActiveSheet(null);
                    showToast('Voiceover added');
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="h-14 w-14 rounded-full bg-[#00f2ea] flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform">
                    <BiCheck size={32} />
                  </div>
                  <span className="text-[11px] font-bold text-white/60">Done</span>
                </button>
              )}
            </div>
          </div>
        </BottomSheet>
      )}


      {isEditingText && (
        <div className="absolute inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-between px-5 pt-8">
            <button
              type="button"
              onClick={handleTextCancel}
              className="text-[16px] font-medium text-white/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTextDone}
              className="rounded-[6px] bg-white px-4 py-1.5 text-[14px] font-bold text-black"
            >
              Done
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center px-8">
            <textarea
              autoFocus
              className="w-full bg-transparent text-center font-bold outline-none placeholder:text-white/20 whitespace-pre overflow-hidden no-scrollbar"
              placeholder="Type something..."
              style={{
                fontSize: `${overlayFontSize}px`,
                fontFamily: FONT_OPTIONS.find(f => f.name === overlayFont)?.family || 'inherit',
                color: overlayColor,
                lineHeight: 1.2,
                overflow: 'hidden',
                resize: 'none'
              }}
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
            />

            {/* Vertical Font Size Slider (Roller) - Redesigned for smooth custom dragging */}
            <div
              ref={fontSizeSliderRef}
              className="absolute left-8 top-1/2 -translate-y-1/2 group touch-none"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                setOverlayFontSize(Math.round(12 + pct * (100 - 12)));
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                setOverlayFontSize(Math.round(12 + pct * (100 - 12)));
              }}
            >
              <div className="relative h-64 w-6 flex items-center justify-center cursor-ns-resize">
                {/* Tapered Track */}
                <div
                  className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-t-sm"
                  style={{
                    clipPath: 'polygon(0% 0%, 100% 0%, 60% 100%, 40% 100%)'
                  }}
                />

                {/* Active Fill (Tapered) */}
                <div
                  className="absolute bottom-0 w-full bg-white/60 origin-bottom transition-all duration-75"
                  style={{
                    height: `${((overlayFontSize - 12) / (100 - 12)) * 100}%`,
                    clipPath: 'polygon(0% 0%, 100% 0%, 60% 100%, 40% 100%)'
                  }}
                />

                {/* Thumb (White Circle) */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.6)] z-10 pointer-events-none transition-all duration-75 border-2 border-white"
                  style={{
                    bottom: `calc(${((overlayFontSize - 12) / (100 - 12)) * 100}% - 12px)`,
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Size</span>
              </div>
            </div>
          </div>

          <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
            {/* Font Picker */}
            <div className="mb-6 flex gap-3 overflow-x-auto px-5 no-scrollbar">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => setOverlayFont(font.name)}
                  className={`shrink-0 rounded-[8px] border px-4 py-2.5 text-[15px] font-bold transition-all active:scale-95 ${overlayFont === font.name ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5 text-white'
                    }`}
                  style={{ fontFamily: font.family }}
                >
                  {font.name}
                </button>
              ))}
            </div>

            {/* Color Picker */}
            <div className="flex gap-4 overflow-x-auto px-6 no-scrollbar">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setOverlayColor(color)}
                  className={`h-8 w-8 shrink-0 rounded-full border-2 transition-transform active:scale-125 ${overlayColor === color ? 'border-white scale-110 shadow-lg' : 'border-white/20'
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Rendering Overlay */}
      {isRendering && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 text-center px-10">
            <div className="relative h-24 w-24">
              <svg className="h-full w-full" viewBox="0 0 100 100">
                <circle
                  className="text-white/10"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-[#fe2c55] transition-all duration-300 ease-out"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - renderProgress / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-xl">
                {renderProgress}%
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Creating your Reel</h2>
              <p className="mt-2 text-[13px] text-white/60">Applying filters, text, and merging clips... Please don't close the app.</p>
            </div>
          </div>
        </div>
      )}
      {activeSheet === 'adjust-preview' && (
        <BottomSheet title="Adjust" onClose={() => setActiveSheet(null)} scrollable transparentOverlay={true}>
          <div className="flex flex-col gap-8 px-6 pb-12 pt-6">
            {[
              { id: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%' },
              { id: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%' },
              { id: 'saturate', label: 'Saturation', min: 0, max: 200, unit: '%' },
              { id: 'hueRotate', label: 'Hue', min: 0, max: 360, unit: '°' },
              { id: 'opacity', label: 'Opacity', min: 0, max: 100, unit: '%' },
              { id: 'blur', label: 'Blur', min: 0, max: 20, unit: 'px' },
              { id: 'grayscale', label: 'Grayscale', min: 0, max: 100, unit: '%' },
              { id: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
              { id: 'invert', label: 'Invert', min: 0, max: 100, unit: '%' },
            ].map((adj) => (
              <div key={adj.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-black">{adj.label}</span>
                  <span className="text-[12px] font-medium text-black/40">{imageAdjustments[adj.id]}{adj.unit}</span>
                </div>
                <input
                  type="range"
                  min={adj.min}
                  max={adj.max}
                  value={imageAdjustments[adj.id]}
                  onChange={(e) => setImageAdjustments(prev => ({ ...prev, [adj.id]: parseInt(e.target.value) }))}
                  className="w-full accent-[#fe2c55] h-1.5 bg-black/5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}

            <button
              onClick={() => setImageAdjustments({
                brightness: 100, contrast: 100, saturate: 100, hueRotate: 0,
                invert: 0, grayscale: 0, sepia: 0, blur: 0, opacity: 100
              })}
              className="mt-4 w-full py-3 rounded-xl bg-black/5 text-[13px] font-bold text-black active:scale-95 transition-transform"
            >
              Reset Adjustments
            </button>
          </div>
        </BottomSheet>
      )}
      <style>{`
        .animate-music-bar-1 { animation: music-bar 0.8s infinite ease-in-out; }
        .animate-music-bar-2 { animation: music-bar 1s infinite ease-in-out; animation-delay: 0.2s; }
        .animate-music-bar-3 { animation: music-bar 0.6s infinite ease-in-out; animation-delay: 0.4s; }
        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
      `}</style>
    </div>
  );
};

export default CreatePage;
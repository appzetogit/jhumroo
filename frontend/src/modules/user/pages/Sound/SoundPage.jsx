import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoShareOutline, IoPlayOutline } from 'react-icons/io5';
import { useTheme } from '../../../../context/ThemeContext';
import audioService from '../../../../services/audioService';
import reelService from '../../../../services/reelService';
import { useAppContent } from '../../../../hooks/useAppContent';

const SoundPage = () => {
  const { musicName } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { reelLibrary } = useAppContent();
  const decodedMusic = decodeURIComponent(musicName || '');

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSoundSaved, setIsSoundSaved] = useState(false);
  const [displayVideos, setDisplayVideos] = useState([]);
  const [soundData, setSoundData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const audioRef = React.useRef(null);



  // Handle Play/Pause
  const togglePlay = () => {
    if (!soundData?.url && !soundData?.audioUrl) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(soundData.url || soundData.audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      
      // Limit playback to the sound's duration (default 15s)
      audioRef.current.ontimeupdate = () => {
        const duration = soundData.duration || 15;
        if (audioRef.current && audioRef.current.currentTime >= duration) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn("Audio playback failed:", err);
          }
          setIsPlaying(false);
        });
      }
      setIsPlaying(true);
    }
  };

  const handleToggleFavorite = async () => {
    if (!soundData?._id && !soundData?.id) return;
    // Optimistic update
    setIsSoundSaved(prev => !prev);
    try {
      const response = await audioService.toggleSaveAudio(soundData._id || soundData.id);
      // Use server truth
      if (typeof response?.isSaved === 'boolean') {
        setIsSoundSaved(response.isSaved);
      }
    } catch (err) {
      console.error('Failed to toggle save audio:', err);
      // Revert on error
      setIsSoundSaved(prev => !prev);
    }
  };

  const handleUseSound = () => {
    if (soundData) {
      localStorage.setItem('selectedSound', JSON.stringify({
        id: soundData._id || soundData.id || 'sound-' + Date.now(),
        title: soundData.title || soundData.name,
        artist: soundData.artist || 'Original Artist',
        url: soundData.url || soundData.audioUrl,
        clipStart: 0,
        clipDuration: 15
      }));
    }
    navigate('/create');
  };

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const handleReelReported = (e) => {
      const { reelId } = e.detail;
      setDisplayVideos(prev => prev.filter(r => (r._id || r.id) !== reelId));
    };
    window.addEventListener('reel-reported', handleReelReported);
    return () => window.removeEventListener('reel-reported', handleReelReported);
  }, []);



  // Fetch sound and videos from API
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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

        // 1. Fetch sound details (getAllAudios returns isSaved per user via optionalAuth)
        const audios = await audioService.getAllAudios({ q: decodedMusic }).catch(() => []);
        const audioList = Array.isArray(audios) ? audios : [];
        // Find exact match or first result
        const sound = audioList.find(a => a.title.toLowerCase() === decodedMusic.toLowerCase()) || audioList[0];
        setSoundData(sound);
        // Seed saved state from API (isSaved is populated by backend for authenticated users)
        if (sound && typeof sound.isSaved === 'boolean') {
          setIsSoundSaved(sound.isSaved);
        }

        // 2. Fetch videos using this sound
        const searchResponse = await reelService.searchReels(decodedMusic);
        if (searchResponse.success) {
          setDisplayVideos(searchResponse.reels);
          setTotalPosts(searchResponse.pagination?.total || searchResponse.reels.length);
        }
      } catch (err) {
        console.error('Error fetching sound data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [decodedMusic]);

  return (
    <div className={`page-container pb-0 flex flex-col overflow-hidden ${isDarkMode ? 'bg-black text-white' : 'bg-[#f8fafc] text-black'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 pt-4 pb-3 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
        <button
          onClick={() => navigate('/')}
          className={`w-8 h-8 flex items-center justify-center active:opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Music Charts badge */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[12px] font-bold px-3 py-1 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          Music Charts
        </div>

        <div className="w-8 h-8" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Sound Card */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-start gap-4">
            {/* Thumbnail */}
            <div 
              onClick={togglePlay}
              className={`relative w-[100px] h-[100px] rounded-xl overflow-hidden shrink-0 shadow-lg border cursor-pointer group active:scale-95 transition-transform ${isDarkMode ? 'bg-white/10 border-white/5' : 'bg-black/5 border-black/5'}`}
            >
              <img
                src={soundData?.thumbnail || `https://api.dicebear.com/7.x/identicon/svg?seed=${decodedMusic}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                alt="sound thumbnail"
                className="w-full h-full object-cover opacity-90"
              />
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-md">
                  {isPlaying ? (
                    <div className="flex gap-0.5 items-center">
                      <div className="w-1 h-3 bg-black animate-pulse" />
                      <div className="w-1 h-4 bg-black animate-pulse delay-75" />
                      <div className="w-1 h-2 bg-black animate-pulse delay-150" />
                    </div>
                  ) : (
                    <IoPlayOutline size={18} className="text-black ml-0.5" />
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 pt-1">
              <h2 className={`text-[16px] font-bold mb-0.5 leading-tight line-clamp-2 drop-shadow-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {soundData?.title || decodedMusic}
              </h2>
              <p className={`text-[13px] mb-3 font-medium ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>
                {totalPosts}+ posts
              </p>

              {/* Add to Favorites Button */}
              <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-2 border rounded-md px-4 py-2 text-[13px] font-semibold transition-all active:scale-95 ${
                  isSoundSaved
                    ? isDarkMode
                      ? 'border-white/10 text-white/40 bg-white/5'
                      : 'border-black/10 text-black/45 bg-black/5'
                    : isDarkMode
                      ? 'border-white/20 text-white bg-transparent hover:bg-white/5'
                      : 'border-black/15 text-black bg-transparent hover:bg-black/[0.03]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                  fill={isSoundSaved ? 'var(--color-accent-red, #FE2C55)' : 'none'}
                  stroke={isSoundSaved ? 'var(--color-accent-red, #FE2C55)' : 'currentColor'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
                {isSoundSaved ? 'Saved ✓' : 'Add to Favorites'}
              </button>
            </div>
          </div>



          {/* Credit line */}
          <p className={`text-[11px] mt-4 leading-relaxed line-clamp-2 ${isDarkMode ? 'text-white/40' : 'text-black/45'}`}>
            Contains music from: {soundData?.artist || 'Original Audio'} - {decodedMusic}
          </p>
        </div>

        {/* Divider */}
        <div className={`h-px mx-0 mb-0.5 mt-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} />

        {/* Video Grid */}
        <div className="grid grid-cols-3 gap-0.5">
          {[...displayVideos, ...displayVideos].slice(0, 9).map((video, idx) => (
            <div key={idx} className={`relative aspect-[3/5] overflow-hidden group ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
              {idx === 0 && (
                <div className="absolute top-1.5 left-1.5 z-10 bg-[#FE2C55] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm">
                  Original
                </div>
              )}
              <video
                src={video.video?.url || video.url}
                poster={(video.video?.thumbnail || video.poster)?.includes('1618005182384') ? undefined : (video.video?.thumbnail || video.poster)}
                muted
                playsInline
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Play count */}
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-[9px] font-bold drop-shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="white">
                  <path d="M5 3l14 9-14 9z" />
                </svg>
                <span>{video.stats?.likes || video.likes || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* "Use this sound" fixed CTA */}
      <div className="absolute bottom-[12px] left-0 right-0 flex justify-center pointer-events-none z-10">
        <button
          onClick={handleUseSound}
          className="pointer-events-auto flex items-center gap-2 bg-[#FE2C55] text-white px-8 py-3 rounded-full text-[15px] font-bold shadow-[0_4px_15px_rgba(254,44,85,0.4)] active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M15 10l4.553-2.07A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.916L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
          </svg>
          Use this sound
        </button>
      </div>
    </div>
  );
};

export default SoundPage;

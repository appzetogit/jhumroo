import React, { useState } from 'react';
import { BiBookmark, BiCheck, BiChevronLeft, BiShareAlt } from 'react-icons/bi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getHashtagDetail } from '../../../../utils/searchUtils';
import { useAppContent } from '../../../../hooks/useAppContent';

const HASHTAG_FAVORITES_KEY = 'searchHashtagFavorites';
const JOINED_HASHTAGS_KEY = 'joinedHashtags';

const readStoredList = (key) => {
  try {
    const storedValue = localStorage.getItem(key);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const persistStoredList = (key, values) => {
  localStorage.setItem(key, JSON.stringify(values));
};

const SearchHashtagPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tagSlug = 'food' } = useParams();
  const { config } = useAppContent();
  const hashtag = getHashtagDetail(tagSlug, config?.search);
  const [isFavorite, setIsFavorite] = useState(() =>
    readStoredList(HASHTAG_FAVORITES_KEY).includes(hashtag.slug),
  );
  const [isJoined, setIsJoined] = useState(() =>
    readStoredList(JOINED_HASHTAGS_KEY).includes(hashtag.slug),
  );

  const searchFallback = location.search
    ? `/search${location.search}`
    : `/search?q=${encodeURIComponent(hashtag.label.replace('#', ''))}&tab=hashtags`;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(searchFallback, { replace: true });
  };

  const handleToggleFavorite = () => {
    const currentFavorites = readStoredList(HASHTAG_FAVORITES_KEY);
    const nextFavorites = isFavorite
      ? currentFavorites.filter((value) => value !== hashtag.slug)
      : [...currentFavorites, hashtag.slug];

    persistStoredList(HASHTAG_FAVORITES_KEY, nextFavorites);
    setIsFavorite(!isFavorite);
  };

  const handleToggleJoined = () => {
    const currentJoinedTags = readStoredList(JOINED_HASHTAGS_KEY);
    const nextJoinedTags = isJoined
      ? currentJoinedTags.filter((value) => value !== hashtag.slug)
      : [...currentJoinedTags, hashtag.slug];

    persistStoredList(JOINED_HASHTAGS_KEY, nextJoinedTags);
    setIsJoined(!isJoined);
  };

  const handleOpenVideo = (selectedVideoId) => {
    navigate('/', {
      state: {
        searchVideos: hashtag.galleryVideos || [],
        activeVideoId: selectedVideoId,
      },
    });
  };

  return (
    <div className="page-container pb-0 theme-surface-page relative flex flex-col overflow-hidden min-h-screen">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(${hashtag.coverImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(18px)',
          transform: 'scale(1.06)',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(255,255,255,0.92)_35%,rgba(255,255,255,1)_100%)]" />

      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,var(--safe-area-top))] pb-4">
        <button
          type="button"
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-black/5 text-black/80 flex items-center justify-center active:scale-95 transition-transform"
        >
          <BiChevronLeft size={24} />
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-black/5 text-black/80 flex items-center justify-center active:scale-95 transition-transform"
        >
          <BiShareAlt size={21} />
        </button>
      </div>

      <div className="relative z-10 scrollable flex-1 px-4 pb-28">
        <div className="flex items-start gap-4">
          <img
            src={hashtag.coverImage}
            alt={hashtag.label}
            className="w-[92px] h-[92px] rounded-[6px] object-cover shadow-md shrink-0"
          />
          <div className="flex-1 pt-2">
            <h1 className="text-[26px] leading-none font-bold text-black">{hashtag.label}</h1>
            <p className="text-[17px] text-black/45 mt-2">{hashtag.views}</p>
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="mt-5 inline-flex items-center gap-2 rounded-[4px] border border-black/10 bg-white px-4 py-2 text-[16px] font-semibold text-black shadow-sm active:scale-[0.98] transition-transform"
            >
              {isFavorite ? <BiCheck size={18} /> : <BiBookmark size={18} />}
              <span>{isFavorite ? 'Added to Favorites' : 'Add to Favorites'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-6">
          {(hashtag.galleryVideos || []).map((video, index) => (
            <button
              key={`${video.id}-${index}`}
              type="button"
              onClick={() => handleOpenVideo(video.id)}
              className={`overflow-hidden ${index === 0 ? 'col-span-1 row-span-1' : ''} active:opacity-85`}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full aspect-square object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-[max(0.75rem,var(--safe-area-bottom))] z-20 px-4">
        <button
          type="button"
          onClick={handleToggleJoined}
          className="w-full min-h-[52px] rounded-full bg-[#fe2c55] text-white text-[18px] font-bold flex items-center justify-center gap-2 shadow-[0_14px_30px_rgba(254,44,85,0.28)] active:scale-[0.98] transition-transform"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/15">
            <BiBookmark size={15} />
          </span>
          <span>{isJoined ? 'Joined hashtag' : 'Join this hashtag'}</span>
        </button>
      </div>
    </div>
  );
};

export default SearchHashtagPage;

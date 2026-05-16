import { useState, useCallback, useRef, useEffect } from 'react';
import reelService from '../services/reelService';

export const useReelsAPI = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const [nextCursor, setNextCursor] = useState(null);
  const nextCursorRef = useRef(null);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchFeed = useCallback(async (feedType = 'foryou', isInitial = false, limit = 10) => {
    if (!hasMoreRef.current && !isInitial) return;
    
    setLoading(true);
    const cursor = isInitial ? null : nextCursorRef.current;

    try {
      let response;
      if (feedType === 'following') {
        response = await reelService.getFollowingReels(cursor, limit);
      } else if (feedType === 'trending') {
        response = await reelService.getTrending(cursor, limit);
      } else {
        response = await reelService.getFeed(cursor, limit);
      }

      if (response.success) {
        const normalizedReels = response.reels.map(reel => ({
          ...reel,
          id: reel._id,
          url: reel.video?.url,
          poster: reel.video?.thumbnail,
          username: reel.user?.username || 'unknown',
          userProfile: reel.user?.profilePicture?.url || '',
          likes: reel.stats?.likesCount || 0,
          comments: reel.stats?.commentsCount || 0,
          shares: reel.stats?.sharesCount || 0,
          isLiked: reel.isLiked || false,
          isSaved: reel.isSaved || false
        }));

        setReels(prev => {
          if (isInitial) return normalizedReels;
          // Filter duplicates
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNewReels = normalizedReels.filter(r => !existingIds.has(r.id));
          return [...prev, ...uniqueNewReels];
        });
        
        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore || false);
      }
    } catch (err) {
      console.error('Error fetching reels:', err);
      setError(err.message || 'Failed to fetch reels');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSingleReel = useCallback(async (reelId) => {
    setLoading(true);
    try {
      const response = await reelService.getReelById(reelId);
      if (response.success) {
        const reel = response.reel;
        const normalizedReel = {
          ...reel,
          id: reel._id,
          url: reel.video?.url,
          poster: reel.video?.thumbnail,
          username: reel.user?.username || 'unknown',
          userProfile: reel.user?.profilePicture?.url || '',
          likes: reel.stats?.likesCount || 0,
          comments: reel.stats?.commentsCount || 0,
          shares: reel.stats?.sharesCount || 0,
          isLiked: reel.isLiked || false,
          isSaved: reel.isSaved || false
        };
        setReels([normalizedReel]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching single reel:', err);
      setError(err.message || 'Failed to fetch reel');
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    reels, 
    loading, 
    error, 
    hasMore, 
    fetchFeed,
    fetchSingleReel 
  };
};

import { useState, useCallback } from 'react';
import reelService from '../services/reelService';

export const useReelsAPI = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (feedType = 'foryou', page = 1, limit = 10) => {
    setLoading(true);
    try {
      let response;
      if (feedType === 'following') {
        response = await reelService.getFollowingReels(page, limit);
      } else if (feedType === 'trending') {
        response = await reelService.getTrending(page, limit);
      } else {
        response = await reelService.getFeed(page, limit);
      }

      if (response.success) {
        // Transform data to match frontend format
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

        setReels(prev => page === 1 ? normalizedReels : [...prev, ...normalizedReels]);
        setHasMore(response.pagination?.hasMore || false);
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

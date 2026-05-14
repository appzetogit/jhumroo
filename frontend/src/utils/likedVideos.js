const LIKED_VIDEOS_KEY = 'likedVideos';

const getDefaultLikedIds = (videos = []) => videos.filter((video) => video.isLiked).map((video) => video.id);

export const getLikedVideoIds = (videos = []) => {
  try {
    const storedIds = localStorage.getItem(LIKED_VIDEOS_KEY);
    if (!storedIds) {
      return getDefaultLikedIds(videos);
    }

    const parsedIds = JSON.parse(storedIds);
    return Array.isArray(parsedIds) ? parsedIds : getDefaultLikedIds(videos);
  } catch {
    return getDefaultLikedIds(videos);
  }
};

export const isVideoLiked = (videoId, videos = []) => getLikedVideoIds(videos).includes(videoId);

export const setVideoLikedState = (videoId, nextLiked, videos = []) => {
  const likedIds = new Set(getLikedVideoIds(videos));

  if (nextLiked) {
    likedIds.add(videoId);
  } else {
    likedIds.delete(videoId);
  }

  const updatedIds = Array.from(likedIds);
  localStorage.setItem(LIKED_VIDEOS_KEY, JSON.stringify(updatedIds));

  return updatedIds;
};

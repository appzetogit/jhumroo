import { useMemo, useCallback } from 'react';
import { useAdminConfig } from '../context/AdminConfigContext';

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const useAppContent = () => {
  const { config, setConfig } = useAdminConfig();

  const currentUserId = config?.users?.defaultUserId || 'johnny_dance';
  const profiles = config?.users?.profiles || {};
  const reelLibrary = ensureArray(config?.reels?.library);

  const reelMap = useMemo(() => {
    const map = new Map();
    reelLibrary.forEach((reel) => {
      if (reel?.id !== undefined) {
        map.set(reel.id, reel);
      }
    });
    return map;
  }, [reelLibrary]);

  const getProfile = useCallback((username) =>
    profiles[username] || profiles[currentUserId] || Object.values(profiles)[0],
  [profiles, currentUserId]);

  const getReelsByIds = (ids = []) =>
    ensureArray(ids)
      .map((id) => reelMap.get(id))
      .filter(Boolean);

  const getSectionReels = (sectionId) => {
    const sections = ensureArray(config?.reels?.sections);
    const section = sections.find((item) => item.id === sectionId) || sections[0];
    if (!section) {
      return [];
    }
    return getReelsByIds(section.reelIds);
  };


  
  const isFollowingUser = (targetUsername, username = currentUserId) => {
    const profile = getProfile(username);
    return ensureArray(profile?.followingUsernames).includes(targetUsername);
  };

  const isFollowerOfMe = (targetUsername, username = currentUserId) => {
    const profile = getProfile(username);
    return ensureArray(profile?.followerUsernames).includes(targetUsername);
  };

  const updateProfile = (username, updater) => {
    setConfig((currentConfig) => {
      const nextProfiles = { ...(currentConfig?.users?.profiles || {}) };
      const currentProfile = nextProfiles[username] || {};
      nextProfiles[username] =
        typeof updater === 'function' ? updater(currentProfile) : { ...currentProfile, ...updater };

      return {
        ...currentConfig,
        users: {
          ...currentConfig.users,
          profiles: nextProfiles,
        },
      };
    });
  };



  const toggleFollowUser = (targetUsername, username = currentUserId) => {
    updateProfile(username, (profile) => {
      const following = ensureArray(profile?.followingUsernames);
      const has = following.includes(targetUsername);
      return {
        ...profile,
        followingUsernames: has
          ? following.filter((u) => u !== targetUsername)
          : [...following, targetUsername],
      };
    });
  };

  return {
    config,
    currentUserId,
    reelLibrary,
    reelSections: ensureArray(config?.reels?.sections),
    getProfile,
    getReelsByIds,
    getSectionReels,
    isFollowingUser,
    isFollowerOfMe,
    toggleFollowUser,
  };
};

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from './SocketContext';
import liveService from '../services/liveService';

const LiveContext = createContext(null);

export const useLive = () => {
  const context = useContext(LiveContext);
  if (!context) {
    throw new Error('useLive must be used within a LiveProvider');
  }
  return context;
};

export const LiveProvider = ({ children }) => {
  const socket = useSocket();
  const [activeLives, setActiveLives] = useState([]);

  // Fetch active live streams
  const fetchActiveLives = useCallback(async () => {
    try {
      const res = await liveService.getActiveLives();
      if (res?.liveStreams && Array.isArray(res.liveStreams)) {
        setActiveLives(res.liveStreams);
      }
    } catch (err) {
      // Silently ignore network hiccups
    }
  }, []);

  // Initial fetch and periodic polling (every 20s)
  useEffect(() => {
    fetchActiveLives();
    const interval = setInterval(fetchActiveLives, 20000);
    return () => clearInterval(interval);
  }, [fetchActiveLives]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleUserWentLive = (data) => {
      if (!data?.liveId) return;
      setActiveLives((prev) => {
        const exists = prev.some((l) => String(l._id) === String(data.liveId));
        if (exists) return prev;
        const newStream = {
          _id: data.liveId,
          broadcaster: data.broadcaster,
          title: data.title,
          startedAt: data.startedAt || new Date().toISOString(),
          status: 'live'
        };
        return [newStream, ...prev];
      });
    };

    const handleUserLeftLive = (data) => {
      if (!data) return;
      setActiveLives((prev) =>
        prev.filter((l) => {
          if (data.liveId && String(l._id) === String(data.liveId)) return false;
          if (data.broadcasterId) {
            const bId = l.broadcaster?._id || l.broadcaster;
            if (String(bId) === String(data.broadcasterId)) return false;
          }
          return true;
        })
      );
    };

    const handleLiveStreamEnded = (data) => {
      if (!data?.liveId) return;
      setActiveLives((prev) => prev.filter((l) => String(l._id) !== String(data.liveId)));
    };

    socket.on('user_went_live', handleUserWentLive);
    socket.on('user_left_live', handleUserLeftLive);
    socket.on('live_stream_ended', handleLiveStreamEnded);

    return () => {
      socket.off('user_went_live', handleUserWentLive);
      socket.off('user_left_live', handleUserLeftLive);
      socket.off('live_stream_ended', handleLiveStreamEnded);
    };
  }, [socket]);

  // Helper: check if a user is live and get their active live stream
  const getUserLive = useCallback(
    (userId, username) => {
      if (!userId && !username) return null;
      return (
        activeLives.find((l) => {
          const bId = l.broadcaster?._id || l.broadcaster;
          const bUsername = l.broadcaster?.username;
          if (userId && bId && String(bId) === String(userId)) return true;
          if (username && bUsername && bUsername.toLowerCase() === username.toLowerCase()) return true;
          return false;
        }) || null
      );
    },
    [activeLives]
  );

  const isUserLive = useCallback(
    (userId, username) => {
      return !!getUserLive(userId, username);
    },
    [getUserLive]
  );

  const value = useMemo(
    () => ({
      activeLives,
      activeLivesCount: activeLives.length,
      getUserLive,
      isUserLive,
      fetchActiveLives
    }),
    [activeLives, getUserLive, isUserLive, fetchActiveLives]
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
};

export default LiveContext;

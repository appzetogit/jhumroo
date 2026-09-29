import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BiX, BiSend, BiHeart, BiVolumeFull, BiVolumeMute } from 'react-icons/bi';
import { useSocket } from '../../../../context/SocketContext';
import { useAuth } from '../../../../context/AuthContext';
import liveService from '../../../../services/liveService';
import followService from '../../../../services/followService';
import { useWebRTCLive } from '../../../../hooks/useWebRTCLive';
import LiveCommentsOverlay from '../../components/live/LiveCommentsOverlay';
import LiveFloatingReactions from '../../components/live/LiveFloatingReactions';

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '👏', '🥳', '😮', '💯'];

export default function LiveViewerPage() {
  const { liveId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user: currentUser } = useAuth();

  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const videoRef = useRef(null);

  // Use WebRTC Live Hook
  const {
    remoteStream,
    connectionStatus,
    viewersCount,
    comments,
    reactions,
    isLiveEnded,
    endStats,
    sendComment,
    sendReaction
  } = useWebRTCLive({
    isBroadcaster: false,
    liveId,
    socket
  });

  // Fetch initial live stream details
  useEffect(() => {
    let isMounted = true;
    const fetchLive = async () => {
      try {
        const res = await liveService.getLiveById(liveId);
        if (isMounted && res.liveStream) {
          setLiveData(res.liveStream);
          if (res.liveStream.status === 'ended') {
            // Already ended
          }
        }
      } catch (err) {
        console.error('Failed to fetch live stream:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLive();
    return () => {
      isMounted = false;
    };
  }, [liveId]);

  // Connect remote stream to video element
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current
        .play()
        .then(() => {
          setAudioBlocked(false);
        })
        .catch((err) => {
          console.warn('[LiveViewer] Autoplay issue:', err);
          setAudioBlocked(true);
        });
    }
  }, [remoteStream]);

  // Handle unmute click
  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
      setIsMuted(false);
      setAudioBlocked(false);
    }
  };

  const handleSendComment = (e) => {
    e?.preventDefault();
    if (!commentText.trim()) return;
    sendComment(commentText);
    setCommentText('');
  };

  const [followLoading, setFollowLoading] = useState(false);
  const broadcaster = liveData?.broadcaster;
  const broadcasterId = broadcaster?._id || liveData?.broadcasterId || (typeof liveData?.broadcaster === 'string' ? liveData.broadcaster : null);

  // Check if current user is already following the broadcaster
  useEffect(() => {
    const checkFollow = async () => {
      if (!currentUser || !broadcasterId || String(currentUser._id) === String(broadcasterId)) return;
      try {
        const followRes = await followService.isFollowing(broadcasterId);
        if (followRes && typeof followRes.isFollowing === 'boolean') {
          setIsFollowing(Boolean(followRes.isFollowing && (!followRes.status || followRes.status === 'accepted')));
        }
      } catch (err) {
        // silent
      }
    };
    checkFollow();
  }, [currentUser, broadcasterId]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!broadcasterId || followLoading) return;
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await followService.unfollowUser(broadcasterId);
        setIsFollowing(false);
      } else {
        await followService.followUser(broadcasterId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setFollowLoading(false);
    }
  };
  const broadcasterName = broadcaster?.username || 'User';
  const broadcasterAvatar =
    broadcaster?.profilePicture?.url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${broadcasterName}`;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-full border-3 border-amber-400 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Connecting to Live...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden">
      {/* Video Container */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {remoteStream ? (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted={isMuted}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-red-500 to-amber-500 animate-pulse">
                <img
                  src={broadcasterAvatar}
                  alt={broadcasterName}
                  className="w-full h-full rounded-full object-cover border-2 border-black"
                />
              </div>
              <span className="absolute bottom-0 right-0 px-2 py-0.5 bg-red-600 text-[10px] font-extrabold uppercase rounded-full text-white shadow-md">
                LIVE
              </span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">@{broadcasterName}</h2>
              <p className="text-white/60 text-xs mt-1">
                {connectionStatus === 'connecting'
                  ? 'Connecting to live video stream...'
                  : 'Waiting for broadcaster video...'}
              </p>
            </div>
          </div>
        )}

        {/* Audio blocked tap-to-unmute banner */}
        {audioBlocked && (
          <button
            type="button"
            onClick={handleUnmute}
            className="absolute top-20 z-40 bg-black/75 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl animate-bounce"
          >
            <BiVolumeMute size={18} className="text-amber-400" />
            <span>Tap to Unmute Audio</span>
          </button>
        )}

        {/* Top Gradient & Header Bar */}
        <div className="absolute inset-x-0 top-0 pt-4 pb-12 px-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent z-30 flex items-center justify-between pointer-events-none">
          {/* Broadcaster Info Pill */}
          <div className="flex items-center gap-2.5 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 pointer-events-auto">
            <img
              src={broadcasterAvatar}
              alt={broadcasterName}
              className="w-8 h-8 rounded-full object-cover border border-amber-400 shrink-0"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold text-white truncate max-w-[110px]">
                  {broadcasterName}
                </span>
                {broadcaster?.isVerified && (
                  <span className="text-blue-400 text-xs">✓</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 px-1.5 py-0.2 bg-red-600 rounded text-[9px] font-black uppercase tracking-wider text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
                <span className="text-[10px] text-white/75 font-semibold">
                  👁️ {viewersCount}
                </span>
              </div>
            </div>

            {/* Follow Button (if not broadcaster themselves) */}
            {(!currentUser || !broadcasterId || String(currentUser._id) !== String(broadcasterId)) && (
              <button
                type="button"
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`ml-1 text-[11px] font-bold px-3 py-1 rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                  isFollowing
                    ? 'bg-white/20 text-white/90 border border-white/20 hover:bg-white/30'
                    : 'bg-[#FE2C55] text-white shadow-md shadow-red-500/40 hover:bg-[#E0264A]'
                }`}
              >
                {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
              </button>
            )}
          </div>

          {/* Right Action Icons: Audio toggle & Close */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setIsMuted(videoRef.current.muted);
                }
              }}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
              title="Toggle audio"
            >
              {isMuted ? <BiVolumeMute size={20} /> : <BiVolumeFull size={20} />}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
              title="Leave live"
            >
              <BiX size={24} />
            </button>
          </div>
        </div>

        {/* Floating Reactions particles */}
        <LiveFloatingReactions reactions={reactions} />

        {/* Bottom Interactive Area */}
        <div className="absolute inset-x-0 bottom-0 pb-4 pt-12 px-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-30 flex flex-col justify-end pointer-events-none">
          {/* Comments Overlay */}
          <div className="mb-3 max-w-sm pointer-events-auto">
            <LiveCommentsOverlay comments={comments} />
          </div>

          {/* Quick Reaction Emojis Row */}
          <div className="flex items-center gap-2 mb-2 px-1 overflow-x-auto no-scrollbar pointer-events-auto">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-base active:scale-125 transition-transform shrink-0 hover:bg-black/70"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Comment Input and Big Heart Reaction */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <form
              onSubmit={handleSendComment}
              className="flex-1 flex items-center bg-black/50 backdrop-blur-xl border border-white/20 rounded-full px-3 py-1.5 shadow-lg focus-within:border-white/50 transition-colors"
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Comment as @"
                maxLength={300}
                className="flex-1 bg-transparent text-white text-xs outline-none placeholder-white/50"
              />
              {commentText.trim() && (
                <button
                  type="submit"
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-red-500 text-white flex items-center justify-center shrink-0 active:scale-90 transition-transform ml-1"
                >
                  <BiSend size={14} />
                </button>
              )}
            </form>

            {/* Quick Heart Reaction Button */}
            <button
              type="button"
              onClick={() => sendReaction('❤️')}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 active:scale-125 transition-transform shrink-0"
              title="Send Heart"
            >
              <BiHeart size={22} className="animate-pulse" />
            </button>
          </div>
        </div>

        {/* Live Stream Ended Overlay */}
        {(isLiveEnded || liveData?.status === 'ended') && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-pink-500 to-amber-500 mb-4 shadow-xl">
              <img
                src={broadcasterAvatar}
                alt={broadcasterName}
                className="w-full h-full rounded-full object-cover border-2 border-black"
              />
            </div>
            <h2 className="text-xl font-black text-white tracking-wide">
              Live Video Has Ended
            </h2>
            <p className="text-white/60 text-xs mt-1 max-w-xs">
              Thank you for watching @{broadcasterName}'s live broadcast!
            </p>

            {endStats && (
              <div className="grid grid-cols-3 gap-3 my-6 w-full max-w-xs bg-white/5 border border-white/10 p-3 rounded-2xl">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-black text-white">{endStats.peakViewers || viewersCount}</span>
                  <span className="text-[10px] text-white/50">Peak Viewers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-black text-white">{endStats.likesCount || reactions.length}</span>
                  <span className="text-[10px] text-white/50">Reactions</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-black text-white">{endStats.commentsCount || comments.length}</span>
                  <span className="text-[10px] text-white/50">Comments</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full max-w-xs mt-4">
              <button
                type="button"
                onClick={() => navigate(`/user/${broadcasterName}`)}
                className="w-full py-2.5 rounded-full bg-white text-black font-extrabold text-xs shadow-lg active:scale-95 transition-transform"
              >
                View @{broadcasterName}'s Profile
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs active:scale-95 transition-transform"
              >
                Back to Feed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

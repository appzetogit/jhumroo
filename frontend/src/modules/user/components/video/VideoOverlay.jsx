import React, { useState } from 'react';
import { BiPlus } from 'react-icons/bi';
import { IoIosMusicalNote } from 'react-icons/io';
import { useNavigate } from 'react-router-dom';
import CommentsSheet from '../modals/CommentsSheet';
import ShareSheet from '../modals/ShareSheet';
import MoreOptionsSheet from '../modals/MoreOptionsSheet';
import ReportSheet from '../modals/ReportSheet';
import EditReelSheet from '../modals/EditReelSheet';
import FullscreenPlayer from '../modals/FullscreenPlayer';
import reelService from '../../../../services/reelService';
import userService from '../../../../services/userService';

import adService from '../../../../services/adService';

const VideoOverlay = ({ reelId, username, caption, musicName, isLiked, likes, comments, shares, isSaved, onSaveClick, onLikeClick, videoData, onUpdate, isMuted, onMuteToggle, isPlaying }) => {
  const isAd = videoData.isAd;
  const isAdminAd = isAd && videoData.onModel === 'Admin';
  
  const handleAdClick = async () => {
    let targetUrl = videoData.link;
    
    if (videoData.adType === 'chat') {
      const phone = videoData.whatsappNumber?.replace(/\D/g, '');
      const text = encodeURIComponent(videoData.welcomeMessage || 'Hello!');
      targetUrl = `https://wa.me/${phone}?text=${text}`;
    }

    if (targetUrl) {
      // Ensure absolute URL
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      try {
        await adService.trackClick(videoData._id);
        window.open(targetUrl, '_blank');
      } catch (err) {
        console.error("Error tracking ad click:", err);
        window.open(targetUrl, '_blank');
      }
    }
  };

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const navigate = useNavigate();

  const handleNotInterested = async () => {
    try {
      await userService.markNotInterested({ 
        reelId, 
        creatorId: videoData.user?._id || videoData.user,
        topics: videoData.hashtags || []
      });
      alert("We'll show you less content like this.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleInterested = async () => {
    try {
      await userService.markInterested(videoData.hashtags || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await reelService.deleteReel(reelId);
      // Refresh feed or remove from UI
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleShare = async (platform = 'general') => {
    const shareUrl = `${window.location.origin}/reel/${reelId}`;
    const shareText = caption || 'Watch this amazing reel on Jhumroo!';
    
    try {
      // Optimistic update
      const newSharesCount = (shares || 0) + 1;
      onUpdate({ stats: { ...(videoData.stats || {}), sharesCount: newSharesCount } });

      let shared = false;
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
        shared = true;
      } else if (platform === 'messenger') {
        window.open(`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`, '_blank');
        shared = true;
      } else if (platform === 'copy') {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
        shared = true;
      } else if (platform === 'general') {
        if (navigator.share) {
          await navigator.share({ title: 'Jhumroo', text: shareText, url: shareUrl });
          shared = true;
        } else {
          await navigator.clipboard.writeText(shareUrl);
          alert('Link copied to clipboard!');
          shared = true;
        }
      }

      if (shared) {
        await reelService.shareReel(reelId);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <>
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[30]">
        <div className="flex justify-between items-end p-4 pb-[calc(var(--bottom-nav-height)+60px)]">
          {/* Left: User info */}
          <div className="flex-1 pr-12 text-left text-white pointer-events-auto flex flex-col items-start">
            {/* Ad Action Button - Moved above name */}
            {isAd && (videoData.adType === 'chat' || videoData.link) && (
              <button 
                onClick={handleAdClick}
                className="w-full bg-[#FE2C55] text-white py-3 px-4 rounded-xl font-bold text-[15px] mb-4 active:scale-[0.98] transition-all flex items-center justify-between shadow-lg shadow-[#FE2C55]/20"
              >
                <span className="flex items-center gap-2">
                  {videoData.adType === 'chat' ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  ) : null}
                  {videoData.adType === 'chat' ? 'Chat Now' : 'Shop Now'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            )}

            {/* Username — clickable → user profile */}
            <div className="flex items-center gap-2 mb-2">
              {(!isAd || (isAd && videoData.onModel === 'User')) && (
                <h3
                  className="text-lg font-bold cursor-pointer active:opacity-70"
                  onClick={() => navigate(`/user/${username}`)}
                >
                  @{username}
                </h3>
              )}
              {isAd && (
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  Sponsored
                </span>
              )}
            </div>

            <div className="text-base mb-2 leading-tight">
              {isExpanded ? (
                <span>{caption}</span>
              ) : (
                <>
                  <span>
                    {caption.length > 90 ? caption.slice(0, 90) : caption}
                  </span>
                  {caption.length > 90 && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                      }}
                      className="font-bold ml-1 cursor-pointer opacity-80 hover:opacity-100"
                    >
                      ...more
                    </span>
                  )}
                </>
              )}
            </div>
            {/* Music — clickable → sound page */}
            {(!isAd || (isAd && videoData.onModel === 'User')) && (
              <div
                className="flex items-center cursor-pointer active:opacity-70"
                onClick={() => navigate(`/sound/${encodeURIComponent(musicName?.name || musicName)}`)}
                style={{ pointerEvents: 'auto' }}
              >
                 <IoIosMusicalNote size={14} className="mr-2" />
                 <div className="w-[180px] overflow-hidden whitespace-nowrap relative">
                   <span className="inline-block select-none animate-marquee pl-4">
                     {musicName?.name || musicName} - Original Audio
                   </span>
                 </div>
              </div>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex flex-col items-center gap-4 pointer-events-auto">
             {/* Avatar + Follow button */}
             {(!isAd || (isAd && videoData.onModel === 'User')) && (
               <div className="relative mb-2 tap-effect">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white bg-surface overflow-hidden cursor-pointer shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/${username}`);
                    }}
                    style={{ pointerEvents: 'auto' }}
                  >
                     <img 
                        src={videoData.userProfile || videoData.user?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} 
                        alt="avatar" 
                        className="w-full h-full object-cover" 
                     />
                  </div>
                  <div className="absolute -bottom-2 left-[14px] w-5 h-5 bg-tiktok-red rounded-full border-2 border-tiktok-black flex items-center justify-center cursor-pointer active:scale-90">
                    <BiPlus size={14} color="white" />
                  </div>
               </div>
             )}

             {/* Like */}
             <div 
               className="flex flex-col items-center text-white tap-effect cursor-pointer" 
               onClick={(e) => {
                 e.stopPropagation();
                 onLikeClick(e);
               }} 
               style={{ pointerEvents: 'auto' }}
             >
                  <svg 
                     xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" 
                     fill={isLiked ? "var(--color-accent-red, #FE2C55)" : "transparent"} 
                     stroke={isLiked ? "var(--color-accent-red, #FE2C55)" : "white"} 
                     strokeWidth={isLiked ? "0" : "1.5"} 
                     strokeLinecap="round" strokeLinejoin="round"
                     className={`transition-all duration-300 ease-spring ${isLiked ? 'scale-[1.15] drop-shadow-[0_0_8px_rgba(254,44,85,0.6)]' : 'scale-100 hover:scale-[1.05]'}`}
                  >
                   <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span className="text-sm font-semibold mt-0.5">{likes}</span>
             </div>

             {/* Comment */}
             <div 
               className="flex flex-col items-center text-white tap-effect" 
               onClick={(e) => {
                 e.stopPropagation();
                 setIsCommentsOpen(true);
               }} 
               style={{ pointerEvents: 'auto' }}
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span className="text-sm font-semibold mt-0.5">{comments}</span>
             </div>
             

             {/* Share */}
             <div className="flex flex-col items-center text-white tap-effect" onClick={(e) => { e.stopPropagation(); handleShare(); }} style={{ pointerEvents: 'auto' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z"></path>
                    <path d="M22 2 11 13"></path>
                </svg>
                <span className="text-sm font-semibold mt-0.5">{shares}</span>
             </div>

             {/* Mute Toggle */}
             <div className="flex flex-col items-center text-white tap-effect cursor-pointer" onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} style={{ pointerEvents: 'auto' }}>
                 {isMuted ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                     <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                   </svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                     <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                   </svg>
                 )}
                 <span className="text-sm font-semibold mt-0.5">{isMuted ? 'Muted' : 'Unmute'}</span>
             </div>

             {/* More Options (3 Dots) */}
             {!isAd && (
               <div 
                 className="flex flex-col items-center text-white tap-effect cursor-pointer py-1" 
                 style={{ pointerEvents: 'auto' }}
                 onClick={(e) => { e.stopPropagation(); setIsMoreOpen(true); }}
               >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white">
                     <circle cx="12" cy="5" r="2" />
                     <circle cx="12" cy="12" r="2" />
                     <circle cx="12" cy="19" r="2" />
                  </svg>
               </div>
             )}
             
             {/* Music Disc — clickable → sound page */}
             <div
               className="mt-2 relative tap-effect cursor-pointer"
               onClick={() => navigate(`/sound/${encodeURIComponent(musicName?.name || musicName)}`)}
               style={{ pointerEvents: 'auto' }}
             >
                <div className={`w-11 h-11 rounded-full border-[8px] border-[#2F2F2F] flex justify-center items-center overflow-hidden ${isPlaying ? 'animate-disc-spin' : ''}`}>
                   <img 
                      src={musicName?.thumbnail || musicName?.audioId?.thumbnail || `https://api.dicebear.com/7.x/identicon/svg?seed=${musicName?.name || musicName}`} 
                      alt="music thumbnail" 
                      className="w-5 h-5 rounded-full object-cover" 
                    />
                </div>
                <IoIosMusicalNote size={12} className={`absolute -top-1 -right-1 text-white/80 ${isPlaying ? 'animate-bounce-slow' : ''}`} />
             </div>

          </div>
        </div>
      </div>
      
      {/* Comments Sheet Modal */}
      <CommentsSheet 
         isOpen={isCommentsOpen} 
         onClose={() => setIsCommentsOpen(false)} 
         commentCount={comments}
         reelId={reelId}
      />

      {/* Share Sheet Modal */}
      <ShareSheet 
         isOpen={isShareOpen} 
         onClose={() => setIsShareOpen(false)} 
         reelData={videoData}
         onShare={handleShare}
      />

      {/* More Options Sheet */}
      <MoreOptionsSheet 
         isOpen={isMoreOpen}
         onClose={() => setIsMoreOpen(false)}
         reelData={videoData}
         isSaved={isSaved}
         onSaveClick={onSaveClick}
         onShareClick={handleShare}
         onReportClick={() => {
           setIsMoreOpen(false);
           setIsReportOpen(true);
         }}
         onEditClick={() => {
           setIsMoreOpen(false);
           setIsEditOpen(true);
         }}
         onDeleteClick={handleDelete}
         onNotInterestedClick={handleNotInterested}
         onInterestedClick={handleInterested}
         onFullscreenClick={() => {
           setIsMoreOpen(false);
           setIsFullscreen(true);
         }}
      />

      {/* Report Sheet */}
      <ReportSheet 
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reelId={reelId}
      />

      {/* Edit Reel Sheet */}
      <EditReelSheet 
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        reelData={videoData}
        onUpdate={onUpdate}
      />

      {/* Fullscreen Player */}
      <FullscreenPlayer 
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        videoUrl={videoData?.video?.url || videoData?.url}
        posterUrl={videoData?.video?.thumbnail || videoData?.poster}
      />
    </>
  );
};

export default VideoOverlay;

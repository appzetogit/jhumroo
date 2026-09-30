import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BiChevronLeft } from 'react-icons/bi';
import VideoCard from '../../components/video/VideoCard';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useReelsAPI } from '../../../../hooks/useReelsAPI';
import { useLenis } from '../../../../hooks/useLenis';
import { useSocket } from '../../../../context/SocketContext';
import liveService from '../../../../services/liveService';
import LiveDiscoverModal from '../../components/live/LiveDiscoverModal';

const HomePage = () => {
  const lenis = useLenis();
  const navigate = useNavigate();
  const location = useLocation();
  const { reelId } = useParams();
  const { reelSections } = useAppContent();
  const { reels, loading, hasMore, fetchFeed, fetchSingleReel } = useReelsAPI();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const defaultTab = reelSections[0]?.id || 'foryou';
  const [currentTab, setCurrentTab] = useState(defaultTab);
  const containerRef = useRef(null);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Live broadcast discovery state
  const socket = useSocket();
  const [showLiveDiscover, setShowLiveDiscover] = useState(false);
  const [activeLiveCount, setActiveLiveCount] = useState(0);

  // Fetch active lives count
  useEffect(() => {
    let isMounted = true;
    const fetchActiveCount = async () => {
      try {
        const res = await liveService.getActiveLives();
        if (isMounted && res.liveStreams) {
          setActiveLiveCount(res.liveStreams.length);
        }
      } catch (err) {}
    };

    fetchActiveCount();
    const interval = setInterval(fetchActiveCount, 20000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Listen for real-time live events from socket
  useEffect(() => {
    if (!socket) return;

    const handleUserWentLive = () => {
      setActiveLiveCount((prev) => prev + 1);
    };

    const handleUserLeftLive = () => {
      setActiveLiveCount((prev) => Math.max(0, prev - 1));
    };

    socket.on('user_went_live', handleUserWentLive);
    socket.on('user_left_live', handleUserLeftLive);

    return () => {
      socket.off('user_went_live', handleUserWentLive);
      socket.off('user_left_live', handleUserLeftLive);
    };
  }, [socket]);

  const isSearchFeed = Array.isArray(location.state?.searchVideos) && location.state.searchVideos.length > 0;
  const activeSearchVideoId = location.state?.activeVideoId;
  const displayedVideos = isSearchFeed ? location.state.searchVideos : reels;

  // Initial Fetch
  useEffect(() => {
    if (reelId) {
      fetchSingleReel(reelId);
    } else {
      fetchFeed(currentTab, true);
    }
  }, [currentTab, reelId, fetchSingleReel, fetchFeed]);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (activeVideoIndex >= reels.length - 2 && hasMore && !loading && !reelId && !isSearchFeed) {
      fetchFeed(currentTab);
    }
  }, [activeVideoIndex, reels.length, hasMore, loading, currentTab, reelId, fetchFeed, isSearchFeed]);

  // Onboarding Logic
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) setOnboardingStep(2);
  }, []);

  const handleFinishOnboarding = () => {
    setOnboardingStep(0);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  // Auto-dismiss onboarding if user successfully scrolls to a subsequent reel
  useEffect(() => {
    if (activeVideoIndex > 0 && onboardingStep === 2) {
      handleFinishOnboarding();
    }
  }, [activeVideoIndex, onboardingStep]);

  // Intersection Observer for Active Video
  useEffect(() => {
    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexAttr = entry.target.getAttribute('data-index');
            const index = Number(indexAttr);
            if (!isNaN(index)) {
              setActiveVideoIndex(index);
            }
          }
        });
      },
      { root: container || null, threshold: 0.5 }
    );

    const elements = container ? container.querySelectorAll('.video-card-wrapper') : document.querySelectorAll('.video-card-wrapper');
    elements.forEach((el) => observer.observe(el));
    return () => elements.forEach((el) => observer.unobserve(el));
  }, [displayedVideos, currentTab]);


  // Feed variables are declared above the hooks

  const isScrollingRef = useRef(false);
  const activeVideoIndexRef = useRef(0);

  // Sync activeVideoIndexRef with the latest state
  useEffect(() => {
    activeVideoIndexRef.current = activeVideoIndex;
  }, [activeVideoIndex]);



  // Desktop Keyboard navigation helper (ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (displayedVideos.length <= 1) return;
      
      // Only handle if active element is body or container itself (not typing in comments/search input)
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.tagName !== 'DIV') {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = activeVideoIndexRef.current + direction;

        if (nextIndex >= 0 && nextIndex < displayedVideos.length) {
          const container = containerRef.current;
          const nextCard = container?.querySelector(`[data-index="${nextIndex}"]`);
          if (nextCard) {
            if (lenis) {
              lenis.scrollTo(nextCard, { duration: 1.0 });
            } else {
              nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [displayedVideos.length, lenis]);

  const handleTabChange = (nextTab) => {
    setCurrentTab(nextTab);
    setActiveVideoIndex(0);
    if (reelId || isSearchFeed) navigate('/', { replace: true });
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  // Scroll to search video if it exists
  useEffect(() => {
    if (isSearchFeed && activeSearchVideoId && containerRef.current) {
      const selectedIndex = displayedVideos.findIndex(v => String(v.id) === String(activeSearchVideoId));
      if (selectedIndex >= 0) {
        setActiveVideoIndex(selectedIndex);
        const selectedCard = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
        selectedCard?.scrollIntoView({ block: 'start' });
      }
    }
  }, [isSearchFeed, activeSearchVideoId, displayedVideos.length]);

  return (
    <div 
      className="relative w-full h-full bg-black overflow-y-visible"
      onClick={onboardingStep === 2 ? handleFinishOnboarding : undefined}
      onWheel={onboardingStep === 2 ? handleFinishOnboarding : undefined}
      onTouchStart={onboardingStep === 2 ? handleFinishOnboarding : undefined}
    >
      {/* Top Navigation */}
      <div className="absolute top-[calc(var(--safe-area-top)+8px)] left-0 w-full flex justify-between items-center px-4 z-[50] pointer-events-none">
        <div className="w-8" />
        <div className="flex items-center gap-6 pointer-events-auto">
          {reelSections.map((section) => {
            const isActive = currentTab === section.id;
            return (
              <div
                key={section.id}
                className="relative cursor-pointer py-1 select-none"
                onClick={() => handleTabChange(section.id)}
              >
                <span
                  className={`text-[17px] transition-all duration-200 drop-shadow-md ${
                    isActive ? 'text-white font-bold tracking-wide' : 'text-white/70 font-semibold hover:text-white'
                  }`}
                >
                  {section.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-[3px] bg-white rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-all duration-300" />
                )}
              </div>
            );
          })}
        </div>
        <div 
          className="pointer-events-auto text-white cursor-pointer p-1 active:scale-95 transition-transform drop-shadow-md" 
          onClick={() => navigate('/search')}
          title="Search"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7.5"/>
            <path d="M16.5 16.5L21 21"/>
          </svg>
        </div>
      </div>

      {/* Vertical Feed */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto reels-feed-container no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth', touchAction: 'pan-y' }}
      >
        {displayedVideos.length === 0 && !loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-black px-6 text-center select-none">
            {/* Glowing Icon Container */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#fe2c55]/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-tr from-[#fe2c55] to-[#25f4ee] rounded-full p-[2px] shadow-2xl flex items-center justify-center">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#empty-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                    <defs>
                      <linearGradient id="empty-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fe2c55" />
                        <stop offset="100%" stopColor="#25f4ee" />
                      </linearGradient>
                    </defs>
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Typography */}
            <h3 className="text-2xl font-bold text-white tracking-wide mb-2">No reels uploaded</h3>
            <p className="text-[14px] text-white/50 max-w-xs leading-relaxed mb-8">
              Be the first to share your beautiful moment with the world!
            </p>
            {/* Glowing Create CTA Button */}
            <button
              onClick={() => navigate('/create')}
              className="relative inline-flex items-center justify-center px-8 py-3.5 text-[15px] font-bold text-white bg-gradient-to-r from-[#fe2c55] to-[#25f4ee] rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer z-50"
            >
              Create Reel
            </button>
          </div>
        ) : (
          displayedVideos.map((video, index) => {
            const isVisible = Math.abs(index - activeVideoIndex) <= 3;
            
            return (
              <div
                key={video.id || video._id || index}
                data-index={index}
                className="video-card-wrapper h-full w-full snap-start snap-always relative"
                style={{ scrollSnapStop: 'always' }}
              >
                {isVisible ? (
                  <VideoCard
                    videoData={video}
                    isActive={index === activeVideoIndex && onboardingStep !== 2}
                    preload={index === activeVideoIndex ? "auto" : (index === activeVideoIndex + 1 ? "metadata" : "none")}
                    shouldLoadMedia={Math.abs(index - activeVideoIndex) <= 1}
                  />
                ) : (
                  <div className="h-full w-full bg-black flex items-center justify-center">
                     <div className="w-10 h-10 border-4 border-white/10 border-t-white/30 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {loading && (
          <div className="h-full w-full flex items-center justify-center bg-black">
            <div className="w-10 h-10 border-4 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Onboarding Swipe Prompt */}
      {onboardingStep === 2 && (
        <div 
          className="absolute inset-0 z-40 bg-black/40 flex flex-col items-center justify-center transition-all duration-300 opacity-100 pointer-events-none" 
        >
          <div className="flex flex-col items-center animate-bounce-slow pointer-events-none">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm mb-6">
              <svg viewBox="0 0 24 24" fill="white" width="48" height="48" className="animate-swipe-up">
                <path d="M11 19V6.414l-4.293 4.293-1.414-1.414L12 2.586l6.707 6.707-1.414 1.414L13 6.414V19h-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white shadow-lg">Swipe up for more</h2>
          </div>
        </div>
      )}

      {/* Live Discover Modal */}
      <LiveDiscoverModal
        isOpen={showLiveDiscover}
        onClose={() => setShowLiveDiscover(false)}
      />
    </div>
  );
};

export default HomePage;

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BiChevronLeft } from 'react-icons/bi';
import VideoCard from '../../components/video/VideoCard';
import VideoOverlay from '../../components/video/VideoOverlay';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useReelsAPI } from '../../../../hooks/useReelsAPI';

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { reelId } = useParams();
  const { reelSections } = useAppContent();
  const { reels, loading, fetchFeed, fetchSingleReel } = useReelsAPI();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const defaultTab = reelSections[0]?.id || 'foryou';
  const [currentTab, setCurrentTab] = useState(defaultTab);
  const containerRef = useRef(null);

  // Fetch real data on tab change or reelId
  useEffect(() => {
    if (reelId) {
      fetchSingleReel(reelId);
    } else {
      fetchFeed(currentTab);
    }
  }, [currentTab, fetchFeed, reelId, fetchSingleReel]);

  // Aggressive pre-fetch for next videos to ensure instant playback
  useEffect(() => {
    const preloadLimit = 3;
    const links = [];

    for (let i = 1; i <= preloadLimit; i++) {
      if (reels.length > activeVideoIndex + i) {
        const nextVideo = reels[activeVideoIndex + i];
        if (nextVideo.url) {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.as = 'video';
          link.href = nextVideo.url;
          document.head.appendChild(link);
          links.push(link);
        }
      }
    }
    
    return () => {
      links.forEach(link => {
        try { document.head.removeChild(link); } catch(e) {}
      });
    };
  }, [reels, activeVideoIndex]);

  // Onboarding sequence - Only show if not seen before
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setOnboardingStep(1);
      // Show notification modal after a short delay
      const timer = setTimeout(() => {
        setShowNotificationModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNotificationChoice = () => {
    setShowNotificationModal(false);
    setOnboardingStep(2); // Move to swipe-up prompt
  };

  const handleFinishOnboarding = () => {
    setOnboardingStep(0);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const isSearchFeed =
    Array.isArray(location.state?.searchVideos) && location.state.searchVideos.length > 0;
  const activeSearchVideoId = location.state?.activeVideoId;
  const displayedVideos = isSearchFeed
    ? location.state.searchVideos
    : reels;

  const handleTabChange = (nextTab) => {
    setCurrentTab(nextTab);

    if (isSearchFeed) {
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    // Force blur any active element (like keyboard) when landing on Home
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  useEffect(() => {
    if (defaultTab && currentTab !== defaultTab && !reelSections.find((section) => section.id === currentTab)) {
      setCurrentTab(defaultTab);
    }
    // Reset index when switching tabs
    setActiveVideoIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // dataset index is passed through an attribute
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveVideoIndex(index);
          }
        });
      },
      {
        root: null, // Full viewport
        rootMargin: '0px',
        threshold: 0.7, // Fire when 70% of the video is visible
      }
    );

    const videoElements = document.querySelectorAll('.video-card-wrapper');
    videoElements.forEach((el) => observer.observe(el));

    return () => {
      videoElements.forEach((el) => observer.unobserve(el));
    };
  }, [currentTab, isSearchFeed, location.key, defaultTab, reelSections]);

  useEffect(() => {
    if (!isSearchFeed || !activeSearchVideoId || !containerRef.current) {
      return;
    }

    const selectedIndex = displayedVideos.findIndex(
      (video) => String(video.id) === String(activeSearchVideoId),
    );

    if (selectedIndex < 0) {
      return;
    }

    setActiveVideoIndex(selectedIndex);

    requestAnimationFrame(() => {
      const selectedCard = containerRef.current?.querySelector(
        `[data-video-id="${activeSearchVideoId}"]`,
      );
      selectedCard?.scrollIntoView({ block: 'start' });
    });
  }, [activeSearchVideoId, displayedVideos, isSearchFeed]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Top Navigation Tabs */}
      <div className="absolute top-[var(--safe-area-top)] left-0 w-full flex justify-between items-center px-4 py-6 z-[50] pointer-events-none">
        <div className="w-8 shrink-0" />

        <div className="flex gap-6 pointer-events-auto">
          {reelId ? (
            <div 
              className="flex items-center gap-1 text-white font-bold cursor-pointer drop-shadow-md"
              onClick={() => navigate('/')}
            >
              <BiChevronLeft size={28} />
              <span>Back to Feed</span>
            </div>
          ) : (
            reelSections.map((section) => (
              <span
                key={section.id}
                className={`text-[17px] font-semibold cursor-pointer pointer-events-auto transition-colors duration-200 relative shadow-black drop-shadow-md ${
                  currentTab === section.id ? 'text-white' : 'text-white/60'
                }`}
                onClick={() => handleTabChange(section.id)}
              >
                {section.label}
                {currentTab === section.id && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />
                )}
              </span>
            ))
          )}
        </div>
        <div className="pointer-events-auto text-white flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      {/* Video Feed Wrapper */}
      <div
        className="home-feed-scroll-lockable h-[100dvh] w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory no-scrollbar touch-pan-y overscroll-none"
        ref={containerRef}
        style={{ scrollSnapStop: 'always', WebkitOverflowScrolling: 'touch' }}
      >
        {displayedVideos.length > 0 ? (
          displayedVideos.map((video, index) => (
            <div
              key={video.id}
              className="video-card-wrapper h-full w-full snap-start snap-always"
              data-index={index}
              data-video-id={video.id}
            >
              <VideoCard
                videoData={video}
                isActive={index === activeVideoIndex && !showNotificationModal && onboardingStep !== 2}
              />
            </div>
          ))
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center relative bg-black">
            <div className="text-center px-8 z-10">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 mx-auto border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                  <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                  <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                  <path d="M7 21h10"></path>
                  <path d="M12 21v-7"></path>
                  <path d="M3 3l18 18"></path>
                </svg>
              </div>
              <h2 className="text-white text-xl font-bold mb-2">No video available</h2>
              <p className="text-white/40 text-[14px] max-w-[240px] leading-relaxed">
                Check back later or try exploring other tabs for new content.
              </p>
            </div>
            
          </div>
        )}
      </div>
      {/* Notification Modal Overlay */}
      {showNotificationModal && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-6 overflow-hidden">
          <div className="absolute top-[20%] text-center text-white/90 px-8">
            <p className="text-[17px] font-medium leading-relaxed">
              To stay on top of likes, comments, the latest videos, and more, allow Jhumroo to send you notifications.
            </p>
          </div>

          <div className="w-full max-w-[280px] bg-[#F1F1F1]/95 backdrop-blur-xl rounded-[14px] overflow-hidden animate-scale-in flex flex-col items-center shadow-2xl">
            <div className="px-5 py-6 text-center border-b border-gray-300">
              <h3 className="text-[17px] font-bold text-black mb-1.5">
                "Jhumroo" Would Like To Send You Notifications
              </h3>
              <p className="text-[13px] text-black/80 leading-snug">
                Notifications may include alerts, sounds and icon badges. These can be configured in Settings.
              </p>
            </div>
            <div className="flex w-full h-11">
              <button
                onClick={handleNotificationChoice}
                className="flex-1 py-1 text-[17px] font-medium text-[#007AFF] border-r border-gray-300 active:bg-gray-200 transition-colors"
              >
                Don't Allow
              </button>
              <button
                onClick={handleNotificationChoice}
                className="flex-1 py-1 text-[17px] font-bold text-[#007AFF] active:bg-gray-200 transition-colors"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swipe Up for More Prompt */}
      {onboardingStep === 2 && !showNotificationModal && (
        <div
          className="absolute inset-0 z-40 bg-black/40 flex flex-col items-center justify-center pointer-events-auto cursor-pointer"
          onClick={handleFinishOnboarding}
        >
          <div className="flex flex-col items-center animate-bounce-slow">
            <div className="relative mb-6">
              {/* Hand Icon and Swipe Animation Overlay */}
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="white" width="48" height="48" className="animate-swipe-up">
                  <path d="M11 19V6.414l-4.293 4.293-1.414-1.414L12 2.586l6.707 6.707-1.414 1.414L13 6.414V19h-2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white shadow-lg drop-shadow-md">Swipe up for more</h2>
            <p className="text-white/60 text-sm mt-2 font-medium">Tap to start watching</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

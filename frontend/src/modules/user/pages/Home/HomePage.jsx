import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BiChevronLeft } from 'react-icons/bi';
import VideoCard from '../../components/video/VideoCard';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useReelsAPI } from '../../../../hooks/useReelsAPI';

const HomePage = () => {
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
    if (activeVideoIndex >= reels.length - 2 && hasMore && !loading && !reelId) {
      fetchFeed(currentTab);
    }
  }, [activeVideoIndex, reels.length, hasMore, loading, currentTab, reelId, fetchFeed]);

  // Onboarding Logic
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) setOnboardingStep(2);
  }, []);

  const handleFinishOnboarding = () => {
    setOnboardingStep(0);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  // Intersection Observer for Active Video
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveVideoIndex(index);
          }
        });
      },
      { threshold: 0.7 }
    );

    const elements = document.querySelectorAll('.video-card-wrapper');
    elements.forEach((el) => observer.observe(el));
    return () => elements.forEach((el) => observer.unobserve(el));
  }, [reels.length, currentTab]);

  const isSearchFeed = Array.isArray(location.state?.searchVideos) && location.state.searchVideos.length > 0;
  const activeSearchVideoId = location.state?.activeVideoId;
  const displayedVideos = isSearchFeed ? location.state.searchVideos : reels;

  const handleTabChange = (nextTab) => {
    setCurrentTab(nextTab);
    setActiveVideoIndex(0);
    if (isSearchFeed) navigate('/', { replace: true });
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
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Top Navigation */}
      <div className="absolute top-[var(--safe-area-top)] left-0 w-full flex justify-between items-center px-4 py-6 z-[50] pointer-events-none">
        <div className="w-8" />
        <div className="flex gap-6 pointer-events-auto">
          {reelId ? (
            <div className="flex items-center gap-1 text-white font-bold cursor-pointer" onClick={() => navigate('/')}>
              <BiChevronLeft size={28} /> <span>Back</span>
            </div>
          ) : (
            reelSections.map((section) => (
              <span
                key={section.id}
                className={`text-[17px] font-semibold cursor-pointer transition-colors ${currentTab === section.id ? 'text-white' : 'text-white/60'}`}
                onClick={() => handleTabChange(section.id)}
              >
                {section.label}
                {currentTab === section.id && <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />}
              </span>
            ))
          )}
        </div>
        <div className="pointer-events-auto text-white cursor-pointer" onClick={() => navigate('/search')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>

      {/* Vertical Feed */}
      <div
        ref={containerRef}
        className="h-[100dvh] w-full overflow-y-auto snap-y snap-mandatory no-scrollbar overscroll-none"
        style={{ scrollSnapStop: 'always', WebkitOverflowScrolling: 'touch' }}
      >
        {displayedVideos.map((video, index) => {
          const isVisible = Math.abs(index - activeVideoIndex) <= 2;
          
          return (
            <div
              key={video.id}
              data-index={index}
              className="video-card-wrapper h-full w-full snap-start snap-always relative"
            >
              {isVisible ? (
                <VideoCard
                  videoData={video}
                  isActive={index === activeVideoIndex && onboardingStep !== 2}
                />
              ) : (
                <div className="h-full w-full bg-black flex items-center justify-center">
                   <div className="w-10 h-10 border-4 border-white/10 border-t-white/30 rounded-full animate-spin" />
                </div>
              )}
            </div>
          );
        })}
        
        {loading && (
          <div className="h-full w-full flex items-center justify-center bg-black">
            <div className="w-10 h-10 border-4 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Onboarding Swipe Prompt */}
      {onboardingStep === 2 && (
        <div className="absolute inset-0 z-40 bg-black/40 flex flex-col items-center justify-center cursor-pointer" onClick={handleFinishOnboarding}>
          <div className="flex flex-col items-center animate-bounce-slow">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm mb-6">
              <svg viewBox="0 0 24 24" fill="white" width="48" height="48" className="animate-swipe-up">
                <path d="M11 19V6.414l-4.293 4.293-1.414-1.414L12 2.586l6.707 6.707-1.414 1.414L13 6.414V19h-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white shadow-lg">Swipe up for more</h2>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

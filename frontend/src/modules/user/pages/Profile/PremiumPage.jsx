import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiArrowBack, BiCheck } from 'react-icons/bi';

const PREMIUM_FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500 w-6 h-6 drop-shadow-[0_2px_4px_rgba(245,158,11,0.2)]">
        <path d="M2 19h20v2H2zm1-4h18v2H3zm9-12.2L16.2 8l4.8-4.8L19 13.8H5L3 3.2 7.8 8z"/>
      </svg>
    ),
    title: 'Go Live',
    desc: 'Going live with your followers  for meetups online '
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500 w-6 h-6">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="17" x2="22" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
      </svg>
    ),
    title: 'Ultra HD 4K Uploads',
    desc: 'Publish your reels in flawless high-definition and maximum bitrate for crystal-clear playback.'
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    ),
    title: 'Ad-Free Browsing',
    desc: 'Enjoy an uninterrupted journey on Jhumroo without any ads or sponsor banners.'
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 w-6 h-6">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: 'Advanced Analytics Pro',
    desc: 'Access deep-dive insights on audience retention, viral hashtags, and geographic share-maps.'
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 w-6 h-6">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
    title: 'Premium Profile Themes',
    desc: 'Customize your profile page with glowing borders, animated canvas headers, and custom text styles.'
  }
];

const PremiumPage = () => {
  const navigate = useNavigate();
  const joinedWaitlistRef = useRef(false);
  const emailRef = useRef('');
  const errorRef = useRef('');

  const handleJoinWaitlist = (e) => {
    e.preventDefault();
    if (!emailRef.current) {
      errorRef.current = 'Please enter a valid email address.';
      return;
    }
    // Simple email validation pattern
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(emailRef.current)) {
      errorRef.current = 'Please enter a valid email address.';
      return;
    }
    errorRef.current = '';
    joinedWaitlistRef.current = true;
  };

  return (
    <div className="page-container pb-0 bg-[#0F0F14] text-white flex flex-col min-h-screen relative overflow-x-hidden overflow-y-auto no-scrollbar pb-10">
      {/* Background Neon Glow Effects */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[100px] right-[-100px] w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0 z-10">
        <button 
          type="button"
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition-transform hover:bg-white/10"
        >
          <BiArrowBack size={20} className="text-white" />
        </button>
        <span className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-amber-500">Jhumroo Elite</span>
        <div className="w-10 h-10" /> {/* Spacer to align title */}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 flex flex-col items-center z-10 text-center">
        {/* Crown Icon Box */}
        <div className="relative mt-8 mb-4">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-pink-500 rounded-3xl blur-[20px] opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-pink-600 p-[1.5px]">
            <div className="w-full h-full bg-[#0F0F14] rounded-[22px] flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="36" 
                height="36" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="text-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]"
              >
                <path d="M2 19h20v2H2zm1-4h18v2H3zm9-12.2L16.2 8l4.8-4.8L19 13.8H5L3 3.2 7.8 8z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black tracking-tight mb-2 text-white">
          Jhumroo <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-500 bg-clip-text text-transparent">Premium</span>
        </h1>

        {/* Professional Coming Soon Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 mb-8 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase">Coming Soon</span>
        </div>

        <p className="text-[14px] text-gray-400 max-w-[320px] leading-relaxed mb-10">
          We are building the ultimate creator suite. Get exclusive features, stand out in comments, and supercharge your reach.
        </p>

        {/* Features List */}
        <div className="w-full max-w-[360px] text-left space-y-5 mb-10 bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl backdrop-blur-md">
          <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Sneak Peek Features</h3>
          {PREMIUM_FEATURES.map((feat, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="p-2 bg-white/5 rounded-xl border border-white/5 shrink-0">
                {feat.icon}
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-white mb-0.5">{feat.title}</h4>
                <p className="text-[12px] text-gray-400 leading-normal">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;

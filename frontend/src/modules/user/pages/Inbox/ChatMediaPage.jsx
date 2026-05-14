import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContent } from '../../../../hooks/useAppContent';
import userService from '../../../../services/userService';

const ChatMediaPage = () => {
  const navigate = useNavigate();
  const { username = '' } = useParams();
  const { config } = useAppContent();
  const [targetUser, setTargetUser] = useState(null);
  
  const galleryItems = config?.inbox?.galleryItems || [];

  useEffect(() => {
    userService.getUserByUsername(username).then(res => {
        if (res.success) setTargetUser(res.user);
    });
  }, [username]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(`/inbox/chat/${username}`);
  };

  return (
    <div className="page-container pb-0 theme-chat-page text-white flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-black/10 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={handleBack} className="text-white active:opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-[16px] font-bold truncate">Gallery</p>
              <p className="text-[12px] text-white/40 truncate">Send to {targetUser?.fullName || username}</p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Recent
          </div>
        </div>
      </div>

      <div className="scrollable flex-1 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {galleryItems.map((item, index) => (
            <button
              key={item}
              className="relative aspect-[3/4] rounded-[22px] overflow-hidden border border-white/10 bg-white/5 active:scale-[0.98] transition-transform"
            >
              <img src={item} alt={`gallery-${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-[12px] font-semibold text-white">Recent {index + 1}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-[max(1rem,var(--safe-area-bottom))] pt-3 border-t border-white/10 bg-black/10 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-white">Choose a photo</p>
            <p className="text-[11px] text-white/35 mt-1">
              Select media to continue in chat.
            </p>
          </div>
          <button className="px-5 py-2.5 rounded-full bg-[#FE2C55] text-white text-[13px] font-bold shadow-[0_10px_24px_rgba(254,44,85,0.35)] active:brightness-95">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMediaPage;

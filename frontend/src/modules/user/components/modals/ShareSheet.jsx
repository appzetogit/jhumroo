import React, { useState } from 'react';
import { BiX, BiLinkAlt, BiFlag, BiDownload, BiMessageSquareDetail } from 'react-icons/bi';
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa';
import { useTheme } from '../../../../context/ThemeContext';

import reelService from '../../../../services/reelService';

const ShareSheet = ({ isOpen, onClose, reelData, onShare }) => {
  const { isDarkMode } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleShareAction = async (platform = 'general') => {
    onShare?.(platform);
    onClose();
  };

  const handleCopyLink = async () => {
    onShare?.('copy');
    onClose();
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    const videoUrl = reelData?.video?.url || reelData?.url;
    if (!videoUrl) {
      alert("Video URL not found.");
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Failed to fetch video file");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = `jhumroo-reel-${reelData?._id || 'video'}.mp4`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading reel:", err);
      // Fallback
      const link = document.createElement('a');
      link.href = videoUrl;
      link.target = '_blank';
      link.setAttribute('download', `jhumroo-reel-${reelData?._id || 'video'}.mp4`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
      onClose();
    }
  };

  return (
    <div
      className={`absolute inset-0 z-[2000] flex flex-col justify-end share-sheet-backdrop ${
        isDarkMode ? 'bg-black/50' : 'bg-black/30 backdrop-blur-[2px]'
      }`}
      data-modal-open="true"
      onClick={onClose}
    >
      <div 
        className={`w-full rounded-t-[12px] p-4 pb-navbar animate-slide-up ${
          isDarkMode
            ? 'bg-[#161823] text-white'
            : 'bg-white text-black shadow-[0_-12px_36px_rgba(15,23,42,0.16)] border-t border-black/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center mb-4">
           <div className={`w-10 h-1 rounded-full mb-3 shrink-0 ${isDarkMode ? 'bg-white/20' : 'bg-black/15'}`}></div>
           <button
             className={`absolute right-4 transition-opacity hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black/70'}`}
             onClick={onClose}
           >
              <BiX size={24} />
           </button>
        </div>

        <div className="space-y-6">
            <div>
                <h3 className={`text-sm font-bold px-2 mb-4 ${isDarkMode ? 'text-white/50' : 'text-black/45'}`}>Send to</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth px-2">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={`friend-${i}`} className="flex flex-col items-center shrink-0 w-16 gap-1 group cursor-pointer" onClick={() => handleShareAction()}>
                           <div className={`w-12 h-12 rounded-full overflow-hidden border group-active:scale-95 transition-transform ${isDarkMode ? 'border-white/5' : 'border-black/10'}`}>
                               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=friend${i}`} alt="friend" className="w-full h-full object-cover" />
                           </div>
                           <span className={`text-[10px] font-bold truncate w-full text-center ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>friend_{i}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`h-px mx-2 ${isDarkMode ? 'bg-white/5' : 'bg-black/[0.08]'}`} />

            <div>
                <h3 className={`text-sm font-bold px-2 mb-4 ${isDarkMode ? 'text-white/50' : 'text-black/45'}`}>Share to</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth px-2">
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={() => handleShareAction('whatsapp')}>
                       <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                           <FaWhatsapp size={24} color="white" />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>WhatsApp</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={() => handleShareAction('instagram')}>
                       <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center shadow-lg shadow-pink-500/20">
                           <FaInstagram size={24} color="white" />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>Instagram</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={() => handleShareAction('messenger')}>
                       <div className="w-12 h-12 rounded-full bg-[#00B2FF] flex items-center justify-center shadow-lg shadow-[#00B2FF]/20">
                           <FaFacebookMessenger size={24} color="white" />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>Messenger</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={handleCopyLink}>
                       <div className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                         isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black/75'
                       }`}>
                           <BiLinkAlt size={24} />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>Copy Link</span>
                    </div>
                </div>
            </div>

            <div className={`flex gap-4 py-4 px-2 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <div className={`flex-1 flex flex-col items-center gap-2 tap-effect cursor-pointer group ${isDarkMode ? 'text-white' : 'text-black/80'}`}>
                   <BiFlag size={20} className="group-hover:text-tiktok-red transition-colors" />
                   <span className="text-[10px] font-bold">Report</span>
                </div>
                <div className={`flex-1 flex flex-col items-center gap-2 tap-effect cursor-pointer group ${isDarkMode ? 'text-white' : 'text-black/80'}`}>
                   <BiMessageSquareDetail size={20} className="group-hover:text-tiktok-cyan transition-colors" />
                   <span className="text-[10px] font-bold">Not interested</span>
                </div>
                {((reelData?.user?.downloadPrivacy !== 'Off') && (reelData?.allowDownload !== false)) && (
                  <div 
                    onClick={handleDownload}
                    className={`flex-1 flex flex-col items-center gap-2 tap-effect cursor-pointer group ${isDarkMode ? 'text-white' : 'text-black/80'} ${isDownloading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isDownloading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <BiDownload size={20} className="group-hover:text-success transition-colors" />
                    )}
                    <span className="text-[10px] font-bold">{isDownloading ? "Saving..." : "Save video"}</span>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ShareSheet;

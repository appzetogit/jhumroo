import React, { useState } from 'react';
import { BiChevronRight, BiCheckCircle } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import reelService from '../../../../services/reelService';

const ReportSheet = ({ isOpen, onClose, reelId }) => {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(1); // 1: list, 2: confirmation
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const reasons = [
    { id: 'spam', label: 'Spam' },
    { id: 'harassment', label: 'Harassment' },
    { id: 'violence', label: 'Violence' },
    { id: 'copyright', label: 'Copyright' },
    { id: 'fake_content', label: 'Fake content' },
    { id: 'adult_content', label: 'Adult content' },
    { id: 'other', label: 'Something else' }
  ];

  const handleReport = async (reason) => {
    setLoading(true);
    try {
      await reelService.reportReel(reelId, reason);
      setStep(2);
    } catch (err) {
      alert(err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[6000] flex flex-col justify-end ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-h-[70vh] rounded-t-[20px] pb-[calc(var(--safe-area-bottom)+20px)] animate-slide-up ${
          isDarkMode ? 'bg-[#161823] text-white' : 'bg-white text-black'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-3 pb-4">
          <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/10'}`}></div>
          <h2 className="text-[17px] font-bold mt-4">Report</h2>
        </div>

        {step === 1 ? (
          <div className="px-4">
            <p className={`text-[14px] mb-4 font-medium ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
              Why are you reporting this reel?
            </p>
            <div className="flex flex-col gap-1">
              {reasons.map((reason) => (
                <button
                  key={reason.id}
                  disabled={loading}
                  onClick={() => handleReport(reason.id)}
                  className={`flex items-center justify-between p-4 rounded-xl active:scale-95 transition-all ${
                    isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
                  }`}
                >
                  <span className="text-[15px] font-semibold">{reason.label}</span>
                  <BiChevronRight size={20} className="opacity-30" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center text-success mb-6">
              <BiCheckCircle size={48} />
            </div>
            <h3 className="text-xl font-bold mb-2">Thanks for reporting</h3>
            <p className={`text-[14px] leading-relaxed mb-8 ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
              Your report helps keep the community safe. We'll review this reel shortly.
            </p>
            <button
              onClick={onClose}
              className="w-full py-4 bg-tiktok-red text-white font-bold rounded-xl active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportSheet;

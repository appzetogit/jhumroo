import React, { useState } from 'react';
import { BiChevronRight, BiCheckCircle } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import userService from '../../../../services/userService';

const REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'violence', label: 'Violence' },
  { id: 'copyright', label: 'Copyright' },
  { id: 'fake_content', label: 'Fake content' },
  { id: 'adult_content', label: 'Adult content' },
  { id: 'other', label: 'Something else' }
];

const ReportUserSheet = ({ isOpen, onClose, userId }) => {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(1); // 1: list, 2: confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleReport = async (reason) => {
    setLoading(true);
    try {
      setError(null);
      await userService.reportUser(userId, reason);
      window.dispatchEvent(new CustomEvent('user-reported', { detail: { userId } }));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after animation
    setTimeout(() => {
      setStep(1);
      setError(null);
    }, 300);
  };

  return (
    <div 
      className={`fixed inset-0 z-[6000] flex flex-col justify-end transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      } ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`}
      data-modal-open={isOpen ? "true" : "false"}
      onClick={handleClose}
    >
      <div 
        className={`w-full max-h-[70vh] rounded-t-[20px] pb-[calc(var(--safe-area-bottom)+40px)] transition-transform duration-300 transform ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } ${
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
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13px] font-medium text-center animate-fade-in">
                {error}
              </div>
            )}
            <p className={`text-[14px] mb-4 font-medium ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
              Why are you reporting this account?
            </p>
            <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar max-h-[45vh]">
              {REASONS.map((reason) => (
                <button
                  type="button"
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
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-6">
              <BiCheckCircle size={48} />
            </div>
            <h3 className="text-xl font-bold mb-2">Thanks for reporting</h3>
            <p className={`text-[14px] leading-relaxed mb-8 ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
              Your report helps keep the community safe. We'll review this account shortly.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-4 bg-[#FE2C55] text-white font-bold rounded-xl active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportUserSheet;

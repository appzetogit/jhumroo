import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import adminInterestService from '../../../../../services/adminInterestService';

const OnboardingPage = ({ onComplete, onBack }) => {
  const { updateInterests, user } = useAuth();
  const [interests, setInterests] = useState([]);
  const [selected, setSelected] = useState(user?.interests || []);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await adminInterestService.getInterests();
        if (response.success) {
          setInterests(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch interests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInterests();
  }, []);

  const handleNext = async () => {
    if (selected.length < 3) return;
    setIsSubmitting(true);
    try {
      await updateInterests(selected);
      onComplete();
    } catch (err) {
      console.error('Failed to save interests:', err);
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleInterest = (item) => {
    setSelected(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  return (
    <div className="h-full w-full theme-surface-page bg-[#161616] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-12 px-6 pb-6 flex flex-col gap-4">
        <div 
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          onClick={() => {
            if (onBack) {
              onBack();
            } else {
              onComplete?.();
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div className="flex-1 pr-4">
          <h1 className="text-3xl font-extrabold text-white mb-3">Choose your interests</h1>
          <p className="text-sm text-white/55 leading-tight">
            Personalize your experience by picking 3 or more topics
          </p>
        </div>
      </div>

      {/* Interests Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
             <div className="w-8 h-8 border-2 border-white/20 border-t-tiktok-red rounded-full animate-spin mb-4" />
             <p className="text-gray-500 text-sm">Finding the best topics for you...</p>
          </div>
        ) : (
          interests.map((section, idx) => (
            <div key={section._id || idx} className="mb-8">
              <div className="flex items-center gap-2 mb-4 text-white font-bold text-sm">
                <span className="text-lg">{section.icon || '🎭'}</span>
                <span className="tracking-tight">{section.category}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {section.items.map((item, i) => {
                  const isSelected = selected.includes(item);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleInterest(item)}
                      className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition-all active:scale-95 ${isSelected
                          ? 'bg-[#fe2c55] border-[#fe2c55] text-white shadow-lg shadow-[#fe2c55]/20'
                          : 'bg-white/5 border-white/10 text-white'
                        }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div 
        className="absolute bottom-0 left-0 w-full p-6 pointer-events-none" 
        style={{ background: 'linear-gradient(to top, #161616 60%, transparent 100%)' }}
      >
        <button
          onClick={handleNext}
          disabled={selected.length < 3 || isSubmitting || loading}
          className={`w-full rounded-full border py-4 font-extrabold text-base transition-all active:scale-[0.98] pointer-events-auto flex items-center justify-center ${selected.length >= 3
              ? 'border-[#ff6c96]/40 bg-[linear-gradient(180deg,#ff5d90_0%,#ff2e69_55%,#ff245f_100%)] text-white shadow-[0_14px_34px_rgba(255,53,108,0.38)]'
              : 'border-white/10 bg-[#2f2f2f] text-white/55 shadow-[0_10px_30px_rgba(0,0,0,0.28)]'
            }`}
        >
          {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;

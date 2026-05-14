import React, { useState } from 'react';
import { BiSearch, BiChevronRight } from 'react-icons/bi';
import { useAppContent } from '../../../../../hooks/useAppContent';
import { useAuth } from '../../../../../context/AuthContext';

const OnboardingPage = ({ onComplete }) => {
  const { config } = useAppContent();
  const { updateInterests } = useAuth();
  const rawInterests = config?.onboarding?.interests || [];
  const interests = rawInterests.map(section => ({
    ...section,
    items: [...new Set(section.items)]
  }));
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (selected.length < 3) return;
    setLoading(true);
    try {
      await updateInterests(selected);
      onComplete();
    } catch (err) {
      console.error('Failed to save interests:', err);
      // Even if it fails, we might want to continue
      onComplete();
    } finally {
      setLoading(false);
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
      <div className="pt-12 px-6 pb-6 flex justify-between items-start">
        <div className="flex-1 pr-4">
          <h1 className="text-3xl font-extrabold text-white mb-3">Choose your interests</h1>
          <p className="text-sm text-white/55 leading-tight">
            Personalize your experience by picking 3 or more topics
          </p>
        </div>
        <button
          onClick={onComplete}
          className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-white/6 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-all hover:bg-white/10 active:scale-[0.97]"
        >
          Skip
        </button>
      </div>

      {/* Interests Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
        {interests.map((section, idx) => (
          <div key={idx} className="mb-8">
            <div className="flex items-center gap-2 mb-4 text-white font-bold text-sm">
              {idx === 0 && <span className="text-lg">🎭</span>}
              {idx === 1 && <span className="text-lg">🏠</span>}
              {idx === 2 && <span className="text-lg">👗</span>}
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
                        ? 'bg-tiktok-red border-tiktok-red text-white shadow-lg shadow-tiktok-red/20'
                        : 'bg-white/5 border-white/10 text-white'
                      }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed Bottom Button */}
      <div 
        className="absolute bottom-0 left-0 w-full p-6 pointer-events-none" 
        style={{ background: 'linear-gradient(to top, var(--theme-page-bg) 60%, transparent 100%)' }}
      >
        <button
          onClick={handleNext}
          disabled={selected.length < 3 || loading}
          className={`w-full rounded-full border py-4 font-extrabold text-base transition-all active:scale-[0.98] pointer-events-auto flex items-center justify-center ${selected.length >= 3
              ? 'border-[#ff6c96]/40 bg-[linear-gradient(180deg,#ff5d90_0%,#ff2e69_55%,#ff245f_100%)] text-white shadow-[0_14px_34px_rgba(255,53,108,0.38)]'
              : 'border-white/10 bg-[#2f2f2f] text-white/55 shadow-[0_10px_30px_rgba(0,0,0,0.28)]'
            }`}
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;

import React, { useState, useEffect } from 'react';
import { BiX, BiChevronRight, BiCheck } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import userService from '../../../../services/userService';

const Section = ({ title, children, isDarkMode }) => (
  <div className="mb-8 px-4">
    <h3 className={`text-[12px] font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>{title}</h3>
    <div className={`rounded-2xl overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
      {children}
    </div>
  </div>
);

const Row = ({ label, value, onClick, isLast, isDarkMode }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 active:bg-white/5 transition-colors ${!isLast ? (isDarkMode ? 'border-b border-white/5' : 'border-b border-black/5') : ''}`}
  >
    <span className="text-[15px] font-semibold">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`text-[14px] ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>{value}</span>
      <BiChevronRight size={20} className="opacity-30" />
    </div>
  </button>
);

const ContentPreferencesSheet = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [preferences, setPreferences] = useState({
    sensitiveContent: 'standard',
    aiContentVisibility: true,
    languagePreferences: ['English']
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchPreferences = async () => {
    try {
      const res = await userService.getPreferences();
      if (res.success) {
        setPreferences(res.preferences);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updatePref = async (updates) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    try {
      await userService.updatePreferences(updates);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[6000] flex flex-col justify-end ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`}
      data-modal-open={isOpen ? "true" : "false"}
      onClick={onClose}
    >
      <div 
        className={`w-full h-[85vh] rounded-t-[20px] flex flex-col animate-slide-up ${
          isDarkMode ? 'bg-[#161823] text-white' : 'bg-white text-black'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <button onClick={onClose} className="p-2 -ml-2">
            <BiX size={28} />
          </button>
          <h2 className="text-[17px] font-bold">Content Preferences</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto pt-6 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <Section title="Safety" isDarkMode={isDarkMode}>
                <Row 
                  label="Sensitive Content" 
                  value={preferences.sensitiveContent} 
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    const levels = ['standard', 'less', 'more'];
                    const next = levels[(levels.indexOf(preferences.sensitiveContent) + 1) % levels.length];
                    updatePref({ sensitiveContent: next });
                  }}
                />
              </Section>

              <Section title="Topics & Language" isDarkMode={isDarkMode}>
                <Row 
                  label="Language" 
                  value={preferences.languagePreferences[0]} 
                  isDarkMode={isDarkMode}
                  onClick={() => {}}
                />
                <Row 
                  label="Manage Topics" 
                  value="12 active" 
                  isLast 
                  isDarkMode={isDarkMode}
                  onClick={() => {}}
                />
              </Section>

              <Section title="AI Content" isDarkMode={isDarkMode}>
                <button 
                  onClick={() => updatePref({ aiContentVisibility: !preferences.aiContentVisibility })}
                  className="w-full flex items-center justify-between p-4"
                >
                  <span className="text-[15px] font-semibold">AI-generated content visibility</span>
                  <div className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                    preferences.aiContentVisibility ? 'bg-tiktok-red' : isDarkMode ? 'bg-white/10' : 'bg-black/10'
                  }`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                      preferences.aiContentVisibility ? 'left-7' : 'left-1'
                    }`} />
                  </div>
                </button>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentPreferencesSheet;

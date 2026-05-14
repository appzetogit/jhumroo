import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiCheck } from 'react-icons/bi';
import { useAppContent } from '../../../../hooks/useAppContent';

const LanguagePage = () => {
    const navigate = useNavigate();
    const { config } = useAppContent();
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const languages = config?.settings?.languages || [];

    return (
        <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-6 pb-6 shrink-0 relative border-b border-white/5">
                <div 
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
                  onClick={() => navigate(-1)}
                >
                    <BiChevronLeft size={24} className="text-white" />
                </div>
                <h2 className="text-[17px] font-bold text-white absolute left-0 right-0 text-center tracking-wide">Language</h2>
                <button className="text-[15px] font-bold text-[#FE2C55] active:opacity-70 z-10" onClick={() => navigate(-1)}>Done</button>
            </div>

            <div className="scrollable flex-1 px-4 pb-24 pt-6">
                <h4 className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-3 ml-1">App Language</h4>
                <div className="bg-[#242424] rounded-[18px] overflow-hidden shadow-sm">
                    {languages.map((lang, idx) => {
                        const isSelected = selectedLanguage === lang;
                        const isLast = idx === languages.length - 1;
                        return (
                            <div 
                                key={idx} 
                                className={`flex justify-between items-center p-4 active:bg-white/5 transition-colors cursor-pointer ${!isLast ? 'border-b border-white border-opacity-[0.05]' : ''}`}
                                onClick={() => setSelectedLanguage(lang)}
                            >
                                <span className="text-[15px] font-medium text-white/90 tracking-wide">{lang}</span>
                                {isSelected && <BiCheck size={24} className="text-[#FE2C55]" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LanguagePage;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiSearch, BiChevronRight, BiMessageDetail, BiShield, BiSolidLockAlt, BiQuestionMark } from 'react-icons/bi';
import { useAppContent } from '../../../../hooks/useAppContent';

const HelpCenterPage = () => {
    const navigate = useNavigate();
    const { config } = useAppContent();
    const [activeTab, setActiveTab] = React.useState('help'); // 'help' or 'support'
    
    // Support form state
    const categories = config?.helpCenter?.reportProblemCategories || [];
    const [selectedCategory, setSelectedCategory] = React.useState(categories[0] || '');
    const [description, setDescription] = React.useState('');
    const [submitted, setSubmitted] = React.useState(false);

    const iconMap = {
      safety: BiShield,
      privacy: BiSolidLockAlt,
      report: BiQuestionMark,
      help: BiMessageDetail,
    };
    
    const sections = (config?.settings?.helpCenterSections || []).map((section) => ({
      ...section,
      items: (section.items || []).map((item) => {
        const Icon = item.icon ? iconMap[item.icon] : null;
        return {
          ...item,
          icon: Icon ? <Icon size={20} /> : null,
        };
      }),
    }));

    const handleSubmit = () => {
        if (!description.trim()) return;
        setSubmitted(true);
        setDescription('');
        setTimeout(() => setSubmitted(false), 3000);
    };

    return (
        <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col shrink-0 border-b border-white/5">
                <div className="flex items-center justify-between px-4 pt-6 pb-4 relative">
                    <div 
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
                      onClick={() => navigate(-1)}
                    >
                        <BiChevronLeft size={24} className="text-white" />
                    </div>
                    <h2 className="text-[17px] font-bold text-white absolute left-0 right-0 text-center tracking-wide">Help Center</h2>
                    <div className="w-10"></div>
                </div>

                {/* Tabs */}
                <div className="flex px-4 gap-8">
                    <div 
                        className={`pb-2 text-[15px] font-bold cursor-pointer transition-all ${activeTab === 'help' ? 'text-white border-b-2 border-white' : 'text-white/40'}`}
                        onClick={() => setActiveTab('help')}
                    >
                        Help Center
                    </div>
                    <div 
                        className={`pb-2 text-[15px] font-bold cursor-pointer transition-all ${activeTab === 'support' ? 'text-white border-b-2 border-white' : 'text-white/40'}`}
                        onClick={() => setActiveTab('support')}
                    >
                        Support
                    </div>
                </div>
            </div>

            <div className="scrollable flex-1 px-4 pb-24 pt-6">
                {activeTab === 'help' ? (
                    <>
                        <div className="bg-[#242424] rounded-[18px] p-4 flex items-center gap-2 mb-8 border border-white/5 focus-within:border-white/20 transition-all">
                            <BiSearch size={20} className="text-white/30" />
                            <input type="text" placeholder="Search" className="bg-transparent text-white text-[15px] outline-none font-medium w-full placeholder:text-white/20" />
                        </div>

                        {sections.map((section, idx) => (
                            <div key={idx} className="mb-8">
                                <h4 className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-3 ml-1">{section.title}</h4>
                                <div className="bg-[#242424] rounded-[18px] overflow-hidden shadow-sm">
                                    {section.items.map((item, itemIdx) => {
                                        const isLast = itemIdx === section.items.length - 1;
                                        return (
                                            <div 
                                                key={itemIdx} 
                                                className={`flex justify-between items-center p-4 active:bg-white/5 transition-colors cursor-pointer ${!isLast ? 'border-b border-white border-opacity-[0.05]' : ''}`}
                                                onClick={() => navigate(item.route)}
                                            >
                                                <div className="flex items-center gap-3.5 text-white/90">
                                                    <div className="opacity-70">{item.icon}</div>
                                                    <span className="text-[15px] font-medium tracking-wide">{item.label}</span>
                                                </div>
                                                <BiChevronRight size={22} className="text-white/30" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div>
                            <h4 className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-4 ml-1">Topic</h4>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                                            selectedCategory === category
                                                ? 'bg-white text-black'
                                                : 'bg-[#242424] text-white/70 border border-white/5'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#242424] rounded-[24px] p-5 border border-white/5 shadow-xl">
                            <div className="mb-6">
                                <label className="block text-[11px] text-white/40 font-bold uppercase tracking-widest mb-3">Reason</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe your issue in detail..."
                                    className="w-full h-40 rounded-[20px] bg-white/5 border border-white/5 p-4 text-[15px] text-white placeholder:text-white/20 resize-none outline-none focus:border-white/20 transition-all"
                                />
                            </div>

                            {submitted && (
                                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-[16px]">
                                    <p className="text-[13px] text-green-400 font-medium text-center">
                                        Support request submitted successfully!
                                    </p>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="w-full h-[56px] rounded-[20px] bg-[#FE2C55] text-white text-[16px] font-bold active:scale-[0.98] transition-all shadow-lg shadow-[#FE2C55]/20"
                            >
                                Submit
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-[20px] p-6 text-center">
                            <p className="text-[14px] text-white/60 leading-relaxed">
                                Our support team typically responds within 24-48 hours. Thank you for your patience.
                            </p>
                        </div>
                    </div>
                )}

                <p className="text-center text-white/20 text-[12px] mt-12 mb-6 tracking-wide">Jhumroo v1.0.0</p>
            </div>
        </div>
    );
};

export default HelpCenterPage;

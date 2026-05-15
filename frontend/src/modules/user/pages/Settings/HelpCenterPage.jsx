import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BiChevronLeft, BiSearch, BiChevronRight, BiMessageDetail, BiShield, BiSolidLockAlt, BiQuestionMark, BiTimeFive, BiCheckCircle, BiPlayCircle } from 'react-icons/bi';
import { useAppContent } from '../../../../hooks/useAppContent';
import userService from '../../../../services/userService';

const HelpCenterPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { config } = useAppContent();
    const [activeTab, setActiveTab] = React.useState(location.state?.activeTab || 'help'); // 'help' or 'support'
    
    // Support state
    const [myReports, setMyReports] = React.useState([]);
    const [loadingReports, setLoadingReports] = React.useState(false);

    React.useEffect(() => {
        if (activeTab === 'support') {
            fetchMyReports();
        }
    }, [activeTab]);

    const fetchMyReports = async () => {
        setLoadingReports(true);
        console.log('Fetching my reports...');
        try {
            const res = await userService.getMyProblemReports();
            console.log('My reports response:', res);
            if (res.success) {
                setMyReports(res.reports || []);
            }
        } catch (error) {
            console.error('Failed to fetch my reports:', error);
        } finally {
            setLoadingReports(false);
        }
    };

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

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <BiTimeFive className="text-yellow-500" size={18} />;
            case 'in_progress': return <BiPlayCircle className="text-blue-500" size={18} />;
            case 'resolved': return <BiCheckCircle className="text-green-500" size={18} />;
            default: return <BiTimeFive className="text-white/20" size={18} />;
        }
    };

    const getStatusText = (status) => {
        if (!status) return 'Pending';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
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
                        History
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
                        {/* Report History */}
                        <div>
                            <div className="flex items-center justify-between mb-4 ml-1">
                                <h4 className="text-[11px] text-white/40 font-bold uppercase tracking-widest">Your Reports</h4>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); fetchMyReports(); }}
                                    className="text-[11px] text-[#FE2C55] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                                >
                                    {loadingReports ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                            
                            {loadingReports && myReports.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-8 h-8 border-2 border-[#FE2C55] border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                            ) : myReports && myReports.length > 0 ? (
                                <div className="space-y-3">
                                    {myReports.map((report) => (
                                        <div key={report._id} className="bg-[#242424] rounded-[20px] p-4 border border-white/5 flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[14px] font-bold text-white/90">{report.category}</span>
                                                <span className="text-[11px] text-white/30">{new Date(report.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-[13px] text-white/50 line-clamp-2 leading-relaxed">
                                                {report.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 pt-2 border-t border-white/5">
                                                {getStatusIcon(report.status)}
                                                <span className="text-[12px] font-bold text-white/70 uppercase tracking-wider">
                                                    {getStatusText(report.status)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : !loadingReports && (
                                <div className="bg-white/5 rounded-[20px] p-8 text-center border border-dashed border-white/10">
                                    <BiTimeFive className="mx-auto mb-3 text-white/10" size={32} />
                                    <p className="text-[13px] text-white/30 font-medium">No reports submitted yet.</p>
                                </div>
                            )}
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

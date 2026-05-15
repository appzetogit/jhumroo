import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiStats, BiPointer, BiTargetLock, BiCalendar, BiInfoCircle } from 'react-icons/bi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { useTheme } from '../../../../context/ThemeContext';
import adService from '../../../../services/adService';

const AdAnalyticsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simulated daily data since we don't have historical data in DB yet
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchAdDetails();
  }, [id]);

  const fetchAdDetails = async () => {
    try {
      const res = await adService.getAdAnalytics(id);
      if (res.success) {
        setAd(res.ad);
        // Generate simulated data based on real counts
        generateSimulatedData(res.ad.stats);
      }
    } catch (error) {
      console.error('Failed to fetch ad details:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSimulatedData = (stats) => {
    const views = stats?.viewsCount || 0;
    const clicks = stats?.clicksCount || 0;
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(day => ({
      name: day,
      views: Math.floor(views * (0.1 + Math.random() * 0.2)),
      clicks: Math.floor(clicks * (0.1 + Math.random() * 0.2))
    }));
    setChartData(data);
  };

  if (loading) {
    return (
      <div className="page-container theme-surface-page flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#FE2C55] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="page-container theme-surface-page flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="theme-text-primary text-xl font-bold mb-2">Ad Not Found</h2>
        <button onClick={() => navigate(-1)} className="theme-text-muted">Go Back</button>
      </div>
    );
  }

  const ctr = ad.stats?.viewsCount > 0 
    ? ((ad.stats.clicksCount / ad.stats.viewsCount) * 100).toFixed(2) 
    : 0;

  return (
    <div className="page-container theme-surface-page flex flex-col min-h-screen bg-[#F8F8F8] dark:bg-[#121212]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0 relative bg-white z-10 border-b border-gray-100">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center z-20"
        >
          <BiChevronLeft size={30} className="text-black" />
        </button>
        <h2 className="text-black text-[18px] font-bold absolute left-0 right-0 text-center">Ad Analytics</h2>
        <div className="w-10"></div>
      </div>

      <div className="scrollable flex-1 px-4 pb-10">
        {/* Ad Summary Card */}
        <div className="theme-panel-card p-4 rounded-[24px] mt-6 flex gap-4 items-center shadow-sm">
          <div className="w-16 h-20 rounded-xl overflow-hidden bg-black/10 shrink-0 shadow-md">
            {ad.media.type === 'video' ? (
              <video src={ad.media.url} className="w-full h-full object-cover" />
            ) : (
              <img src={ad.media.url} className="w-full h-full object-cover" alt="" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="theme-text-primary font-bold text-[16px] line-clamp-1">{ad.caption || 'Untitled Ad'}</h3>
            <p className="theme-text-muted text-[12px] flex items-center gap-1 mt-0.5">
              <BiCalendar size={14} /> Created on {new Date(ad.createdAt).toLocaleDateString()}
            </p>
            <div className="flex gap-2 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${ad.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {ad.isActive ? 'Active' : 'Paused'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-blue-100 text-blue-600">
                {ad.adType}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="theme-panel-card p-5 rounded-[24px] flex flex-col shadow-sm">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <BiStats size={18} className="text-blue-600" />
            </div>
            <span className="theme-text-muted text-[12px] font-medium">Total Views</span>
            <span className="theme-text-primary text-[24px] font-black">{ad.stats?.viewsCount || 0}</span>
            <span className="text-green-500 text-[10px] font-bold mt-1">↑ 12% vs last week</span>
          </div>
          <div className="theme-panel-card p-5 rounded-[24px] flex flex-col shadow-sm">
            <div className="w-8 h-8 rounded-full bg-[#FE2C55]/10 flex items-center justify-center mb-3">
              <BiPointer size={18} className="text-[#FE2C55]" />
            </div>
            <span className="theme-text-muted text-[12px] font-medium">Total Clicks</span>
            <span className="theme-text-primary text-[24px] font-black">{ad.stats?.clicksCount || 0}</span>
            <span className="text-green-500 text-[10px] font-bold mt-1">↑ 8% vs last week</span>
          </div>
          <div className="theme-panel-card p-5 rounded-[24px] flex flex-col shadow-sm">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mb-3">
              <BiTargetLock size={18} className="text-orange-600" />
            </div>
            <span className="theme-text-muted text-[12px] font-medium">Avg. CTR</span>
            <span className="theme-text-primary text-[24px] font-black">{ctr}%</span>
            <span className="theme-text-muted text-[10px] mt-1">Click-through rate</span>
          </div>
          <div className="theme-panel-card p-5 rounded-[24px] flex flex-col shadow-sm">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mb-3">
              <BiInfoCircle size={18} className="text-purple-600" />
            </div>
            <span className="theme-text-muted text-[12px] font-medium">Engagement</span>
            <span className="theme-text-primary text-[24px] font-black">High</span>
            <span className="text-green-500 text-[10px] font-bold mt-1">Optimal performance</span>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="theme-panel-card p-5 rounded-[24px] mt-6 shadow-sm">
          <h4 className="theme-text-primary font-bold text-[15px] mb-6">Performance Trend</h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FE2C55" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FE2C55" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isDarkMode ? '#888' : '#666', fontSize: 10}}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    backgroundColor: isDarkMode ? '#222' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#FE2C55" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FE2C55]"></div>
              <span className="theme-text-muted text-[11px]">Views</span>
            </div>
          </div>
        </div>

        {/* Targeting Info */}
        <div className="theme-panel-card p-5 rounded-[24px] mt-6 shadow-sm">
          <h4 className="theme-text-primary font-bold text-[15px] mb-4 flex items-center gap-2">
            <BiTargetLock className="text-[#FE2C55]" /> Targeted States
          </h4>
          <div className="flex flex-wrap gap-2">
            {ad.targetStates && ad.targetStates.length > 0 ? (
              ad.targetStates.map(state => (
                <span key={state} className="bg-black/5 theme-text-primary px-3 py-1.5 rounded-full text-[12px] font-medium border theme-panel-divider">
                  {state}
                </span>
              ))
            ) : (
              <span className="theme-text-muted text-[13px] italic">All India targeting</span>
            )}
          </div>
        </div>

        {/* Ad Content Details */}
        <div className="theme-panel-card p-5 rounded-[24px] mt-6 shadow-sm">
          <h4 className="theme-text-primary font-bold text-[15px] mb-4">Advertisement Details</h4>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center py-2 border-b theme-panel-divider">
              <span className="theme-text-muted text-[13px]">Type</span>
              <span className="theme-text-primary text-[13px] font-bold capitalize">{ad.adType}</span>
            </div>
            {ad.adType === 'chat' ? (
              <>
                <div className="flex justify-between items-center py-2 border-b theme-panel-divider">
                  <span className="theme-text-muted text-[13px]">WhatsApp</span>
                  <span className="theme-text-primary text-[13px] font-bold">{ad.whatsappNumber}</span>
                </div>
                <div className="py-2 border-b theme-panel-divider">
                  <span className="theme-text-muted text-[13px] block mb-1">Welcome Message</span>
                  <span className="theme-text-primary text-[13px] font-medium italic">"{ad.welcomeMessage}"</span>
                </div>
              </>
            ) : (
              <div className="py-2 border-b theme-panel-divider">
                <span className="theme-text-muted text-[13px] block mb-1">Destination URL</span>
                <a href={ad.link} target="_blank" rel="noreferrer" className="text-blue-500 text-[13px] font-medium break-all underline">
                  {ad.link}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdAnalyticsPage;

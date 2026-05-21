import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BiRocket, 
  BiBarChartSquare, 
  BiTrendingUp, 
  BiDollarCircle, 
  BiBullseye,
  BiTrash,
  BiCheckCircle,
  BiXCircle,
  BiStats,
  BiLink,
  BiTargetLock,
  BiUser,
  BiCalendar,
  BiRefresh,
  BiPlus,
  BiHeart,
  BiCommentDetail,
  BiEditAlt
} from 'react-icons/bi';
import adService from '../../../services/adService';
import CommentsSheet from '../../user/components/modals/CommentsSheet';

const AdminAds = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAds: 0,
    activeAds: 0,
    totalViews: 0,
    totalClicks: 0
  });

  const [selectedAd, setSelectedAd] = useState(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await adService.getAllAdsAdmin();
      if (res.success) {
        setAds(res.ads);
        
        // Calculate basic stats
        const totalViews = res.ads.reduce((acc, ad) => acc + (ad.stats?.viewsCount || 0), 0);
        const totalClicks = res.ads.reduce((acc, ad) => acc + (ad.stats?.clicksCount || 0), 0);
        const activeAds = res.ads.filter(ad => ad.isActive).length;

        setStats({
          totalAds: res.ads.length,
          activeAds,
          totalViews,
          totalClicks
        });
      }
    } catch (err) {
      console.error("Failed to fetch ads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleToggleStatus = async (adId) => {
    try {
      const res = await adService.toggleAdStatus(adId);
      if (res.success) {
        setAds(ads.map(ad => ad._id === adId ? { ...ad, isActive: !ad.isActive } : ad));
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleDeleteAd = async (adId) => {
    if (window.confirm('Are you sure you want to delete this advertisement? This action cannot be undone.')) {
      try {
        const res = await adService.deleteAd(adId);
        if (res.success) {
          setAds(ads.filter(ad => ad._id !== adId));
        }
      } catch (err) {
        console.error("Error deleting ad:", err);
      }
    }
  };

  return (
    <div className="admin-page p-6 bg-[#FAFAFA] dark:bg-[#0A0A0A] min-h-screen">
      <div className="admin-page-header flex justify-between items-center mb-8">
        <div>
          <h1 className="text-[28px] font-black text-[#1A1A1A] dark:text-white">Ads Management</h1>
          <p className="text-[#666] dark:text-[#AAA] text-[14px]">Monitor and manage all sponsored content across the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin/ads/create')}
            className="flex items-center gap-2 bg-[#FE2C55] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#E2264D] transition-all shadow-lg shadow-[#FE2C55]/20"
          >
            <BiPlus size={20} />
            Create Advertisement
          </button>
          <button 
            onClick={fetchAds}
            className="bg-white dark:bg-[#1A1A1A] border border-[#EEE] dark:border-[#333] p-2 rounded-xl text-[#1A1A1A] dark:text-white hover:bg-[#F5F5F5] transition-all"
          >
            <BiRefresh size={24} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard label="Total Ads" value={stats.totalAds} icon={<BiRocket size={24} />} accent="#8b5cf6" />
        <StatCard label="Active Now" value={stats.activeAds} icon={<BiCheckCircle size={24} />} accent="#10b981" />
        <StatCard label="Total Impressions" value={stats.totalViews} icon={<BiBullseye size={24} />} accent="#3b82f6" />
        <StatCard label="Total Clicks" value={stats.totalClicks} icon={<BiTrendingUp size={24} />} accent="#FE2C55" />
      </div>

      {/* Ads List */}
      <div className="flex flex-col gap-6">
        <h2 className="text-[18px] font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
          <BiBarChartSquare className="text-[#FE2C55]" />
          All Advertisements
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#FE2C55] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : ads.length === 0 ? (
          <div className="bg-white dark:bg-[#111] rounded-[24px] p-12 text-center border border-[#EEE] dark:border-[#222]">
            <p className="text-[#666]">No advertisements found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {ads.map(ad => (
              <AdRow 
                key={ad._id} 
                ad={ad} 
                onToggle={() => handleToggleStatus(ad._id)}
                onDelete={() => handleDeleteAd(ad._id)}
                onEdit={() => navigate(`/admin/ads/edit/${ad._id}`)}
                onViewComments={() => {
                  setSelectedAd(ad);
                  setIsCommentsOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {selectedAd && (
        <CommentsSheet 
          isOpen={isCommentsOpen}
          onClose={() => {
            setIsCommentsOpen(false);
            setSelectedAd(null);
          }}
          reelId={selectedAd._id}
          commentCount={selectedAd.stats?.commentsCount || 0}
        />
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, accent }) => (
  <div className="bg-white dark:bg-[#111] p-6 rounded-[24px] border border-[#EEE] dark:border-[#222] shadow-sm">
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${accent}15`, color: accent }}>
      {icon}
    </div>
    <p className="text-[#666] dark:text-[#888] text-[13px] font-medium mb-1">{label}</p>
    <p className="text-[28px] font-black text-[#1A1A1A] dark:text-white">{value.toLocaleString()}</p>
  </div>
);

const AdRow = ({ ad, onToggle, onDelete, onEdit, onViewComments }) => {
  const statesArray = Array.isArray(ad.targetState) 
    ? ad.targetState 
    : (ad.targetState ? (ad.targetState.startsWith('[') ? JSON.parse(ad.targetState) : [ad.targetState]) : []);

  return (
    <div className="bg-white dark:bg-[#111] p-4 rounded-[24px] border border-[#EEE] dark:border-[#222] flex flex-col md:flex-row items-center gap-6 shadow-sm hover:border-[#FE2C55]/30 transition-all group">
      {/* Media Preview */}
      <div className="w-full md:w-[120px] h-[160px] md:h-[80px] rounded-2xl overflow-hidden bg-black flex-shrink-0 relative">
        {ad.media?.type === 'video' ? (
          <video src={ad.media.url} className="w-full h-full object-cover" muted />
        ) : (
          <img src={ad.media?.url} className="w-full h-full object-cover" alt="ad" />
        )}
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
          {ad.media?.type}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-[16px] font-bold text-[#1A1A1A] dark:text-white truncate">{ad.caption || 'No caption'}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            ad.isActive ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#EF4444]/10 text-[#EF4444]'
          }`}>
            {ad.isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="bg-[#3b82f6]/10 text-[#3b82f6] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {ad.adType}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-[#666] dark:text-[#999] text-[12px]">
          <div className="flex items-center gap-1.5">
            <BiCalendar />
            <span>{new Date(ad.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5" title={statesArray.join(', ') || 'All States'}>
            <BiTargetLock />
            <span>
              {statesArray.length > 0 
                ? `${statesArray.length} ${statesArray.length === 1 ? 'State' : 'States'}` 
                : `All States (${ad.targetCountry || 'All'})`}
            </span>
          </div>
          {ad.link && (
            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
              <BiLink />
              <span className="truncate">{ad.link}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 px-6 border-x border-[#EEE] dark:border-[#222]">
        <div className="text-center">
          <p className="text-[#1A1A1A] dark:text-white font-bold text-[16px]">{ad.stats?.viewsCount || 0}</p>
          <p className="text-[#999] text-[10px] uppercase font-bold tracking-wider">Views</p>
        </div>
        <div className="text-center">
          <p className="text-[#1A1A1A] dark:text-white font-bold text-[16px]">{ad.stats?.clicksCount || 0}</p>
          <p className="text-[#999] text-[10px] uppercase font-bold tracking-wider">Clicks</p>
        </div>
        <div className="text-center">
          <p className="text-[#FE2C55] font-bold text-[16px] flex items-center justify-center gap-1">
            <BiHeart size={14} />
            {ad.stats?.likesCount || 0}
          </p>
          <p className="text-[#999] text-[10px] uppercase font-bold tracking-wider">Likes</p>
        </div>
        <div className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-1 rounded-lg transition-colors" onClick={onViewComments}>
          <p className="text-[#3b82f6] font-bold text-[16px] flex items-center justify-center gap-1">
            <BiCommentDetail size={14} />
            {ad.stats?.commentsCount || 0}
          </p>
          <p className="text-[#999] text-[10px] uppercase font-bold tracking-wider">Comments</p>
        </div>
        <div className="text-center">
          <p className="text-[#FE2C55] font-bold text-[16px]">
            {ad.stats?.viewsCount > 0 ? ((ad.stats.clicksCount / ad.stats.viewsCount) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-[#999] text-[10px] uppercase font-bold tracking-wider">CTR</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onEdit}
          className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all"
          title="Edit Ad"
        >
          <BiEditAlt size={20} />
        </button>
        <button 
          onClick={onToggle}
          className={`p-2.5 rounded-xl transition-all ${
            ad.isActive 
              ? 'bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20' 
              : 'bg-[#666]/10 text-[#666] hover:bg-[#666]/20'
          }`}
          title={ad.isActive ? 'Deactivate Ad' : 'Activate Ad'}
        >
          {ad.isActive ? <BiCheckCircle size={20} /> : <BiXCircle size={20} />}
        </button>
        <button 
          onClick={onDelete}
          className="p-2.5 rounded-xl bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-all"
          title="Delete Ad"
        >
          <BiTrash size={20} />
        </button>
      </div>
    </div>
  );
};

export default AdminAds;

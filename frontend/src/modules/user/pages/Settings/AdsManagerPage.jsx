import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiPlus, BiTrash, BiStats, BiLinkExternal, BiChevronLeft, BiHeart, BiMessageRounded } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import adService from '../../../../services/adService';

const AdsManagerPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const res = await adService.getMyAds();
      if (res.success) {
        setAds(res.ads);
      }
    } catch (error) {
      console.error('Failed to fetch ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (adId) => {
    try {
      const res = await adService.toggleAdStatus(adId);
      if (res.success) {
        setAds(ads.map(ad => ad._id === adId ? { ...ad, isActive: !ad.isActive } : ad));
      }
    } catch (error) {
      console.error('Failed to toggle ad status:', error);
    }
  };

  const handleDeleteAd = async (adId) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) return;
    try {
      const res = await adService.deleteAd(adId);
      if (res.success) {
        setAds(ads.filter(ad => ad._id !== adId));
      }
    } catch (error) {
      console.error('Failed to delete ad:', error);
    }
  };

  return (
    <div className="page-container theme-surface-page flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0 relative">
        <button
          onClick={() => navigate(-1)}
          className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center z-10"
        >
          <BiChevronLeft size={24} className="theme-text-primary" />
        </button>
        <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center">Ads Manager</h2>
        <div className="w-10"></div>
      </div>

      <div className="scrollable flex-1 px-4 pb-20">
        <div className="flex flex-col gap-4 mt-4">
          <div className="theme-panel-card p-6 rounded-[24px] text-center bg-gradient-to-br from-[#FE2C55] to-[#FF7B93] text-white">
            <h3 className="text-[20px] font-bold mb-1">Grow your reach</h3>
            <p className="text-[13px] opacity-90 mb-4">Create sponsored reels to reach users in specific states across India.</p>
            <button
              onClick={() => navigate('/settings/ads-manager/create')}
              className="bg-white text-[#FE2C55] px-6 py-2.5 rounded-full font-bold text-[14px] active:scale-95 transition-transform"
            >
              Create New Ad
            </button>
          </div>

          <h4 className="theme-text-primary text-[15px] font-bold mt-4">Your Advertisements</h4>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#FE2C55] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : ads.length === 0 ? (
            <div className="theme-panel-card p-10 rounded-[24px] text-center">
              <p className="theme-text-muted text-[14px]">No ads created yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {ads.map(ad => (
                <div key={ad._id} className="theme-panel-card p-4 rounded-[20px] shadow-sm flex gap-4">
                  <div className="w-20 h-24 rounded-lg overflow-hidden bg-black/10 shrink-0">
                    {ad.media.type === 'video' ? (
                      <video src={ad.media.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={ad.media.url} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ad.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {ad.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => navigate(`/settings/ads-manager/analytics/${ad._id}`)}
                            className="bg-[#FE2C55]/10 text-[#FE2C55] px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          >
                            Dashboard
                          </button>
                          <button onClick={() => handleToggleStatus(ad._id)} className="theme-text-primary p-1">
                            <span className="text-[11px] font-bold">{ad.isActive ? 'Pause' : 'Resume'}</span>
                          </button>
                          <button onClick={() => handleDeleteAd(ad._id)} className="text-red-500 p-1">
                            <BiTrash size={18} />
                          </button>
                        </div>
                      </div>
                      <p className="theme-text-primary text-[13px] font-medium line-clamp-1 mt-1">{ad.caption || 'No caption'}</p>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <div className="flex items-center gap-1 theme-text-muted">
                        <BiStats size={14} />
                        <span className="text-[11px]">{ad.stats?.viewsCount || 0} views</span>
                      </div>
                      <div className="flex items-center gap-1 theme-text-muted">
                        <BiHeart size={14} />
                        <span className="text-[11px]">{ad.stats?.likesCount || 0} likes</span>
                      </div>
                      <div className="flex items-center gap-1 theme-text-muted">
                        <BiMessageRounded size={14} />
                        <span className="text-[11px]">{ad.stats?.commentsCount || 0} comments</span>
                      </div>
                      <div className="flex items-center gap-1 theme-text-muted">
                        <BiLinkExternal size={14} />
                        <span className="text-[11px]">{ad.stats?.clicksCount || 0} clicks</span>
                      </div>
                    </div>

                    {/* Targeting summary */}
                    {(ad.targetState || (ad.targetDistricts && ad.targetDistricts.length > 0)) && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] theme-text-muted">📍</span>
                        <span className="text-[10px] theme-text-muted truncate">
                          {ad.targetState || 'India'}
                          {ad.targetDistricts && ad.targetDistricts.length > 0
                            ? ` · ${ad.targetDistricts.slice(0, 2).join(', ')}${ad.targetDistricts.length > 2 ? ` +${ad.targetDistricts.length - 2}` : ''}`
                            : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdsManagerPage;

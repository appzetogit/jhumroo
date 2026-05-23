import React, { useState, useEffect } from 'react';
import { BiPlay, BiShow, BiTrash, BiCommentDetail, BiRefresh, BiTime, BiHeart, BiX, BiXCircle, BiBarChart, BiGlobe } from 'react-icons/bi';
import adminContentService from '../../../services/adminContentService';

const AVAILABLE_LOCATIONS = {
  "India": [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry"
  ],
  "United States": [
    "California", "Texas", "New York", "Florida", "Illinois", "Pennsylvania", "Ohio",
    "Georgia", "North Carolina", "Michigan", "Washington", "Arizona", "Massachusetts"
  ],
  "United Kingdom": [
    "England", "Scotland", "Wales", "Northern Ireland"
  ],
  "Canada": [
    "Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba", "Saskatchewan"
  ]
};

const AdminReels = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [selectedReel, setSelectedReel] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Geo-targeting state
  const [showTargetingModal, setShowTargetingModal] = useState(false);
  const [targetLocations, setTargetLocations] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [selectedStates, setSelectedStates] = useState([]);
  const [savingTargeting, setSavingTargeting] = useState(false);
  const [globalTargetingEnabled, setGlobalTargetingEnabled] = useState(false);

  useEffect(() => {
    fetchReels();
    fetchGlobalTargeting();
  }, [page]);

  const fetchGlobalTargeting = async () => {
    try {
      const response = await adminContentService.getGlobalReelsTargeting();
      if (response.success) {
        setTargetLocations(response.targetLocations || []);
        setGlobalTargetingEnabled((response.targetLocations || []).length > 0);
      }
    } catch (error) {
      console.error('Error fetching global targeting:', error);
    }
  };

  const fetchReels = async () => {
    setLoading(true);
    try {
      const response = await adminContentService.getAllReels({ page, limit: 15 });
      if (response.success) {
        setReels(response.reels);
        setPagination(response.pagination || { pages: response.pages, page: response.page });
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (reelId) => {
    setCommentsLoading(true);
    try {
      const response = await adminContentService.getAllComments({ reelId });
      if (response.success) {
        setComments(response.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleDeleteReel = async (reelId) => {
    if (window.confirm('Are you sure you want to delete this reel?')) {
      try {
        await adminContentService.deleteReel(reelId);
        alert('Reel deleted successfully');
        fetchReels();
      } catch (error) {
        alert('Error deleting reel');
      }
    }
  };

  const handleSyncDurations = async () => {
    setSyncing(true);
    try {
      const response = await adminContentService.syncDurations();
      if (response.success) {
        alert(response.message);
        fetchReels();
      }
    } catch (error) {
      alert('Error syncing durations');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenGlobalTargeting = () => {
    setSelectedCountry('India');
    setSelectedStates([]);
    setShowTargetingModal(true);
  };

  const handleToggleState = (stateName) => {
    setSelectedStates(prev => 
      prev.includes(stateName)
        ? prev.filter(s => s !== stateName)
        : [...prev, stateName]
    );
  };

  const handleSelectAllStates = () => {
    const states = AVAILABLE_LOCATIONS[selectedCountry] || [];
    setSelectedStates(states);
  };

  const handleClearAllStates = () => {
    setSelectedStates([]);
  };

  const handleAddRule = () => {
    const existingRuleIndex = targetLocations.findIndex(rule => rule.country === selectedCountry);
    let updatedLocations = [...targetLocations];
    
    if (existingRuleIndex > -1) {
      updatedLocations[existingRuleIndex] = {
        country: selectedCountry,
        states: selectedStates
      };
    } else {
      updatedLocations.push({
        country: selectedCountry,
        states: selectedStates
      });
    }
    
    setTargetLocations(updatedLocations);
    setSelectedStates([]);
  };

  const handleRemoveRule = (countryName) => {
    setTargetLocations(prev => prev.filter(loc => loc.country !== countryName));
  };

  const handleSaveTargeting = async () => {
    setSavingTargeting(true);
    try {
      const response = await adminContentService.updateGlobalReelsTargeting(targetLocations);
      if (response.success) {
        setTargetLocations(response.targetLocations || []);
        setGlobalTargetingEnabled((response.targetLocations || []).length > 0);
        alert('Global reels geo-targeting updated successfully');
        setShowTargetingModal(false);
      }
    } catch (error) {
      console.error('Error saving global targeting:', error);
      alert('Error saving global targeting: ' + (error.response?.data?.message || error.message));
    } finally {
      setSavingTargeting(false);
    }
  };

  const formatDuration = (reel) => {
    // Check multiple potential fields for duration on the reel object
    const seconds = reel?.video?.duration || reel?.duration || reel?.music?.duration || 0;
    
    if (!seconds || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reels Management</h1>
          <p className="admin-page-subtitle">Manage all video content, monitor engagement, and moderate reels.</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="admin-secondary-btn flex items-center gap-2"
            onClick={handleSyncDurations}
            disabled={syncing || loading}
            title="Update all missing reel durations"
          >
            <BiRefresh className={syncing ? 'animate-spin' : ''} />
            Sync Metadata
          </button>
          <button 
            className="admin-secondary-btn flex items-center gap-2"
            onClick={handleOpenGlobalTargeting}
            style={{ 
              borderColor: globalTargetingEnabled ? '#fe2c55' : 'rgba(254, 44, 85, 0.15)',
              color: globalTargetingEnabled ? '#fe2c55' : 'inherit'
            }}
            title="Configure global reels country/state targeting"
          >
            <BiGlobe className={globalTargetingEnabled ? 'text-[var(--admin-primary)]' : ''} />
            Global Geo-Targeting
          </button>
          <button 
            className="admin-secondary-btn flex items-center gap-2"
            onClick={fetchReels}
            disabled={loading}
          >
            <BiRefresh className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="p-12 text-center">
            <div className="admin-spinner" />
            <p className="mt-4 text-gray-500">Loading reels...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BiPlay size={48} className="mx-auto mb-4 opacity-20" />
            <p>No reels found</p>
          </div>
        ) : (
          <div className="admin-table">
            <div className="admin-table-head admin-table-head--reels">
              <span>Reel</span>
              <span>Creator</span>
              <span>Engagement</span>
              <span>Duration</span>
              <span>Created At</span>
              <span className="text-right">Actions</span>
            </div>
            
            {reels.map((reel) => {
              const { date, time } = formatDate(reel.createdAt);
              return (
                <div key={reel._id} className="admin-table-row admin-table-row--reels">
                  {/* Reel Preview */}
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-20 rounded-lg bg-black overflow-hidden relative cursor-pointer group"
                      onClick={() => {
                        setSelectedReel(reel);
                        setShowVideoModal(true);
                      }}
                    >
                      {reel.video?.thumbnail && !reel.video.thumbnail.includes('1618005182384') ? (
                        <img 
                          src={reel.video.thumbnail} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          alt="thumbnail"
                        />
                      ) : (
                        <video 
                          src={reel.video?.url} 
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <BiPlay size={24} className="text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-gray-500 line-clamp-2">{reel.caption || 'No caption'}</p>
                    </div>
                  </div>

                  {/* Creator */}
                  <div className="admin-user-cell">
                    <div className="admin-avatar">
                      <img 
                        src={reel.user?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reel.user?.username}`} 
                        alt="" 
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="admin-user-name truncate">@{reel.user?.username}</p>
                      <p className="admin-user-handle truncate">{reel.user?.fullName}</p>
                    </div>
                  </div>

                  {/* Engagement */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-gray-600 font-bold text-[12px]" title="Total Views">
                      <BiShow size={14} />
                      {reel.stats?.viewsCount || 0}
                    </div>
                    <div className="flex items-center gap-1.5 text-pink-600 font-bold text-[12px]" title="Likes">
                      <BiHeart size={14} />
                      {reel.stats?.likesCount || 0}
                    </div>
                    <div 
                      className="flex items-center gap-1.5 text-blue-600 font-bold text-[12px] cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors w-fit"
                      title="View Comments"
                      onClick={() => {
                        setSelectedReel(reel);
                        fetchComments(reel._id);
                        setShowCommentsModal(true);
                      }}
                    >
                      <BiCommentDetail size={14} />
                      {reel.stats?.commentsCount || 0}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 text-gray-600 font-medium text-[13px]">
                    <BiTime size={16} />
                    {formatDuration(reel)}
                  </div>

                  {/* Created At */}
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] text-admin-strong">{date}</span>
                    <span className="text-[11px] text-admin-muted">{time}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      className="admin-icon-btn" 
                      style={{ color: '#ef4444' }}
                      title="Delete Reel"
                      onClick={() => handleDeleteReel(reel._id)}
                    >
                      <BiTrash size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          <button 
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${page === 1 ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-admin-primary border border-admin-border hover:bg-admin-primary/5'}`}
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <div className="flex gap-2">
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                  page === i + 1 ? 'bg-admin-primary text-white shadow-lg shadow-admin-primary/20' : 'bg-white text-gray-600 border border-admin-border hover:bg-gray-50'
                }`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button 
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${page === pagination.pages ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-admin-primary border border-admin-border hover:bg-admin-primary/5'}`}
            onClick={() => page < pagination.pages && setPage(page + 1)}
            disabled={page === pagination.pages}
          >
            Next
          </button>
        </div>
      )}

      {/* Video Preview Modal */}
      {showVideoModal && selectedReel && (
        <div className="admin-modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="admin-modal !p-0 !w-[320px] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-admin-strong text-[14px]">Reel Preview</h3>
                <p className="text-[10px] text-admin-muted">by @{selectedReel.user?.username}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleDeleteReel(selectedReel._id)} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Delete Reel"
                >
                  <BiTrash size={18} />
                </button>
                <button 
                  onClick={() => setShowVideoModal(false)} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  title="Close"
                >
                  <BiX size={24} />
                </button>
              </div>
            </div>
            <div className="aspect-[9/16] bg-black">
              <video src={selectedReel.video?.url} controls autoPlay className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && selectedReel && (
        <div className="admin-modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="admin-modal !p-0 !w-[450px] max-h-[80vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0">
              <div>
                <h3 className="font-bold text-admin-strong">Reel Comments</h3>
                <p className="text-[11px] text-admin-muted">Total {selectedReel.stats?.commentsCount || 0} comments</p>
              </div>
              <button 
                onClick={() => setShowCommentsModal(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <BiX size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {commentsLoading ? (
                <div className="text-center py-8 text-gray-500 text-sm">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No comments on this reel.</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img src={comment.user?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user?.username}`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[12px]">@{comment.user?.username}</span>
                        <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[13px] text-gray-700 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Geo-Targeting Modal */}
      {showTargetingModal && (
        <div className="admin-modal-overlay" onClick={() => setShowTargetingModal(false)}>
          <div className="admin-modal geo-target-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-pink-50 text-[var(--admin-primary)]">
                  <BiGlobe size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-admin-strong text-[15px] flex items-center gap-2">Global Geo-Location Targeting</h3>
                  <p className="text-[11px] text-admin-muted">Restrict visibility globally for all reels in the app</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTargetingModal(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <BiX size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Active Rules List */}
              <div className="geo-rules-section">
                <h4 className="font-bold text-[13px] text-admin-strong mb-3 flex items-center gap-1.5">
                  Targeted Locations ({targetLocations.length})
                </h4>
                
                {targetLocations.length === 0 ? (
                  <div className="text-center py-4 bg-white/60 backdrop-blur-sm border border-dashed border-pink-200/50 rounded-lg">
                    <p className="text-[12px] text-gray-500 font-medium">🌍 Public Reels (Global)</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">No geo-targeting rules configured. All reels are visible globally to all users.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {targetLocations.map((rule, idx) => (
                      <div key={idx} className="geo-rule-card">
                        <div className="flex-1 pr-4">
                          <p className="font-bold text-[12px] text-admin-strong mb-1 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block"></span>
                            {rule.country}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(!rule.states || rule.states.length === 0) ? (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">
                                Entire Country (All States)
                              </span>
                            ) : (
                              rule.states.map((s, sIdx) => (
                                <span key={sIdx} className="px-2 py-0.5 bg-pink-50 text-[var(--admin-primary)] border border-pink-100 rounded text-[10px] font-medium">
                                  {s}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveRule(rule.country)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                          title="Remove Rule"
                        >
                          <BiXCircle size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Rule Form */}
              <div className="space-y-4 border border-gray-150 rounded-xl p-4 bg-white">
                <h4 className="font-bold text-[13px] text-admin-strong">Add Location Rule</h4>
                
                {/* Country Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Select Country</label>
                  <select 
                    className="geo-select" 
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setSelectedStates([]);
                    }}
                  >
                    {Object.keys(AVAILABLE_LOCATIONS).map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                {/* State Select */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Select States</label>
                    <div className="flex gap-2">
                      <button type="button" className="btn-text" onClick={handleSelectAllStates}>Select All</button>
                      <span className="text-[10px] text-gray-300">|</span>
                      <button type="button" className="btn-text" onClick={handleClearAllStates}>Clear All</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-admin-muted mb-1">
                    * If you don't select any states, the reel is targeted to the entire country.
                  </p>
                  
                  <div className="state-pills-container">
                    {(AVAILABLE_LOCATIONS[selectedCountry] || []).map((state) => {
                      const isSelected = selectedStates.includes(state);
                      return (
                        <div 
                          key={state}
                          className={`state-pill ${isSelected ? 'selected' : 'unselected'}`}
                          onClick={() => handleToggleState(state)}
                        >
                          {state}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Rule Button */}
                <button 
                  type="button"
                  onClick={handleAddRule}
                  className="w-full py-2 bg-gray-900 hover:bg-black text-white text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  Save Location Rule
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 sticky bottom-0">
              <button 
                onClick={() => setShowTargetingModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all"
                disabled={savingTargeting}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTargeting}
                className="px-5 py-2 bg-[var(--admin-primary)] hover:bg-[var(--admin-secondary)] text-white rounded-lg text-sm font-bold shadow-lg shadow-pink-500/10 flex items-center gap-2 transition-all"
                disabled={savingTargeting}
              >
                {savingTargeting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Apply Geo-Targeting'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-table-head--reels, .admin-table-row--reels {
          grid-template-columns: 2fr 1.5fr 1fr 0.8fr 1.2fr 0.8fr;
          align-items: center;
          gap: 20px;
        }
        .admin-table-head {
          padding: 12px 0;
          border-bottom: 2px solid var(--admin-border);
          margin-bottom: 8px;
        }
        .admin-table-row--reels {
          padding: 16px 0;
          transition: all 0.2s;
        }
        .admin-table-row--reels:hover {
          background: rgba(254, 44, 85, 0.02);
        }
        .admin-user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .admin-avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid var(--admin-border);
        }
        .admin-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .admin-user-name {
          font-weight: 700;
          font-size: 13px;
          color: var(--admin-strong);
        }
        .admin-user-handle {
          font-size: 11px;
          color: var(--admin-muted);
        }
        /* Geo-targeting Modal Custom Styles */
        .geo-target-modal {
          width: 600px !important;
          max-width: 90vw;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
        }
        .geo-rules-section {
          background: #fdf2f4;
          border: 1px solid rgba(254, 44, 85, 0.1);
          border-radius: 12px;
          padding: 16px;
        }
        .geo-rule-card {
          background: white;
          border: 1px solid rgba(254, 44, 85, 0.08);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .geo-rule-card:hover {
          box-shadow: 0 4px 8px rgba(254, 44, 85, 0.05);
          border-color: rgba(254, 44, 85, 0.2);
        }
        .state-pills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-height: 160px;
          overflow-y: auto;
          padding: 8px;
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 8px;
        }
        .state-pill {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
        }
        .state-pill.selected {
          background: var(--admin-primary);
          color: white;
          border-color: var(--admin-primary);
          box-shadow: 0 2px 6px rgba(254, 44, 85, 0.3);
          transform: translateY(-1px);
        }
        .state-pill.unselected {
          background: white;
          color: #4b5563;
          border: 1px solid #e5e7eb;
        }
        .state-pill.unselected:hover {
          border-color: var(--admin-primary);
          background: rgba(254, 44, 85, 0.04);
          color: var(--admin-primary);
          transform: translateY(-1px);
        }
        .geo-select {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .geo-select:focus {
          border-color: var(--admin-primary);
        }
        .active-pill {
          display: inline-block;
          padding: 2px 8px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 11px;
          color: #374151;
          margin-right: 4px;
          margin-bottom: 4px;
        }
        .btn-text {
          font-size: 11px;
          font-weight: 700;
          color: var(--admin-primary);
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          text-decoration: underline;
        }
        .btn-text:hover {
          color: var(--admin-secondary);
        }
      `}} />
    </div>
  );
};

export default AdminReels;

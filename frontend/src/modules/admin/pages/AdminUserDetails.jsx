import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BiArrowBack, BiCheckCircle, BiBlock, BiPlay, BiHeart, BiComment, BiUser, BiX } from 'react-icons/bi';
import adminUserService from '../../../services/adminUserService';

const AdminUserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedReel, setSelectedReel] = useState(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, reelsRes] = await Promise.all([
        adminUserService.getUserById(userId),
        adminUserService.getUserReels(userId)
      ]);

      if (userRes.success) setUser(userRes.user);
      if (reelsRes.success) setReels(reelsRes.reels);
    } catch (err) {
      setError('Failed to fetch user details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async () => {
    if (!user) return;
    const isSuspending = !user.isBanned;
    let reason = '';
    
    if (isSuspending) {
      reason = window.prompt('Enter reason for suspension:', 'Violation of community guidelines');
      if (reason === null) return;
    }

    try {
      const response = await adminUserService.banUser(user._id, { reason });
      if (response.success) {
        setUser(response.user);
      }
    } catch (err) {
      alert('Failed to update suspension status');
    }
  };

  if (loading) {
    return (
      <div className="admin-page flex items-center justify-center min-h-[400px]">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="admin-page">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-admin-muted mb-4">
          <BiArrowBack /> Back to Users
        </button>
        <div className="admin-card p-8 text-center text-red-500">
          {error || 'User not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-admin-muted hover:text-admin-primary transition-colors font-medium"
        >
          <BiArrowBack /> Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handleToggleBan}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              user.isBanned 
                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' 
                : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
            }`}
          >
            <BiBlock />
            {user.isBanned ? 'Unsuspend User' : 'Suspend User'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="admin-card p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-admin-border shadow-lg">
                <img 
                  src={user.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-bold text-admin-strong flex items-center gap-1">
                {user.fullName || 'No Name'}
                {user.isVerified && <BiCheckCircle className="text-blue-500" />}
              </h2>
              <p className="text-admin-muted text-sm font-medium">@{user.username}</p>
              
              <div className="mt-6 w-full grid grid-cols-3 gap-2 py-4 border-y border-admin-border">
                <div className="text-center">
                  <p className="text-lg font-bold text-admin-strong">{user.stats?.reelsCount || 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-admin-muted font-bold">Reels</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-admin-strong">{user.stats?.followersCount || 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-admin-muted font-bold">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-admin-strong">{user.stats?.likesCount || 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-admin-muted font-bold">Likes</p>
                </div>
              </div>

              <div className="mt-6 w-full space-y-4 text-left">
                <div>
                  <label className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Bio</label>
                  <p className="text-sm text-admin-strong mt-1 leading-relaxed">
                    {user.bio || <span className="italic text-gray-300">No bio provided</span>}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${user.isBanned ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span className="text-sm font-medium">{user.isBanned ? 'Suspended' : 'Active'}</span>
                  </div>
                </div>
                {user.isBanned && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Suspension Reason</label>
                    <p className="text-xs text-red-600 mt-1">{user.banReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Content */}
        <div className="lg:col-span-3">
          <div className="admin-card overflow-hidden">
            <div className="p-4 border-b border-admin-border flex items-center justify-between bg-white/50">
              <h3 className="font-bold text-admin-strong flex items-center gap-2">
                <BiPlay size={20} className="text-admin-primary" />
                User Reels ({reels.length})
              </h3>
            </div>
            
            {reels.length === 0 ? (
              <div className="p-12 text-center text-admin-muted">
                <BiPlay size={48} className="mx-auto mb-2 opacity-20" />
                <p>No reels uploaded by this user</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
                {reels.map((reel) => (
                  <div 
                    key={reel._id} 
                    className="group relative aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-admin-border"
                    onClick={() => setSelectedReel(reel)}
                  >
                    <img 
                      src={reel.video?.thumbnail || reel.video?.url} 
                      alt="" 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold transform translate-y-1 group-hover:translate-y-0 transition-all">
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-0.5"><BiPlay size={12} /> {reel.stats?.viewsCount || 0}</span>
                        <span className="flex items-center gap-0.5"><BiHeart size={10} /> {reel.stats?.likesCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {selectedReel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 animate-fade-in" onClick={() => setSelectedReel(null)}>
          <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <video 
              src={selectedReel.video?.url} 
              className="w-full h-full object-contain"
              controls
              autoPlay
            />
            <button 
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-md"
              onClick={() => setSelectedReel(null)}
            >
              <BiX size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetails;

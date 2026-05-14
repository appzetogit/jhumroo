import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiArrowBack, BiCheck, BiX } from 'react-icons/bi';
import followService from '../../../../services/followService';

const RequestCard = ({ user, onAccept, onReject }) => {
  const navigate = useNavigate();
  const handleOpenProfile = () => navigate(`/user/${user.username}`);

  return (
    <div className="flex items-center px-4 py-3 gap-3 border-b border-white/5 bg-white/5 mb-[1px]">
      <div
        className="w-12 h-12 rounded-full overflow-hidden shrink-0 cursor-pointer border border-white/10"
        onClick={handleOpenProfile}
      >
        <img 
          src={user.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
          alt={user.username} 
          className="w-full h-full object-cover" 
        />
      </div>
      <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={handleOpenProfile}>
        <p className="text-white font-bold text-[14px] truncate">{user.username}</p>
        <p className="text-white/40 text-[12px] truncate">{user.fullName || 'Requested to follow you'}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAccept(user._id)}
          className="w-9 h-9 rounded-full bg-[#FE2C55] text-white flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          title="Accept"
        >
          <BiCheck size={24} />
        </button>
        <button
          onClick={() => onReject(user._id)}
          className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95 transition-transform border border-white/10"
          title="Reject"
        >
          <BiX size={24} />
        </button>
      </div>
    </div>
  );
};

const FollowRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await followService.getFollowRequests();
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (error) {
      console.error('Failed to fetch follow requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (userId) => {
    try {
      const res = await followService.acceptFollowRequest(userId);
      if (res.success) {
        setRequests(prev => prev.filter(r => r._id !== userId));
      }
    } catch (error) {
      console.error('Failed to accept follow request:', error);
    }
  };

  const handleReject = async (userId) => {
    try {
      const res = await followService.rejectFollowRequest(userId);
      if (res.success) {
        setRequests(prev => prev.filter(r => r._id !== userId));
      }
    } catch (error) {
      console.error('Failed to reject follow request:', error);
    }
  };

  return (
    <div className="page-container theme-surface-page flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0 bg-black/20">
        <button onClick={() => navigate(-1)} className="text-white active:opacity-60">
          <BiArrowBack size={24} />
        </button>
        <h2 className="text-[16px] font-bold text-white">Follow requests</h2>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="opacity-20">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-white font-bold text-[17px] mb-2">No follow requests</p>
            <p className="text-white/40 text-[14px]">When people ask to follow you, you'll see their requests here.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="px-4 py-3 text-[12px] font-bold text-white/40 uppercase tracking-wider bg-black/10">
              Pending requests ({requests.length})
            </div>
            {requests.map(user => (
              <RequestCard 
                key={user._id} 
                user={user} 
                onAccept={handleAccept} 
                onReject={handleReject} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowRequestsPage;

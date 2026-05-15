import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';
import followService from '../../../../services/followService';

const RequestCard = ({ user, onAccept, onReject }) => {
  const navigate = useNavigate();
  const handleOpenProfile = () => navigate(`/user/${user.username}`);

  return (
    <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100 bg-white">
      <div
        className="w-14 h-14 rounded-full overflow-hidden shrink-0 cursor-pointer border border-gray-100"
        onClick={handleOpenProfile}
      >
        <img 
          src={user.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
          alt={user.username} 
          className="w-full h-full object-cover" 
        />
      </div>
      <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={handleOpenProfile}>
        <p className="text-gray-900 font-bold text-[14px] truncate">{user.username}</p>
        <p className="text-gray-400 text-[12px] truncate">{user.fullName || 'Requested to follow you'}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAccept(user._id)}
          className="px-4 py-[7px] min-w-[85px] rounded-[8px] bg-[#4258ff] text-white text-[14px] font-bold active:scale-95 transition-all"
        >
          Confirm
        </button>
        <button
          onClick={() => onReject(user._id)}
          className="px-4 py-[7px] min-w-[85px] rounded-[8px] bg-[#f0f2f5] text-gray-900 text-[14px] font-bold active:scale-95 transition-all"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

const PendingRequestsPage = () => {
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
    <div className="page-container bg-white flex flex-col min-h-screen text-black">
      {/* Header */}
      <div className="flex items-center px-4 py-4 shrink-0 bg-white sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-black active:opacity-60 mr-8">
          <BiArrowBack size={26} />
        </button>
        <h2 className="text-[20px] font-bold text-black">Follow requests</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0095F6]"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
            <p className="text-gray-400 text-[14px]">No pending follow requests.</p>
          </div>
        ) : (
          <div className="flex flex-col">
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

export default PendingRequestsPage;

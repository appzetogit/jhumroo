import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContent } from '../../../../hooks/useAppContent';
import { BiChevronRight, BiUserPlus, BiCheck, BiX } from 'react-icons/bi';
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

const FindFriends = ({ contacts, onDismiss }) => (
  <div className="px-4 pb-4">
    <div className="flex items-center gap-1 mb-3">
      <span className="text-[13px] font-semibold text-white">Find friends</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
    </div>
    <div className="space-y-3">
      {contacts.map(c => (
        <div key={c.id} className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/10 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`} alt="" className="w-full h-full object-cover rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate">{c.username}</p>
            <p className="text-[11px] text-white/40">{c.sub}</p>
          </div>
          <button className="px-4 py-1.5 bg-[#FE2C55] text-white text-[12px] font-bold rounded-sm shadow-sm active:brightness-90">Follow</button>
          <button onClick={() => onDismiss(c.id)} className="text-white/30 active:opacity-60 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  </div>
);

const NewFollowersPage = () => {
  const navigate = useNavigate();
  const { config } = useAppContent();
  const [contacts, setContacts] = useState(config?.inbox?.newFollowersContacts || []);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
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
    <div className="page-container theme-surface-page flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
        <button onClick={() => navigate(-1)} className="text-white active:opacity-60 w-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-[15px] font-bold text-white">New followers</h2>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Follow Requests List */}
        {requests.length > 0 && (
          <div className="flex flex-col mb-4">
            <div className="px-4 py-3 text-[12px] font-bold text-white/40 uppercase tracking-wider bg-black/10">
              Follow Requests ({requests.length})
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

        {/* Empty State (Only if no requests and no followers - though followers list is missing here, we'll keep it for now) */}
        {!loading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="text-[16px] font-bold text-white mb-2">New followers</h3>
            <p className="text-[13px] text-white/40 leading-relaxed">
              When someone new follows you, you'll see it here
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-white/10 mx-4 mb-4" />

        {/* Find Friends */}
        <FindFriends
          contacts={contacts}
          onDismiss={(id) => setContacts(prev => prev.filter(c => c.id !== id))}
        />
      </div>
    </div>
  );
};

export default NewFollowersPage;

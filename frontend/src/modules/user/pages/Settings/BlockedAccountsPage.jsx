import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiSearch } from 'react-icons/bi';
import userService from '../../../../services/userService';

const BlockedAccountsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [blockedAccounts, setBlockedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmUnblock, setShowConfirmUnblock] = useState(false);
  const [userToUnblock, setUserToUnblock] = useState(null);

  useEffect(() => {
    fetchBlockedAccounts();
  }, []);

  const fetchBlockedAccounts = async () => {
    try {
      const res = await userService.getBlockedUsers();
      if (res.success) {
        setBlockedAccounts(res.users);
      }
    } catch (err) {
      console.error('Failed to fetch blocked accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return blockedAccounts;
    }

    return blockedAccounts.filter((account) =>
      [account.fullName || '', account.username || ''].join(' ').toLowerCase().includes(query),
    );
  }, [blockedAccounts, searchQuery]);

  const handleUnblockClick = (userId, username) => {
    setUserToUnblock({ id: userId, username });
    setShowConfirmUnblock(true);
  };

  const handleUnblockAction = async (userId) => {
    try {
      const res = await userService.blockUser(userId);
      if (res.success) {
        setBlockedAccounts((prev) => prev.filter((account) => account._id !== userId));
      }
    } catch (err) {
      console.error('Failed to unblock user:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-container pb-0 theme-surface-page flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#FE2C55] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-4 pt-6 pb-6 shrink-0 relative border-b border-white/5">
        <div
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
          onClick={() => navigate(-1)}
        >
          <BiChevronLeft size={24} className="text-white" />
        </div>
        <h2 className="text-[17px] font-bold text-white absolute left-0 right-0 text-center tracking-wide">
          Blocked accounts
        </h2>
        <div className="w-10" />
      </div>

      <div className="scrollable flex-1 px-4 pb-24 pt-6">
        <p className="text-[13px] leading-6 text-white/45 mb-4 px-1">
          Blocked accounts cannot find your profile, view your content, or message you.
        </p>

        <div className="rounded-[18px] bg-white/6 border border-white/10 px-4 py-3 flex items-center gap-3 mb-5">
          <BiSearch size={18} className="text-white/45" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search blocked accounts"
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
          />
        </div>

        {filteredAccounts.length > 0 ? (
          <div className="bg-[#242424] rounded-[18px] overflow-hidden shadow-sm">
            {filteredAccounts.map((account, index) => {
              const isLast = index === filteredAccounts.length - 1;

              return (
                <div
                  key={account._id || account.username}
                  className={`flex items-center gap-3 p-4 ${!isLast ? 'border-b border-white border-opacity-[0.05]' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10 bg-black/20">
                    <img
                      src={account.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${account.username}`}
                      alt={account.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">{account.fullName || account.username}</p>
                    <p className="text-[12px] text-white/45 truncate">@{account.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblockClick(account._id, account.username)}
                    className="px-4 py-2 rounded-full border border-white/15 text-[12px] font-semibold text-white active:bg-white/5 transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#242424] rounded-[18px] px-5 py-12 text-center shadow-sm">
            <p className="text-[15px] font-semibold text-white">No blocked accounts found</p>
            <p className="text-[12px] text-white/40 mt-2">
              Try another search or unblock someone to update this list.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal Popup */}
      {showConfirmUnblock && userToUnblock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => {
              setShowConfirmUnblock(false);
              setUserToUnblock(null);
            }} 
          />
          {/* Dialog Card */}
          <div className="relative w-full max-w-[320px] bg-[#1e1e1e] border border-white/10 rounded-[28px] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-[17px] font-bold text-white mb-2">Unblock Account?</h3>
            <p className="text-[13px] text-white/60 leading-relaxed mb-6">
              Are you sure you want to unblock @{userToUnblock.username}? They will be able to search for your profile, view your content, and message you.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  const targetId = userToUnblock.id;
                  setShowConfirmUnblock(false);
                  setUserToUnblock(null);
                  await handleUnblockAction(targetId);
                }}
                className="w-full py-3 rounded-full bg-[#FE2C55] text-[14px] font-bold text-white active:scale-[0.98] transition-transform"
              >
                Unblock
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmUnblock(false);
                  setUserToUnblock(null);
                }}
                className="w-full py-3 rounded-full bg-white/5 border border-white/10 text-[14px] font-semibold text-white hover:bg-white/10 active:scale-[0.98] transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockedAccountsPage;

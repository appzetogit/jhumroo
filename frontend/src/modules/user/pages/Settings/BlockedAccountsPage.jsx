import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiSearch } from 'react-icons/bi';
import { getBlockedAccounts, unblockAccount } from '../../../../utils/privacySettings';

const BlockedAccountsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [blockedAccounts, setBlockedAccounts] = useState(() => getBlockedAccounts());

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return blockedAccounts;
    }

    return blockedAccounts.filter((account) =>
      [account.displayName, account.username, account.subtitle].join(' ').toLowerCase().includes(query),
    );
  }, [blockedAccounts, searchQuery]);

  const handleUnblock = (username) => {
    const updatedSettings = unblockAccount(username);
    setBlockedAccounts(updatedSettings.blockedAccounts);
  };

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
                  key={account.username}
                  className={`flex items-center gap-3 p-4 ${!isLast ? 'border-b border-white border-opacity-[0.05]' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10 bg-black/20">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account.username}`}
                      alt={account.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">{account.displayName}</p>
                    <p className="text-[12px] text-white/45 truncate">@{account.username}</p>
                    <p className="text-[12px] text-white/35 truncate mt-1">{account.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblock(account.username)}
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
    </div>
  );
};

export default BlockedAccountsPage;

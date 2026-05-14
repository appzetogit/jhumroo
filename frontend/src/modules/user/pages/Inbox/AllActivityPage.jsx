import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContent } from '../../../../hooks/useAppContent';

const ActivityItem = ({ item }) => {
  const [localFollowing, setLocalFollowing] = useState(false);

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-white/10 overflow-hidden shrink-0 border border-white/5">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user}`} alt={item.user} className="w-full h-full object-cover rounded-full" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-white leading-snug">
          <span className="font-bold text-white">{item.user}</span>
          {' '}<span className="text-white/80">{item.action}</span>{' '}
          <span className="text-white/40 text-[11px] font-medium">{item.time}</span>
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          {item.type === 'contact' && (
            <button
              onClick={() => setLocalFollowing(f => !f)}
              className={`px-5 py-1.5 rounded-sm text-[12px] font-bold transition-all active:scale-95 ${
                localFollowing ? 'border border-white/20 text-white/60 bg-transparent' : 'bg-[#FE2C55] text-white shadow-sm'
              }`}
            >
              {localFollowing ? 'Following' : 'Follow'}
            </button>
          )}
          {item.type === 'view' && (
            <>
              <button className="px-4 py-1.5 border border-white/35 rounded-sm text-[12px] font-bold text-white active:bg-white/5 bg-transparent">
                Ignore
              </button>
              <button
                onClick={() => setLocalFollowing(f => !f)}
                className={`px-4 py-1.5 rounded-sm text-[12px] font-bold transition-all active:scale-95 ${
                  localFollowing ? 'border border-white/20 text-white/60 bg-transparent' : 'bg-[#FE2C55] text-white shadow-sm'
                }`}
              >
                {localFollowing ? 'Following' : 'Follow back'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Video thumbnail (for view items) */}
      {item.type === 'view' && (
        <div className="w-10 h-14 rounded bg-white/10 overflow-hidden shrink-0 border border-white/5">
          <img src={`https://picsum.photos/40/56?random=${item.id}`} alt="thumb" className="w-full h-full object-cover opacity-90" />
        </div>
      )}
    </div>
  );
};

const AllActivityPage = () => {
  const navigate = useNavigate();
  const { config } = useAppContent();
  const mockActivities = config?.inbox?.activityGroups || [];

  return (
    <div className="page-container theme-surface-page flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
        <button onClick={() => navigate(-1)} className="text-white active:opacity-60 w-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        {/* "All activity ▼" dropdown title */}
        <button className="flex items-center gap-1 text-[15px] font-bold text-white active:opacity-70">
          All activity
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div className="w-8" />
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {mockActivities.map(section => (
          <div key={section.group}>
            {/* Group header */}
            <div className="px-4 pt-4 pb-1">
              <span className="text-[12px] font-semibold text-white/40">{section.group}</span>
            </div>
            {section.items.map(item => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
        ))}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default AllActivityPage;

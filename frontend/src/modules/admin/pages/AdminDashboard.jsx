import React from 'react';
import { BiTrendingUp, BiUser, BiVideo, BiShieldQuarter } from 'react-icons/bi';
import { useAdminConfig } from '../../../context/AdminConfigContext';

const StatCard = ({ label, value, icon, accent }) => (
  <div className="admin-card admin-stat-card">
    <div className="admin-stat-icon" style={{ color: accent }}>
      {icon}
    </div>
    <div>
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { config } = useAdminConfig();
  const reels = config?.reels?.library || [];
  const profiles = config?.users?.profiles || {};
  const reports = config?.moderation?.reports || [];
  const sections = config?.reels?.sections || [];

  const openReports = reports.filter((report) => report.status !== 'Resolved').length;
  const totalUsers = Object.keys(profiles).length;
  const trendingSection = sections.find((section) => section.id === 'trending');

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time pulse of your Jhumroo ecosystem.</p>
        </div>
        <button type="button" className="admin-primary-btn">
          Generate report
        </button>
      </div>

      <div className="admin-grid">
        <StatCard
          label="Total Reels"
          value={reels.length}
          icon={<BiVideo size={22} />}
          accent="var(--admin-primary)"
        />
        <StatCard
          label="Active Users"
          value={totalUsers}
          icon={<BiUser size={22} />}
          accent="var(--admin-secondary)"
        />
        <StatCard
          label="Open Reports"
          value={openReports}
          icon={<BiShieldQuarter size={22} />}
          accent="var(--admin-accent)"
        />
        <StatCard
          label="Trending Queue"
          value={trendingSection?.reelIds?.length || 0}
          icon={<BiTrendingUp size={22} />}
          accent="var(--admin-accent)"
        />
      </div>

      <div className="admin-columns">
        <div className="admin-card admin-column">
          <div className="admin-card-header">
            <h2>Latest Activity</h2>
            <span className="admin-chip">Updated just now</span>
          </div>
          <div className="admin-activity-list">
            {(config?.inbox?.activityGroups || []).slice(0, 2).map((group) => (
              <div key={group.group} className="admin-activity-group">
                <p className="admin-section-label">{group.group}</p>
                {group.items.map((item) => (
                  <div key={item.id} className="admin-activity-item">
                    <span className="admin-activity-user">@{item.user}</span>
                    <span className="admin-activity-text">{item.action}</span>
                    <span className="admin-activity-time">{item.time}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card admin-column">
          <div className="admin-card-header">
            <h2>Top Reels</h2>
            <span className="admin-chip">By engagement</span>
          </div>
          <div className="admin-table">
            <div className="admin-table-head">
              <span>Creator</span>
              <span>Caption</span>
              <span>Likes</span>
            </div>
            {reels.slice(0, 5).map((reel) => (
              <div key={reel.id} className="admin-table-row">
                <span>@{reel.username}</span>
                <span className="admin-truncate">{reel.caption}</span>
                <span>{reel.likes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

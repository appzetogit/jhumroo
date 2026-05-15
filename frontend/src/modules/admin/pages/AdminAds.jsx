import React from 'react';
import { 
  BiRocket, 
  BiPlayCircle, 
  BiImage, 
  BiStar, 
  BiBarChartSquare, 
  BiTrendingUp, 
  BiDollarCircle, 
  BiBullseye,
  BiPlus
} from 'react-icons/bi';

const AdTypeCard = ({ title, icon, color, activeCount }) => (
  <div className="admin-card ad-type-card">
    <div className="ad-icon-box" style={{ backgroundColor: `${color}15`, color: color }}>
      {icon}
    </div>
    <div className="ad-type-info">
      <h3>{title}</h3>
      <div className="ad-active-badge">
        <span className="dot" style={{ backgroundColor: color }}></span>
        {activeCount} Active
      </div>
    </div>
  </div>
);

const AdStatCard = ({ label, value, icon, accent, trend }) => (
  <div className="admin-card ad-stat-card">
    <div className="ad-stat-header">
      <div className="ad-stat-icon" style={{ color: accent }}>{icon}</div>
      <span className={`ad-trend ${trend.startsWith('+') ? 'up' : 'down'}`}>{trend}</span>
    </div>
    <div className="ad-stat-body">
      <p className="ad-stat-label">{label}</p>
      <p className="ad-stat-value">{value}</p>
    </div>
  </div>
);

const AdminAds = () => {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Ads Management</h1>
          <p>Optimize monetization and campaign performance.</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="admin-secondary-btn">Download Report</button>
          <button type="button" className="admin-primary-btn">
            <BiPlus size={20} /> Create Campaign
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="admin-grid">
        <AdStatCard 
          label="Ad Revenue" 
          value="$12,450.00" 
          icon={<BiDollarCircle size={22} />} 
          accent="#10b981" 
          trend="+18.2%"
        />
        <AdStatCard 
          label="Total Impressions" 
          value="1.2M" 
          icon={<BiBullseye size={22} />} 
          accent="#3b82f6" 
          trend="+5.4%"
        />
        <AdStatCard 
          label="Avg. CTR" 
          value="3.85%" 
          icon={<BiTrendingUp size={22} />} 
          accent="#f59e0b" 
          trend="-1.2%"
        />
        <AdStatCard 
          label="Active Campaigns" 
          value="24" 
          icon={<BiRocket size={22} />} 
          accent="#8b5cf6" 
          trend="+2"
        />
      </div>

      <div className="admin-section-grid" style={{ marginTop: '2rem' }}>
        <div className="admin-section">
          <h2 className="admin-section-title">Ad Formats</h2>
          <div className="ad-formats-list">
            <AdTypeCard title="Banner Ads" icon={<BiImage size={24} />} color="#ef4444" activeCount={8} />
            <AdTypeCard title="Video Ads" icon={<BiPlayCircle size={24} />} color="#3b82f6" activeCount={12} />
            <AdTypeCard title="Sponsored Content" icon={<BiStar size={24} />} color="#f59e0b" activeCount={4} />
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-card ad-campaign-card">
            <div className="admin-card-header">
              <h2>Top Performing Campaigns</h2>
              <BiBarChartSquare color="var(--admin-primary)" />
            </div>
            <div className="admin-table">
              <div className="admin-table-head ads-table-grid">
                <span>Campaign</span>
                <span>Impressions</span>
                <span>CTR</span>
                <span>Revenue</span>
              </div>
              <div className="admin-table-row ads-table-grid">
                <span className="campaign-name">Summer Sale 2024</span>
                <span>450k</span>
                <span>5.2%</span>
                <span className="rev-val">$4,200</span>
              </div>
              <div className="admin-table-row ads-table-grid">
                <span className="campaign-name">Nike Air Max Promo</span>
                <span>320k</span>
                <span>4.8%</span>
                <span className="rev-val">$3,150</span>
              </div>
              <div className="admin-table-row ads-table-grid">
                <span className="campaign-name">Gaming Expo Launch</span>
                <span>210k</span>
                <span>3.1%</span>
                <span className="rev-val">$1,840</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-section-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
        }
        .admin-section-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--admin-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1.25rem;
        }
        .ad-formats-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ad-type-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ad-type-card:hover {
          transform: translateX(8px);
          border-color: var(--admin-primary);
        }
        .ad-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ad-type-info h3 {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .ad-active-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--admin-muted);
        }
        .ad-active-badge .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .ad-stat-card {
          padding: 1.5rem;
        }
        .ad-stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .ad-trend {
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .ad-trend.up { background: #d1fae5; color: #059669; }
        .ad-trend.down { background: #fee2e2; color: #dc2626; }
        .ad-stat-label {
          font-size: 13px;
          color: var(--admin-muted);
          margin-bottom: 4px;
        }
        .ad-stat-value {
          font-size: 24px;
          font-weight: 800;
          color: var(--admin-strong);
        }
        .ads-table-grid {
          display: grid;
          grid-template-columns: 1fr 100px 80px 100px;
          gap: 1rem;
        }
        .campaign-name { font-weight: 700; color: var(--admin-text); }
        .rev-val { font-weight: 700; color: #10b981; }

        @media (max-width: 1200px) {
          .admin-section-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminAds;

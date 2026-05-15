import React from 'react';
import { 
  BiBell, 
  BiBroadcast, 
  BiMailSend, 
  BiTargetLock, 
  BiCalendarEvent, 
  BiStats, 
  BiPaperPlane,
  BiPlus
} from 'react-icons/bi';

const NotificationTypeCard = ({ title, description, icon, accent }) => (
  <div className="admin-card notification-type-card">
    <div className="notification-icon-wrapper" style={{ backgroundColor: `${accent}20`, color: accent }}>
      {icon}
    </div>
    <div className="notification-card-content">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    <button className="admin-icon-btn">
      <BiPlus size={20} />
    </button>
  </div>
);

const FeatureCard = ({ title, icon, color }) => (
  <div className="admin-card feature-card">
    <div className="feature-icon" style={{ color: color }}>
      {icon}
    </div>
    <span>{title}</span>
  </div>
);

const AdminNotifications = () => {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Notifications Center</h1>
          <p>Manage and dispatch platform-wide communication.</p>
        </div>
        <button type="button" className="admin-primary-btn">
          Compose Notification
        </button>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Notification Types</h2>
        <div className="admin-grid">
          <NotificationTypeCard 
            title="Push Notification" 
            description="Real-time alerts sent directly to user mobile devices."
            icon={<BiBell size={24} />}
            accent="#fe2c55"
          />
          <NotificationTypeCard 
            title="Broadcast Message" 
            description="System-wide messages shown in the user's inbox."
            icon={<BiBroadcast size={24} />}
            accent="#3b82f6"
          />
          <NotificationTypeCard 
            title="Email Notification" 
            description="Official communications sent to registered email addresses."
            icon={<BiMailSend size={24} />}
            accent="#10b981"
          />
          <NotificationTypeCard 
            title="Promotional" 
            description="Targeted marketing campaigns for specific user segments."
            icon={<BiPaperPlane size={24} />}
            accent="#f59e0b"
          />
        </div>
      </div>

      <div className="admin-section" style={{ marginTop: '2rem' }}>
        <h2 className="admin-section-title">Advanced Features</h2>
        <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <FeatureCard 
            title="Schedule Notifications" 
            icon={<BiCalendarEvent size={22} />}
            color="#8b5cf6"
          />
          <FeatureCard 
            title="Audience Targeting" 
            icon={<BiTargetLock size={22} />}
            color="#ec4899"
          />
          <FeatureCard 
            title="Click Analytics" 
            icon={<BiStats size={22} />}
            color="#14b8a6"
          />
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '2rem' }}>
        <div className="admin-card-header">
          <h2>Recent Dispatches</h2>
          <span className="admin-chip">Last 24 Hours</span>
        </div>
        <div className="admin-table">
          <div className="admin-table-head notification-table-grid">
            <span>Type</span>
            <span>Subject</span>
            <span>Target</span>
            <span>Clicks</span>
            <span>Status</span>
          </div>
          <div className="admin-table-row notification-table-grid">
            <span className="type-tag push">Push</span>
            <span>Weekend Vibes is here!</span>
            <span>Global</span>
            <span>12.4k</span>
            <span className="status-sent">Sent</span>
          </div>
          <div className="admin-table-row notification-table-grid">
            <span className="type-tag broadcast">Broadcast</span>
            <span>Server Maintenance Notice</span>
            <span>All Users</span>
            <span>4.2k</span>
            <span className="status-scheduled">Scheduled</span>
          </div>
        </div>
      </div>

      <style>{`
        .admin-section-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--admin-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
        }
        .notification-type-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem;
          transition: transform 0.2s;
        }
        .notification-type-card:hover {
          transform: translateY(-4px);
        }
        .notification-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .notification-card-content {
          flex: 1;
        }
        .notification-card-content h3 {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .notification-card-content p {
          font-size: 12px;
          color: var(--admin-muted);
          line-height: 1.4;
        }
        .feature-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255,255,255,0.5);
          border-style: dashed;
        }
        .feature-card span {
          font-weight: 600;
          font-size: 14px;
        }
        .notification-table-grid {
          display: grid;
          grid-template-columns: 100px 1fr 120px 80px 100px;
          align-items: center;
        }
        .type-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          width: fit-content;
        }
        .type-tag.push { background: #fee2e2; color: #ef4444; }
        .type-tag.broadcast { background: #dbeafe; color: #3b82f6; }
        .status-sent { color: #10b981; font-weight: 600; }
        .status-scheduled { color: #f59e0b; font-weight: 600; }
      `}</style>
    </div>
  );
};

export default AdminNotifications;

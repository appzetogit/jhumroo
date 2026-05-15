import React, { useState, useEffect } from 'react';
import { 
  BiTrendingUp, 
  BiUser, 
  BiVideo, 
  BiShieldQuarter, 
  BiPulse, 
  BiBroadcast, 
  BiCloudUpload, 
  BiUserPlus,
  BiTimeFive,
  BiBarChartAlt2
} from 'react-icons/bi';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import adminAnalyticsService from '../../../services/adminAnalyticsService';

const StatCard = ({ label, value, icon, accent, subValue }) => (
  <div className="admin-card admin-stat-card">
    <div className="admin-stat-icon" style={{ backgroundColor: `${accent}20`, color: accent }}>
      {icon}
    </div>
    <div className="admin-stat-content">
      <p className="admin-stat-label">{label}</p>
      <div className="admin-stat-main">
        <p className="admin-stat-value">{value}</p>
        {subValue && <span className="admin-stat-sub">{subValue}</span>}
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [contentAnalytics, setContentAnalytics] = useState([]);
  const [watchTimeAnalytics, setWatchTimeAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashStats, growth, content, watchTime] = await Promise.all([
          adminAnalyticsService.getDashboardStats(),
          adminAnalyticsService.getUserGrowth(7),
          adminAnalyticsService.getContentAnalytics(7),
          adminAnalyticsService.getWatchTimeAnalytics(7)
        ]);

        setStats(dashStats.stats);
        setUserGrowth(growth.data);
        
        // Transform content analytics for easier charting
        const combinedContent = content.data.reels.map(item => {
          const day = item._id;
          const comments = content.data.comments.find(c => c._id === day)?.count || 0;
          const likes = content.data.likes.find(l => l._id === day)?.count || 0;
          return {
            date: day,
            reels: item.count,
            comments,
            likes
          };
        });
        setContentAnalytics(combinedContent);
        setWatchTimeAnalytics(watchTime.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="admin-page admin-loading">
        <div className="admin-loader"></div>
        <p>{loading ? 'Loading real-time analytics...' : 'Failed to load dashboard data.'}</p>
      </div>
    );
  }

  const formatWatchTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time pulse of your Jhumroo ecosystem.</p>
        </div>
        <div className="admin-header-actions">
          <span className="admin-status-pill">
            <span className="pulse-dot"></span> Live Updates
          </span>
          <button type="button" className="admin-primary-btn">
            Generate Report
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="admin-grid admin-stats-grid">
        <StatCard
          label="Total Users"
          value={stats?.overview?.totalUsers?.toLocaleString() || '0'}
          icon={<BiUser size={24} />}
          accent="#6366f1"
          subValue={stats?.today?.newUsers ? `+${stats.today.newUsers} today` : null}
        />
        <StatCard
          label="Daily Active Users"
          value={stats?.overview?.activeUsers24h?.toLocaleString() || '0'}
          icon={<BiPulse size={24} />}
          accent="#10b981"
        />
        <StatCard
          label="Total Videos"
          value={stats?.overview?.totalReels?.toLocaleString() || '0'}
          icon={<BiVideo size={24} />}
          accent="#f59e0b"
          subValue={stats?.today?.newReels ? `+${stats.today.newReels} today` : null}
        />
        <StatCard
          label="Pending Reports"
          value={stats?.pendingReports?.total || '0'}
          icon={<BiShieldQuarter size={24} />}
          accent="#ef4444"
          subValue={stats?.pendingReports?.critical > 0 ? `${stats.pendingReports.critical} critical` : null}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="admin-grid admin-stats-grid-small" style={{ marginTop: '1.5rem' }}>
        <StatCard
          label="Live Users"
          value={stats?.overview?.liveUsers || '0'}
          icon={<BiBroadcast size={20} />}
          accent="#ec4899"
        />
        <StatCard
          label="Today's Uploads"
          value={stats?.today?.newReels || '0'}
          icon={<BiCloudUpload size={20} />}
          accent="#3b82f6"
        />
        <StatCard
          label="New Signups"
          value={stats?.today?.newUsers || '0'}
          icon={<BiUserPlus size={20} />}
          accent="#8b5cf6"
        />
        <StatCard
          label="Total Watch Time"
          value={formatWatchTime(stats?.overview?.totalWatchTimeSeconds || 0)}
          icon={<BiTimeFive size={20} />}
          accent="#14b8a6"
        />
      </div>

      {/* Charts Section */}
      <div className="admin-charts-container" style={{ marginTop: '2rem' }}>
        <div className="admin-charts-row">
          {/* User Growth Chart */}
          <div className="admin-card admin-chart-card">
            <div className="admin-card-header">
              <h2>User Growth</h2>
              <span className="admin-chip">Last 7 Days</span>
            </div>
            <div className="admin-chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2d', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#6366f1' }}
                  />
                  <Area type="monotone" dataKey="totalUsers" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Video Uploads Chart */}
          <div className="admin-card admin-chart-card">
            <div className="admin-card-header">
              <h2>Video Uploads</h2>
              <span className="admin-chip">Content Velocity</span>
            </div>
            <div className="admin-chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={contentAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2d', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="reels" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="admin-charts-row" style={{ marginTop: '2rem' }}>
          {/* Watch Time Analytics */}
          <div className="admin-card admin-chart-card full-width">
            <div className="admin-card-header">
              <h2>Watch Time Analytics</h2>
              <div className="admin-header-info">
                <span className="admin-chip">Platform Engagement</span>
              </div>
            </div>
            <div className="admin-chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={watchTimeAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="_id" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', offset: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2d', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Line name="Watch Time (s)" type="monotone" dataKey="dailyWatchTime" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  <Line name="Total Views" type="monotone" dataKey="totalViews" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Hashtags Section */}
      <div className="admin-columns" style={{ marginTop: '2rem' }}>
        <div className="admin-card admin-column">
          <div className="admin-card-header">
            <h2>Trending Hashtags</h2>
            <BiTrendingUp color="var(--admin-accent)" />
          </div>
          <div className="admin-hashtag-list">
            {stats.trendingHashtags.length > 0 ? (
              stats.trendingHashtags.map((item, index) => (
                <div key={item.tag} className="admin-hashtag-item">
                  <div className="hashtag-rank">#{index + 1}</div>
                  <div className="hashtag-info">
                    <span className="hashtag-name">#{item.tag}</span>
                    <span className="hashtag-count">{item.count.toLocaleString()} videos</span>
                  </div>
                  <div className="hashtag-bar-bg">
                    <div 
                      className="hashtag-bar-fill" 
                      style={{ width: `${(item.count / stats.trendingHashtags[0].count) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="admin-empty-state">No hashtags trending yet.</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          color: rgba(255,255,255,0.6);
        }
        .admin-loader {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: var(--admin-primary);
          border-radius: 50%;
          animation: admin-spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes admin-spin {
          to { transform: rotate(360deg); }
        }
        .admin-header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .admin-status-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .admin-stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          transition: transform 0.2s;
        }
        .admin-stat-card:hover {
          transform: translateY(-4px);
        }
        .admin-stat-icon {
          width: 54px;
          height: 54px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .admin-stat-main {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
        }
        .admin-stat-sub {
          font-size: 0.8rem;
          color: #10b981;
          font-weight: 500;
        }
        .admin-charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .full-width {
          grid-column: span 2;
        }
        .admin-chart-wrapper {
          padding: 1rem 0;
        }
        .admin-hashtag-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1rem 0;
        }
        .admin-hashtag-item {
          display: grid;
          grid-template-columns: 40px 1fr 100px;
          align-items: center;
          gap: 1rem;
        }
        .hashtag-rank {
          font-weight: 700;
          color: rgba(255,255,255,0.3);
          font-size: 1.1rem;
        }
        .hashtag-name {
          font-weight: 600;
          color: #fff;
          display: block;
        }
        .hashtag-count {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
        }
        .hashtag-bar-bg {
          height: 6px;
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .hashtag-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--admin-primary), var(--admin-accent));
          border-radius: 3px;
        }
        .admin-health-metrics {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem 0;
        }
        .health-metric {
          display: flex;
          justify-content: space-between;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 0.9rem;
        }
        .health-value {
          font-weight: 600;
        }
        .healthy { color: #10b981; }
        .warning { color: #f59e0b; }
        .danger { color: #ef4444; }

        @media (max-width: 1024px) {
          .admin-charts-row {
            grid-template-columns: 1fr;
          }
          .full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;

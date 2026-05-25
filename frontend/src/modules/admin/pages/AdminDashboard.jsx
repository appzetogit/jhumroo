import React, { useState, useEffect, Suspense, useReducer } from 'react';
import { 
  BiUser, 
  BiVideo, 
  BiCloudUpload,
  BiMusic,
  BiSolidMegaphone,
  BiShieldQuarter,
  BiSupport,
  BiBlock,
  BiTrendingUp,
  BiCheckCircle,
  BiHeart,
  BiMessageRounded,
  BiShareAlt,
  BiShow
} from 'react-icons/bi';
import adminAnalyticsService from '../../../services/adminAnalyticsService';

// Lazy load Recharts for optimal code splitting
const AreaChart = React.lazy(() => import('recharts').then(m => ({ default: m.AreaChart })));
const Area = React.lazy(() => import('recharts').then(m => ({ default: m.Area })));
const XAxis = React.lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = React.lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = React.lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = React.lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = React.lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const BarChart = React.lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
const Bar = React.lazy(() => import('recharts').then(m => ({ default: m.Bar })));
const Legend = React.lazy(() => import('recharts').then(m => ({ default: m.Legend })));

const CURRENT_YEAR = new Date().getFullYear();

// Static constants to avoid unnecessary object re-allocations on render (no-new-object-as-prop)
const AXIS_TICK_STYLE = { fill: 'var(--admin-muted)', fontSize: 11 };
const AXIS_TICK_STYLE_BOLD = { fill: 'var(--admin-muted)', fontSize: 11, fontWeight: 600 };
const Y_AXIS_DOMAIN = [0, 'auto'];
const BAR_RADIUS = [6, 6, 0, 0];

// Static helpers to avoid inline function allocations (no-new-function-as-prop)
const reelsTooltipFormatter = (value) => [value.toLocaleString(), 'New Reels'];
const integerTickFormatter = (v) => Number.isInteger(v) ? v : '';
const usersTooltipFormatter = (value) => [value.toLocaleString(), 'New Users'];
const newSignupsLegendFormatter = () => 'New Signups';

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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload[0].value || 0;
    
    return (
      <div className="custom-chart-tooltip">
        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--admin-muted)' }}>{label}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <span style={{ color: '#a855f7' }}>Users:</span>
          <span style={{ fontWeight: 'bold' }}>{total.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

// 1. Self-contained User Growth Chart component
const UserGrowthChart = () => {
  // Combined state object to avoid multiple setState cascading updates
  const [growthData, setGrowthData] = useState(undefined);
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [selectedMonth, setSelectedMonth] = useState('All');

  useEffect(() => {
    adminAnalyticsService.getUserGrowth(365)
      .then(res => {
        setGrowthData({
          list: res.data || [],
          baseline: res.baseline || 0,
          total: res.totalUsersCount || 0
        });
      })
      .catch(err => console.error('User growth fetch error:', err));
  }, []);

  if (growthData === undefined) {
    return (
      <div className="admin-card admin-chart-card admin-loading-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <div className="admin-loader"></div>
      </div>
    );
  }

  const getFilteredChartData = () => {
    const currentDate = new Date();
    const currentYearNum = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();
    const currentDayNum = currentDate.getDate();
    const yearNum = parseInt(selectedYear);

    const sortedGrowth = growthData.list.toSorted((a, b) => a.date.localeCompare(b.date));

    const getCumulativeOnDate = (targetDateStr) => {
      let latestEntry = null;
      for (const entry of sortedGrowth) {
        if (entry.date <= targetDateStr) latestEntry = entry;
        else break;
      }
      if (latestEntry) return latestEntry.totalUsers;

      if (sortedGrowth.length > 0 && targetDateStr > sortedGrowth[sortedGrowth.length - 1].date) {
        return growthData.total;
      }

      return growthData.baseline;
    };

    if (selectedMonth === 'All') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const targetMonths = yearNum === currentYearNum
        ? months.slice(0, currentMonthIndex + 1)
        : months;

      return targetMonths.map((month, index) => {
        const lastDay = new Date(yearNum, index + 1, 0).getDate();
        const paddedMonth = String(index + 1).padStart(2, '0');
        const paddedDay = String(lastDay).padStart(2, '0');
        const targetDateStr = `${yearNum}-${paddedMonth}-${paddedDay}`;
        return { dateLabel: month, totalUsers: getCumulativeOnDate(targetDateStr) };
      });
    } else {
      const monthIndex = parseInt(selectedMonth);
      if (yearNum === currentYearNum && monthIndex > currentMonthIndex) return [];

      const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate();
      const paddedMonth = String(monthIndex + 1).padStart(2, '0');
      const targetDays = (yearNum === currentYearNum && monthIndex === currentMonthIndex)
        ? currentDayNum
        : daysInMonth;

      const dailyData = [];
      for (let d = 1; d <= targetDays; d++) {
        const paddedDay = String(d).padStart(2, '0');
        const targetDateStr = `${yearNum}-${paddedMonth}-${paddedDay}`;
        dailyData.push({ dateLabel: `${d}`, totalUsers: getCumulativeOnDate(targetDateStr) });
      }
      return dailyData;
    }
  };

  const transformedGrowth = getFilteredChartData();

  return (
    <div className="admin-card admin-chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>User Growth</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="admin-select"
          >
            <option value="All">All Months</option>
            <option value="0">January</option>
            <option value="1">February</option>
            <option value="2">March</option>
            <option value="3">April</option>
            <option value="4">May</option>
            <option value="5">June</option>
            <option value="6">July</option>
            <option value="7">August</option>
            <option value="8">September</option>
            <option value="9">October</option>
            <option value="10">November</option>
            <option value="11">December</option>
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="admin-select"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>
      <div className="admin-chart-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={transformedGrowth} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
            <XAxis 
              dataKey="dateLabel" 
              axisLine={false} 
              tickLine={false} 
              tick={AXIS_TICK_STYLE}
              dy={10}
            />
            <YAxis hide />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: 'rgba(0, 0, 0, 0.1)', strokeWidth: 1 }} 
            />
            <Area type="monotone" dataKey="totalUsers" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 2. Self-contained Reels Growth Chart component
const ReelsGrowthChart = () => {
  const [selectedReelsYear, setSelectedReelsYear] = useState(String(CURRENT_YEAR));
  const [reelsGrowth, setReelsGrowth] = useState(undefined);

  useEffect(() => {
    adminAnalyticsService.getReelsGrowth(selectedReelsYear)
      .then(res => setReelsGrowth(res.data || []))
      .catch(err => console.error('Reels growth fetch error:', err));
  }, [selectedReelsYear]);

  const handleYearChange = (e) => {
    setSelectedReelsYear(e.target.value);
    setReelsGrowth(undefined); // Implicit loading state triggers loader
  };

  if (reelsGrowth === undefined) {
    return (
      <div className="admin-card admin-chart-card admin-loading-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <div className="admin-loader"></div>
      </div>
    );
  }

  return (
    <div className="admin-card admin-chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Reels Growth</h2>
        <select
          value={selectedReelsYear}
          onChange={handleYearChange}
          className="admin-select"
        >
          <option value={String(CURRENT_YEAR)}>{CURRENT_YEAR}</option>
          <option value={String(CURRENT_YEAR - 1)}>{CURRENT_YEAR - 1}</option>
          <option value={String(CURRENT_YEAR - 2)}>{CURRENT_YEAR - 2}</option>
        </select>
      </div>
      <div className="admin-chart-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={reelsGrowth} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReels" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK_STYLE}
              dy={10}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--admin-border)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(254, 44, 85, 0.08)',
                color: 'var(--admin-text)',
                fontSize: '12px',
                fontFamily: 'inherit'
              }}
              formatter={reelsTooltipFormatter}
              cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
            />
            <Area type="monotone" dataKey="newReels" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorReels)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 3. Self-contained New Signups Chart component
const NewSignupsChart = () => {
  const [selectedNewUsersYear, setSelectedNewUsersYear] = useState(String(CURRENT_YEAR));
  const [signupsData, setSignupsData] = useState(undefined);

  useEffect(() => {
    adminAnalyticsService.getNewUsersMonthly(selectedNewUsersYear)
      .then(res => {
        setSignupsData({
          list: res.data || [],
          total: res.yearUsersCount || 0
        });
      })
      .catch(err => console.error('New users monthly fetch error:', err));
  }, [selectedNewUsersYear]);

  const handleYearChange = (yr) => {
    setSelectedNewUsersYear(yr);
    setSignupsData(undefined); // Implicit loading state triggers loader
  };

  if (signupsData === undefined) {
    return (
      <div className="admin-card admin-chart-card full-width admin-loading-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '360px' }}>
        <div className="admin-loader"></div>
      </div>
    );
  }

  return (
    <div className="admin-card admin-chart-card full-width">
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0 }}>New Signups</h2>
          <p style={{ margin: '4px 0 0 0', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            Monthly count of new users registered on the platform.
            {signupsData.total > 0 && (
              <span style={{ marginLeft: '8px', fontWeight: '700', color: '#6366f1' }}>
                · {signupsData.total.toLocaleString()} this year
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2, 3].map(offset => {
            const yr = String(CURRENT_YEAR - offset);
            return (
              <button
                key={yr}
                type="button"
                onClick={() => handleYearChange(yr)}
                className={`admin-filter-pill ${selectedNewUsersYear === yr ? 'active' : ''}`}
              >
                {yr}
              </button>
            );
          })}
        </div>
      </div>
      <div className="admin-chart-wrapper" style={{ marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={signupsData.list} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} barSize={32}>
            <defs>
              <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK_STYLE_BOLD}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK_STYLE}
              width={40}
              allowDecimals={false}
              domain={Y_AXIS_DOMAIN}
              tickFormatter={integerTickFormatter}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--admin-border)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.12)',
                color: 'var(--admin-text)',
                fontSize: '13px',
                fontFamily: 'inherit',
                padding: '10px 14px'
              }}
              formatter={usersTooltipFormatter}
              cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
            />
            <Legend
              verticalAlign="top"
              height={32}
              formatter={newSignupsLegendFormatter}
              wrapperStyle={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}
            />
            <Bar
              dataKey="newUsers"
              fill="url(#colorNewUsers)"
              radius={BAR_RADIUS}
              name="New Signups"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 4. Trending Hashtags List component
const TrendingHashtags = ({ stats }) => (
  <div className="admin-card admin-column">
    <div className="admin-card-header">
      <h2>Trending Hashtags</h2>
      <BiTrendingUp color="var(--admin-accent)" />
    </div>
    <div className="admin-hashtag-list">
      {stats?.trendingHashtags && stats.trendingHashtags.length > 0 ? (
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
);

// 5. Top Creators List component
const TopCreators = ({ topCreators }) => (
  <div className="admin-card admin-column">
    <div className="admin-card-header">
      <h2>Top 5 Reel Creators</h2>
      <BiVideo color="var(--admin-accent)" />
    </div>
    <div className="admin-creator-list">
      {topCreators && topCreators.length > 0 ? (
        topCreators.map((creator, index) => (
          <div key={creator._id} className="admin-creator-item">
            <div className="creator-rank">#{index + 1}</div>
            <img 
              src={creator.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.username}`} 
              alt="" 
              className="creator-avatar"
            />
            <div className="creator-info">
              <span className="creator-name">
                {creator.fullName || creator.username}
                {creator.isVerified && (
                  <BiCheckCircle className="verified-badge" color="#3b82f6" style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle' }} />
                )}
              </span>
              <span className="creator-count">@{creator.username} • {creator.stats?.reelsCount || 0} reels</span>
            </div>
            <div className="creator-bar-bg">
              <div 
                className="creator-bar-fill" 
                style={{ width: `${((creator.stats?.reelsCount || 0) / (topCreators[0]?.stats?.reelsCount || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        ))
      ) : (
        <p className="admin-empty-state">No creators found.</p>
      )}
    </div>
  </div>
);

// 6. Header sub-component for cleaner layout
const DashboardHeader = () => (
  <div className="admin-page-header">
    <div>
      <h1>Dashboard</h1>
      <p>Real-time pulse of your Jhumroo ecosystem.</p>
    </div>
    <div className="admin-header-actions">
      <span className="admin-status-pill">
        <span className="pulse-dot"></span> Live Updates
      </span>
    </div>
  </div>
);

// 7. Stat Cards Grid sub-component for optimal lines count
const OverviewCardsGrid = ({ stats }) => (
  <div className="admin-grid admin-stats-grid-8" style={{ marginBottom: '0' }}>
    <StatCard
      label="Total Users"
      value={stats?.overview?.totalUsers?.toLocaleString() || '0'}
      icon={<BiUser size={24} />}
      accent="#6366f1"
      subValue={stats?.today?.newUsers ? `+${stats.today.newUsers} today` : null}
    />
    <StatCard
      label="Total Reels"
      value={stats?.overview?.totalReels?.toLocaleString() || '0'}
      icon={<BiVideo size={24} />}
      accent="#f59e0b"
      subValue={stats?.today?.newReels ? `+${stats.today.newReels} today` : null}
    />
    <StatCard
      label="Today's Uploads"
      value={stats?.today?.newReels?.toLocaleString() || '0'}
      icon={<BiCloudUpload size={24} />}
      accent="#3b82f6"
    />
    <StatCard
      label="Total Audio"
      value={stats?.overview?.totalAudio?.toLocaleString() || '0'}
      icon={<BiMusic size={24} />}
      accent="#10b981"
    />
    <StatCard
      label="Total User Ads"
      value={stats?.overview?.totalUserAds?.toLocaleString() || '0'}
      icon={<BiSolidMegaphone size={24} />}
      accent="#ec4899"
    />
    <StatCard
      label="Total Admin Ads"
      value={stats?.overview?.totalAdminAds?.toLocaleString() || '0'}
      icon={<BiShieldQuarter size={24} />}
      accent="#8b5cf6"
    />
    <StatCard
      label="Total Blocked Users"
      value={stats?.overview?.totalBlockedUsers?.toLocaleString() || '0'}
      icon={<BiBlock size={24} />}
      accent="#ef4444"
    />
    <StatCard
      label="Support Requests Pending"
      value={stats?.overview?.totalSupportPending?.toLocaleString() || '0'}
      icon={<BiSupport size={24} />}
      accent="#14b8a6"
    />
    <StatCard
      label="Total Views"
      value={stats?.overview?.totalViews?.toLocaleString() || '0'}
      icon={<BiShow size={24} />}
      accent="#06b6d4"
    />
    <StatCard
      label="Total Likes"
      value={stats?.overview?.totalLikes?.toLocaleString() || '0'}
      icon={<BiHeart size={24} />}
      accent="#f43f5e"
    />
    <StatCard
      label="Total Comments"
      value={stats?.overview?.totalComments?.toLocaleString() || '0'}
      icon={<BiMessageRounded size={24} />}
      accent="#a855f7"
      subValue={stats?.today?.newComments ? `+${stats.today.newComments} today` : null}
    />
    <StatCard
      label="Total Share"
      value={stats?.overview?.totalShares?.toLocaleString() || '0'}
      icon={<BiShareAlt size={24} />}
      accent="#0ea5e9"
    />
  </div>
);

const dashboardReducer = (state, action) => {
  if (action.type === 'SET_DATA') {
    return {
      stats: action.payload.stats,
      topCreators: action.payload.creators,
      isLoaded: true
    };
  }
  return state;
};

const INITIAL_STATE = {
  stats: undefined,
  topCreators: [],
  isLoaded: false
};

const AdminDashboard = () => {
  const [state, dispatch] = useReducer(dashboardReducer, INITIAL_STATE);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashStats, creators] = await Promise.all([
          adminAnalyticsService.getDashboardStats(),
          adminAnalyticsService.getTopUsers('reels', 5)
        ]);

        dispatch({
          type: 'SET_DATA',
          payload: {
            stats: dashStats.stats,
            creators: creators?.users || []
          }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, []);

  if (!state.isLoaded) {
    return (
      <div className="admin-page admin-loading">
        <div className="admin-loader"></div>
        <p>Loading real-time analytics…</p>
      </div>
    );
  }

  const { stats, topCreators } = state;

  return (
    <div className="admin-page">
      <DashboardHeader />
      <OverviewCardsGrid stats={stats} />

      {/* Charts Section with Suspense for lazy loading */}
      <Suspense fallback={
        <div className="admin-page admin-loading" style={{ height: '300px' }}>
          <div className="admin-loader"></div>
          <p>Loading interactive widgets…</p>
        </div>
      }>
        <div className="admin-charts-container" style={{ marginTop: '2rem' }}>
          <div className="admin-charts-row">
            <UserGrowthChart />
            <ReelsGrowthChart />
          </div>
          
          <div className="admin-charts-row" style={{ marginTop: '2rem' }}>
            <NewSignupsChart />
          </div>
        </div>
      </Suspense>

      {/* Trending & Top Creators Section */}
      <div className="admin-columns" style={{ marginTop: '2rem' }}>
        <TrendingHashtags stats={stats} />
        <TopCreators topCreators={topCreators} />
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
        .admin-loading-placeholder {
          background: #fff;
          border: 1px solid var(--admin-border);
          border-radius: 12px;
        }
        .admin-loader {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(0,0,0,0.05);
          border-top-color: #6366f1;
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
          color: var(--admin-muted);
          font-size: 1.1rem;
          opacity: 0.6;
        }
        .hashtag-name {
          font-weight: 600;
          color: var(--admin-text);
          display: block;
        }
        .hashtag-count {
          font-size: 0.8rem;
          color: var(--admin-muted);
        }
        .hashtag-bar-bg {
          height: 6px;
          background: rgba(0,0,0,0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .hashtag-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--admin-primary), var(--admin-accent));
          border-radius: 3px;
        }
        .admin-creator-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1rem 0;
        }
        .admin-creator-item {
          display: grid;
          grid-template-columns: 40px 48px 1fr 100px;
          align-items: center;
          gap: 1rem;
        }
        .creator-rank {
          font-weight: 700;
          color: var(--admin-muted);
          font-size: 1.1rem;
          opacity: 0.6;
        }
        .creator-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--admin-border);
        }
        .creator-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .creator-name {
          font-weight: 600;
          color: var(--admin-text);
          display: flex;
          align-items: center;
          font-size: 0.95rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .creator-count {
          font-size: 0.8rem;
          color: var(--admin-muted);
        }
        .creator-bar-bg {
          height: 6px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .creator-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--admin-primary), var(--admin-secondary));
          border-radius: 3px;
        }
        .verified-badge {
          flex-shrink: 0;
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

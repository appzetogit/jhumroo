import React, { useState, useEffect } from 'react';
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload[0].value || 0;
    
    return (
      <div className="custom-chart-tooltip" style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid var(--admin-border)',
        padding: '10px 14px',
        borderRadius: '8px',
        color: 'var(--admin-text)',
        fontSize: '13px',
        fontFamily: 'inherit',
        boxShadow: '0 8px 24px rgba(254, 44, 85, 0.08)'
      }}>
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

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [growthBaseline, setGrowthBaseline] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [reelsGrowth, setReelsGrowth] = useState([]);
  const [selectedReelsYear, setSelectedReelsYear] = useState(String(new Date().getFullYear()));
  const [newUsersMonthly, setNewUsersMonthly] = useState([]);
  const [newUsersYearTotal, setNewUsersYearTotal] = useState(0);
  const [selectedNewUsersYear, setSelectedNewUsersYear] = useState(String(new Date().getFullYear()));
  const [contentAnalytics, setContentAnalytics] = useState([]);
  const [watchTimeAnalytics, setWatchTimeAnalytics] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashStats, growth, reelsData, newUsersData, content, watchTime, creators] = await Promise.all([
          adminAnalyticsService.getDashboardStats(),
          adminAnalyticsService.getUserGrowth(365),
          adminAnalyticsService.getReelsGrowth(new Date().getFullYear()),
          adminAnalyticsService.getNewUsersMonthly(new Date().getFullYear()),
          adminAnalyticsService.getContentAnalytics(7),
          adminAnalyticsService.getWatchTimeAnalytics(7),
          adminAnalyticsService.getTopUsers('reels', 5)
        ]);

        setStats(dashStats.stats);
        setUserGrowth(growth.data || []);
        setGrowthBaseline(growth.baseline || 0);
        setTotalUsersCount(growth.totalUsersCount || 0);
        setReelsGrowth(reelsData.data || []);
        setNewUsersMonthly(newUsersData.data || []);
        setNewUsersYearTotal(newUsersData.yearUsersCount || 0);
        if (creators && creators.users) {
          setTopCreators(creators.users);
        }
        
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

  // Refetch reels growth when year changes
  useEffect(() => {
    adminAnalyticsService.getReelsGrowth(selectedReelsYear)
      .then(res => setReelsGrowth(res.data || []))
      .catch(err => console.error('Reels growth fetch error:', err));
  }, [selectedReelsYear]);

  // Refetch new users monthly when year changes
  useEffect(() => {
    adminAnalyticsService.getNewUsersMonthly(selectedNewUsersYear)
      .then(res => {
        setNewUsersMonthly(res.data || []);
        setNewUsersYearTotal(res.yearUsersCount || 0);
      })
      .catch(err => console.error('New users monthly fetch error:', err));
  }, [selectedNewUsersYear]);

  if (loading || !stats) {
    return (
      <div className="admin-page admin-loading">
        <div className="admin-loader"></div>
        <p>{loading ? 'Loading real-time analytics...' : 'Failed to load dashboard data.'}</p>
      </div>
    );
  }

  const formatWatchTime = (seconds) => {
    if (seconds < 60) return `${seconds} secs`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} mins`;
    return `${(seconds / 3600).toFixed(1)} hrs`;
  };

  const getFilteredChartData = () => {
    const currentDate = new Date();
    const currentYearNum = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();
    const currentDayNum = currentDate.getDate();
    const yearNum = parseInt(selectedYear);

    // Sort growth entries by date
    const sortedGrowth = [...userGrowth].sort((a, b) => a.date.localeCompare(b.date));

    // For a given date string, return the best known cumulative user count
    const getCumulativeOnDate = (targetDateStr) => {
      // Find the latest entry on or before targetDate
      let latestEntry = null;
      for (const entry of sortedGrowth) {
        if (entry.date <= targetDateStr) latestEntry = entry;
        else break;
      }
      if (latestEntry) return latestEntry.totalUsers;

      // If targetDate is AFTER all our entries → return the overall total
      if (sortedGrowth.length > 0 && targetDateStr > sortedGrowth[sortedGrowth.length - 1].date) {
        return totalUsersCount;
      }

      // If targetDate is BEFORE all entries → return baseline (users before 365-day window)
      return growthBaseline;
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
        </div>
      </div>

      {/* Main Stats Grid — 12 cards */}
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

      {/* Charts Section */}
      <div className="admin-charts-container" style={{ marginTop: '2rem' }}>
        <div className="admin-charts-row">
          {/* User Growth Chart */}
          <div className="admin-card admin-chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ margin: 0 }}>User Growth</h2>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Month Selector */}
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '8px',
                    color: 'var(--admin-text)',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
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

                {/* Year Selector */}
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '8px',
                    color: 'var(--admin-text)',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
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
                    tick={{ fill: 'var(--admin-muted)', fontSize: 11 }}
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

          {/* Reels Growth Chart */}
          <div className="admin-card admin-chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ margin: 0 }}>Reels Growth</h2>
              <select
                value={selectedReelsYear}
                onChange={(e) => setSelectedReelsYear(e.target.value)}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '8px',
                  color: 'var(--admin-text)',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
                <option value={String(new Date().getFullYear() - 1)}>{new Date().getFullYear() - 1}</option>
                <option value={String(new Date().getFullYear() - 2)}>{new Date().getFullYear() - 2}</option>
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
                    tick={{ fill: 'var(--admin-muted)', fontSize: 11 }}
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
                    formatter={(value) => [value.toLocaleString(), 'New Reels']}
                    cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="newReels" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorReels)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="admin-charts-row" style={{ marginTop: '2rem' }}>
          {/* New Signups Monthly Chart */}
          <div className="admin-card admin-chart-card full-width">
            <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0 }}>New Signups</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--admin-muted)' }}>
                  Monthly new user registrations
                  {newUsersYearTotal > 0 && (
                    <span style={{ marginLeft: '8px', fontWeight: '700', color: '#6366f1' }}>
                      · {newUsersYearTotal.toLocaleString()} this year
                    </span>
                  )}
                </p>
              </div>
              {/* 4-Year filter */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0, 1, 2, 3].map(offset => {
                  const yr = String(new Date().getFullYear() - offset);
                  return (
                    <button
                      key={yr}
                      onClick={() => setSelectedNewUsersYear(yr)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: selectedNewUsersYear === yr ? '#6366f1' : 'var(--admin-border)',
                        background: selectedNewUsersYear === yr ? '#6366f1' : '#fff',
                        color: selectedNewUsersYear === yr ? '#fff' : 'var(--admin-muted)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="admin-chart-wrapper" style={{ marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={newUsersMonthly} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} barSize={32}>
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
                    tick={{ fill: 'var(--admin-muted)', fontSize: 11, fontWeight: 600 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--admin-muted)', fontSize: 11 }}
                    width={40}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                    tickFormatter={(v) => Number.isInteger(v) ? v : ''}
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
                    formatter={(value) => [value.toLocaleString(), 'New Users']}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    formatter={() => 'New Signups'}
                    wrapperStyle={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="newUsers"
                    fill="url(#colorNewUsers)"
                    radius={[6, 6, 0, 0]}
                    name="New Signups"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Trending & Top Creators Section */}
      <div className="admin-columns" style={{ marginTop: '2rem' }}>
        {/* Trending Hashtags */}
        <div className="admin-card admin-column">
          <div className="admin-card-header">
            <h2>Trending Hashtags</h2>
            <BiTrendingUp color="var(--admin-accent)" />
          </div>
          <div className="admin-hashtag-list">
            {stats.trendingHashtags && stats.trendingHashtags.length > 0 ? (
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

        {/* Top 5 Reel Creators */}
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

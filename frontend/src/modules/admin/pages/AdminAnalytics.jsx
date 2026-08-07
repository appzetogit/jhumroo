import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  BiMap, BiRocket, BiFilterAlt, BiRefresh, BiTrendingUp,
  BiVideo, BiHeart, BiShare, BiMessageSquare, BiMouse,
  BiShow, BiCrosshair, BiStore, BiBarChartAlt2, BiWorld,
  BiCheckCircle, BiX
} from 'react-icons/bi';
import adminAnalyticsService from '../../../services/adminAnalyticsService';

/* ─── Colour palette ─── */
const METRIC_COLORS = {
  views:    '#6366f1',
  likes:    '#ec4899',
  shares:   '#f59e0b',
  comments: '#10b981',
};
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6'];
const HYPE_GRADIENT = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

/* ─── Helpers ─── */
const fmt = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const StatCard = ({ label, value, icon, accent, sub, trend }) => (
  <div className="anl-stat-card" style={{ '--acc': accent }}>
    <div className="anl-stat-icon">{icon}</div>
    <div className="anl-stat-body">
      <p className="anl-stat-label">{label}</p>
      <p className="anl-stat-value">{value}</p>
      {sub   && <p className="anl-stat-sub">{sub}</p>}
      {trend && <span className={`anl-trend ${trend > 0 ? 'up' : 'down'}`}>{trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>}
    </div>
  </div>
);

const FilterSelect = ({ label, value, onChange, options, placeholder }) => (
  <div className="anl-filter-group">
    <label className="anl-filter-label">{label}</label>
    <select className="anl-filter-select" value={value} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
          {typeof o === 'string' ? o : o.label}
        </option>
      ))}
    </select>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="anl-tooltip">
      <p className="anl-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{fmt(p.value)}</strong></p>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────── */
/*  TAB 1 – REEL GEO ANALYTICS                  */
/* ────────────────────────────────────────────── */
const ReelGeoTab = () => {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [metric,    setMetric]    = useState('views');
  const [days,      setDays]      = useState('30');
  const [country,   setCountry]   = useState('');
  const [state,     setState]     = useState('');
  const [district,  setDistrict]  = useState('');
  const [drillLevel, setDrillLevel] = useState('state'); // state | district

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAnalyticsService.getReelGeoAnalytics({
        metric, days, country, state, district, _t: Date.now()
      });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [metric, days, country, state, district]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const chartData = drillLevel === 'state'
    ? (data?.data?.byState || []).slice(0, 15)
    : (data?.data?.byDistrict || []).slice(0, 15);

  const chartKey   = drillLevel === 'state' ? 'state' : 'district';
  const totalHype  = chartData.reduce((s, d) => s + d.hypeScore, 0);

  const metricIcon = { views: BiShow, likes: BiHeart, shares: BiShare, comments: BiMessageSquare };
  const MetIcon = metricIcon[metric] || BiShow;

  return (
    <div className="anl-tab-content">
      {/* ── Filter bar ── */}
      <div className="anl-filter-bar">
        <div className="anl-filter-left">
          <BiFilterAlt size={18} className="anl-filter-icon" />
          <FilterSelect label="Country"  value={country}  onChange={v => { setCountry(v); setState(''); setDistrict(''); }}
            options={data?.dropdowns?.countries || []} />
          <FilterSelect label="State"    value={state}    onChange={v => { setState(v); setDistrict(''); }}
            options={data?.dropdowns?.states || []} />
          <FilterSelect label="District" value={district} onChange={setDistrict}
            options={data?.dropdowns?.districts || []} />
        </div>
        <div className="anl-filter-right">
          <FilterSelect label="Metric" value={metric} onChange={setMetric}
            options={[
              { value: 'views',    label: '👁 Views'    },
              { value: 'likes',    label: '❤️ Likes'    },
              { value: 'shares',   label: '↗ Shares'   },
              { value: 'comments', label: '💬 Comments' }
            ]} placeholder="Views" />
          <FilterSelect label="Period" value={days} onChange={setDays}
            options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]}
            placeholder="30 days" />
          <button className="anl-refresh-btn" onClick={fetchData} disabled={loading}>
            <BiRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="anl-loading"><div className="anl-loader" /><p>Loading geo data…</p></div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="anl-stats-row">
            <StatCard label="Top Country"  value={data?.data?.byCountry?.[0]?.country || 'No data'}
              icon={<BiWorld  size={22}/>} accent="#6366f1" sub={data?.data?.byCountry?.[0]?.hypeScore ? `${fmt(data.data.byCountry[0].hypeScore)} ${metric}` : 'No reels yet'} />
            <StatCard label="Top State"    value={data?.data?.byState?.[0]?.state    || 'No data'}
              icon={<BiMap    size={22}/>} accent="#f59e0b" sub={data?.data?.byState?.[0]?.hypeScore ? `${fmt(data.data.byState[0].hypeScore)} ${metric}` : 'No state info'} />
            <StatCard label="Top District" value={data?.data?.byDistrict?.[0]?.district || 'No data'}
              icon={<BiCrosshair size={22}/>} accent="#10b981" sub={data?.data?.byDistrict?.[0]?.hypeScore ? `${fmt(data.data.byDistrict[0].hypeScore)} ${metric}` : 'No district info'} />
            <StatCard label={`Total ${metric.charAt(0).toUpperCase() + metric.slice(1)}`}
              value={fmt(totalHype)} icon={<MetIcon size={22}/>} accent={METRIC_COLORS[metric]} />
          </div>

          {/* ── Drill level toggle ── */}
          <div className="anl-drill-toggle">
            <button className={`anl-drill-btn ${drillLevel === 'state' ? 'active' : ''}`}
              onClick={() => setDrillLevel('state')}>By State</button>
            <button className={`anl-drill-btn ${drillLevel === 'district' ? 'active' : ''}`}
              onClick={() => setDrillLevel('district')}>By District</button>
          </div>

          {/* ── Main hype bar chart ── */}
          <div className="anl-card">
            <div className="anl-card-header">
              <h2><BiTrendingUp size={18}/> Reel Hype — Top {drillLevel === 'state' ? 'States' : 'Districts'}</h2>
              <span className="anl-chip" style={{ background: `${METRIC_COLORS[metric]}20`, color: METRIC_COLORS[metric] }}>
                {metric} score
              </span>
            </div>
            {chartData.length === 0 ? (
              <p className="anl-empty">No data for selected filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--admin-muted)', fontSize: 11 }}
                    tickFormatter={fmt} />
                  <YAxis type="category" dataKey={chartKey} width={110}
                    axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--admin-text)', fontSize: 12, fontWeight: 500 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hypeScore" name={`${metric} score`} radius={[0, 6, 6, 0]} barSize={18}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={HYPE_GRADIENT[i % HYPE_GRADIENT.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Geo breakdown table ── */}
          <div className="anl-card" style={{ marginTop: '1.5rem' }}>
            <div className="anl-card-header">
              <h2><BiMap size={18}/> Detailed Geo Breakdown</h2>
              <span className="anl-chip">
                {country || 'All Countries'}{state ? ` › ${state}` : ''}{district ? ` › ${district}` : ''}
              </span>
            </div>
            <div className="anl-table-wrap">
              <table className="anl-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{drillLevel === 'state' ? 'State' : 'District'}</th>
                    {drillLevel === 'district' && <th>State</th>}
                    <th>Country</th>
                    <th>Reels</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Shares</th>
                    <th>Comments</th>
                    <th>Hype Score</th>
                    <th>Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, i) => {
                    const pct = totalHype > 0 ? ((row.hypeScore / totalHype) * 100).toFixed(1) : '0';
                    return (
                      <tr key={i}>
                        <td className="anl-td-rank">#{i + 1}</td>
                        <td className="anl-td-bold">{drillLevel === 'state' ? row.state : row.district}</td>
                        {drillLevel === 'district' && <td>{row.state}</td>}
                        <td>{row.country}</td>
                        <td>{fmt(row.totalReels)}</td>
                        <td>{fmt(row.totalViews)}</td>
                        <td>{fmt(row.totalLikes)}</td>
                        <td>{fmt(row.totalShares)}</td>
                        <td>{fmt(row.totalComments)}</td>
                        <td>
                          <div className="anl-score-cell">
                            <span>{fmt(row.hypeScore)}</span>
                            <div className="anl-mini-bar">
                              <div className="anl-mini-fill"
                                style={{ width: `${(row.hypeScore / (chartData[0]?.hypeScore || 1)) * 100}%`,
                                         background: METRIC_COLORS[metric] }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="anl-pct-badge">{pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────── */
/*  TAB 2 – ADS ANALYTICS                       */
/* ────────────────────────────────────────────── */
const AdsAnalyticsTab = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [type,    setType]    = useState('all');
  const [days,    setDays]    = useState('30');
  const [country, setCountry] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAnalyticsService.getAdsAnalytics({ type, days, country, _t: Date.now() });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [type, days, country]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const topAds     = data?.topAdsByViews     || [];
  const geoData    = data?.geoDistribution   || [];
  const trendData  = data?.dailyTrend        || [];
  const typeSplit  = data?.typeSplit         || [];
  const overview   = data?.overview          || {};

  /* Build pie data from typeSplit */
  const pieData = typeSplit.map(t => ({
    name: t.type === 'Admin' ? 'Platform Ads' : 'User Ads',
    value: t.count,
    views: t.totalViews,
    clicks: t.totalClicks
  }));

  return (
    <div className="anl-tab-content">
      {/* ── Filter bar ── */}
      <div className="anl-filter-bar">
        <div className="anl-filter-left">
          <BiFilterAlt size={18} className="anl-filter-icon" />
          <FilterSelect label="Ad Type" value={type} onChange={setType}
            options={[
              { value: 'all',   label: 'All Ads'       },
              { value: 'admin', label: 'Platform Ads'  },
              { value: 'user',  label: 'User Ads'      }
            ]} />
          <FilterSelect label="Country" value={country} onChange={setCountry}
            placeholder="All"
            options={['India', 'USA', 'UK', 'UAE', 'Canada']} />
        </div>
        <div className="anl-filter-right">
          <FilterSelect label="Period" value={days} onChange={setDays}
            options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
          <button className="anl-refresh-btn" onClick={fetchData} disabled={loading} title="Refresh data">
            <BiRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="anl-loading"><div className="anl-loader" /><p>Loading ads analytics…</p></div>
      ) : (
        <>
          {/* ── Overview cards ── */}
          <div className="anl-stats-row anl-stats-6">
            <StatCard label="Total Ads"   value={fmt(overview.totalAds)}        icon={<BiRocket   size={22}/>} accent="#6366f1"
              sub={`${overview.activeAds || 0} active`} />
            <StatCard label="Total Views" value={fmt(overview.totalViews)}       icon={<BiShow      size={22}/>} accent="#3b82f6" />
            <StatCard label="Total Clicks" value={fmt(overview.totalClicks)}     icon={<BiMouse size={22}/>} accent="#f59e0b" />
            <StatCard label="Avg CTR"     value={`${overview.avgCTRPercent || 0}%`} icon={<BiBarChartAlt2 size={22}/>} accent="#10b981" />
            <StatCard label="Total Likes" value={fmt(overview.totalLikes)}       icon={<BiHeart    size={22}/>} accent="#ec4899" />
            <StatCard label="Comments"    value={fmt(overview.totalComments)}    icon={<BiMessageSquare size={22}/>} accent="#8b5cf6" />
          </div>

          {/* ── Charts row ── */}
          <div className="anl-charts-2col">
            {/* Left — Views trend */}
            <div className="anl-card">
              <div className="anl-card-header">
                <h2><BiShow size={18}/> Daily Views &amp; Clicks Trend</h2>
                <span className="anl-chip">Last {days} days</span>
              </div>
              {trendData.length === 0 ? (
                <p className="anl-empty">No trend data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="gViews"  x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="_id" axisLine={false} tickLine={false}
                      tick={{ fill: 'var(--admin-muted)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={fmt}
                      tick={{ fill: 'var(--admin-muted)', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={30}/>
                    <Area name="Views"  type="monotone" dataKey="totalViews"  stroke="#6366f1" strokeWidth={2} fill="url(#gViews)" />
                    <Area name="Clicks" type="monotone" dataKey="totalClicks" stroke="#f59e0b" strokeWidth={2} fill="url(#gClicks)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Right — Ad type pie */}
            <div className="anl-card">
              <div className="anl-card-header">
                <h2><BiRocket size={18}/> Platform vs User Ads</h2>
                <span className="anl-chip">Distribution</span>
              </div>
              {pieData.length === 0 ? (
                <p className="anl-empty">No ads found.</p>
              ) : (
                <div className="anl-pie-wrap">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                        dataKey="value" paddingAngle={4}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, name, p) => [
                        `${v} ads · ${fmt(p.payload.views)} views · CTR ${p.payload.views > 0
                          ? ((p.payload.clicks / p.payload.views) * 100).toFixed(1) : 0}%`, name
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="anl-pie-legend">
                    {pieData.map((d, i) => (
                      <div key={i} className="anl-pie-legend-item">
                        <span className="anl-pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <div>
                          <p className="anl-pie-name">{d.name}</p>
                          <p className="anl-pie-count">{d.value} ads · {fmt(d.views)} views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Geo targeting chart ── */}
          {geoData.length > 0 && (
            <div className="anl-card" style={{ marginTop: '1.5rem' }}>
              <div className="anl-card-header">
                <h2><BiCrosshair size={18}/> Geo Targeting Distribution (Top States)</h2>
                <span className="anl-chip">Ad reach by state</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={geoData.slice(0, 15)} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="state" axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--admin-muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={fmt}
                    tick={{ fill: 'var(--admin-muted)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={30}/>
                  <Bar name="Ads Count" dataKey="adsCount"   fill="#6366f1" radius={[4,4,0,0]} barSize={22} />
                  <Bar name="Views"     dataKey="totalViews" fill="#f59e0b" radius={[4,4,0,0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Top Ads table ── */}
          <div className="anl-card" style={{ marginTop: '1.5rem' }}>
            <div className="anl-card-header">
              <h2><BiStore size={18}/> Top Ads Performance</h2>
              <span className="anl-chip">Sorted by views</span>
            </div>
            <div className="anl-table-wrap">
              <table className="anl-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ad</th>
                    <th>Type</th>
                    <th>Targeting</th>
                    <th>Views</th>
                    <th>Clicks</th>
                    <th>CTR</th>
                    <th>Likes</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topAds.map((ad, i) => (
                    <tr key={ad.id}>
                      <td className="anl-td-rank">#{i + 1}</td>
                      <td>
                        <div className="anl-ad-cell">
                          <div className="anl-ad-type-badge" style={{
                            background: ad.mediaType === 'video' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)',
                            color: ad.mediaType === 'video' ? '#6366f1' : '#10b981'
                          }}>
                            {ad.mediaType === 'video' ? '▶ Video' : '🖼 Image'}
                          </div>
                          <div>
                            <p className="anl-ad-caption">{ad.caption || '(no caption)'}</p>
                            <p className="anl-ad-user">
                              {ad.onModel === 'Admin' ? '🛡 Platform Ad' : `@${ad.user?.username || 'user'}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="anl-ad-adtype-badge" style={{
                          background: ad.adType === 'shop' ? 'rgba(245,158,11,0.12)' : 'rgba(236,72,153,0.12)',
                          color: ad.adType === 'shop' ? '#f59e0b' : '#ec4899'
                        }}>
                          {ad.adType === 'shop' ? <><BiStore size={12}/> Shop</> : <>💬 Chat</>}
                        </span>
                      </td>
                      <td>
                        <div className="anl-geo-cell">
                          <span>{ad.targetCountry || '—'}</span>
                          {ad.targetState?.length > 0 && (
                            <span className="anl-geo-states">
                              {ad.targetState.slice(0, 2).join(', ')}
                              {ad.targetState.length > 2 && ` +${ad.targetState.length - 2}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td><strong>{fmt(ad.views)}</strong></td>
                      <td>{fmt(ad.clicks)}</td>
                      <td>
                        <span className="anl-ctr-badge" style={{
                          background: parseFloat(ad.ctr) > 5 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          color:      parseFloat(ad.ctr) > 5 ? '#10b981'              : '#f59e0b'
                        }}>
                          {ad.ctr}%
                        </span>
                      </td>
                      <td>{fmt(ad.likes)}</td>
                      <td>
                        {ad.isActive
                          ? <span className="anl-status active"><BiCheckCircle size={14}/> Active</span>
                          : <span className="anl-status inactive"><BiX   size={14}/> Off</span>}
                      </td>
                    </tr>
                  ))}
                  {topAds.length === 0 && (
                    <tr><td colSpan={9} className="anl-empty-row">No ads found for selected filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────── */
/*  MAIN PAGE COMPONENT                          */
/* ────────────────────────────────────────────── */
const AdminAnalytics = () => {
  const [tab, setTab] = useState('geo');

  return (
    <div className="anl-page">
      {/* Page header */}
      <div className="anl-page-header">
        <div>
          <h1>Analytics Center</h1>
          <p>Reel geo-hype trends &amp; ad performance — country, state &amp; district level</p>
        </div>
        <div className="anl-header-pills">
          <span className="anl-live-pill"><span className="anl-pulse" />Live Data</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="anl-tabs">
        <button className={`anl-tab ${tab === 'geo' ? 'active' : ''}`} onClick={() => setTab('geo')}>
          <BiMap size={16}/> Reel Geo Analytics
        </button>
        <button className={`anl-tab ${tab === 'ads' ? 'active' : ''}`} onClick={() => setTab('ads')}>
          <BiRocket size={16}/> Ads Analytics
        </button>
      </div>

      {/* Tab content */}
      {tab === 'geo' ? <ReelGeoTab /> : <AdsAnalyticsTab />}

      {/* ── Scoped styles ── */}
      <style>{`
        /* Page */
        .anl-page { padding: 2rem; min-height: 100vh; }
        .anl-page-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 1.75rem;
        }
        .anl-page-header h1 { font-size: 1.75rem; font-weight: 700; color: var(--admin-text); margin: 0 0 .3rem; }
        .anl-page-header p  { color: var(--admin-muted); font-size: .9rem; margin: 0; }

        /* Live pill */
        .anl-header-pills { display:flex; gap:.75rem; }
        .anl-live-pill {
          display: flex; align-items: center; gap: .45rem;
          background: rgba(16,185,129,.1); color: #10b981;
          padding: .35rem .85rem; border-radius: 20px; font-size: .82rem; font-weight: 600;
        }
        .anl-pulse {
          width: 8px; height: 8px; border-radius: 50%; background: #10b981;
          box-shadow: 0 0 0 rgba(16,185,129,.4);
          animation: anl-pulse 2s infinite;
        }
        @keyframes anl-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(16,185,129,.4); }
          70%  { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0   rgba(16,185,129,0); }
        }
        @keyframes anl-spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: anl-spin 0.8s linear infinite !important; }

        /* Tabs */
        .anl-tabs { display: flex; gap: .5rem; margin-bottom: 1.75rem; border-bottom: 2px solid rgba(0,0,0,.06); }
        .anl-tab {
          display: flex; align-items: center; gap: .4rem;
          padding: .7rem 1.4rem; border: none; background: transparent; cursor: pointer;
          font-size: .9rem; font-weight: 600; color: var(--admin-muted);
          border-bottom: 3px solid transparent; margin-bottom: -2px;
          transition: color .2s, border-color .2s;
        }
        .anl-tab:hover  { color: var(--admin-primary); }
        .anl-tab.active { color: var(--admin-primary); border-bottom-color: var(--admin-primary); }

        /* Filter bar */
        .anl-filter-bar {
          display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap;
          gap: 1rem; padding: 1rem 1.25rem;
          background: rgba(255,255,255,.7); border: 1px solid rgba(0,0,0,.07);
          border-radius: 12px; backdrop-filter: blur(8px);
          margin-bottom: 1.5rem;
        }
        .anl-filter-left, .anl-filter-right { display: flex; align-items: flex-end; gap: .85rem; flex-wrap: wrap; }
        .anl-filter-icon { color: var(--admin-primary); flex-shrink: 0; margin-bottom: 6px; }
        .anl-filter-group { display: flex; flex-direction: column; gap: .25rem; }
        .anl-filter-label { font-size: .72rem; font-weight: 600; color: var(--admin-muted); text-transform: uppercase; letter-spacing: .04em; }
        .anl-filter-select {
          padding: .45rem .85rem; border: 1.5px solid rgba(0,0,0,.1); border-radius: 8px;
          background: #fff; color: var(--admin-text); font-size: .88rem; cursor: pointer;
          transition: border-color .2s;
        }
        .anl-filter-select:focus { outline: none; border-color: var(--admin-primary); }
        .anl-refresh-btn {
          padding: .48rem .7rem; border: 1.5px solid rgba(0,0,0,.1); border-radius: 8px;
          background: #fff; cursor: pointer; display: flex; align-items: center;
          transition: background .2s, border-color .2s; margin-bottom: 0;
        }
        .anl-refresh-btn:hover { background: var(--admin-primary); color: #fff; border-color: var(--admin-primary); }
        .anl-refresh-btn:disabled { opacity: .5; cursor: default; }

        /* Stat cards */
        .anl-stats-row {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 1rem; margin-bottom: 1.5rem;
        }
        .anl-stats-6 { grid-template-columns: repeat(6, 1fr); }
        @media (max-width: 1300px) { .anl-stats-6 { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px)  { .anl-stats-row, .anl-stats-6 { grid-template-columns: repeat(2, 1fr); } }

        .anl-stat-card {
          background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 14px;
          padding: 1.25rem 1.35rem; display: flex; align-items: center; gap: 1rem;
          transition: transform .2s, box-shadow .2s;
        }
        .anl-stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        .anl-stat-icon {
          width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--acc) 12%, transparent);
          color: var(--acc);
        }
        .anl-stat-label { font-size: .75rem; font-weight: 600; color: var(--admin-muted); margin: 0 0 .2rem; text-transform: uppercase; letter-spacing: .04em; }
        .anl-stat-value { font-size: 1.55rem; font-weight: 800; color: var(--admin-text); margin: 0; line-height: 1.1; }
        .anl-stat-sub   { font-size: .77rem; color: var(--admin-muted); margin: .2rem 0 0; }
        .anl-trend       { font-size: .72rem; font-weight: 700; padding: .1rem .4rem; border-radius: 4px; }
        .anl-trend.up   { color: #10b981; background: rgba(16,185,129,.1); }
        .anl-trend.down { color: #ef4444; background: rgba(239,68,68,.1); }

        /* Cards */
        .anl-card {
          background: #fff; border: 1px solid rgba(0,0,0,.07);
          border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,.04);
        }
        .anl-card-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .anl-card-header h2 {
          display: flex; align-items: center; gap: .5rem;
          font-size: 1rem; font-weight: 700; color: var(--admin-text); margin: 0;
        }
        .anl-chip {
          font-size: .75rem; font-weight: 600; padding: .25rem .65rem;
          border-radius: 20px; background: rgba(0,0,0,.06); color: var(--admin-muted);
        }

        /* Drill toggle */
        .anl-drill-toggle { display: flex; gap: .5rem; margin-bottom: 1.25rem; }
        .anl-drill-btn {
          padding: .45rem 1.1rem; border-radius: 8px; border: 1.5px solid rgba(0,0,0,.1);
          background: #fff; font-size: .85rem; font-weight: 600; cursor: pointer;
          color: var(--admin-muted); transition: all .2s;
        }
        .anl-drill-btn.active { background: var(--admin-primary); color: #fff; border-color: var(--admin-primary); }
        .anl-drill-btn:hover:not(.active) { border-color: var(--admin-primary); color: var(--admin-primary); }

        /* 2-col charts */
        .anl-charts-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 0; }
        @media (max-width: 1024px) { .anl-charts-2col { grid-template-columns: 1fr; } }

        /* Pie */
        .anl-pie-wrap { display: flex; align-items: center; }
        .anl-pie-legend { display: flex; flex-direction: column; gap: .75rem; padding-left: 1rem; }
        .anl-pie-legend-item { display: flex; align-items: center; gap: .6rem; }
        .anl-pie-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .anl-pie-name  { font-size: .88rem; font-weight: 700; color: var(--admin-text); margin: 0; }
        .anl-pie-count { font-size: .77rem; color: var(--admin-muted); margin: 0; }

        /* Tooltip */
        .anl-tooltip {
          background: #1e1e2d; border-radius: 10px; padding: .75rem 1rem;
          font-size: .83rem; line-height: 1.6; border: none; box-shadow: 0 4px 16px rgba(0,0,0,.2);
        }
        .anl-tooltip-label { color: rgba(255,255,255,.7); font-weight: 600; margin-bottom: .25rem; }

        /* Table */
        .anl-table-wrap { overflow-x: auto; }
        .anl-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
        .anl-table thead tr {
          border-bottom: 2px solid rgba(0,0,0,.07);
        }
        .anl-table th {
          padding: .65rem .9rem; text-align: left; font-size: .72rem; font-weight: 700;
          color: var(--admin-muted); text-transform: uppercase; letter-spacing: .04em;
          white-space: nowrap;
        }
        .anl-table tbody tr {
          border-bottom: 1px solid rgba(0,0,0,.05); transition: background .15s;
        }
        .anl-table tbody tr:hover { background: rgba(99,102,241,.04); }
        .anl-table td { padding: .7rem .9rem; vertical-align: middle; }
        .anl-td-rank  { font-weight: 700; color: var(--admin-muted); font-size: .78rem; }
        .anl-td-bold  { font-weight: 700; color: var(--admin-text); }
        .anl-empty-row{ text-align: center; color: var(--admin-muted); padding: 2rem !important; }

        /* Score cell */
        .anl-score-cell { display: flex; flex-direction: column; gap: .3rem; }
        .anl-mini-bar { height: 5px; background: rgba(0,0,0,.07); border-radius: 3px; width: 80px; overflow: hidden; }
        .anl-mini-fill{ height: 100%; border-radius: 3px; transition: width .4s; }
        .anl-pct-badge { font-size: .75rem; font-weight: 700; padding: .15rem .45rem; border-radius: 4px; background: rgba(99,102,241,.1); color: #6366f1; }

        /* Ad table cells */
        .anl-ad-cell { display: flex; align-items: flex-start; gap: .65rem; }
        .anl-ad-type-badge { font-size: .7rem; font-weight: 700; padding: .15rem .5rem; border-radius: 6px; white-space: nowrap; flex-shrink: 0; margin-top: 2px; }
        .anl-ad-caption { font-size: .85rem; font-weight: 600; color: var(--admin-text); margin: 0 0 .15rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .anl-ad-user    { font-size: .75rem; color: var(--admin-muted); margin: 0; }
        .anl-ad-adtype-badge { display: inline-flex; align-items: center; gap: .3rem; font-size: .73rem; font-weight: 700; padding: .2rem .55rem; border-radius: 6px; }
        .anl-geo-cell   { display: flex; flex-direction: column; gap: .2rem; }
        .anl-geo-states { font-size: .72rem; color: var(--admin-muted); }
        .anl-ctr-badge  { font-size: .8rem; font-weight: 700; padding: .2rem .55rem; border-radius: 6px; }
        .anl-status { display: inline-flex; align-items: center; gap: .3rem; font-size: .78rem; font-weight: 600; padding: .2rem .55rem; border-radius: 6px; }
        .anl-status.active   { background: rgba(16,185,129,.1); color: #10b981; }
        .anl-status.inactive { background: rgba(239,68,68,.1);  color: #ef4444; }

        /* Loading */
        .anl-loading {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 40vh; color: var(--admin-muted);
        }
        .anl-loader {
          width: 36px; height: 36px; border: 3px solid rgba(0,0,0,.08);
          border-top-color: var(--admin-primary); border-radius: 50%;
          animation: anl-spin 1s linear infinite; margin-bottom: .75rem;
        }
        .anl-empty { color: var(--admin-muted); text-align: center; padding: 2.5rem 0; font-size: .9rem; }
      `}</style>
    </div>
  );
};

export default AdminAnalytics;

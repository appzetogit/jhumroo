import React from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import {
  BiBarChartAlt2,
  BiCog,
  BiGroup,
  BiShieldQuarter,
  BiSearch,
  BiMessageSquareDetail,
  BiBell,
  BiMusic,
  BiFlag,
  BiPlay,
  BiRocket,
  BiBookmark,
  BiSupport,
  BiFile
} from 'react-icons/bi';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminReels from './pages/AdminReels';
import AdminAudio from './pages/AdminAudio';
import AdminReports from './pages/AdminReports';
import AdminProblemReports from './pages/AdminProblemReports';
import AdminSupportRequests from './pages/AdminSupportRequests';
import AdminTermsAndPolicy from './pages/AdminTermsAndPolicy';
import AdminNotifications from './pages/AdminNotifications';
import AdminAds from './pages/AdminAds';
import AdminInterests from './pages/AdminInterests';
import AdminProfile from './pages/AdminProfile';
import AdminUserDetails from './pages/AdminUserDetails';
import AdminCreateAd from './pages/AdminCreateAd';
import AdminUserAds from './pages/AdminUserAds';
import { useAdminConfig } from '../../context/AdminConfigContext';
import { useNavigate } from 'react-router-dom';
import adminAuthService from '../../services/adminAuthService';

const isVeryLightHex = (hex) => {
  if (typeof hex !== 'string') {
    return false;
  }

  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(clean)) {
    return false;
  }

  const expanded = clean.length === 3
    ? clean
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
    : clean;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.78;
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: BiBarChartAlt2, path: '/admin/dashboard' },
  { id: 'users', label: 'Users', icon: BiGroup, path: '/admin/users' },
  { id: 'reels', label: 'Reels', icon: BiPlay, path: '/admin/reels' },
  { id: 'audio', label: 'Audio', icon: BiMusic, path: '/admin/audio' },
  { id: 'reports', label: 'Reels Reports', icon: BiFlag, path: '/admin/reports' },
  { id: 'problem-reports', label: 'Customer Report', icon: BiMessageSquareDetail, path: '/admin/problem-reports' },
  { id: 'support-requests', label: 'Support Requests', icon: BiSupport, path: '/admin/support-requests' },
  { id: 'static-pages', label: 'Terms & Policy', icon: BiFile, path: '/admin/terms-and-policy' },
  { id: 'notifications', label: 'Notifications', icon: BiBell, path: '/admin/notifications' },
  { id: 'user-ads', label: 'User Ads Manager', icon: BiGroup, path: '/admin/user-ads' },
  { id: 'ads', label: 'Advertisements', icon: BiRocket, path: '/admin/ads' },
  { id: 'interests', label: 'Interests', icon: BiBookmark, path: '/admin/interests' },
];

const AdminLayout = () => {
  const { config } = useAdminConfig();
  const adminUser = adminAuthService.getAdminUser();
  const navigate = useNavigate();
  const branding = config?.branding || {};
  const palette = branding.palette || {};
  const primary = palette.primary || '#fe2c55';
  const secondary = palette.secondary || '#ff7b93';
  const accent = palette.accent || '#ffb4c1';
  const ink = palette.ink || '#2a1117';
  const surface = palette.surface || '#ffffff';
  const mutedCandidate = palette.muted || '#a16976';
  const muted = isVeryLightHex(mutedCandidate) ? '#8f606d' : mutedCandidate;
  const adminStyle = {
    '--admin-primary': primary,
    '--admin-secondary': secondary,
    '--admin-accent': accent,
    '--admin-text': ink,
    '--admin-surface': surface,
    '--admin-muted': muted,
    '--admin-border': 'rgba(254, 44, 85, 0.15)',
    '--admin-bg': 'linear-gradient(180deg, #fff8f9 0%, #fff2f4 48%, #ffffff 100%)',
  };

  return (
    <div className="admin-shell" style={adminStyle}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.appName || 'Admin'} />
            ) : (
              <span className="admin-logo-fallback">A</span>
            )}
          </div>
          <div>
            <p className="admin-brand-title">{branding.appName || 'Admin'}</p>
            <p className="admin-brand-subtitle">Operations Console</p>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `admin-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="admin-nav-icon">
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-search">
            <BiSearch size={18} />
            <input placeholder="Search admin data, users, reels..." />
          </div>
          <div className="admin-top-actions">
            <button type="button" className="admin-icon-btn" aria-label="Notifications">
              <BiBell size={18} />
            </button>
            <button 
              type="button" 
              className="admin-profile"
              onClick={() => navigate('/admin/profile')}
            >
              <span className="admin-profile-initial">
                {adminUser?.fullName?.split(' ').map(n => n[0]).join('') || 'AD'}
              </span>
              <span className="admin-profile-text">
                <strong>{adminUser?.fullName || 'Super Admin'}</strong>
                <span>{adminUser?.email || 'Operations Console'}</span>
              </span>
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:userId" element={<AdminUserDetails />} />
            <Route path="reels" element={<AdminReels />} />
            <Route path="audio" element={<AdminAudio />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="problem-reports" element={<AdminProblemReports />} />
            <Route path="support-requests" element={<AdminSupportRequests />} />
            <Route path="terms-and-policy" element={<AdminTermsAndPolicy />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="user-ads" element={<AdminUserAds />} />
            <Route path="ads" element={<AdminAds />} />
            <Route path="ads/create" element={<AdminCreateAd />} />
            <Route path="ads/edit/:adId" element={<AdminCreateAd />} />
            <Route path="interests" element={<AdminInterests />} />
            <Route path="profile" element={<AdminProfile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

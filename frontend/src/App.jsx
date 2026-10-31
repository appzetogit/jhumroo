import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AdminConfigProvider } from './context/AdminConfigContext';
import AdminLayout from './modules/admin/AdminLayout';
import AdminLogin from './modules/admin/pages/AdminLogin';
import adminAuthService from './services/adminAuthService';
import adminStaticPageService from './services/adminStaticPageService';
import LenisProvider from './components/LenisProvider';
import { FaGooglePlay, FaApple } from 'react-icons/fa';
import logo from './assets/loginPage/Logo.png';

const storeBtn = 'flex items-center gap-3 px-5 py-3 rounded-xl bg-white text-black hover:bg-white/90 transition';

const LandingPage = () => {
  const [links, setLinks] = useState({});

  useEffect(() => {
    adminStaticPageService.getAppLinks()
      .then((res) => res.success && setLinks(res.links))
      .catch((err) => console.error('Error fetching app links:', err));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen gap-4 px-4 text-center bg-black text-white">
      <img src={logo} alt="Jhumroo" className="w-24 h-24 object-contain" />
      <h1 className="text-3xl font-bold">Jhumroo</h1>
      <p className="text-white/70">Short videos, made for you.</p>
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        {links.playStoreUrl && (
          <a href={links.playStoreUrl} target="_blank" rel="noopener noreferrer" className={storeBtn}>
            <FaGooglePlay size={24} />
            <span className="text-left leading-tight"><span className="block text-xs">GET IT ON</span><span className="block font-semibold">Google Play</span></span>
          </a>
        )}
        {links.appStoreUrl && (
          <a href={links.appStoreUrl} target="_blank" rel="noopener noreferrer" className={storeBtn}>
            <FaApple size={26} />
            <span className="text-left leading-tight"><span className="block text-xs">Download on the</span><span className="block font-semibold">App Store</span></span>
          </a>
        )}
      </div>
    </div>
  );
};

const AppContent = () => {
  const { pathname } = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    const isAdminRoute = pathname.startsWith('/admin');
    document.body.classList.toggle('app-admin-route', isAdminRoute);
    return () => document.body.classList.remove('app-admin-route');
  }, [pathname]);

  return (
    <div className={`theme-app-shell relative w-full max-w-full h-full min-h-full mx-auto flex flex-col overflow-hidden shadow-2xl ${theme === 'light' ? 'theme-is-light' : 'theme-is-dark'}`}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/*"
          element={adminAuthService.isAdminAuthenticated() ? <AdminLayout /> : <Navigate to="/admin/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <LenisProvider>
        <ThemeProvider>
          <AdminConfigProvider>
            <AppContent />
          </AdminConfigProvider>
        </ThemeProvider>
      </LenisProvider>
    </Router>
  );
}

export default App;

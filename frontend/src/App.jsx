import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom';
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
    <div className="relative flex flex-col items-center justify-center h-full min-h-screen gap-4 px-4 text-center bg-black text-white">
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
      <div className="absolute bottom-6 inset-x-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/60">
        <Link to="/terms-and-condition" className="hover:text-white underline">Terms & Conditions</Link>
        <Link to="/privacy-policy" className="hover:text-white underline">Privacy Policy</Link>
        <Link to="/child-policy" className="hover:text-white underline">Child Policy</Link>
      </div>
    </div>
  );
};

const StaticPage = ({ slug }) => {
  const [page, setPage] = useState(null);

  useEffect(() => {
    adminStaticPageService.getStaticPage(slug)
      .then((res) => res.success && setPage(res.page))
      .catch((err) => console.error('Error fetching page:', err));
  }, [slug]);

  return (
    <div className="min-h-screen h-full overflow-y-auto bg-black text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-sm text-white/60 hover:text-white">&larr; Back</Link>
        <h1 className="text-3xl font-bold mt-4 mb-6">{page?.title}</h1>
        {!page ? <p className="text-white/60">Loading...</p>
          : <div className="whitespace-pre-wrap text-white/80 leading-relaxed">{page.content || 'Content coming soon.'}</div>}
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
        <Route path="/terms-and-condition" element={<StaticPage slug="terms-and-condition" />} />
        <Route path="/privacy-policy" element={<StaticPage slug="privacy-policy" />} />
        <Route path="/child-policy" element={<StaticPage slug="child-policy" />} />
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

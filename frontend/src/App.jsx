import React, { useState, useEffect } from 'react';
import { registerFcmToken, onForegroundMessage, removeFcmToken } from './lib/fcmService';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import BottomNavBar from './modules/user/components/navigation/BottomNavBar';
import HomePage from './modules/user/pages/Home/HomePage';
import SearchPage from './modules/user/pages/Search/SearchPage';
import SearchHashtagPage from './modules/user/pages/Search/SearchHashtagPage';
import CreatePage from './modules/user/pages/Create/CreatePage';
import InboxPage from './modules/user/pages/Inbox/InboxPage';
import ProfilePage from './modules/user/pages/Profile/ProfilePage';
import SettingsPage from './modules/user/pages/Settings/SettingsPage';
import EditProfilePage from './modules/user/pages/Settings/EditProfilePage';
import PrivacyPage from './modules/user/pages/Settings/PrivacyPage';
import PrivacyCommentsPage from './modules/user/pages/Settings/PrivacyCommentsPage';
import PrivacyMentionsTagsPage from './modules/user/pages/Settings/PrivacyMentionsTagsPage';
import PrivacyDirectMessagesPage from './modules/user/pages/Settings/PrivacyDirectMessagesPage';
import PrivacyDownloadsPage from './modules/user/pages/Settings/PrivacyDownloadsPage';
import BlockedAccountsPage from './modules/user/pages/Settings/BlockedAccountsPage';
import SecurityPage from './modules/user/pages/Settings/SecurityPage';
import SecurityAlertsPage from './modules/user/pages/Settings/SecurityAlertsPage';
import YourDevicesPage from './modules/user/pages/Settings/YourDevicesPage';
import PasswordPage from './modules/user/pages/Settings/PasswordPage';
import TwoStepVerificationPage from './modules/user/pages/Settings/TwoStepVerificationPage';
import PushNotificationsPage from './modules/user/pages/Settings/PushNotificationsPage';
import LanguagePage from './modules/user/pages/Settings/LanguagePage';
import HelpCenterPage from './modules/user/pages/Settings/HelpCenterPage';
import SafetyCenterPage from './modules/user/pages/Settings/SafetyCenterPage';
import HelpPrivacySecurityPage from './modules/user/pages/Settings/HelpPrivacySecurityPage';
import ReportProblemPage from './modules/user/pages/Settings/ReportProblemPage';
import HelpArticlesPage from './modules/user/pages/Settings/HelpArticlesPage';
import HelpArticleDetailPage from './modules/user/pages/Settings/HelpArticleDetailPage';
import SupportPage from './modules/user/pages/Settings/SupportPage';
import { TermsAndConditionPage, PrivacyPolicyPage } from './modules/user/pages/Settings/StaticContentPages';
import AdsManagerPage from './modules/user/pages/Settings/AdsManagerPage';
import CreateAdPage from './modules/user/pages/Settings/CreateAdPage';
import AdAnalyticsPage from './modules/user/pages/Settings/AdAnalyticsPage';
import Splash from './modules/user/components/common/Splash';
import AuthPage from './modules/user/pages/Auth/AuthPage';
import OnboardingPage from './modules/user/pages/Auth/components/OnboardingPage';
import SoundPage from './modules/user/pages/Sound/SoundPage';
import FollowersPage from './modules/user/pages/Profile/FollowersPage';
import NewFollowersPage from './modules/user/pages/Inbox/NewFollowersPage';
import AllActivityPage from './modules/user/pages/Inbox/AllActivityPage';
import NewMessagePage from './modules/user/pages/Inbox/NewMessagePage';
import ChatPage from './modules/user/pages/Inbox/ChatPage';
import ChatMediaPage from './modules/user/pages/Inbox/ChatMediaPage';
import FollowRequestsPage from './modules/user/pages/Profile/FollowRequestsPage';
import PendingRequestsPage from './modules/user/pages/Profile/PendingRequestsPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AdminConfigProvider } from './context/AdminConfigContext';
import { SocketProvider } from './context/SocketContext';
import AdminLayout from './modules/admin/AdminLayout';
import AdminLogin from './modules/admin/pages/AdminLogin';
import { useAuth } from './context/AuthContext';
import adminAuthService from './services/adminAuthService';

const MainLayout = ({ onLogout }) => {
  const location = useLocation();
  const [showNav, setShowNav] = useState(true);

  // Hide nav on certain pages if needed, and handle theme
  useEffect(() => {
    // Dismiss keyboard on any tab/route change
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const isChatSubPage =
      location.pathname === '/inbox/new-message' ||
      location.pathname.startsWith('/inbox/chat/');
    const isSettingsPage =
      location.pathname === '/settings' ||
      location.pathname.startsWith('/settings/');
    const isSearchDetailPage = location.pathname.startsWith('/search/hashtag/');

    // Hide bottom nav on sub-pages (Sound, User Profile pages, Inbox sub-pages)
    const isSubPage = 
      location.pathname.includes('/sound/') || 
      location.pathname === '/create' ||
      location.pathname.startsWith('/user/') || 
      isSettingsPage ||
      isSearchDetailPage ||
      isChatSubPage ||
      location.pathname === '/inbox/new-followers' || 
      location.pathname === '/inbox/activity';
    
    setShowNav(!isSubPage);
  }, [location]);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reel/:reelId" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/search/hashtag/:tagSlug" element={<SearchHashtagPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/inbox/new-followers" element={<NewFollowersPage />} />
        <Route path="/inbox/activity" element={<AllActivityPage />} />
        <Route path="/inbox/new-message" element={<NewMessagePage />} />
        <Route path="/inbox/chat/:username" element={<ChatPage />} />


        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage onLogout={onLogout} />} />
        <Route path="/settings/edit-profile" element={<EditProfilePage />} />
        <Route path="/settings/interests" element={<OnboardingPage onComplete={() => window.history.back()} />} />
        <Route path="/settings/privacy" element={<PrivacyPage />} />
        <Route path="/settings/privacy/comments" element={<PrivacyCommentsPage />} />
        <Route path="/settings/privacy/mentions-tags" element={<PrivacyMentionsTagsPage />} />
        <Route path="/settings/privacy/direct-messages" element={<PrivacyDirectMessagesPage />} />
        <Route path="/settings/privacy/downloads" element={<PrivacyDownloadsPage />} />
        <Route path="/settings/privacy/blocked-accounts" element={<BlockedAccountsPage />} />
        <Route path="/settings/security" element={<SecurityPage />} />
        <Route path="/settings/security/alerts" element={<SecurityAlertsPage />} />
        <Route path="/settings/security/devices" element={<YourDevicesPage />} />
        <Route path="/settings/security/password" element={<PasswordPage />} />
        <Route path="/settings/security/two-step-verification" element={<TwoStepVerificationPage />} />
        <Route path="/settings/push-notifications" element={<PushNotificationsPage />} />
        <Route path="/settings/ads-manager" element={<AdsManagerPage />} />
        <Route path="/settings/ads-manager/create" element={<CreateAdPage />} />
        <Route path="/settings/ads-manager/analytics/:id" element={<AdAnalyticsPage />} />
        <Route path="/settings/language" element={<LanguagePage />} />
        <Route path="/settings/help-center" element={<HelpCenterPage />} />
        <Route path="/settings/support" element={<SupportPage />} />
        <Route path="/settings/help-center/safety-center" element={<SafetyCenterPage />} />
        <Route path="/settings/help-center/privacy-security" element={<HelpPrivacySecurityPage />} />
        <Route path="/settings/help-center/report-problem" element={<ReportProblemPage />} />
        <Route path="/settings/help-center/articles" element={<HelpArticlesPage />} />
        <Route path="/settings/help-center/articles/:articleSlug" element={<HelpArticleDetailPage />} />
        <Route path="/settings/terms-and-condition" element={<TermsAndConditionPage />} />
        <Route path="/settings/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/sound/:musicName" element={<SoundPage />} />
        <Route path="/user/:username" element={<ProfilePage />} />
        <Route path="/user/:username/followers" element={<FollowersPage />} />
        <Route path="/user/requests" element={<FollowRequestsPage />} />
        <Route path="/user/requests/pending" element={<PendingRequestsPage />} />
      </Routes>
      {showNav && <BottomNavBar isDarkTheme={location.pathname !== '/'} />}
    </>
  );
};


import SuspendedScreen from './modules/user/components/common/SuspendedScreen';

const AppContent = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const [appState, setAppState] = useState('launch'); // launch, auth, onboarding, main

    useEffect(() => {
        const isAdminRoute = location.pathname.startsWith('/admin');
        document.body.classList.toggle('app-admin-route', isAdminRoute);

        return () => {
          document.body.classList.remove('app-admin-route');
        };
    }, [location.pathname]);

    // Sync FCM Token and set up foreground listener when authenticated
    useEffect(() => {
        if (isAuthenticated && appState === 'main') {
            const syncFcm = async () => {
                try {
                    await registerFcmToken();
                } catch (error) {
                    console.warn('[FCM] Auto-sync failed:', error);
                }
            };
            
            const timer = setTimeout(syncFcm, 1000); // Small buffer to ensure session is stable

            // Setup foreground messaging listener
            let unsubscribe = () => {};
            onForegroundMessage((payload) => {
                console.log('[FCM] Foreground notification payload:', payload);
                
                // Show browser Notification if permitted
                if (Notification.permission === 'granted') {
                  const title = payload.notification?.title || payload.data?.title || 'Jhumroo';
                  const body = payload.notification?.body || payload.data?.body || '';
                  new Notification(title, {
                    body: body,
                    icon: '/favicon.svg',
                    tag: payload.data?.tag || payload.data?.reelId || 'jhumroo_foreground',
                  });
                }
            }).then(unsub => {
                unsubscribe = unsub;
            });

            return () => {
                clearTimeout(timer);
                if (unsubscribe) unsubscribe();
            };
        }
    }, [isAuthenticated, appState]);

    useEffect(() => {
        if (appState === 'launch') {
            // Wait for auth to finish loading first
            if (isLoading) return;

            const timer = setTimeout(() => {
                const isAdminRoute = location.pathname.startsWith('/admin');
                
                if (isAdminRoute) {
                    setAppState('main');
                } else if (isAuthenticated) {
                    if (user && !user.isOnboarded) {
                        setAppState('onboarding');
                    } else {
                        setAppState('main');
                    }
                } else {
                    setAppState('auth');
                    // Force navigate to welcome after splash only for regular app root
                    if (location.pathname === '/') {
                      navigate('/welcome', { replace: true });
                    }
                }
            }, 400); // 400ms minimum splash delay for smooth transition
            return () => clearTimeout(timer);
        }
    }, [appState, navigate, location.pathname, isAuthenticated, isLoading, user]);

    const handleAuthComplete = (needsOnboarding = false) => {
        if (needsOnboarding) {
            setAppState('onboarding');
        } else {
            setAppState('main');
            navigate('/', { replace: true });
        }
    };

    const handleOnboardingComplete = () => {
        setAppState('main');
        navigate('/', { replace: true });
    };

    const handleLogout = () => {
        removeFcmToken().catch(() => {});
        logout();
        setAppState('auth');
        navigate('/welcome', { replace: true });
    };

    // Global suspended check for regular users
    const isSuspended = isAuthenticated && user?.isBanned && !location.pathname.startsWith('/admin');

    return (
        <div className={`theme-app-shell relative w-full max-w-full h-full min-h-full mx-auto flex flex-col overflow-hidden shadow-2xl ${theme === 'light' ? 'theme-is-light' : 'theme-is-dark'}`}>
            {appState === 'launch' && <Splash />}
            {appState !== 'launch' && (
                <>
                  {isSuspended ? (
                    <SuspendedScreen reason={user?.banReason} />
                  ) : (
                    <Routes>
                        {appState === 'auth' ? (
                            <>
                                <Route path="/welcome" element={<AuthPage key="welcome" onComplete={handleAuthComplete} initialMode="signup" />} />
                                <Route path="/login" element={<AuthPage key="login" onComplete={handleAuthComplete} initialMode="login" />} />
                                <Route path="/signup" element={<AuthPage key="signup" onComplete={handleAuthComplete} initialMode="signup" />} />
                                <Route path="/settings/terms-and-condition" element={<TermsAndConditionPage backTo="/welcome" />} />
                                <Route path="/settings/privacy-policy" element={<PrivacyPolicyPage backTo="/welcome" />} />
                                <Route path="*" element={<Navigate to="/welcome" replace />} />
                            </>
                        ) : appState === 'onboarding' ? (
                            <Route path="/*" element={<OnboardingPage onComplete={handleOnboardingComplete} />} />
                        ) : (
                            <>
                              <Route path="/admin/login" element={<AdminLogin />} />
                              <Route 
                                path="/admin/*" 
                                element={
                                  adminAuthService.isAdminAuthenticated() ? 
                                  <AdminLayout /> : 
                                  <Navigate to="/admin/login" replace />
                                } 
                              />
                              <Route path="/*" element={<MainLayout onLogout={handleLogout} />} />
                            </>
                        )}
                    </Routes>
                  )}
                </>
            )}
        </div>
    );
}

function App() {
  return (
    <Router>
        <ThemeProvider>
          <AdminConfigProvider>
            <SocketProvider>
              <AppContent />
            </SocketProvider>
          </AdminConfigProvider>
        </ThemeProvider>
    </Router>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
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
import CommentBlocksPage from './modules/user/pages/Settings/CommentBlocksPage';
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
import loginBg from './assets/loginPage/LoginPageImage.webp';

// Pre-load the critical welcome background image globally to cache it immediately
const preloadBgImage = new Image();
preloadBgImage.src = loginBg;
import SoundPage from './modules/user/pages/Sound/SoundPage';
import FollowersPage from './modules/user/pages/Profile/FollowersPage';
import NewFollowersPage from './modules/user/pages/Inbox/NewFollowersPage';
import AllActivityPage from './modules/user/pages/Inbox/AllActivityPage';
import ChatPage from './modules/user/pages/Inbox/ChatPage';
import ChatMediaPage from './modules/user/pages/Inbox/ChatMediaPage';
import FollowRequestsPage from './modules/user/pages/Profile/FollowRequestsPage';
import PendingRequestsPage from './modules/user/pages/Profile/PendingRequestsPage';
import PremiumPage from './modules/user/pages/Profile/PremiumPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AdminConfigProvider } from './context/AdminConfigContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import AdminLayout from './modules/admin/AdminLayout';
import AdminLogin from './modules/admin/pages/AdminLogin';
import { useAuth } from './context/AuthContext';
import adminAuthService from './services/adminAuthService';
import LenisProvider from './components/LenisProvider';

const MainLayout = ({ onLogout }) => {
  const { pathname } = useLocation();
  const [showNav, setShowNav] = useState(true);

  // Hide nav on certain pages if needed, and handle theme
  useEffect(() => {
    // Dismiss keyboard on any tab/route change
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const isChatSubPage = pathname.startsWith('/inbox/chat/');
    const isSettingsPage =
      pathname === '/settings' ||
      pathname.startsWith('/settings/');
    const isSearchDetailPage = pathname.startsWith('/search/hashtag/');

    // Hide bottom nav on sub-pages (Sound, User Profile pages, Inbox sub-pages)
    const isSubPage = 
      pathname.includes('/sound/') || 
      pathname === '/create' ||
      pathname.startsWith('/user/') || 
      pathname === '/profile/premium' ||
      isSettingsPage ||
      isSearchDetailPage ||
      isChatSubPage ||
      pathname === '/inbox/new-followers' || 
      pathname === '/inbox/activity';
    
    setShowNav(!isSubPage);
  }, [pathname]);

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
        <Route path="/inbox/chat/:username" element={<ChatPage />} />


        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/premium" element={<PremiumPage />} />
        <Route path="/settings" element={<SettingsPage onLogout={onLogout} />} />
        <Route path="/settings/edit-profile" element={<EditProfilePage />} />
        <Route path="/settings/interests" element={<OnboardingPage onComplete={() => window.history.back()} />} />
        <Route path="/settings/privacy" element={<PrivacyPage />} />
        <Route path="/settings/privacy/comments" element={<PrivacyCommentsPage />} />
        <Route path="/settings/privacy/mentions-tags" element={<PrivacyMentionsTagsPage />} />
        <Route path="/settings/privacy/direct-messages" element={<PrivacyDirectMessagesPage />} />
        <Route path="/settings/privacy/downloads" element={<PrivacyDownloadsPage />} />
        <Route path="/settings/privacy/blocked-accounts" element={<BlockedAccountsPage />} />
        <Route path="/settings/privacy/comment-blocks" element={<CommentBlocksPage />} />
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
      {showNav && <BottomNavBar isDarkTheme={pathname !== '/'} />}
    </>
  );
};


import SuspendedScreen from './modules/user/components/common/SuspendedScreen';
import useLiveLocation from './hooks/useLiveLocation';

const AppContent = () => {
    useLiveLocation();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const [appState, setAppState] = useState('launch'); // launch, auth, onboarding, main
    const hasLaunchedBeforeRef = useRef(sessionStorage.getItem('app_launched') === 'true');

    useEffect(() => {
        const isAdminRoute = pathname.startsWith('/admin');
        document.body.classList.toggle('app-admin-route', isAdminRoute);

        return () => {
          document.body.classList.remove('app-admin-route');
        };
    }, [pathname]);

    useEffect(() => {
        // Document viewport is locked globally in index.css to prevent whole page wobble on mobile
    }, [pathname, appState]);

    // Sync FCM Token and set up foreground listener when authenticated
    // We use a ref to ensure only one listener is active at a time
    const fcmUnsubscribeRef = useRef(null);

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
            // IMPORTANT: We do NOT call `new Notification()` here because the
            // Service Worker's onBackgroundMessage already handles showing the OS
            // notification. Calling new Notification() here causes duplicates.
            // Use this handler only for in-app UI updates (e.g., toasts, badge counts).
            onForegroundMessage((payload) => {
                console.log('[FCM] Foreground notification received (in-app only):', payload?.data?.type);
                // Add in-app notification badge/toast here if needed.
                // Do NOT call new Notification() - the service worker handles OS notifications.
            }).then(unsub => {
                // Cleanup any previously registered listener before setting the new one
                if (fcmUnsubscribeRef.current) {
                    fcmUnsubscribeRef.current();
                }
                fcmUnsubscribeRef.current = unsub;
            });

            return () => {
                clearTimeout(timer);
                if (fcmUnsubscribeRef.current) {
                    fcmUnsubscribeRef.current();
                    fcmUnsubscribeRef.current = null;
                }
            };
        }
    }, [isAuthenticated, appState]);

    useEffect(() => {
        if (isLoading) return;

        // If we are still in launch state, run the initial timer
        if (appState === 'launch') {
            const timer = setTimeout(() => {
                sessionStorage.setItem('app_launched', 'true');
                const isAdminRoute = pathname.startsWith('/admin');

                if (isAdminRoute) {
                    setAppState('main');
                } else if (isAuthenticated) {
                    const isProfileCompleted = user?.isProfileCompleted !== undefined
                        ? user.isProfileCompleted
                        : (user?.username && !user.username.startsWith('user_') && user.fullName);

                    if (user && !isProfileCompleted) {
                        setAppState('auth');
                        if (pathname !== '/signup') {
                            navigate('/signup', { replace: true });
                        }
                    } else if (user && !user.isOnboarded) {
                        setAppState('onboarding');
                        if (pathname !== '/signup/interests') {
                            navigate('/signup/interests', { replace: true });
                        }
                    } else {
                        setAppState('main');
                    }
                } else {
                    setAppState('auth');
                    // Redirect legacy /welcome to / if they land on it
                    if (pathname === '/welcome') {
                      navigate('/', { replace: true });
                    }
                }
            }, hasLaunchedBeforeRef.current ? 0 : 400); // splash delay skipped on refresh within the same session
            return () => clearTimeout(timer);
        }

        // Run this check on subsequent route/auth state changes
        const isAdminRoute = pathname.startsWith('/admin');
        if (isAdminRoute) {
            setAppState('main');
            return;
        }

        if (isAuthenticated && user) {
            const isProfileCompleted = user.isProfileCompleted !== undefined
                ? user.isProfileCompleted
                : (user.username && !user.username.startsWith('user_') && user.fullName);

            if (!isProfileCompleted) {
                setAppState('auth');
                if (pathname !== '/signup') {
                    navigate('/signup', { replace: true });
                }
            } else if (!user.isOnboarded) {
                if (pathname === '/signup') {
                    // Allowed to go back to complete profile
                    if (appState !== 'auth') {
                        setAppState('auth');
                    }
                } else {
                    if (appState !== 'onboarding') {
                        setAppState('onboarding');
                    }
                    if (pathname !== '/signup/interests') {
                        navigate('/signup/interests', { replace: true });
                    }
                }
            } else {
                setAppState('main');
            }
        } else {
            setAppState('auth');
        }
    }, [pathname, isAuthenticated, isLoading, user, appState, navigate]);

    const handleAuthComplete = (needsOnboarding = false) => {
        if (needsOnboarding) {
            setAppState('onboarding');
            navigate('/signup/interests');
        } else {
            setAppState('main');
            navigate('/', { replace: true });
        }
    };

    const handleOnboardingComplete = () => {
        setAppState('main');
        navigate('/', { replace: true });
    };

    const handleOnboardingBack = () => {
        sessionStorage.setItem('signup_step', '6');
        setAppState('auth');
        navigate('/signup');
    };

    const handleLogout = async () => {
        await removeFcmToken().catch(() => {});
        logout();
        setAppState('auth');
        navigate('/', { replace: true });
    };

    // Global suspended check for regular users (support page stays reachable so a banned user can still contact support;
    // login page stays reachable too, since logout() is async and isAuthenticated doesn't flip false until it resolves)
    const isSuspended = isAuthenticated && user?.isBanned && !pathname.startsWith('/admin') && pathname !== '/settings/support' && pathname !== '/login';

    // Suspended users have no route to navigate back to - intercept back so it logs out to the login screen instead of exiting the app
    useEffect(() => {
        if (!isSuspended) return;
        window.history.pushState({ suspended: true }, '');
        const handlePopState = async () => {
            await removeFcmToken().catch(() => {});
            logout();
            setAppState('auth');
            navigate('/login', { replace: true });
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isSuspended]);

    return (
        <div className={`theme-app-shell relative w-full max-w-full h-full min-h-full mx-auto flex flex-col overflow-hidden shadow-2xl ${theme === 'light' ? 'theme-is-light' : 'theme-is-dark'}`}>
            {appState === 'launch' && !hasLaunchedBeforeRef.current && <Splash />}
            {appState !== 'launch' && (
                <>
                  {isSuspended ? (
                    <SuspendedScreen reason={user?.banReason} />
                  ) : (
                    <Routes>
                        {(appState === 'auth' || appState === 'onboarding') ? (
                            <>
                                <Route path="/" element={<AuthPage key="welcome" onComplete={handleAuthComplete} initialMode="signup" />} />
                                <Route path="/login" element={<AuthPage key="login" onComplete={handleAuthComplete} initialMode="login" />} />
                                <Route path="/signup" element={<AuthPage key="signup" onComplete={handleAuthComplete} initialMode="signup" />} />
                                <Route path="/signup/interests" element={<OnboardingPage onComplete={handleOnboardingComplete} onBack={handleOnboardingBack} />} />
                                <Route path="/settings/terms-and-condition" element={<TermsAndConditionPage backTo="/" />} />
                                <Route path="/settings/privacy-policy" element={<PrivacyPolicyPage backTo="/" />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </>
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
      <LenisProvider>
        <ThemeProvider>
          <AdminConfigProvider>
            <SocketProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </SocketProvider>
          </AdminConfigProvider>
        </ThemeProvider>
      </LenisProvider>
    </Router>
  );
}

export default App;

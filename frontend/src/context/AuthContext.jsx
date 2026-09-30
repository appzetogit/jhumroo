/**
 * Auth Context
 * Manages authentication state and multi-account switching across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const deduplicateAccounts = (accountsList) => {
  if (!Array.isArray(accountsList)) return [];
  const seen = new Set();
  const clean = [];
  for (const acc of accountsList) {
    if (!acc || !acc.user) continue;
    const u = acc.user;
    const idKey = u._id ? String(u._id) : (u.id ? String(u.id) : null);
    const usernameKey = u.username ? `u:${u.username}` : null;
    const phoneKey = u.phoneNumber ? `p:${u.phoneNumber}` : null;

    const isDuplicate = 
      (idKey && seen.has(idKey)) || 
      (usernameKey && seen.has(usernameKey)) || 
      (phoneKey && seen.has(phoneKey));

    if (!isDuplicate) {
      if (idKey) seen.add(idKey);
      if (usernameKey) seen.add(usernameKey);
      if (phoneKey) seen.add(phoneKey);
      clean.push(acc);
    }
  }
  return clean;
};

const getStoredAccounts = () => {
  try {
    const raw = localStorage.getItem('jhumroo_accounts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return deduplicateAccounts(parsed);
    }
  } catch (e) {
    console.error('Failed to parse jhumroo_accounts:', e);
  }
  return [];
};

const saveStoredAccounts = (accounts) => {
  try {
    const clean = deduplicateAccounts(accounts);
    localStorage.setItem('jhumroo_accounts', JSON.stringify(clean));
    return clean;
  } catch (e) {
    console.error('Failed to save jhumroo_accounts:', e);
    return accounts;
  }
};

const getInitialUser = () => {
  const storedUser = authService.getUser();
  if (storedUser && (storedUser.isPremium || (storedUser.fullName && !storedUser.username?.startsWith('user_')))) {
    storedUser.isOnboarded = true;
    storedUser.isProfileCompleted = true;
  }
  return storedUser;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getInitialUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [accounts, setAccounts] = useState(() => getStoredAccounts());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(authService.getToken() && authService.getUser()));
  const [isLoading, setIsLoading] = useState(() => !authService.getToken());

  // Sync accounts into storage whenever state changes
  const addAccountSession = useCallback((newToken, newRefreshToken, newUser) => {
    if (!newUser || !newToken) return;
    const currentAccounts = getStoredAccounts();
    const userId = newUser._id || newUser.id;
    const username = newUser.username;

    const existingIdx = currentAccounts.findIndex((a) => {
      const u = a.user;
      if (!u) return false;
      return (
        (userId && (u._id === userId || u.id === userId)) ||
        (username && u.username === username)
      );
    });

    let updatedAccounts;
    if (existingIdx !== -1) {
      updatedAccounts = [...currentAccounts];
      updatedAccounts[existingIdx] = {
        token: newToken,
        refreshToken: newRefreshToken || updatedAccounts[existingIdx].refreshToken || '',
        user: newUser,
      };
    } else {
      updatedAccounts = [
        ...currentAccounts,
        {
          token: newToken,
          refreshToken: newRefreshToken || '',
          user: newUser,
        },
      ];
    }

    const saved = saveStoredAccounts(updatedAccounts);
    setAccounts(saved);

    // Set as active session
    localStorage.setItem('jhumroo_token', newToken);
    localStorage.setItem('jhumroo_user', JSON.stringify(newUser));
    if (newRefreshToken) {
      localStorage.setItem('jhumroo_refresh_token', newRefreshToken);
    }
    localStorage.setItem('jhumroo_active_account_id', userId || username);

    setUser(newUser);
    setToken(newToken);
    setIsAuthenticated(true);

    window.dispatchEvent(new CustomEvent('account-switched', { detail: newUser }));
  }, []);

  const switchAccount = useCallback((targetUserId) => {
    if (!targetUserId) return false;
    const currentAccounts = getStoredAccounts();
    const targetAcc = currentAccounts.find(
      (acc) => (acc.user?._id || acc.user?.id) === targetUserId
    );
    if (!targetAcc) return false;

    // Set local storage for target account immediately
    localStorage.setItem('jhumroo_token', targetAcc.token);
    localStorage.setItem('jhumroo_user', JSON.stringify(targetAcc.user));
    if (targetAcc.refreshToken) {
      localStorage.setItem('jhumroo_refresh_token', targetAcc.refreshToken);
    } else {
      localStorage.removeItem('jhumroo_refresh_token');
    }
    localStorage.setItem('jhumroo_active_account_id', targetUserId);

    // Instant state updates
    setUser(targetAcc.user);
    setToken(targetAcc.token);
    setIsAuthenticated(true);

    window.dispatchEvent(new CustomEvent('account-switched', { detail: targetAcc.user }));

    // Re-verify profile in background asynchronously without blocking
    authService.getMe().then((response) => {
      if (response && response.success && response.user) {
        setUser(response.user);
        const latestAccs = getStoredAccounts();
        const updated = latestAccs.map((a) =>
          (a.user?._id || a.user?.id) === targetUserId ? { ...a, user: response.user } : a
        );
        saveStoredAccounts(updated);
        setAccounts(updated);
      }
    }).catch((err) => {
      console.warn('Could not sync user profile after switch:', err);
    });

    return true;
  }, []);

  const removeAccount = useCallback(async (targetUserId) => {
    const currentAccounts = getStoredAccounts();
    const filtered = currentAccounts.filter(
      (a) => (a.user?._id || a.user?.id) !== targetUserId
    );
    saveStoredAccounts(filtered);
    setAccounts(filtered);

    const currentActiveId = user?._id || user?.id;
    if (currentActiveId === targetUserId) {
      if (filtered.length > 0) {
        const nextAcc = filtered[0];
        await switchAccount(nextAcc.user?._id || nextAcc.user?.id);
      } else {
        await logout(true);
      }
    }
  }, [user, switchAccount]);

  const logout = useCallback(async (all = false) => {
    try {
      await authService.logout().catch(() => {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (all) {
        localStorage.removeItem('jhumroo_accounts');
        localStorage.removeItem('jhumroo_token');
        localStorage.removeItem('jhumroo_user');
        localStorage.removeItem('jhumroo_refresh_token');
        localStorage.removeItem('jhumroo_active_account_id');
        setAccounts([]);
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      } else {
        const currentActiveId = user?._id || user?.id;
        const currentAccounts = getStoredAccounts();
        const remaining = currentAccounts.filter(
          (a) => (a.user?._id || a.user?.id) !== currentActiveId
        );
        saveStoredAccounts(remaining);
        setAccounts(remaining);

        if (remaining.length > 0) {
          const nextAcc = remaining[0];
          await switchAccount(nextAcc.user?._id || nextAcc.user?.id);
        } else {
          localStorage.removeItem('jhumroo_accounts');
          localStorage.removeItem('jhumroo_token');
          localStorage.removeItem('jhumroo_user');
          localStorage.removeItem('jhumroo_refresh_token');
          localStorage.removeItem('jhumroo_active_account_id');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      }
    }
  }, [user, switchAccount]);

  const checkAuth = useCallback(async () => {
    try {
      const storedToken = authService.getToken();
      const storedUser = authService.getUser();
      const storedAccounts = getStoredAccounts();

      if (storedToken && storedUser) {
        if (storedUser.isPremium || (storedUser.fullName && !storedUser.username?.startsWith('user_'))) {
          storedUser.isOnboarded = true;
          storedUser.isProfileCompleted = true;
          try {
            localStorage.setItem('jhumroo_user', JSON.stringify(storedUser));
          } catch (_) {}
        }
        setUser(storedUser);
        setToken(storedToken);
        setIsAuthenticated(true);

        const activeUserId = storedUser._id || storedUser.id;
        const exists = storedAccounts.some(
          (a) => (a.user?._id || a.user?.id) === activeUserId
        );
        if (!exists) {
          const updated = [
            ...storedAccounts,
            {
              token: storedToken,
              refreshToken: localStorage.getItem('jhumroo_refresh_token') || '',
              user: storedUser,
            },
          ];
          saveStoredAccounts(updated);
          setAccounts(updated);
        } else {
          setAccounts(storedAccounts);
        }

        // Verify token with backend
        try {
          const response = await authService.getMe();
          if (response.success && response.user) {
            setUser(response.user);
            const currentAccs = getStoredAccounts();
            const updated = currentAccs.map((a) =>
              (a.user?._id || a.user?.id) === activeUserId ? { ...a, user: response.user } : a
            );
            saveStoredAccounts(updated);
            setAccounts(updated);
          }
        } catch (error) {
          console.warn('Session verification failed for active user:', error);
          const currentAccs = getStoredAccounts();
          const cleanAccounts = currentAccs.filter(
            (a) => (a.user?._id || a.user?.id) !== activeUserId
          );
          saveStoredAccounts(cleanAccounts);
          setAccounts(cleanAccounts);

          if (cleanAccounts.length > 0) {
            const nextAcc = cleanAccounts[0];
            await switchAccount(nextAcc.user?._id || nextAcc.user?.id);
            return;
          }

          // Clear invalid session
          localStorage.removeItem('jhumroo_token');
          localStorage.removeItem('jhumroo_user');
          localStorage.removeItem('jhumroo_refresh_token');
          localStorage.removeItem('jhumroo_active_account_id');
          localStorage.removeItem('jhumroo_accounts');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      } else if (storedAccounts.length > 0) {
        const first = storedAccounts[0];
        await switchAccount(first.user?._id || first.user?.id);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Stable callback

  // Check authentication status on mount only once
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendOTP = async (phoneNumber, countryCode = '+91', mode = 'signup') => {
    try {
      const response = await authService.sendOTP(phoneNumber, countryCode, mode);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const verifyOTP = async (phoneNumber, otp) => {
    try {
      const response = await authService.verifyOTP(phoneNumber, otp);
      if (response.success && response.user && response.token) {
        addAccountSession(response.token, response.refreshToken, response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const completeProfile = async (profileData) => {
    try {
      const response = await authService.completeProfile(profileData);
      if (response.success && response.user) {
        updateUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const updateUser = (userData) => {
    if (!userData) return;
    setUser((prev) => {
      const merged = { ...(prev || {}), ...userData };
      if (prev?.isOnboarded || userData.isOnboarded || userData.isPremium || merged.isPremium) {
        merged.isOnboarded = true;
      }
      if (prev?.isProfileCompleted || userData.isProfileCompleted || (merged.fullName && !merged.username?.startsWith('user_'))) {
        merged.isProfileCompleted = true;
      }
      try {
        localStorage.setItem('jhumroo_user', JSON.stringify(merged));
      } catch (_) {}
      return merged;
    });

    const currentAccounts = getStoredAccounts();
    const userId = userData?._id || userData?.id;
    if (userId) {
      const updated = currentAccounts.map((a) =>
        (a.user?._id || a.user?.id) === userId ? { ...a, user: { ...a.user, ...userData, isOnboarded: true } } : a
      );
      saveStoredAccounts(updated);
      setAccounts(updated);
    }
  };

  const updateInterests = async (interests) => {
    try {
      const response = await authService.updateInterests(interests);
      if (response.success && response.user) {
        updateUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    token,
    accounts,
    isAuthenticated,
    isLoading,
    sendOTP,
    verifyOTP,
    completeProfile,
    updateInterests,
    logout,
    updateUser,
    switchAccount,
    addAccountSession,
    removeAccount,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;


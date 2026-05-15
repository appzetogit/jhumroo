/**
 * Auth Context
 * Manages authentication state across the application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = authService.getToken();
      const storedUser = authService.getUser();

      if (token && storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
        
        // Optionally verify token with backend
        try {
          const response = await authService.getMe();
          if (response.success) {
            setUser(response.user);
          }
        } catch (error) {
          // Token invalid, clear auth
          logout();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const completeProfile = async (profileData) => {
    try {
      const response = await authService.completeProfile(profileData);
      if (response.success) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    sessionStorage.setItem('jhumroo_user', JSON.stringify(userData));
  };

  const updateInterests = async (interests) => {
    try {
      const response = await authService.updateInterests(interests);
      if (response.success) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    sendOTP,
    verifyOTP,
    completeProfile,
    updateInterests,
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

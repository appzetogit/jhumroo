import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getStoredTheme, setStoredTheme, toggleStoredTheme } from '../utils/themeSettings';

const ThemeContext = createContext({
  theme: 'dark',
  preferredTheme: 'dark',
  isDarkMode: true,
  setTheme: () => {},
  toggleTheme: () => {},
});

const FORCED_DARK_ROUTES = new Set(['/', '/welcome', '/login', '/signup']);

const getActiveTheme = (pathname, preferredTheme) =>
  FORCED_DARK_ROUTES.has(pathname) ? 'dark' : preferredTheme;

export const ThemeProvider = ({ children }) => {
  const location = useLocation();
  const [preferredTheme, setPreferredThemeState] = useState(() => getStoredTheme());
  const theme = useMemo(
    () => getActiveTheme(location.pathname, preferredTheme),
    [location.pathname, preferredTheme],
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (nextTheme) => {
    const normalizedTheme = nextTheme === 'light' ? 'light' : 'dark';
    setStoredTheme(normalizedTheme);
    setPreferredThemeState(normalizedTheme);
  };

  const toggleTheme = () => {
    setPreferredThemeState((currentTheme) => toggleStoredTheme(currentTheme));
  };

  const value = useMemo(
    () => ({
      theme,
      preferredTheme,
      isDarkMode: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [preferredTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

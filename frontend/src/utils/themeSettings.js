const THEME_KEY = 'appTheme';

export const getStoredTheme = () => {
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme) {
      return storedTheme === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  } catch {
    return 'light';
  }
};

export const setStoredTheme = (theme) => {
  localStorage.setItem(THEME_KEY, theme);
  return theme;
};

export const toggleStoredTheme = (currentTheme) => {
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  setStoredTheme(nextTheme);
  return nextTheme;
};

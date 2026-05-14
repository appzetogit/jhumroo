import { getDefaultAdminConfig } from '../data/adminDefaultConfig';

const ADMIN_CONFIG_KEY = 'adminConfig_v2';
const ADMIN_CONFIG_EVENT = 'adminConfigUpdated';
const LEGACY_PURPLE_PALETTE = {
  primary: '#5b2b88',
  secondary: '#2bc4d5',
  accent: '#f28c3a',
  ink: '#1d1533',
  surface: '#ffffff',
  muted: '#f1ecfb',
};
const LIGHT_RED_PALETTE = {
  primary: '#fe2c55',
  secondary: '#ff7b93',
  accent: '#ffb4c1',
  ink: '#2a1117',
  surface: '#ffffff',
  muted: '#a16976',
};

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const mergeDefaults = (defaults, stored) => {
  if (Array.isArray(defaults)) {
    if (!Array.isArray(stored)) return defaults;
    
    // If defaults is empty, we want to allow emptying mock data
    if (defaults.length === 0) return [];
    
    // If it's an array of objects (like settings sections or items), sync with defaults
    if (isObject(defaults[0])) {
      return defaults.map((defaultItem) => {
        const identifier = defaultItem.label || defaultItem.title || defaultItem.id;
        if (!identifier) return defaultItem;

        const storedItem = stored.find(
          (item) => (item.label || item.title || item.id) === identifier
        );

        return storedItem ? mergeDefaults(defaultItem, storedItem) : defaultItem;
      });
    }
    
    return stored;
  }

  if (isObject(defaults)) {
    const result = { ...defaults };
    if (isObject(stored)) {
      Object.keys(stored).forEach((key) => {
        if (defaults[key] !== undefined) {
          result[key] = mergeDefaults(defaults[key], stored[key]);
        } else {
          result[key] = stored[key];
        }
      });
    }
    return result;
  }

  return stored !== undefined ? stored : defaults;
};

const normalizeHex = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

const isLegacyPalette = (palette = {}) =>
  Object.entries(LEGACY_PURPLE_PALETTE).every(
    ([key, value]) => normalizeHex(palette?.[key]) === value,
  );

const normalizeBrandingPalette = (config = {}) => {
  const palette = config?.branding?.palette;
  if (!palette || !isLegacyPalette(palette)) {
    return config;
  }

  return {
    ...config,
    branding: {
      ...config.branding,
      palette: {
        ...palette,
        ...LIGHT_RED_PALETTE,
      },
    },
  };
};

export const readAdminConfig = () => {
  return getDefaultAdminConfig();
};

export const writeAdminConfig = (config) => {
  // localStorage persistence disabled
  if (typeof window !== 'undefined') {
    // Use setTimeout to ensure the event is dispatched asynchronously
    // This prevents React "Cannot update a component while rendering a different component" warnings
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(ADMIN_CONFIG_EVENT, { detail: config }));
    }, 0);
  }
};

export const resetAdminConfig = () => {
  const defaults = getDefaultAdminConfig();
  writeAdminConfig(defaults);
  return defaults;
};

export const onAdminConfigUpdate = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const listener = (event) => {
    handler(event.detail);
  };

  window.addEventListener(ADMIN_CONFIG_EVENT, listener);
  return () => window.removeEventListener(ADMIN_CONFIG_EVENT, listener);
};

export const getAdminConfigKey = () => ADMIN_CONFIG_KEY;

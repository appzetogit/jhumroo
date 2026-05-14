const SECURITY_SETTINGS_KEY = 'securitySettings';

const DEFAULT_SECURITY_SETTINGS = {
  securityAlerts: [],
  devices: [
    {
      id: 'current-device',
      name: 'Current Device',
      platform: 'Web',
      location: 'Unknown',
      lastActive: 'Current device',
      isCurrent: true,
    },
  ],
  passwordLastUpdated: '2026-03-17T09:40:00.000Z',
  twoStepEnabled: false,
  twoStepMethod: 'SMS',
};

const normalizeSecuritySettings = (value) => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SECURITY_SETTINGS;
  }

  return {
    securityAlerts: Array.isArray(value.securityAlerts)
      ? value.securityAlerts
      : DEFAULT_SECURITY_SETTINGS.securityAlerts,
    devices: Array.isArray(value.devices) ? value.devices : DEFAULT_SECURITY_SETTINGS.devices,
    passwordLastUpdated: value.passwordLastUpdated || DEFAULT_SECURITY_SETTINGS.passwordLastUpdated,
    twoStepEnabled:
      typeof value.twoStepEnabled === 'boolean'
        ? value.twoStepEnabled
        : DEFAULT_SECURITY_SETTINGS.twoStepEnabled,
    twoStepMethod: value.twoStepMethod || DEFAULT_SECURITY_SETTINGS.twoStepMethod,
  };
};

const getStoredSecuritySettings = () => {
  try {
    const storedValue = localStorage.getItem(SECURITY_SETTINGS_KEY);
    if (!storedValue) {
      return DEFAULT_SECURITY_SETTINGS;
    }

    return normalizeSecuritySettings(JSON.parse(storedValue));
  } catch {
    return DEFAULT_SECURITY_SETTINGS;
  }
};

const persistSecuritySettings = (settings) => {
  localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
};

export const getSecuritySettings = () => getStoredSecuritySettings();

export const getSecurityAlerts = () => getStoredSecuritySettings().securityAlerts;

export const markSecurityAlertReviewed = (alertId) => {
  const currentSettings = getStoredSecuritySettings();
  return persistSecuritySettings({
    ...currentSettings,
    securityAlerts: currentSettings.securityAlerts.map((alert) =>
      alert.id === alertId
        ? {
            ...alert,
            reviewed: true,
          }
        : alert,
    ),
  });
};

export const getSecurityAlertsSummary = () => {
  const unreadAlerts = getSecurityAlerts().filter((alert) => !alert.reviewed).length;

  if (unreadAlerts === 0) {
    return {
      value: 'No issues',
      color: '#4CD964',
    };
  }

  return {
    value: `${unreadAlerts} alert${unreadAlerts > 1 ? 's' : ''}`,
    color: '#FE2C55',
  };
};

export const getDevices = () => getStoredSecuritySettings().devices;

export const removeDevice = (deviceId) => {
  const currentSettings = getStoredSecuritySettings();
  return persistSecuritySettings({
    ...currentSettings,
    devices: currentSettings.devices.filter((device) => device.id !== deviceId || device.isCurrent),
  });
};

export const getDevicesSummary = () => {
  const activeDevices = getDevices().length;
  return `${activeDevices} active`;
};

export const updatePasswordMeta = () => {
  const currentSettings = getStoredSecuritySettings();
  const now = new Date().toISOString();
  return persistSecuritySettings({
    ...currentSettings,
    passwordLastUpdated: now,
  });
};

export const getPasswordSummary = () => {
  const updatedAt = new Date(getStoredSecuritySettings().passwordLastUpdated);
  return updatedAt.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export const setTwoStepVerification = (enabled, method) => {
  const currentSettings = getStoredSecuritySettings();
  return persistSecuritySettings({
    ...currentSettings,
    twoStepEnabled: enabled,
    twoStepMethod: method || currentSettings.twoStepMethod,
  });
};

export const getTwoStepSummary = () => {
  const settings = getStoredSecuritySettings();
  return settings.twoStepEnabled ? settings.twoStepMethod : 'Off';
};

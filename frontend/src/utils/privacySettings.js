const PRIVACY_SETTINGS_KEY = 'privacySettings';

const DEFAULT_PRIVACY_SETTINGS = {
  comments: 'Everyone',
  mentionsTags: 'Friends',
  directMessages: 'Friends',
  duet: 'Everyone',
  stitch: 'Everyone',
  downloads: 'On',
  privateAccount: false,
  blockedAccounts: [],
};

const normalizePrivacySettings = (value) => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  return {
    comments: value.comments || DEFAULT_PRIVACY_SETTINGS.comments,
    mentionsTags: value.mentionsTags || DEFAULT_PRIVACY_SETTINGS.mentionsTags,
    directMessages: value.directMessages || DEFAULT_PRIVACY_SETTINGS.directMessages,
    duet: value.duet || DEFAULT_PRIVACY_SETTINGS.duet,
    stitch: value.stitch || DEFAULT_PRIVACY_SETTINGS.stitch,
    downloads: value.downloads || DEFAULT_PRIVACY_SETTINGS.downloads,
    privateAccount:
      typeof value.privateAccount === 'boolean'
        ? value.privateAccount
        : DEFAULT_PRIVACY_SETTINGS.privateAccount,
    blockedAccounts: Array.isArray(value.blockedAccounts)
      ? value.blockedAccounts
      : DEFAULT_PRIVACY_SETTINGS.blockedAccounts,
  };
};

const getStoredPrivacySettings = () => {
  try {
    const storedValue = localStorage.getItem(PRIVACY_SETTINGS_KEY);
    if (!storedValue) {
      return DEFAULT_PRIVACY_SETTINGS;
    }

    return normalizePrivacySettings(JSON.parse(storedValue));
  } catch {
    return DEFAULT_PRIVACY_SETTINGS;
  }
};

const persistPrivacySettings = (settings) => {
  localStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
};

export const getPrivacySettings = () => getStoredPrivacySettings();

export const getPrivacySetting = (key) => getStoredPrivacySettings()[key];

export const setPrivacySetting = (key, value) => {
  const currentSettings = getStoredPrivacySettings();
  return persistPrivacySettings({
    ...currentSettings,
    [key]: value,
  });
};

export const togglePrivateAccount = () => {
  const currentSettings = getStoredPrivacySettings();
  return persistPrivacySettings({
    ...currentSettings,
    privateAccount: !currentSettings.privateAccount,
  });
};

export const getBlockedAccounts = () => getStoredPrivacySettings().blockedAccounts;

export const unblockAccount = (username) => {
  const currentSettings = getStoredPrivacySettings();
  return persistPrivacySettings({
    ...currentSettings,
    blockedAccounts: currentSettings.blockedAccounts.filter((account) => account.username !== username),
  });
};

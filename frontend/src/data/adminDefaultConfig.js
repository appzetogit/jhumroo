import logoUrl from '../assets/loginPage/Logo.png';

const REEL_LIBRARY = [];
const DEFAULT_SECTIONS = [
  {
    id: 'foryou',
    label: 'For You',
    reelIds: [],
  },
  {
    id: 'following',
    label: 'Following',
    reelIds: [],
  },
];

const DEFAULT_PROFILES = {};

const DEFAULT_SUGGESTED_ACCOUNTS = [];

const DEFAULT_FOLLOWER_STATS = {
  default: { followers: '0', following: '0' },
};

const DEFAULT_FOLLOWER_LISTS = {
  following: [],
  followers: [],
  suggested: [],
};

const DEFAULT_ONBOARDING_INTERESTS = [
  {
    category: 'Entertainment & Culture',
    items: ['Trends', 'TV shows', 'Marvel', 'Comedy', 'BTS', 'HBO', 'Naruto'],
  },
  {
    category: 'Home & Family',
    items: ['Motherhood', 'Parenting', 'Weddings', 'Fatherhood', 'Married life', 'Relationships'],
  },
  {
    category: 'Fashion & Beauty',
    items: ['Makeup', 'Nails', 'Sneakers', 'Hydration'],
  },
];

const DEFAULT_COMMENTS = [];

const DEFAULT_QUICK_EMOJIS = [
  '😁',
  '🥰',
  '😂',
  '😳',
  '😉',
  '😅',
  '🥺',
];

const DEFAULT_INBOX_CONTACTS = [];

const DEFAULT_INBOX_SUGGESTED = [];

const DEFAULT_ACTIVITY_GROUPS = [];

const DEFAULT_CHAT_USERS = [];

const DEFAULT_CHAT_THREADS = [];

const DEFAULT_SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: 'user', label: 'Edit profile', route: '/settings/edit-profile' },
      { icon: 'lock', label: 'Privacy', route: '/settings/privacy' },
    ],
  },
  {
    title: 'Content & Display',
    items: [
      { icon: 'bell', label: 'Push notifications', route: '/settings/push-notifications' },
      { icon: 'globe', label: 'Ads Manager', route: '/settings/ads-manager' },
      { icon: 'moon', label: 'Dark mode', isToggle: true },
      { icon: 'helpCircle', label: 'Help Center', route: '/settings/help-center' },
      { icon: 'support', label: 'Support', route: '/settings/support' },
      { icon: 'file', label: 'Terms & Condition', route: '/settings/terms-and-condition' },
      { icon: 'shield', label: 'Privacy Policy', route: '/settings/privacy-policy' },
    ],
  },
  {
    title: 'Support & About',
    items: [
      { icon: 'logout', label: 'Log out', color: '#FF3B30', isLogout: true },
    ],
  },
];

const DEFAULT_LANGUAGES = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Chinese',
  'Japanese',
  'Arabic',
  'Russian',
];

const DEFAULT_PUSH_SECTIONS = [
  {
    title: 'Interactions',
    items: [
      { label: 'Likes', default: true },
      { label: 'Comments', default: true },
      { label: 'New followers', default: true },
      { label: 'Mentions & tags', default: true },
    ],
  },
];

const DEFAULT_PRIVACY_SECTIONS = [
  {
    title: 'Interactions',
    items: [
      { icon: 'comments', label: 'Comments', value: 'comments', route: '/settings/privacy/comments' },
      { icon: 'mentions', label: 'Mentions and tags', value: 'mentionsTags', route: '/settings/privacy/mentions-tags' },
      { icon: 'messages', label: 'Direct messages', value: 'directMessages', route: '/settings/privacy/direct-messages' },
    ],
  },
  {
    title: 'Safety',
    items: [
      { icon: 'downloads', label: 'Downloads', value: 'downloads', route: '/settings/privacy/downloads' },
      { icon: 'blocked', label: 'Blocked accounts', route: '/settings/privacy/blocked-accounts' },
      { icon: 'blocked', label: 'Comment blocked', route: '/settings/privacy/comment-blocks' },
      { icon: 'lock', label: 'Private account', isToggle: true },
    ],
  },
];

const DEFAULT_SECURITY_SECTIONS = [
  {
    title: 'Security Status',
    items: [
      { icon: 'alert', label: 'Security alerts', value: 'securityAlerts', route: '/settings/security/alerts' },
      { icon: 'device', label: 'Your devices', value: 'devices', route: '/settings/security/devices' },
    ],
  },
  {
    title: 'Login Security',
    items: [
      { icon: 'password', label: 'Password', value: 'password', route: '/settings/security/password' },
      { icon: 'twoStep', label: '2-step verification', value: 'twoStep', route: '/settings/security/two-step-verification' },
    ],
  },
];

const DEFAULT_HELP_SECTIONS = [
  {
    title: 'Support',
    items: [
      { icon: 'report', label: 'Report a problem', route: '/settings/help-center/report-problem' },
    ],
  },
];

const DEFAULT_VERIFICATION_METHODS = ['SMS', 'Email', 'Authenticator app'];

const DEFAULT_AUTH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DEFAULT_AUTH_METHODS = [
  { id: 'phone', label: 'Use phone or email' },
];

const DEFAULT_HELP_CENTER_DATA = {
  reportProblemCategories: [
    'Login issue',
    'App crash',
    'Video playback',
    'Chat and messages',
    'Privacy concern',
    'Account warning',
  ],
};

export const getDefaultAdminConfig = () => ({
  branding: {
    appName: 'Jhumroo',
    logo: logoUrl,
    palette: {
      primary: '#fe2c55',
      secondary: '#ff7b93',
      accent: '#ffb4c1',
      ink: '#2a1117',
      surface: '#ffffff',
      muted: '#a16976',
    },
  },
  reels: {
    library: REEL_LIBRARY,
    sections: DEFAULT_SECTIONS,
  },
  users: {
    defaultUserId: 'johnny_dance',
    profiles: DEFAULT_PROFILES,
    followerStats: DEFAULT_FOLLOWER_STATS,
    followerLists: DEFAULT_FOLLOWER_LISTS,
    suggestions: DEFAULT_SUGGESTED_ACCOUNTS,
  },
  createFlow: {
    durations: ['15s', '30s', '60s'],
    speeds: ['0.3x', '0.5x', '1x', '2x', '3x'],
    canvasImage: '',
    galleryItems: [],
    filters: [],
    sounds: [],
    locations: {
      chips: ['Mumbai', 'Delhi', 'Bangalore', 'Goa', 'Pune', 'Lonavala'],
      results: [
        { id: '1', title: 'Mumbai, Maharashtra', subtitle: 'Popular city in Maharashtra, India' },
        { id: '2', title: 'Delhi, India', subtitle: 'Capital territory of India' },
        { id: '3', title: 'Bangalore, Karnataka', subtitle: 'Silicon Valley of India' },
        { id: '4', title: 'Goa, India', subtitle: 'Popular beach destination' },
        { id: '5', title: 'Pune, Maharashtra', subtitle: 'Cultural capital of Maharashtra' }
      ],
    },
    hashtagSuggestions: [],
    linkOptions: [],
    audienceOptions: [],
    shareTargets: [],
    sideTools: [
      { id: 'flip', label: 'Flip', icon: 'flip' },
      { id: 'speed', label: 'Speed', icon: 'speed' },
      { id: 'timer', label: 'Timer', icon: 'timer' },
      { id: 'zoom', label: 'Zoom', icon: 'zoom' },
    ],
    previewTools: [
      { id: 'text', label: 'Text', icon: 'text' },
      { id: 'speed', label: 'Speed', icon: 'speed' },
      { id: 'stickers', label: 'Stickers', icon: 'stickers' },
      { id: 'volume', label: 'Volume', icon: 'volume' },
    ],
    editorActions: [],
    editorPrimaryTabs: [],
  },
  search: {
    tabs: [
      { id: 'top', label: 'Top' },
      { id: 'videos', label: 'Videos' },
      { id: 'users', label: 'Users' },
      { id: 'sounds', label: 'Sounds' },
      { id: 'shop', label: 'Shop' },
      { id: 'live', label: 'LIVE' },
      { id: 'hashtags', label: 'Hashtags' },
    ],
    topFilters: [
      { id: 'all', label: 'All' },
      { id: 'unwatched', label: 'Unwatched' },
      { id: 'watched', label: 'Watched' },
      { id: 'recent', label: 'Recently uploaded' },
    ],
    discoverySuggestions: [],
    typeaheadPool: [],
    videos: [],
    users: [],
    sounds: [],
    shop: [],
    live: [],
    hashtags: [],
    hashtagDetails: {},
  },
  onboarding: {
    interests: [
      {
        category: 'Entertainment & Culture',
        items: ['Trends', 'TV shows', 'Marvel', 'Comedy', 'BTS', 'HBO', 'Naruto'],
      },
      {
        category: 'Home & Family',
        items: ['Motherhood', 'Parenting', 'Weddings', 'Fatherhood', 'Married life', 'Relationships'],
      },
      {
        category: 'Fashion & Beauty',
        items: ['Makeup', 'Nails', 'Sneakers', 'Hydration'],
      },
    ],
  },
  comments: {
    quickEmojis: DEFAULT_QUICK_EMOJIS,
    seedComments: [],
  },
  inbox: {
    suggestedFriends: [],
    newFollowersContacts: [],
    activityGroups: [],
    chat: {
      users: [],
      threads: [],
    },
    galleryItems: [],
    attachmentOptions: [
      { key: 'gallery', label: 'Gallery', hint: 'Open photos', route: 'gallery' },
    ],
  },
  settings: {
    sections: DEFAULT_SETTINGS_SECTIONS,
    languages: DEFAULT_LANGUAGES,
    pushNotifications: DEFAULT_PUSH_SECTIONS,
    privacySections: DEFAULT_PRIVACY_SECTIONS,
    securitySections: DEFAULT_SECURITY_SECTIONS,
    helpCenterSections: DEFAULT_HELP_SECTIONS,
    verificationMethods: DEFAULT_VERIFICATION_METHODS,
  },
  navigation: {
    bottomNav: [
      { path: '/', label: 'Home', icon: 'home', type: 'link' },
      { path: '/search', label: 'Discover', icon: 'search', type: 'link' },
      { path: '/create', label: 'Create', type: 'create' },
      { path: '/inbox', label: 'Inbox', icon: 'inbox', type: 'link' },
      { path: '/profile', label: 'Profile', icon: 'user', type: 'link' },
    ],
  },
  moderation: {
    reports: [],
  },
  features: {
    enableTrending: true,
    enableAdminAnalytics: true,
  },
  auth: {
    months: DEFAULT_AUTH_MONTHS,
    methods: DEFAULT_AUTH_METHODS,
  },
  helpCenter: DEFAULT_HELP_CENTER_DATA,
});

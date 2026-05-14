export const normalizeSearchQuery = (value = '') =>
  String(value).replace(/\s+/g, ' ').trim();

export const getDefaultSearchSuggestions = (searchConfig) =>
  searchConfig?.discoverySuggestions || [];

const matchesQuery = (query, values) => {
  if (!query) {
    return true;
  }

  return values
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query);
};

const dedupeByLabel = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const createDynamicTypeaheadSuggestions = (query) => [
  { label: query, kind: 'recent' },
  { label: `${query} tiktok`, kind: 'search' },
  { label: `${query} videos`, kind: 'search' },
  { label: `${query} live`, kind: 'search' },
];

export const getTypingSuggestions = (query, history = [], searchConfig) => {
  const normalized = normalizeSearchQuery(query);

  if (!normalized) {
    return [];
  }

  const loweredQuery = normalized.toLowerCase();
  const historySuggestions = history
    .filter((item) => item.toLowerCase().includes(loweredQuery))
    .map((item) => ({ label: item, kind: 'recent' }));
  const matchingPool = (searchConfig?.typeaheadPool || []).filter((item) =>
    item.label.toLowerCase().includes(loweredQuery),
  );

  return dedupeByLabel([
    ...historySuggestions,
    ...createDynamicTypeaheadSuggestions(normalized),
    ...matchingPool,
  ]).slice(0, 8);
};

const filterItems = (query, items, fields) =>
  items.filter((item) =>
    matchesQuery(
      query,
      fields.map((field) => {
        const value = item[field];
        return Array.isArray(value) ? value.join(' ') : value;
      }),
    ),
  );

export const getSearchResults = (query, searchConfig) => {
  const normalized = normalizeSearchQuery(query).toLowerCase();
  const videosSource = searchConfig?.videos || [];
  const usersSource = searchConfig?.users || [];
  const soundsSource = searchConfig?.sounds || [];
  const shopSource = searchConfig?.shop || [];
  const liveSource = searchConfig?.live || [];
  const hashtagSource = searchConfig?.hashtags || [];

  const fallbackVideos = videosSource.slice(0, 6);
  const fallbackUsers = usersSource.slice(0, 8);
  const fallbackSounds = soundsSource.slice(0, 7);
  const fallbackShop = shopSource.slice(0, 6);
  const fallbackLive = liveSource.slice(0, 4);
  const fallbackHashtags = hashtagSource.slice(0, 12);

  const videos = normalized
    ? filterItems(normalized, videosSource, ['title', 'caption', 'username', 'music', 'tags'])
    : fallbackVideos;
  const users = normalized
    ? filterItems(normalized, usersSource, ['username', 'displayName', 'subtitle', 'tags'])
    : fallbackUsers;
  const sounds = normalized
    ? filterItems(normalized, soundsSource, ['musicName', 'creator', 'badge', 'tags'])
    : fallbackSounds;
  const shop = normalized
    ? filterItems(normalized, shopSource, ['title', 'shopName', 'meta', 'tags'])
    : fallbackShop;
  const live = normalized
    ? filterItems(normalized, liveSource, ['title', 'host', 'tags'])
    : fallbackLive;
  const hashtags = normalized
    ? filterItems(normalized, hashtagSource, ['label', 'tags'])
    : fallbackHashtags;

  return {
    videos: videos.length > 0 ? videos : fallbackVideos,
    users: users.length > 0 ? users : fallbackUsers,
    sounds: sounds.length > 0 ? sounds : fallbackSounds,
    shop: shop.length > 0 ? shop : fallbackShop,
    live: live.length > 0 ? live : fallbackLive,
    hashtags: hashtags.length > 0 ? hashtags : fallbackHashtags,
  };
};

export const getHashtagDetail = (slug, searchConfig) => {
  const hashtagResults = searchConfig?.hashtags || [];
  const detailMap = searchConfig?.hashtagDetails || {};
  const selectedHashtag =
    hashtagResults.find((item) => item.slug === slug) || hashtagResults[0];
  const detail = detailMap[slug] || detailMap.food || detailMap[selectedHashtag?.slug];

  if (detail) {
    return {
      ...detail,
      slug: selectedHashtag?.slug || detail.slug,
      label: selectedHashtag ? `#${selectedHashtag.label}` : detail.label,
      views: selectedHashtag?.views || detail.views,
    };
  }

  return {
    slug: selectedHashtag?.slug || slug,
    label: selectedHashtag ? `#${selectedHashtag.label}` : `#${slug}`,
    views: selectedHashtag?.views || '',
    coverImage: '',
    galleryVideos: [],
  };
};

/**
 * Mapping of common hashtags to interest categories.
 * In a real production system, this would be more extensive or even ML-based.
 */
export const HASHTAG_CATEGORY_MAP = {
  // Entertainment & Anime
  'anime': 'entertainment',
  'naruto': 'entertainment',
  'onepiece': 'entertainment',
  'dragonball': 'entertainment',
  'manga': 'entertainment',
  'otaku': 'entertainment',
  'movie': 'entertainment',
  'netflix': 'entertainment',
  
  // Fitness & Health
  'fitness': 'fitness',
  'gym': 'fitness',
  'workout': 'fitness',
  'health': 'fitness',
  'yoga': 'fitness',
  'bodybuilding': 'fitness',
  
  // Technology
  'tech': 'technology',
  'coding': 'technology',
  'programming': 'technology',
  'gadgets': 'technology',
  'apple': 'technology',
  'iphone': 'technology',
  'ai': 'technology',
  
  // Automotive
  'cars': 'automotive',
  'supercars': 'automotive',
  'racing': 'automotive',
  'bikes': 'automotive',
  'luxurycars': 'automotive',
  
  // Fashion & Beauty
  'fashion': 'fashion',
  'style': 'fashion',
  'makeup': 'fashion',
  'beauty': 'fashion',
  'outfit': 'fashion',
  
  // Food
  'food': 'food',
  'cooking': 'food',
  'recipe': 'food',
  'yummy': 'food',
  'streetfood': 'food',
  
  // Travel
  'travel': 'travel',
  'nature': 'travel',
  'adventure': 'travel',
  'wanderlust': 'travel',
  'beach': 'travel'
};

/**
 * Get categories for a list of hashtags
 * @param {string[]} hashtags 
 * @returns {string[]} unique categories
 */
export const getCategoriesFromHashtags = (hashtags) => {
  if (!hashtags || !Array.isArray(hashtags)) return ['general'];
  
  const categories = new Set();
  hashtags.forEach(tag => {
    const normalizedTag = tag.toLowerCase().replace('#', '');
    if (HASHTAG_CATEGORY_MAP[normalizedTag]) {
      categories.add(HASHTAG_CATEGORY_MAP[normalizedTag]);
    }
  });
  
  return categories.size > 0 ? Array.from(categories) : ['general'];
};

/**
 * Weights for different user signals
 */
export const SIGNAL_WEIGHTS = {
  WATCH_FULL: 15,
  WATCH_COMPLETION: 0.1, // Multiplied by percentage (e.g. 90% = 9)
  REPLAY: 10,
  LIKE: 20,
  COMMENT: 25,
  SHARE: 30,
  SAVE: 35,
  FOLLOW: 50,
  
  // Negative signals
  INSTANT_SKIP: -20, // Watched < 2 seconds
  QUICK_SWIPE: -10, // Watched < 25%
  NOT_INTERESTED: -100
};

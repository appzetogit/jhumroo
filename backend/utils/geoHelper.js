import SystemSetting from '../models/SystemSetting.model.js';

/**
 * Checks if the user is allowed to view reels based on the global geo-targeting setting.
 * @param {Object} req - Express request object containing req.user
 * @returns {Boolean} - True if allowed, false otherwise
 */
export const isUserAllowedToViewReels = async (req) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'global_reels_targeting' });
    if (!setting || !setting.value || setting.value.length === 0) {
      return true; // No global rules, everyone is allowed!
    }

    const userCountry = req.user?.country || 'India';
    const userState = req.user?.state || '';

    // Find if there is a rule matching the user's country (case-insensitive)
    const matchingRule = setting.value.find(
      rule => rule.country.toLowerCase() === userCountry.toLowerCase()
    );

    if (!matchingRule) {
      return false; // User is in a country not targeted globally
    }

    // If the rule has no states, the user is allowed anywhere in this country
    if (!matchingRule.states || matchingRule.states.length === 0) {
      return true;
    }

    // Otherwise, the user's state must be in the targeted list (case-insensitive)
    return matchingRule.states.some(
      s => s.toLowerCase() === userState.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking global geo targeting:', error);
    return true; // Fallback to true on DB error so visibility doesn't break
  }
};

import UserPreference from '../models/UserPreference.model.js';
import Reel from '../models/Reel.model.js';
import WatchAnalytics from '../models/WatchAnalytics.model.js';
import { SIGNAL_WEIGHTS, getCategoriesFromHashtags } from './interestMapping.js';

/**
 * Recommendation Engine Service
 */
const RecommendationEngine = {
  /**
   * Update user interest profile based on an interaction
   * @param {string} userId 
   * @param {string} reelId 
   * @param {string} signalType - 'like', 'comment', 'share', 'save', 'watch', 'not_interested'
   * @param {Object} metadata - Additional info like watch duration, completion %
   */
  updateUserInterests: async (userId, reelId, signalType, metadata = {}) => {
    try {
      if (!userId) return;

      const reel = await Reel.findById(reelId).select('hashtags user');
      if (!reel) return;

      const categories = getCategoriesFromHashtags(reel.hashtags);
      
      let weight = 0;
      switch (signalType) {
        case 'like': weight = SIGNAL_WEIGHTS.LIKE; break;
        case 'comment': weight = SIGNAL_WEIGHTS.COMMENT; break;
        case 'share': weight = SIGNAL_WEIGHTS.SHARE; break;
        case 'save': weight = SIGNAL_WEIGHTS.SAVE; break;
        case 'not_interested': weight = SIGNAL_WEIGHTS.NOT_INTERESTED; break;
        case 'watch':
          if (metadata.isFullWatch) weight += SIGNAL_WEIGHTS.WATCH_FULL;
          if (metadata.replayCount) weight += (metadata.replayCount * SIGNAL_WEIGHTS.REPLAY);
          if (metadata.completionPercentage) {
            weight += (metadata.completionPercentage * SIGNAL_WEIGHTS.WATCH_COMPLETION);
          }
          
          // Negative watch signals
          if (metadata.watchDuration < 2) weight += SIGNAL_WEIGHTS.INSTANT_SKIP;
          else if (metadata.completionPercentage < 25) weight += SIGNAL_WEIGHTS.QUICK_SWIPE;
          break;
      }

      if (weight === 0) return;

      // Update UserPreference
      let preference = await UserPreference.findOne({ user: userId });
      if (!preference) {
        preference = await UserPreference.create({ user: userId });
      }

      // Initialize interestVectors if missing
      if (!preference.interestVectors) preference.interestVectors = new Map();

      categories.forEach(category => {
        const currentScore = preference.interestVectors.get(category) || 50; // Base score 50
        const newScore = Math.max(0, Math.min(1000, currentScore + weight)); // Cap between 0 and 1000
        preference.interestVectors.set(category, newScore);
      });

      await preference.save();
    } catch (error) {
      console.error('[RecommendationEngine] updateUserInterests failed:', error);
    }
  },

  /**
   * Calculate trending score for a reel
   * Trending = (EngagementVelocity * 0.6) + (WatchRetention * 0.4) - TimeDecay
   */
  calculateTrendingScore: (reel) => {
    const now = new Date();
    const ageInHours = (now - reel.createdAt) / (1000 * 60 * 60);
    
    // Engagement Velocity: Recent interactions / age
    const engagement = (reel.stats.likesCount * 2) + (reel.stats.commentsCount * 3) + (reel.stats.sharesCount * 5);
    const velocity = engagement / (ageInHours + 2); // Add 2 to avoid division by zero and dampen very new content

    // Watch Retention
    const averageWatchTime = reel.stats.viewsCount > 0 ? (reel.stats.totalWatchTime / reel.stats.viewsCount) : 0;
    const retentionScore = Math.min(100, (averageWatchTime / (reel.video.duration || 15)) * 100);

    // Final score with exponential time decay
    const gravity = 1.8;
    const score = (velocity * 0.6 + retentionScore * 0.4) / Math.pow(ageInHours + 2, gravity);
    
    return score;
  },

  /**
   * Build the aggregation pipeline for personalized feed
   */
  getRecommendationPipeline: async (userId, options = {}) => {
    const { limit = 10, lastScore, lastId, query = {}, isExploration = false } = options;
    
    let interestWeights = {};
    if (userId && !isExploration) {
      const preference = await UserPreference.findOne({ user: userId }).lean();
      if (preference && preference.interestVectors) {
        // Convert Map or Object to a plain object
        interestWeights = preference.interestVectors instanceof Map 
          ? Object.fromEntries(preference.interestVectors)
          : preference.interestVectors;
      }
    }

    // Default weight for exploration or new users
    const defaultWeights = { 'general': 50, 'entertainment': 40 };

    const pipeline = [
      { $match: { ...query, isActive: true, status: 'completed' } },
      {
        $addFields: {
          // Calculate interest match score based on Reel categories
          interestMatch: {
            $let: {
              vars: { 
                weightArr: { 
                  $objectToArray: { 
                    $literal: Object.keys(interestWeights).length > 0 ? interestWeights : defaultWeights 
                  } 
                } 
              },
              in: {
                $reduce: {
                  input: "$categories",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $let: {
                          vars: { 
                            match: { 
                              $filter: { 
                                input: "$$weightArr", 
                                as: "w", 
                                cond: { $eq: ["$$w.k", "$$this"] } 
                              } 
                            } 
                          },
                          in: { $ifNull: [{ $arrayElemAt: ["$$match.v", 0] }, 10] }
                        }
                      }
                    ]
                  }
                }
              }
            }
          },
          // Better Recency Score (decay over 48 hours)
          recencyScore: {
            $let: {
              vars: { hoursAgo: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000] } },
              in: { $exp: { $multiply: [-0.05, "$$hoursAgo"] } } // Exponential decay
            }
          },
          // Engagement Score (normalized)
          engagementScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$stats.likesCount", 0] }, 1] },
              { $multiply: [{ $ifNull: ["$stats.commentsCount", 0] }, 2] },
              { $multiply: [{ $ifNull: ["$stats.sharesCount", 0] }, 3] },
              { $multiply: [{ $ifNull: ["$stats.savesCount", 0] }, 2.5] },
              { $divide: [{ $ifNull: ["$stats.totalWatchTime", 0] }, 60] } // 1 point per minute
            ]
          }
        }
      },
      {
        $addFields: {
          // Final Score Formula
          // For exploration, reduce interestMatch weight and increase randomness/trending
          finalScore: {
            $add: [
              { $multiply: ["$interestMatch", isExploration ? 0.1 : 0.4] },
              { $multiply: [{ $log10: { $add: ["$engagementScore", 1] } }, 30] },
              { $multiply: ["$recencyScore", 30] },
              { $multiply: [{ $rand: {} }, isExploration ? 50 : 5] } // Higher randomness for exploration
            ]
          }
        }
      }
    ];

    // Cursor handling
    if (lastScore !== undefined && lastId) {
      pipeline.push({
        $match: {
          $or: [
            { finalScore: { $lt: lastScore } },
            { finalScore: lastScore, _id: { $lt: new mongoose.Types.ObjectId(lastId) } }
          ]
        }
      });
    }

    pipeline.push({ $sort: { finalScore: -1, _id: -1 } });
    pipeline.push({ $limit: limit });

    return pipeline;
  }
};

export default RecommendationEngine;

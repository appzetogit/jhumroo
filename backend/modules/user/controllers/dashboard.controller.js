// Premium "Dashboard & analytics": views, viewers, follows, interactions and profile visits for the
// signed-in creator over the last N days, compared with the N days before that.
import Reel from '../../../models/Reel.model.js';
import ReelView from '../../../models/ReelView.model.js';
import Follow from '../../../models/Follow.model.js';
import Like from '../../../models/Like.model.js';
import Comment from '../../../models/Comment.model.js';
import SavedReel from '../../../models/SavedReel.model.js';
import LiveStream from '../../../models/LiveStream.model.js';
import LiveComment from '../../../models/LiveComment.model.js';
import ProfileVisit from '../../../models/ProfileVisit.model.js';
import User from '../../../models/User.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

const DAY = 86400000;
const RANGES = [7, 14, 30, 90];

/**
 * @route   GET /api/users/me/dashboard?days=30
 * @access  Private (active Premium)
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const me = req.user;
  if (!(me.isPremium && me.premiumExpiresAt && new Date(me.premiumExpiresAt) > new Date())) {
    return res.status(403).json({ success: false, message: 'Dashboard & analytics is a Premium feature.' });
  }

  const days = RANGES.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const now = Date.now();
  const start = new Date(now - days * DAY);
  const prevStart = new Date(now - 2 * days * DAY);

  // ponytail: follower ids go inline into $in; fine to ~100k followers, switch to a $lookup past that.
  const [reels, followerIds, lives] = await Promise.all([
    Reel.find({ user: me._id, isActive: true })
      .select('caption postType video stats createdAt isFlagged')
      .sort({ createdAt: -1 }),
    Follow.distinct('follower', { following: me._id, status: 'accepted' }),
    LiveStream.find({ broadcaster: me._id, startedAt: { $gte: start } }).select('totalUniqueViewers likesCount startedAt').lean()
  ]);
  const reelIds = reels.map((r) => r._id);
  const followers = new Set(followerIds.map(String));
  const isFollower = { $in: ['$user', followerIds] };
  const typeOf = new Map(reels.map((r) => [String(r._id), r.postType === 'photo' ? 'posts' : 'reels']));

  const empty = () => ({ reels: { f: 0, n: 0 }, posts: { f: 0, n: 0 }, live: { f: 0, n: 0 } });
  const byType = (rows) => {
    const out = empty();
    for (const r of rows) out[typeOf.get(String(r._id.reel)) || 'reels'][r._id.f ? 'f' : 'n'] += r.n;
    return out;
  };
  const dayOf = (field) => ({ $floor: { $divide: [{ $subtract: [field, start] }, DAY] } });
  const series = (rows) => {
    const out = Array(days).fill(0);
    for (const d of rows) if (d._id >= 0 && d._id < days) out[d._id] = d.n;
    return out;
  };
  const totals = [{ $group: { _id: '$user', n: { $sum: 1 } } }, { $group: { _id: null, views: { $sum: '$n' }, viewers: { $sum: 1 } } }];
  const interactions = (Model, extra = {}) =>
    Model.aggregate([
      { $match: { reel: { $in: reelIds }, createdAt: { $gte: start }, user: { $ne: me._id }, ...extra } },
      { $group: { _id: { reel: '$reel', f: isFollower }, n: { $sum: 1 } } }
    ]);

  const [[v], likes, comments, saves, liveComments, follows, prevFollows, profileVisits] = await Promise.all([
    ReelView.aggregate([
      { $match: { reel: { $in: reelIds }, viewedAt: { $gte: prevStart } } },
      {
        $facet: {
          prev: [{ $match: { viewedAt: { $lt: start } } }, ...totals],
          cur: [{ $match: { viewedAt: { $gte: start } } }, ...totals],
          daily: [{ $match: { viewedAt: { $gte: start } } }, { $group: { _id: dayOf('$viewedAt'), n: { $sum: 1 } } }],
          dailyViewers: [
            { $match: { viewedAt: { $gte: start } } },
            { $group: { _id: { d: dayOf('$viewedAt'), u: '$user' } } },
            { $group: { _id: '$_id.d', n: { $sum: 1 } } }
          ],
          byReel: [{ $match: { viewedAt: { $gte: start } } }, { $group: { _id: { reel: '$reel', f: isFollower }, n: { $sum: 1 } } }]
        }
      }
    ]),
    interactions(Like),
    interactions(Comment, { isDeleted: { $ne: true } }),
    interactions(SavedReel),
    LiveComment.aggregate([
      { $match: { liveStream: { $in: lives.map((l) => l._id) }, user: { $ne: me._id } } },
      { $group: { _id: isFollower, n: { $sum: 1 } } }
    ]),
    Follow.aggregate([
      { $match: { following: me._id, status: 'accepted', createdAt: { $gte: start } } },
      { $group: { _id: dayOf('$createdAt'), n: { $sum: 1 } } }
    ]),
    Follow.countDocuments({ following: me._id, status: 'accepted', createdAt: { $gte: prevStart, $lt: start } }),
    ProfileVisit.countDocuments({ profile: me._id, createdAt: { $gte: start } })
  ]);

  const followsDaily = series(follows);

  const viewsByType = byType(v.byReel);
  const viewsDaily = series(v.daily);
  const viewersDaily = series(v.dailyViewers);
  let liveViews = 0;
  for (const l of lives) {
    const n = (l.totalUniqueViewers || []).length;
    for (const u of l.totalUniqueViewers || []) viewsByType.live[followers.has(String(u)) ? 'f' : 'n']++;
    const d = Math.min(days - 1, Math.floor((new Date(l.startedAt) - start) / DAY));
    viewsDaily[d] += n;
    viewersDaily[d] += n;
    liveViews += n;
  }

  const likesByType = byType(likes);
  likesByType.live.n += lives.reduce((s, l) => s + (l.likesCount || 0), 0); // live hearts are anonymous taps
  const commentsByType = byType(comments);
  for (const c of liveComments) commentsByType.live[c._id ? 'f' : 'n'] += c.n;

  // Audience breakdown only once there are enough followers for it to mean anything.
  const topLocations =
    followerIds.length >= 100
      ? await User.aggregate([
          { $match: { _id: { $in: followerIds } } },
          { $group: { _id: { $ifNull: ['$state', '$country'] }, n: { $sum: 1 } } },
          { $sort: { n: -1 } },
          { $limit: 5 }
        ])
      : [];

  res.json({
    success: true,
    days,
    start,
    views: { total: (v.cur[0]?.views || 0) + liveViews, prev: v.prev[0]?.views || 0, daily: viewsDaily, byType: viewsByType },
    viewers: { total: (v.cur[0]?.viewers || 0) + liveViews, prev: v.prev[0]?.viewers || 0, daily: viewersDaily },
    follows: { total: followsDaily.reduce((a, b) => a + b, 0), prev: prevFollows, daily: followsDaily },
    followers: followerIds.length,
    interactions: { likes: likesByType, comments: commentsByType, saves: byType(saves) },
    profileVisits,
    flaggedCount: reels.filter((r) => r.isFlagged).length,
    topLocations: topLocations.map((l) => ({ name: l._id || 'Unknown', count: l.n })),
    content: reels
      .filter((r) => r.createdAt >= start)
      .map((r) => {
        const j = r.toJSON();
        return {
          _id: j._id,
          caption: j.caption,
          postType: j.postType,
          createdAt: j.createdAt,
          thumbnail: j.video?.thumbnail || (j.postType === 'photo' ? j.video?.url : null),
          views: j.stats?.viewsCount || 0,
          likes: j.stats?.likesCount || 0,
          comments: j.stats?.commentsCount || 0,
          shares: j.stats?.sharesCount || 0,
          saves: j.stats?.savesCount || 0
        };
      })
  });
});

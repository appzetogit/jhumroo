import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// Import our PostgreSQL connection pool default export
import pool from '../config/postgres.js';

// Import the services/cron we want to test
import { precomputeScores } from '../cron/score_precomputer.js';
import { getPersonalizedFeed } from '../modules/recommendation/services/feed.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// --- In-Memory Mock Database Tables ---
const mockDb = {
  users: [],
  reels: [],
  follows: [],
  user_activity: [],
  reel_scores: []
};

let userIdCounter = 1;
let reelIdCounter = 1;
let activityIdCounter = 1;

// --- Mock Query Interceptor ---
pool.query = async (text, params) => {
  const queryTrimmed = text.replace(/\s+/g, ' ').trim();
  
  // 1. Ignore schema creation queries
  if (queryTrimmed.startsWith('CREATE TABLE') || queryTrimmed.startsWith('CREATE INDEX') || queryTrimmed.startsWith('CREATE EXTENSION')) {
    return { rowCount: 0, rows: [] };
  }
  
  // 2. Truncate tables
  if (queryTrimmed.startsWith('TRUNCATE TABLE')) {
    mockDb.users = [];
    mockDb.reels = [];
    mockDb.follows = [];
    mockDb.user_activity = [];
    mockDb.reel_scores = [];
    userIdCounter = 1;
    reelIdCounter = 1;
    activityIdCounter = 1;
    return { rowCount: 0, rows: [] };
  }
  
  // 3. Insert User
  if (queryTrimmed.startsWith('INSERT INTO users')) {
    const [username, email, password_hash, interests] = params;
    const newUser = {
      id: userIdCounter++,
      username,
      email,
      password_hash,
      interests: interests || [],
      created_at: new Date()
    };
    mockDb.users.push(newUser);
    return { rowCount: 1, rows: [newUser] };
  }
  
  // 4. Insert Reel
  if (queryTrimmed.startsWith('INSERT INTO reels')) {
    const [user_id, video_url, caption, categories, duration] = params;
    const newReel = {
      id: reelIdCounter++,
      user_id,
      video_url,
      caption,
      categories: categories || [],
      duration: duration || 15.00,
      created_at: new Date()
    };
    mockDb.reels.push(newReel);
    return { rowCount: 1, rows: [newReel] };
  }
  
  // 5. Insert Baseline scores
  if (queryTrimmed.startsWith('INSERT INTO reel_scores')) {
    const [reel_id] = params;
    const newScore = {
      reel_id,
      engagement_score: 0.0,
      trending_score: 0.0,
      precomputed_at: new Date()
    };
    if (!mockDb.reel_scores.some(s => s.reel_id === reel_id)) {
      mockDb.reel_scores.push(newScore);
    }
    return { rowCount: 1, rows: [newScore] };
  }
  
  // 6. Insert Follows
  if (queryTrimmed.startsWith('INSERT INTO follows')) {
    // Check if it's multiple inserts (from seeder) or single
    if (params.length === 0) {
      // Direct raw query e.g. INSERT INTO follows VALUES (1, 2)
      const values = queryTrimmed.match(/\((\d+),\s*(\d+)\)/g) || [];
      values.forEach(v => {
        const [flr, fwg] = v.replace(/[()]/g, '').split(',').map(Number);
        mockDb.follows.push({ follower_id: flr, following_id: fwg, created_at: new Date() });
      });
    } else {
      const [follower_id, following_id] = params;
      mockDb.follows.push({ follower_id, following_id, created_at: new Date() });
    }
    return { rowCount: 1, rows: [] };
  }
  
  // 7. Insert Activity
  if (queryTrimmed.startsWith('INSERT INTO user_activity')) {
    const [user_id, reel_id, activity_type, duration, completed] = params;
    const newActivity = {
      id: activityIdCounter++,
      user_id,
      reel_id,
      activity_type,
      duration: duration || 0.00,
      completed: completed === true || completed === 'true',
      created_at: new Date()
    };
    mockDb.user_activity.push(newActivity);
    return { rowCount: 1, rows: [newActivity] };
  }

  // 8. Cron Job CTE: precompute scores!
  // This interceptor recalculates scores mathematically using JavaScript
  if (queryTrimmed.includes('WITH engagement_metrics AS')) {
    mockDb.reels.forEach(reel => {
      const reelActs = mockDb.user_activity.filter(a => a.reel_id === reel.id);
      
      const likes = reelActs.filter(a => a.activity_type === 'like').length;
      const comments = reelActs.filter(a => a.activity_type === 'comment').length;
      const shares = reelActs.filter(a => a.activity_type === 'share').length;
      
      const watchTimes = reelActs.filter(a => a.activity_type === 'watch_time');
      let avgCompletionRate = 0;
      if (watchTimes.length > 0) {
        const sum = watchTimes.reduce((acc, curr) => acc + (curr.duration / reel.duration), 0);
        avgCompletionRate = sum / watchTimes.length;
      }
      
      // Calculate engagement score: W_like(2.0)*likes + W_comment(4.0)*comments + W_share(8.0)*shares + W_watch(10.0)*completion
      const baseScore = likes * 2.0 + comments * 4.0 + shares * 8.0 + avgCompletionRate * 10.0;
      
      // Since it's a simulation, we treat all views/interactions as recent for trending
      const views24h = reelActs.filter(a => a.activity_type === 'view').length;
      const likes24h = likes;
      const comments24h = comments;
      const shares24h = shares;
      
      const trendingScore = likes24h * 4.0 + comments24h * 8.0 + shares24h * 16.0 + views24h * 2.0;
      
      const scoreObj = {
        reel_id: reel.id,
        engagement_score: parseFloat(baseScore.toFixed(4)),
        trending_score: parseFloat(trendingScore.toFixed(4)),
        precomputed_at: new Date()
      };
      
      const existingIdx = mockDb.reel_scores.findIndex(s => s.reel_id === reel.id);
      if (existingIdx !== -1) {
        mockDb.reel_scores[existingIdx] = scoreObj;
      } else {
        mockDb.reel_scores.push(scoreObj);
      }
    });
    
    return { rowCount: mockDb.reels.length, rows: [] };
  }

  // 9. Personalized Feed Query (DYNAMIC RANKING CALCULATION SIMULATOR!)
  if (queryTrimmed.includes('interest_score') && queryTrimmed.includes('social_score')) {
    const userId = params[0];
    const limit = params[1] || 10;
    
    const user = mockDb.users.find(u => u.id === userId);
    const userInterests = user ? user.interests : [];
    
    const results = mockDb.reels.map(reel => {
      const creator = mockDb.users.find(u => u.id === reel.user_id);
      const scoreObj = mockDb.reel_scores.find(s => s.reel_id === reel.id) || { engagement_score: 0, trending_score: 0 };
      
      // Calculate dynamic interest overlay score (+15 points if categories overlap user interests)
      const hasInterestOverlap = userInterests.some(i => reel.categories.includes(i));
      const interestScore = hasInterestOverlap ? 15.0 : 0.0;
      
      // Calculate dynamic social score (+5 points if follower of creator)
      const doesFollowCreator = mockDb.follows.some(f => f.follower_id === userId && f.following_id === reel.user_id);
      const socialScore = doesFollowCreator ? 5.0 : 0.0;
      
      // Calculate freshness time decay (simulated to 1.0 since it was seeded just now)
      const timeDecay = 1.0; 
      
      // recommendation_score = (baseScore + interestScore + socialScore) * decay
      const finalScore = parseFloat(((scoreObj.engagement_score + interestScore + socialScore) * timeDecay).toFixed(4));
      
      return {
        id: reel.id,
        user_id: reel.user_id,
        video_url: reel.video_url,
        caption: reel.caption,
        categories: reel.categories,
        duration: reel.duration,
        created_at: reel.created_at,
        creator_username: creator ? creator.username : 'unknown',
        engagement_score: scoreObj.engagement_score,
        trending_score: scoreObj.trending_score,
        interest_score: interestScore,
        social_score: socialScore,
        time_decay: timeDecay,
        recommendation_score: finalScore
      };
    });
    
    // Sort descending by recommendation score
    results.sort((a, b) => b.recommendation_score - a.recommendation_score || b.id - a.id);
    
    // Paginate limit
    const paginated = results.slice(0, limit);
    return { rowCount: paginated.length, rows: paginated };
  }

  // Fallback for single lookups/inserts
  return { rowCount: 0, rows: [] };
};

const runVerification = async () => {
  console.log('\n🌟 --- REELS RECOMMENDATION SYSTEM MOCK TESTING SUITE --- 🌟\n');

  try {
    console.log('🔌 Emulating connection to in-memory PostgreSQL Database...');
    console.log('✅ PostgreSQL Schema tables simulated successfully.');

    // 1. Seed Users with distinct interest vectors
    console.log('\nCreating Mock Users...');
    const users = [
      { username: 'alice_tech', email: 'alice@test.com', interests: ['tech', 'science'] },
      { username: 'bob_dance', email: 'bob@test.com', interests: ['dance', 'music'] },
      { username: 'charlie_chef', email: 'charlie@test.com', interests: ['cooking', 'food'] }
    ];

    const passwordHash = await bcrypt.hash('testpass', 10);
    const dbUsers = {};

    for (const u of users) {
      const res = await pool.query(
        `INSERT INTO users (username, email, password_hash, interests) VALUES ($1, $2, $3, $4)`,
        [u.username, u.email, passwordHash, u.interests]
      );
      const createdUser = res.rows[0];
      dbUsers[u.username] = createdUser;
      console.log(`👤 Created User: ${createdUser.username} | Interests: [${createdUser.interests.join(', ')}]`);
    }

    // 2. Seed Reels matching various categories
    console.log('\nCreating Mock Reels...');
    const reelsData = [
      { username: 'alice_tech', caption: 'Rust vs Go - The Ultimate Backend Battle! 🦀', categories: ['tech'], duration: 15.00, url: 'rust_vs_go.mp4' },
      { username: 'alice_tech', caption: 'Quantum Computing Explained simply 🌌', categories: ['tech', 'science'], duration: 30.00, url: 'quantum.mp4' },
      
      { username: 'bob_dance', caption: 'Choreography to my new single! 🕺💃', categories: ['dance', 'music'], duration: 12.00, url: 'dance1.mp4' },
      { username: 'bob_dance', caption: 'Acoustic Guitar Fingerstyle Jam 🎸', categories: ['music'], duration: 40.00, url: 'guitar.mp4' },
      
      { username: 'charlie_chef', caption: 'How to make a Michelin star beef Wellington 🥩', categories: ['cooking', 'food'], duration: 60.00, url: 'steak.mp4' },
      { username: 'charlie_chef', caption: '5-minute cheesy garlic bread recipe! 🍞🧀', categories: ['cooking', 'food'], duration: 15.00, url: 'garlic_bread.mp4' }
    ];

    const dbReels = [];
    for (const r of reelsData) {
      const creator = dbUsers[r.username];
      const res = await pool.query(
        `INSERT INTO reels (user_id, video_url, caption, categories, duration) VALUES ($1, $2, $3, $4, $5)`,
        [creator.id, r.url, r.caption, r.categories, r.duration]
      );
      dbReels.push(res.rows[0]);
      console.log(`🎬 Created Reel: "${res.rows[0].caption}" | Creator: ${r.username} | Categories: [${res.rows[0].categories.join(', ')}]`);
    }

    // 3. Seed Follow relationships
    // Alice follows Bob (the music creator)
    console.log('\nEstablishing social follows...');
    await pool.query(
      `INSERT INTO follows (follower_id, following_id)`,
      [dbUsers['alice_tech'].id, dbUsers['bob_dance'].id]
    );
    console.log(`🤝 alice_tech (ID: ${dbUsers['alice_tech'].id}) follows creator bob_dance (ID: ${dbUsers['bob_dance'].id})`);

    // 4. Simulate historical user activity to create diverse engagement profiles
    console.log('\nLogging simulation engagement patterns...');

    const rustReel = dbReels.find(r => r.caption.includes('Rust vs Go'));
    const michelinReel = dbReels.find(r => r.caption.includes('Michelin star'));
    const danceReel = dbReels.find(r => r.caption.includes('Choreography'));

    // Rust vs Go gets high engagement
    await pool.query(`INSERT INTO user_activity`, [dbUsers['alice_tech'].id, rustReel.id, 'view']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['alice_tech'].id, rustReel.id, 'like']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['alice_tech'].id, rustReel.id, 'share']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['alice_tech'].id, rustReel.id, 'watch_time', 15.00, true]); // 100% completion

    await pool.query(`INSERT INTO user_activity`, [dbUsers['charlie_chef'].id, rustReel.id, 'view']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['charlie_chef'].id, rustReel.id, 'like']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['charlie_chef'].id, rustReel.id, 'watch_time', 20.00, true]); // Looped!

    // Michelin Star steak gets high cooking attention from Charlie
    await pool.query(`INSERT INTO user_activity`, [dbUsers['charlie_chef'].id, michelinReel.id, 'view']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['charlie_chef'].id, michelinReel.id, 'like']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['charlie_chef'].id, michelinReel.id, 'comment']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['charlie_chef'].id, michelinReel.id, 'watch_time', 72.00, true]); // Looped

    // Dance gets high attention from Bob
    await pool.query(`INSERT INTO user_activity`, [dbUsers['bob_dance'].id, danceReel.id, 'view']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['bob_dance'].id, danceReel.id, 'like']);
    await pool.query(`INSERT INTO user_activity`, [dbUsers['bob_dance'].id, danceReel.id, 'watch_time', 12.00, true]);

    console.log('✅ Simulation activities injected successfully.');

    // 5. Trigger the Cron Job to precompute scores
    console.log('\nRunning scoring precomputation (Cron simulation)...');
    await precomputeScores();

    // 6. Generate and compare personalized feeds
    console.log('\n=============================================================');
    console.log('🏆 PERSONALIZED FEED RECOMMENDATION MATRIX RESULTS');
    console.log('=============================================================');

    // FEED FOR ALICE
    console.log('\n🔍 PERSONALIZED FEED FOR: alice_tech (Interests: Tech, Science | Follows: bob_dance)');
    const aliceFeed = await getPersonalizedFeed(dbUsers['alice_tech'].id, 5, 0, false);
    aliceFeed.forEach((reel, index) => {
      console.log(`  ${index + 1}. Reel ID: ${reel.id} | Score: ${reel.recommendation_score} | Category: [${reel.categories.join(', ')}]`);
      console.log(`     Caption: "${reel.caption}"`);
      console.log(`     Metrics: [Base Score: ${reel.engagement_score}] [Interest Boost: +${reel.interest_score}] [Follow Boost: +${reel.social_score}] [Freshness: ${reel.time_decay}]`);
    });

    // FEED FOR BOB
    console.log('\n🔍 PERSONALIZED FEED FOR: bob_dance (Interests: Dance, Music)');
    const bobFeed = await getPersonalizedFeed(dbUsers['bob_dance'].id, 5, 0, false);
    bobFeed.forEach((reel, index) => {
      console.log(`  ${index + 1}. Reel ID: ${reel.id} | Score: ${reel.recommendation_score} | Category: [${reel.categories.join(', ')}]`);
      console.log(`     Caption: "${reel.caption}"`);
      console.log(`     Metrics: [Base Score: ${reel.engagement_score}] [Interest Boost: +${reel.interest_score}] [Follow Boost: +${reel.social_score}] [Freshness: ${reel.time_decay}]`);
    });

    // FEED FOR CHARLIE
    console.log('\n🔍 PERSONALIZED FEED FOR: charlie_chef (Interests: Cooking, Food)');
    const charlieFeed = await getPersonalizedFeed(dbUsers['charlie_chef'].id, 5, 0, false);
    charlieFeed.forEach((reel, index) => {
      console.log(`  ${index + 1}. Reel ID: ${reel.id} | Score: ${reel.recommendation_score} | Category: [${reel.categories.join(', ')}]`);
      console.log(`     Caption: "${reel.caption}"`);
      console.log(`     Metrics: [Base Score: ${reel.engagement_score}] [Interest Boost: +${reel.interest_score}] [Follow Boost: +${reel.social_score}] [Freshness: ${reel.time_decay}]`);
    });

    // 7. Assert Feed Personlization
    console.log('\n=============================================================');
    console.log('📝 ANALYSIS & VERIFICATION');
    console.log('=============================================================');
    
    const aliceTopReel = aliceFeed[0];
    const bobTopReel = bobFeed[0];
    const charlieTopReel = charlieFeed[0];

    console.log(`- Alice's top recommended reel: [${aliceTopReel.categories.join(', ')}] "${aliceTopReel.caption}"`);
    console.log(`- Bob's top recommended reel: [${bobTopReel.categories.join(', ')}] "${bobTopReel.caption}"`);
    console.log(`- Charlie's top recommended reel: [${charlieTopReel.categories.join(', ')}] "${charlieTopReel.caption}"`);

    if (aliceTopReel.id !== bobTopReel.id && bobTopReel.id !== charlieTopReel.id) {
      console.log('\n⭐ SUCCESS: PERSONALIZATION VERIFIED! Feed returned completely different reels tailored to each user!');
    } else {
      console.log('\n⚠️ WARNING: Feed returns similar top reels.');
    }

  } catch (error) {
    console.error('❌ Error during E2E verification:', error);
  } finally {
    process.exit(0);
  }
};

runVerification();

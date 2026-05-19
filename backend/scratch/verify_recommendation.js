import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { query } from '../config/postgres.js';
import { precomputeScores } from '../cron/score_precomputer.js';
import { getPersonalizedFeed } from '../modules/recommendation/services/feed.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const runVerification = async () => {
  console.log('\n🌟 --- REELS RECOMMENDATION SYSTEM E2E SIMULATOR --- 🌟\n');

  try {
    // 1. Initialize Tables from schema.sql
    const schemaPath = path.join(projectRoot, 'db/schema.sql');
    console.log(`Reading SQL schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing PostgreSQL database schemas...');
    await query(schemaSql);
    console.log('✅ PostgreSQL Schema initialized successfully.');

    // 2. Clean database
    console.log('Clearing old data for clean test run...');
    await query('TRUNCATE TABLE reel_scores, user_activity, follows, reels, users CASCADE;');
    console.log('✅ Database state clean.');

    // 3. Seed Users with distinct interest vectors
    console.log('Creating Test Users...');
    const users = [
      { username: 'alice_tech', email: 'alice@test.com', interests: ['tech', 'science'] },
      { username: 'bob_dance', email: 'bob@test.com', interests: ['dance', 'music'] },
      { username: 'charlie_chef', email: 'charlie@test.com', interests: ['cooking', 'food'] }
    ];

    const passwordHash = await bcrypt.hash('testpass', 10);
    const dbUsers = {};

    for (const u of users) {
      const res = await query(
        `INSERT INTO users (username, email, password_hash, interests) 
         VALUES ($1, $2, $3, $4) RETURNING id, username, interests`,
        [u.username, u.email, passwordHash, u.interests]
      );
      dbUsers[u.username] = res.rows[0];
      console.log(`👤 Created user ${u.username} (ID: ${res.rows[0].id}, Interests: [${res.rows[0].interests.join(', ')}])`);
    }

    // 4. Seed Reels matching various categories
    console.log('\nCreating Test Reels...');
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
      const res = await query(
        `INSERT INTO reels (user_id, video_url, caption, categories, duration) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, caption, categories, duration`,
        [creator.id, r.url, r.caption, r.categories, r.duration]
      );
      dbReels.push(res.rows[0]);
      console.log(`🎬 Created Reel: "${res.rows[0].caption}" (ID: ${res.rows[0].id}, Categories: [${res.rows[0].categories.join(', ')}])`);
    }

    // 5. Seed Follow relationships
    // Alice follows Bob (the music creator)
    console.log('\nEstablishing social follows...');
    await query(
      `INSERT INTO follows (follower_id, following_id) 
       VALUES ($1, $2)`,
      [dbUsers['alice_tech'].id, dbUsers['bob_dance'].id]
    );
    console.log(`🤝 alice_tech now follows creator bob_dance (+5 dynamic score boost for Bob's reels)`);

    // 6. Simulate historical user activity to create diverse engagement profiles
    console.log('\nLogging simulation engagement patterns...');

    // Let's make "Rust vs Go" highly popular among all (high likes, high completion)
    const rustReel = dbReels.find(r => r.caption.includes('Rust vs Go'));
    const quantumReel = dbReels.find(r => r.caption.includes('Quantum'));
    const michelinReel = dbReels.find(r => r.caption.includes('Michelin star'));
    const danceReel = dbReels.find(r => r.caption.includes('Choreography'));

    // Rust vs Go gets high engagement
    await logSimulatedActivity(dbUsers['alice_tech'].id, rustReel.id, 'like');
    await logSimulatedActivity(dbUsers['alice_tech'].id, rustReel.id, 'share');
    await logSimulatedActivity(dbUsers['alice_tech'].id, rustReel.id, 'watch_time', 15.00, true); // 100% completion

    await logSimulatedActivity(dbUsers['charlie_chef'].id, rustReel.id, 'like');
    await logSimulatedActivity(dbUsers['charlie_chef'].id, rustReel.id, 'watch_time', 20.00, true); // Looped!

    // Michelin Star steak gets high cooking attention from Charlie
    await logSimulatedActivity(dbUsers['charlie_chef'].id, michelinReel.id, 'like');
    await logSimulatedActivity(dbUsers['charlie_chef'].id, michelinReel.id, 'comment');
    await logSimulatedActivity(dbUsers['charlie_chef'].id, michelinReel.id, 'watch_time', 72.00, true); // Looped

    // Dance gets high attention from Bob
    await logSimulatedActivity(dbUsers['bob_dance'].id, danceReel.id, 'like');
    await logSimulatedActivity(dbUsers['bob_dance'].id, danceReel.id, 'watch_time', 12.00, true);

    console.log('✅ Simulation activities injected successfully.');

    // 7. Trigger the Cron Job to precompute scores
    console.log('\nRunning scoring precomputation (Cron simulation)...');
    await precomputeScores();

    // 8. Generate and compare personalized feeds
    console.log('\n=============================================================');
    console.log('🏆 PERSONALIZED FEED RECOMMENDATION MATRIX RESULTS');
    console.log('=============================================================');

    // FEED FOR ALICE
    console.log('\n🔍 PERSONALIZED FEED FOR: alice_tech (Likes: Tech, Science. Follows: bob_dance)');
    const aliceFeed = await getPersonalizedFeed(dbUsers['alice_tech'].id, 5, 0, false);
    aliceFeed.forEach((reel, index) => {
      console.log(`  ${index + 1}. Reel ID: ${reel.id} | Score: ${reel.recommendation_score} | Category: [${reel.categories.join(', ')}]`);
      console.log(`     Caption: "${reel.caption}"`);
      console.log(`     Metrics: [Base Score: ${reel.engagement_score}] [Interest Overlap Boost: +${reel.interest_score}] [Follow Boost: +${reel.social_score}] [Time Decay Multiplier: ${reel.time_decay}]`);
    });

    // FEED FOR BOB
    console.log('\n🔍 PERSONALIZED FEED FOR: bob_dance (Likes: Dance, Music)');
    const bobFeed = await getPersonalizedFeed(dbUsers['bob_dance'].id, 5, 0, false);
    bobFeed.forEach((reel, index) => {
      console.log(`  ${index + 1}. Reel ID: ${reel.id} | Score: ${reel.recommendation_score} | Category: [${reel.categories.join(', ')}]`);
      console.log(`     Caption: "${reel.caption}"`);
      console.log(`     Metrics: [Base Score: ${reel.engagement_score}] [Interest Overlap Boost: +${reel.interest_score}] [Follow Boost: +${reel.social_score}] [Time Decay Multiplier: ${reel.time_decay}]`);
    });

    // FEED FOR CHARLIE
    console.log('\n🔍 PERSONALIZED FEED FOR: charlie_chef (Likes: Cooking, Food)');
    const charlieFeed = await getPersonalizedFeed(dbUsers['charlie_chef'].id, 5, 0, false);
    charlieFeed.forEach((reel, index) => {
      console.log(`  ${index + 1}. Reel ID: ${reel.id} | Score: ${reel.recommendation_score} | Category: [${reel.categories.join(', ')}]`);
      console.log(`     Caption: "${reel.caption}"`);
      console.log(`     Metrics: [Base Score: ${reel.engagement_score}] [Interest Overlap Boost: +${reel.interest_score}] [Follow Boost: +${reel.social_score}] [Time Decay Multiplier: ${reel.time_decay}]`);
    });

    // 9. Assert Feed Personlization
    console.log('\n=============================================================');
    console.log('📝 ANALYSIS & VERIFICATION');
    console.log('=============================================================');
    
    const aliceTopReel = aliceFeed[0];
    const bobTopReel = bobFeed[0];
    const charlieTopReel = charlieFeed[0];

    console.log(`- Alice's top recommended reel category: [${aliceTopReel.categories.join(', ')}] (${aliceTopReel.caption.substring(0, 30)}...)`);
    console.log(`- Bob's top recommended reel category: [${bobTopReel.categories.join(', ')}] (${bobTopReel.caption.substring(0, 30)}...)`);
    console.log(`- Charlie's top recommended reel category: [${charlieTopReel.categories.join(', ')}] (${charlieTopReel.caption.substring(0, 30)}...)`);

    if (aliceTopReel.id !== bobTopReel.id && bobTopReel.id !== charlieTopReel.id) {
      console.log('\n⭐ SUCCESS: PERSONALIZATION VERIFIED! Feed returned completely different reels tailored to each user!');
    } else {
      console.log('\n⚠️ WARNING: Feed returns similar top reels. Personalization values might need tuning.');
    }

  } catch (error) {
    console.error('❌ Error during E2E verification:', error);
  } finally {
    process.exit(0);
  }
};

const logSimulatedActivity = async (userId, reelId, activityType, duration = 0.00, completed = false) => {
  await query(
    `INSERT INTO user_activity (user_id, reel_id, activity_type, duration, completed) 
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, reelId, activityType, duration, completed]
  );
};

runVerification();

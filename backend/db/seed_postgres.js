import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { query } from '../config/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDatabase = async () => {
  console.log('🚀 Starting PostgreSQL Database Seeding...');

  try {
    // 1. Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Creating database tables...');
    await query(schemaSql);
    console.log('✅ Tables and Indexes initialized successfully!');

    // Clean existing tables (in order of dependencies)
    console.log('Cleaning up existing data...');
    await query('TRUNCATE TABLE reel_scores, user_activity, follows, reels, users CASCADE;');
    console.log('✅ Existing data truncated.');

    // 2. Seed Users
    console.log('Seeding users...');
    const usersData = [
      { username: 'alice_tech', email: 'alice@example.com', interests: ['tech', 'gaming', 'science'] },
      { username: 'bob_dance', email: 'bob@example.com', interests: ['dance', 'music', 'comedy'] },
      { username: 'charlie_chef', email: 'charlie@example.com', interests: ['cooking', 'food', 'travel'] },
      { username: 'dave_all', email: 'dave@example.com', interests: ['tech', 'dance', 'cooking', 'comedy'] },
      { username: 'eve_comedy', email: 'eve@example.com', interests: ['comedy', 'music'] },
      { username: 'creator_jack', email: 'jack@example.com', interests: ['music', 'dance'] },
      { username: 'creator_sara', email: 'sara@example.com', interests: ['tech', 'science'] },
    ];

    const passwordHash = await bcrypt.hash('password123', 10);
    const users = [];

    for (const u of usersData) {
      const res = await query(
        `INSERT INTO users (username, email, password_hash, interests) 
         VALUES ($1, $2, $3, $4) RETURNING id, username, interests`,
        [u.username, u.email, passwordHash, u.interests]
      );
      users.push(res.rows[0]);
    }
    console.log(`✅ Seeded ${users.length} users.`);

    // 3. Seed Reels (with different categories and durations)
    console.log('Seeding reels...');
    const jack = users.find(u => u.username === 'creator_jack');
    const sara = users.find(u => u.username === 'creator_sara');
    const alice = users.find(u => u.username === 'alice_tech');
    
    const reelsData = [
      // Tech Reels (by Sara or Alice)
      { user_id: sara.id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/tech1.mp4', caption: 'Deep dive into Postgres optimization! ⚡', categories: ['tech', 'science'], duration: 15.00 },
      { user_id: sara.id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/tech2.mp4', caption: 'React 19 features you need to know!', categories: ['tech', 'gaming'], duration: 20.00 },
      { user_id: sara.id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/science1.mp4', caption: 'How black holes bend time 🌌', categories: ['science'], duration: 30.00 },
      
      // Dance/Music Reels (by Jack)
      { user_id: jack.id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/dance1.mp4', caption: 'Check out my new dance steps! 🕺💃', categories: ['dance', 'music'], duration: 12.00 },
      { user_id: jack.id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/music1.mp4', caption: 'Acoustic cover of my favorite song 🎸', categories: ['music'], duration: 45.00 },
      { user_id: jack.id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/comedy1.mp4', caption: 'When the code compiles on the first try 😂', categories: ['comedy', 'tech'], duration: 10.00 },
      
      // Cooking/Food Reels (by Charlie)
      { user_id: users.find(u => u.username === 'charlie_chef').id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/cook1.mp4', caption: 'Cooking the perfect medium rare steak 🥩', categories: ['cooking', 'food'], duration: 60.00 },
      { user_id: users.find(u => u.username === 'charlie_chef').id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/cook2.mp4', caption: 'Secret 5-minute pasta recipe! 🍝', categories: ['cooking', 'food', 'travel'], duration: 18.00 },
      
      // General Reels
      { user_id: users.find(u => u.username === 'eve_comedy').id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/comedy2.mp4', caption: 'Every Monday morning standup meetings... 💀', categories: ['comedy'], duration: 15.00 },
      { user_id: users.find(u => u.username === 'dave_all').id, video_url: 'https://jhumroo-media-prod.s3.amazonaws.com/travel1.mp4', caption: 'Backpacking in Swiss Alps 🏔️', categories: ['travel'], duration: 25.00 }
    ];

    const reels = [];
    for (const r of reelsData) {
      const res = await query(
        `INSERT INTO reels (user_id, video_url, caption, categories, duration) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, categories, duration`,
        [r.user_id, r.video_url, r.caption, r.categories, r.duration]
      );
      reels.push(res.rows[0]);
    }
    console.log(`✅ Seeded ${reels.length} reels.`);

    // 4. Seed Follows
    console.log('Seeding follows...');
    // Alice follows Sara (science/tech creator) and Jack (music)
    const bob = users.find(u => u.username === 'bob_dance');
    const charlie = users.find(u => u.username === 'charlie_chef');
    
    await query(`INSERT INTO follows (follower_id, following_id) VALUES 
      (${alice.id}, ${sara.id}),
      (${alice.id}, ${jack.id}),
      (${bob.id}, ${jack.id}),
      (${charlie.id}, ${sara.id})
    `);
    console.log('✅ Seeded follows relations.');

    // 5. Seed Activities to make specific reels high-engagement
    console.log('Seeding user activities (views, watch time, likes, shares, comments)...');
    
    // Get reels by category to make users interact according to their interest
    const techReel1 = reels.find(r => r.categories.includes('tech'));
    const danceReel1 = reels.find(r => r.categories.includes('dance'));
    const cookReel1 = reels.find(r => r.categories.includes('cooking'));

    // Alice (tech lover) interacts with techReel1
    await logUserActivity(alice.id, techReel1.id, 'view');
    await logUserActivity(alice.id, techReel1.id, 'watch_time', techReel1.duration * 1.5, true); // Looped! Completed!
    await logUserActivity(alice.id, techReel1.id, 'like');
    await logUserActivity(alice.id, techReel1.id, 'comment');
    await logUserActivity(alice.id, techReel1.id, 'share');

    // Bob (dance lover) interacts with danceReel1
    await logUserActivity(bob.id, danceReel1.id, 'view');
    await logUserActivity(bob.id, danceReel1.id, 'watch_time', danceReel1.duration * 0.9, false); // Watched 90%
    await logUserActivity(bob.id, danceReel1.id, 'like');
    await logUserActivity(bob.id, danceReel1.id, 'share');

    // Charlie (chef) interacts with cookReel1
    await logUserActivity(charlie.id, cookReel1.id, 'view');
    await logUserActivity(charlie.id, cookReel1.id, 'watch_time', cookReel1.duration * 1.2, true); // Completed
    await logUserActivity(charlie.id, cookReel1.id, 'like');
    await logUserActivity(charlie.id, cookReel1.id, 'comment');

    // Dave (all) interacts with everything a bit
    for (const r of reels) {
      await logUserActivity(users.find(u => u.username === 'dave_all').id, r.id, 'view');
      // Random watch time
      const randWatch = (Math.random() * r.duration * 1.2).toFixed(2);
      const completed = randWatch >= r.duration;
      await logUserActivity(users.find(u => u.username === 'dave_all').id, r.id, 'watch_time', parseFloat(randWatch), completed);
      if (Math.random() > 0.5) await logUserActivity(users.find(u => u.username === 'dave_all').id, r.id, 'like');
    }

    console.log('✅ Seeded user activities.');
    console.log('⭐ PostgreSQL database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during PostgreSQL seeding:', error);
  } finally {
    process.exit(0);
  }
};

const logUserActivity = async (userId, reelId, activityType, duration = 0.00, completed = false) => {
  await query(
    `INSERT INTO user_activity (user_id, reel_id, activity_type, duration, completed) 
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, reelId, activityType, duration, completed]
  );
};

seedDatabase();

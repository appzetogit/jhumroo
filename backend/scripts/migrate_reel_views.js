// One-off: move embedded Reel.views[] into the ReelView collection, then drop the array.
// Safe to re-run (duplicate rows are skipped). Run once after deploying the ReelView change:
//   node scripts/migrate_reel_views.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ReelView from '../models/ReelView.model.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
await ReelView.init(); // make sure the unique index exists before inserting
const reels = mongoose.connection.collection('reels');

let reelsDone = 0, rows = 0;
const cursor = reels.find({ 'views.0': { $exists: true } }, { projection: { views: 1 } });
for await (const r of cursor) {
  const docs = r.views.filter(v => v?.user).map(v => ({ reel: r._id, user: v.user, viewedAt: v.viewedAt || new Date() }));
  if (docs.length) {
    try {
      const res = await ReelView.insertMany(docs, { ordered: false });
      rows += res.length;
    } catch (e) {
      if (e.code !== 11000 && !e.writeErrors) throw e; // duplicates = already migrated
      rows += e.insertedDocs?.length || 0;
    }
  }
  await reels.updateOne({ _id: r._id }, { $unset: { views: '' } });
  if (++reelsDone % 500 === 0) console.log(`${reelsDone} reels...`);
}

console.log(`Done: ${reelsDone} reels, ${rows} view rows inserted.`);
await mongoose.disconnect();

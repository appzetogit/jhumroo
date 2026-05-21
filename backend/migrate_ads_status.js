import mongoose from 'mongoose';
import Ad from './models/Ad.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Database successfully!');

    // Find advertisements where status is not set (undefined or not one of the enum values)
    // Or simply update all currently existing ads to 'approved'
    const result = await Ad.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'approved' } }
    );

    console.log(`Migration completed successfully!`);
    console.log(`Matched: ${result.matchedCount} advertisements`);
    console.log(`Modified: ${result.modifiedCount} advertisements`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from Database');
  }
}

run();

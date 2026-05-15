import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Report from '../models/Report.model.js';

dotenv.config();

async function migrateReports() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update all reports with lowercase reportType to capitalized
        const result1 = await Report.updateMany({ reportType: 'reel' }, { $set: { reportType: 'Reel' } });
        console.log(`Updated ${result1.modifiedCount} reports from 'reel' to 'Reel'`);

        const result2 = await Report.updateMany({ reportType: 'user' }, { $set: { reportType: 'User' } });
        console.log(`Updated ${result2.modifiedCount} reports from 'user' to 'User'`);

        const result3 = await Report.updateMany({ reportType: 'comment' }, { $set: { reportType: 'Comment' } });
        console.log(`Updated ${result3.modifiedCount} reports from 'comment' to 'Comment'`);

        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrateReports();

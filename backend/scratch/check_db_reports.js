import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Report from '../models/Report.model.js';
import Reel from '../models/Reel.model.js';
import User from '../models/User.model.js';

dotenv.config();

async function checkReports() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const totalReports = await Report.countDocuments();
        console.log('Total Reports in DB:', totalReports);

        const reports = await Report.find().limit(5);
        console.log('Sample Reports:', JSON.stringify(reports, null, 2));

        const reelCount = await Reel.countDocuments();
        console.log('Total Reels in DB:', reelCount);

        const userCount = await User.countDocuments();
        console.log('Total Users in DB:', userCount);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkReports();

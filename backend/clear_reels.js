import mongoose from 'mongoose';
import Reel from './models/Reel.model.js';
import dotenv from 'dotenv';

dotenv.config();

const clearData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for clearing reels...');

        await Reel.deleteMany({});
        console.log('Successfully deleted all reels');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
};

clearData();

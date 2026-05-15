import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model.js';
import Follow from './models/Follow.model.js';
import Notification from './models/Notification.model.js';

dotenv.config();

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const usernames = ['rahul_cool', 'sneha_dance', 'amit_vlogs'];
        
        for (const username of usernames) {
            const user = await User.findOne({ username });
            if (user) {
                await Follow.deleteMany({ $or: [{ follower: user._id }, { following: user._id }] });
                await Notification.deleteMany({ $or: [{ sender: user._id }, { recipient: user._id }] });
                await User.deleteOne({ _id: user._id });
                console.log('Deleted dummy user:', username);
            }
        }
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

cleanup();

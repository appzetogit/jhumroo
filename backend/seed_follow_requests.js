import mongoose from 'mongoose';
import User from './models/User.model.js';
import Follow from './models/Follow.model.js';
import dotenv from 'dotenv';

dotenv.config();

const seedFollowRequests = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const targetUsers = await User.find({});
        if (targetUsers.length === 0) {
            console.log('No users found to follow');
            process.exit(0);
        }

        const dummyUsersData = [
            { username: 'rahul_cool', fullName: 'Rahul Kumar', phoneNumber: '1111111111', countryCode: '+91' },
            { username: 'sneha_dance', fullName: 'Sneha Sharma', phoneNumber: '2222222222', countryCode: '+91' },
            { username: 'amit_vlogs', fullName: 'Amit Singh', phoneNumber: '3333333333', countryCode: '+91' }
        ];

        for (const data of dummyUsersData) {
            let dummy = await User.findOne({ username: data.username });
            if (!dummy) {
                // Add required fields
                dummy = await User.create({
                    ...data,
                    isOnboarded: true
                });
                console.log(`Created dummy user: ${data.username}`);
            }

            for (const target of targetUsers) {
                if (target._id.equals(dummy._id)) continue;

                // Only request to existing real users
                if (dummyUsersData.some(d => d.username === target.username)) continue;

                const existing = await Follow.findOne({ follower: dummy._id, following: target._id });
                if (!existing) {
                    await Follow.create({
                        follower: dummy._id,
                        following: target._id,
                        status: 'pending'
                    });
                    console.log(`${dummy.username} requested to follow ${target.username}`);
                }
            }
        }

        console.log('Follow requests seeding completed');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding follow requests:', error);
        process.exit(1);
    }
};

seedFollowRequests();

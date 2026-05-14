import mongoose from 'mongoose';
import User from './models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Clear existing users
        await User.deleteMany({});
        console.log('Cleared existing users');

        const users = [
            {
                username: 'jhumroo_user',
                fullName: 'Jhumroo User',
                phoneNumber: '9009925021',
                countryCode: '+91',
                bio: 'Love Jhumroo! ❤️',
                isVerified: true
            }
        ];

        for (const userData of users) {
            const exists = await User.findOne({ username: userData.username });
            if (!exists) {
                await User.create(userData);
                console.log(`Created user: ${userData.username}`);
            }
        }

        console.log('Seeding completed');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();

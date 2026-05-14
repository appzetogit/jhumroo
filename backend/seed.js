
import mongoose from 'mongoose';
import Reel from './models/Reel.model.js';
import User from './models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Create a dummy user
        let user = await User.findOne({ username: 'jhumroo_official' });
        if (!user) {
            user = await User.create({
                username: 'jhumroo_official',
                fullName: 'Jhumroo Official',
                email: 'official@jhumroo.com',
                phoneNumber: '9876543210',
                countryCode: '+91',
                password: 'password123',
                profilePicture: {
                    url: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=500&auto=format&fit=crop&q=60',
                    publicId: 'dummy_pic'
                }
            });
            console.log('Dummy user created');
        }

        // Dummy Reels
        const reels = [
            {
                user: user._id,
                video: {
                    url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-dancing-reggaeton-41221-large.mp4',
                    publicId: 'dummy_reel_1',
                    thumbnail: 'https://images.unsplash.com/photo-1547153760-18fc26048999?w=500&auto=format&fit=crop&q=60',
                    duration: 15
                },
                caption: 'Neon vibes only! 💃✨ #dance #neon #jhumroo',
                music: { name: 'Neon Dreams - Original Mix' },
                stats: { viewsCount: 1200, likesCount: 450, commentsCount: 32 }
            },
            {
                user: user._id,
                video: {
                    url: 'https://assets.mixkit.co/videos/preview/mixkit-man-dancing-under-a-street-light-at-night-41214-large.mp4',
                    publicId: 'dummy_reel_2',
                    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60',
                    duration: 12
                },
                caption: 'Dancing in the dark. 🌙 #night #dance #vibe',
                music: { name: 'Late Night Grooves' },
                stats: { viewsCount: 800, likesCount: 210, commentsCount: 15 }
            }
        ];

        await Reel.deleteMany({ user: user._id });
        await Reel.insertMany(reels);
        console.log('Successfully seeded reels');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();

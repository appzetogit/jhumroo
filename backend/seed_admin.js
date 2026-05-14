import mongoose from 'mongoose';
import Admin from './models/Admin.model.js';
import dotenv from 'dotenv';

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Remove all existing admins to ensure only the requested one exists
        await Admin.deleteMany({});
        console.log('Cleared existing admins');

        await Admin.create({
            email: 'panchalajay717@gmail.com',
            password: '123456',
            fullName: 'Ajay Panchal',
            role: 'super_admin',
            permissions: [
                'manage_users',
                'manage_content',
                'manage_reports',
                'manage_analytics',
                'manage_admins',
                'manage_settings',
                'delete_content',
                'ban_users'
            ]
        });
        console.log('Admin injected: panchalajay717@gmail.com / 123456');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();

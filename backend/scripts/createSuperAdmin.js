import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.model.js';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB\n');

    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Name: ${existingSuperAdmin.fullName}\n`);

      const overwrite = await question('Do you want to create another super admin? (yes/no): ');

      if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
        console.log('\n❌ Operation cancelled');
        process.exit(0);
      }
    }

    console.log('=== Create Super Admin ===\n');

    // Get admin details
    const email = await question('Email: ');
    const password = await question('Password (min 8 characters): ');
    const fullName = await question('Full Name: ');
    const phoneNumber = await question('Phone Number (optional): ');

    // Validate inputs
    if (!email || !password || !fullName) {
      console.log('\n❌ Email, password, and full name are required!');
      process.exit(1);
    }

    if (password.length < 8) {
      console.log('\n❌ Password must be at least 8 characters long!');
      process.exit(1);
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });

    if (existingAdmin) {
      console.log('\n❌ Admin with this email already exists!');
      process.exit(1);
    }

    // Create super admin
    const superAdmin = await Admin.create({
      email: email.toLowerCase(),
      password,
      fullName,
      phoneNumber: phoneNumber || undefined,
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

    console.log('\n✅ Super admin created successfully!\n');
    console.log('==========================================');
    console.log('Super Admin Details:');
    console.log('==========================================');
    console.log(`ID:       ${superAdmin._id}`);
    console.log(`Email:    ${superAdmin.email}`);
    console.log(`Name:     ${superAdmin.fullName}`);
    console.log(`Role:     ${superAdmin.role}`);
    console.log(`Phone:    ${superAdmin.phoneNumber || 'Not provided'}`);
    console.log('==========================================\n');

    console.log('🔐 You can now login to the admin panel with these credentials.\n');

  } catch (error) {
    console.error('\n❌ Error creating super admin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
console.log('\n╔════════════════════════════════════════╗');
console.log('║   Jhumroo Admin Panel Setup Script    ║');
console.log('╚════════════════════════════════════════╝\n');

createSuperAdmin();

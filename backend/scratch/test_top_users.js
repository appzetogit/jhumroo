import mongoose from 'mongoose';
import Admin from '../models/Admin.model.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Get the admin
    const admin = await Admin.findOne({ email: 'panchalajay717@gmail.com' });
    if (!admin) {
      console.error('Admin not found!');
      await mongoose.disconnect();
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, isAdmin: true, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Generated Admin JWT.');

    await mongoose.disconnect();

    // Hit the local server running on port 5003
    const url = 'http://localhost:5003/api/admin/analytics/top-users?metric=reels&limit=5';
    console.log(`Hitting URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.error('API Error Response:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

run();

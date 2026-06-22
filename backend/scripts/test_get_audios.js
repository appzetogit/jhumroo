import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Audio from '../models/Audio.model.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);

    // Get the test user
    const user = await User.findOne({ username: '___himanshiii___' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    const port = process.env.PORT || 5007;
    const url = `http://localhost:${port}/api/audios`;

    console.log('Hitting GET /api/audios with auth token...');
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Response audios array:');
    response.data.audios.forEach(a => {
      console.log(`- Title: "${a.title}", isSaved: ${a.isSaved} (type: ${typeof a.isSaved})`);
    });

    console.log('\nHitting GET /api/audios/saved with auth token...');
    const savedResponse = await axios.get(`${url}/saved`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Saved response audios array:', savedResponse.data.audios);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

run();

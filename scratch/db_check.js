import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Import models using dynamic import to handle ES modules properly
async function checkComments() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // We can use the connection to get the collection directly if imports are tricky
  const comments = await mongoose.connection.db.collection('comments').find({ 
    mentions: { $exists: true, $not: { $size: 0 } } 
  }).toArray();
  
  console.log('Comments with mentions:', JSON.stringify(comments, null, 2));
  
  const notifications = await mongoose.connection.db.collection('notifications').find({ 
    type: 'mention' 
  }).toArray();
  
  console.log('Mention Notifications:', JSON.stringify(notifications, null, 2));
  
  await mongoose.disconnect();
}

checkComments().catch(console.error);

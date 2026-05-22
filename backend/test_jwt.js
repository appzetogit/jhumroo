import fs from 'fs';
import crypto from 'crypto';

try {
  const raw = fs.readFileSync('./config/jhumroo-e265a-firebase-adminsdk-fbsvc-3b063602ea.json', 'utf8');
  const serviceAccount = JSON.parse(raw);
  const privateKey = serviceAccount.private_key;
  
  console.log('Private key type:', typeof privateKey);
  console.log('Private key length:', privateKey.length);
  
  const sign = crypto.createSign('SHA256');
  sign.update('test message');
  const signature = sign.sign(privateKey, 'base64');
  console.log('Successfully signed message! Signature length:', signature.length);
} catch (err) {
  console.error('Error signing:', err.message);
}

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp;

try {
  let serviceAccount = null;

  // 1. Try to load from explicit environment JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
    }
  }

  // 2. Try to load from explicit path or default/discovered path
  if (!serviceAccount) {
    const serviceAccountPaths = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      path.join(__dirname, 'jhumroo-e265a-firebase-adminsdk-fbsvc-3b063602ea.json'),
      path.join(process.cwd(), 'config', 'jhumroo-e265a-firebase-adminsdk-fbsvc-3b063602ea.json'),
      path.join(process.cwd(), 'backend', 'config', 'jhumroo-e265a-firebase-adminsdk-fbsvc-3b063602ea.json')
    ].filter(Boolean);

    // Auto-discover any *-firebase-adminsdk-*.json in config directory
    const configDir = __dirname;
    if (fs.existsSync(configDir)) {
      const files = fs.readdirSync(configDir);
      const sdkFile = files.find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));
      if (sdkFile) {
        serviceAccountPaths.push(path.join(configDir, sdkFile));
      }
    }

    for (const saPath of serviceAccountPaths) {
      const resolvedPath = path.isAbsolute(saPath) ? saPath : path.resolve(process.cwd(), saPath);
      if (fs.existsSync(resolvedPath)) {
        try {
          const raw = fs.readFileSync(resolvedPath, 'utf8');
          serviceAccount = JSON.parse(raw);
          console.log(`Firebase Admin: service account loaded from file: ${path.basename(resolvedPath)}`);
          break;
        } catch (err) {
          console.error(`Failed to read/parse service account file at ${resolvedPath}:`, err.message);
        }
      }
    }
  }

  // 3. Fallback to individual variables
  if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    console.log('Firebase Admin: using credentials from environment variables');
  }

  if (serviceAccount) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    }, 'jhumroo');
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('Firebase configuration missing. Push notifications will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
}

const messaging = firebaseApp ? admin.messaging(firebaseApp) : null;

export { admin, messaging };

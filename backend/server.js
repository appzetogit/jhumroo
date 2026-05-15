import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { initSocket } from './config/socket.js';

// Import Routes from Modules
import authRoutes from './modules/auth/routes/auth.routes.js';
import userRoutes from './modules/user/routes/user.routes.js';
import reelRoutes from './modules/reel/routes/reel.routes.js';
import followRoutes from './modules/follow/routes/follow.routes.js';
import commentRoutes from './modules/comment/routes/comment.routes.js';
import messageRoutes from './modules/message/routes/message.routes.js';
import audioRoutes from './modules/audio/routes/audio.routes.js';
import notificationRoutes from './modules/notification/routes/notification.routes.js';
import problemReportRoutes from './modules/problemReport/problemReport.routes.js';
import supportRoutes from './modules/support/support.routes.js';
import staticPageRoutes from './modules/staticPage/staticPage.routes.js';

// Import Admin Routes
import adminAuthRoutes from './modules/admin/routes/auth.routes.js';
import adminUsersRoutes from './modules/admin/routes/users.routes.js';
import adminContentRoutes from './modules/admin/routes/content.routes.js';
import adminAnalyticsRoutes from './modules/admin/routes/analytics.routes.js';
import adminAdminsRoutes from './modules/admin/routes/admins.routes.js';
import adminReportRoutes from './modules/admin/routes/report.routes.js';
import adminInterestRoutes from './modules/admin/routes/interest.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined')); // Logging

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/follows', followRoutes);
app.use('/api', commentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/audios', audioRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/problem-reports', problemReportRoutes);
app.use('/api/support-requests', supportRoutes);
app.use('/api/static-pages', staticPageRoutes);
app.use('/api/interests', adminInterestRoutes);

// Admin API Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/content', adminContentRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/admins', adminAdminsRoutes);
app.use('/api/admin/reports', adminReportRoutes);
app.use('/api/admin/problem-reports', problemReportRoutes);
app.use('/api/admin/support-requests', supportRoutes);
app.use('/api/admin/static-pages', staticPageRoutes);
app.use('/api/admin/interests', adminInterestRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (should be last)
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log('Socket.io ready for real-time messaging');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

# Jhumroo Backend API

A robust backend API for Jhumroo - TikTok Clone built with Node.js, Express, MongoDB, and Cloudinary.

**Architecture**: Modular MVC - Each feature is organized into its own module containing controller and routes for better scalability and maintainability.

## 🚀 Features

- **Authentication**: OTP-based phone authentication using Twilio
- **User Management**: Complete profile management with Cloudinary integration
- **Reels**: Video upload, CRUD operations, likes, saves, and views
- **Comments**: Instagram-like comment system with follow status, nested replies, and likes
- **Social Features**: Follow/unfollow, followers, following
- **Feed Algorithm**: Personalized feed and following feed
- **Search**: Search users and reels with hashtags
- **Optimized Performance**: Rate limiting, compression, caching
- **Security**: Helmet.js, JWT authentication, input validation

## 📁 Project Structure (Modular MVC Architecture)

```
backend/
├── config/                 # Configuration files
│   ├── database.js        # MongoDB connection
│   └── cloudinary.js      # Cloudinary setup
├── models/                # Database models (Shared)
│   ├── User.model.js
│   ├── Reel.model.js
│   ├── Follow.model.js
│   ├── Like.model.js
│   ├── Comment.model.js
│   └── SavedReel.model.js
├── modules/               # Feature modules
│   ├── auth/             # Authentication module
│   │   ├── controllers/
│   │   │   └── auth.controller.js
│   │   └── routes/
│   │       └── auth.routes.js
│   ├── user/             # User management module
│   │   ├── controllers/
│   │   │   └── user.controller.js
│   │   └── routes/
│   │       └── user.routes.js
│   ├── reel/             # Reel/video module
│   │   ├── controllers/
│   │   │   └── reel.controller.js
│   │   └── routes/
│   │       └── reel.routes.js
│   ├── comment/          # Comments module
│   │   ├── controllers/
│   │   │   └── comment.controller.js
│   │   └── routes/
│   │       └── comment.routes.js
│   └── follow/           # Follow system module
│       ├── controllers/
│       │   └── follow.controller.js
│       └── routes/
│           └── follow.routes.js
├── middleware/            # Custom middleware (Shared)
│   ├── auth.js           # JWT authentication
│   ├── errorHandler.js   # Error handling
│   ├── rateLimiter.js    # Rate limiting
│   ├── upload.js         # File upload with Multer
│   └── validation.js     # Input validation
├── .env                   # Environment variables
├── .gitignore
├── package.json
└── server.js             # Entry point
```

## 🛠️ Setup Instructions

### 1. Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Cloudinary account
- Twilio account (for OTP)

### 2. Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### 3. Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/jhumroo

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio Configuration (for OTP)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# App Configuration
OTP_EXPIRY_MINUTES=10
MAX_VIDEO_SIZE_MB=100
```

### 4. Run the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## 📚 API Documentation

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/send-otp` | Send OTP to phone number | Public |
| POST | `/api/auth/verify-otp` | Verify OTP and login | Public |
| POST | `/api/auth/complete-profile` | Complete user profile | Private |
| GET | `/api/auth/me` | Get current user | Private |
| GET | `/api/auth/check-username/:username` | Check username availability | Public |
| POST | `/api/auth/logout` | Logout user | Private |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/:username` | Get user profile | Public |
| PUT | `/api/users/profile` | Update profile | Private |
| POST | `/api/users/profile-picture` | Upload profile picture | Private |
| GET | `/api/users/:username/reels` | Get user's reels | Public |
| GET | `/api/users/me/liked-reels` | Get liked reels | Private |
| GET | `/api/users/me/saved-reels` | Get saved reels | Private |
| GET | `/api/users/search` | Search users | Public |
| GET | `/api/users/suggested/users` | Get suggested users | Private |

### Reels

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/reels` | Create new reel | Private |
| GET | `/api/reels/feed` | Get feed reels (For You) | Public |
| GET | `/api/reels/following/feed` | Get following feed | Private |
| GET | `/api/reels/:id` | Get single reel | Public |
| DELETE | `/api/reels/:id` | Delete reel | Private |
| POST | `/api/reels/:id/like` | Like/unlike reel | Private |
| POST | `/api/reels/:id/save` | Save/unsave reel | Private |
| POST | `/api/reels/:id/view` | Increment view count | Public |
| GET | `/api/reels/search` | Search reels | Public |

### Follows

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/follows/:userId` | Follow user | Private |
| DELETE | `/api/follows/:userId` | Unfollow user | Private |
| GET | `/api/follows/:userId/followers` | Get user's followers | Public |
| GET | `/api/follows/:userId/following` | Get user's following | Public |
| DELETE | `/api/follows/followers/:userId` | Remove follower | Private |
| GET | `/api/follows/requests/pending` | Get follow requests | Private |
| PUT | `/api/follows/requests/:userId/accept` | Accept follow request | Private |
| DELETE | `/api/follows/requests/:userId` | Reject follow request | Private |
| GET | `/api/follows/check/:userId` | Check follow status | Private |

### Comments (Instagram-like with Follow Status)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/reels/:reelId/comments` | Add comment to reel | Private |
| GET | `/api/reels/:reelId/comments` | Get reel comments | Public |
| GET | `/api/comments/:commentId/replies` | Get comment replies | Public |
| PUT | `/api/comments/:commentId` | Edit comment | Private |
| DELETE | `/api/comments/:commentId` | Delete comment | Private |
| POST | `/api/comments/:commentId/like` | Like/unlike comment | Private |
| PUT | `/api/comments/:commentId/pin` | Pin/unpin comment | Private |

**Special Features:**
- **Instagram-like Profile Population**: Each comment includes user profile details and whether you follow them
- **Nested Replies**: Support for replying to comments with full thread view
- **Reply Preview**: Top 2 replies shown in comment list
- **Follow Status**: `isFollowing` field indicates if current user follows the commenter
- **Like Status**: `isLiked` field indicates if current user liked the comment
- **Own Comment Flag**: `isOwnComment` helps highlight your own comments
- **Pin Feature**: Reel owners can pin important comments
- **Sort Options**: Sort by 'recent' or 'popular'

## 🔧 API Features

### Rate Limiting
- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- OTP: 3 requests per hour
- Upload: 20 uploads per hour

### File Upload
- Videos: Max 100MB (configurable)
- Images: Max 5MB
- Supported video formats: MP4, MOV, AVI, MKV, WebM
- Supported image formats: JPEG, JPG, PNG, GIF, WebP

### Security Features
- JWT authentication
- Helmet.js security headers
- CORS protection
- Input validation and sanitization
- MongoDB injection prevention
- Rate limiting

### Performance Optimizations
- Response compression
- Database indexing
- Denormalized stats for quick reads
- Efficient pagination
- Cloudinary CDN for media

## 🧪 Testing

You can test the API using:
- Postman
- Thunder Client (VS Code extension)
- curl commands

Example test request:

```bash
# Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890", "countryCode": "+1"}'
```

## 📦 Database Models

### User Model
- Phone authentication
- Profile information
- Stats (followers, following, likes, reels)
- Device tokens for notifications
- Account status

### Reel Model
- Video details (URL, duration, dimensions)
- Caption with hashtag/mention extraction
- Privacy settings
- Stats (likes, comments, shares, views, saves)
- Location data

### Follow Model
- Follower/following relationships
- Status (pending/accepted) for private accounts
- Auto-update user stats

### Like Model
- User-reel relationships
- Prevent duplicate likes
- Auto-update stats

### SavedReel Model
- Save reels to collections
- Auto-update stats

## 🚀 Deployment

### Recommended Platforms
- Backend: Heroku, Railway, Render
- Database: MongoDB Atlas
- Media Storage: Cloudinary

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET
- [ ] Set up MongoDB Atlas
- [ ] Configure Cloudinary production account
- [ ] Set up Twilio for OTP
- [ ] Configure CORS for frontend domain
- [ ] Set up monitoring (e.g., PM2)
- [ ] Configure backup strategy
- [ ] Set up logging service

## 📝 Notes

- In development mode, OTP is logged to console instead of sending SMS
- File uploads are temporarily stored in `./uploads` before Cloudinary upload
- Stats are denormalized for performance (tradeoff: consistency vs speed)
- Large view arrays are limited to 1000 entries to prevent document size issues

## 🤝 Contributing

1. Follow MVC architecture
2. Write clean, documented code
3. Test all endpoints before committing
4. Follow existing naming conventions

## 📄 License

ISC

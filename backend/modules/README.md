# Backend Modules Structure

This backend follows a **modular architecture** where each feature is organized into its own module folder.

## 📁 Module Structure

Each module contains:
- **`controllers/`** folder - Contains business logic and request handlers
- **`routes/`** folder - Contains route definitions and middleware

### Example Structure:
```
modules/
├── auth/
│   ├── controllers/
│   │   └── auth.controller.js    # Business logic
│   └── routes/
│       └── auth.routes.js        # Route definitions
```

## 🗂️ Available Modules

### 1. **Auth Module** (`modules/auth/`)
Handles authentication and authorization:
- OTP-based phone login
- Profile completion
- Session management
- Username availability check

**Routes**: `/api/auth/*`

---

### 2. **User Module** (`modules/user/`)
Manages user profiles and user-related operations:
- Get user profile
- Update profile
- Upload profile picture
- Search users
- Get user's reels
- Liked and saved reels

**Routes**: `/api/users/*`

---

### 3. **Reel Module** (`modules/reel/`)
Handles video content (reels):
- Create reel with video upload
- Get feed (For You page)
- Get following feed
- Like/unlike reel
- Save/unsave reel
- View tracking
- Search reels

**Routes**: `/api/reels/*`

---

### 4. **Comment Module** (`modules/comment/`)
Instagram-like commenting system:
- Add comment to reel
- Get comments with follow status
- Nested replies
- Like/unlike comments
- Edit/delete comments
- Pin comments (reel owner)

**Routes**: `/api/reels/:reelId/comments`, `/api/comments/*`

---

### 5. **Follow Module** (`modules/follow/`)
Social following system:
- Follow/unfollow users
- Get followers/following lists
- Remove followers
- Follow requests (for private accounts)
- Check follow status

**Routes**: `/api/follows/*`

---

## 🎯 Benefits of Modular Structure

1. **Better Organization**: Related code stays together
2. **Scalability**: Easy to add new modules
3. **Maintainability**: Changes are isolated to specific modules
4. **Team Collaboration**: Different team members can work on different modules
5. **Reusability**: Modules can be easily ported to other projects
6. **Testing**: Easier to test individual modules

---

## 📝 Adding a New Module

To add a new module (e.g., `notifications`):

1. Create module folder structure:
   ```powershell
   New-Item -ItemType Directory -Path "modules\notifications\controllers" -Force
   New-Item -ItemType Directory -Path "modules\notifications\routes" -Force
   ```

2. Create controller (`modules/notifications/controllers/notifications.controller.js`):
   ```javascript
   import Notification from '../../../models/Notification.model.js';
   import { asyncHandler } from '../../../middleware/errorHandler.js';

   export const getNotifications = asyncHandler(async (req, res) => {
     // Your logic here
   });
   ```

3. Create routes (`modules/notifications/routes/notifications.routes.js`):
   ```javascript
   import express from 'express';
   import { getNotifications } from '../controllers/notifications.controller.js';
   import { protect } from '../../../middleware/auth.js';

   const router = express.Router();
   router.get('/', protect, getNotifications);
   export default router;
   ```

4. Register routes in `server.js`:
   ```javascript
   import notificationRoutes from './modules/notifications/routes/notifications.routes.js';
   app.use('/api/notifications', notificationRoutes);
   ```

---

## 🔗 Import Path Rules

From within a module's **controller** file:
- **Models**: `import User from '../../../models/User.model.js';`
- **Middleware**: `import { protect } from '../../../middleware/auth.js';`
- **Config**: `import db from '../../../config/database.js';`

From within a module's **routes** file:
- **Controller**: `import { getUser } from '../controllers/user.controller.js';`
- **Middleware**: `import { protect } from '../../../middleware/auth.js';`
- **Other modules**: `import { followUser } from '../../follow/controllers/follow.controller.js';`

---

## 🚀 Next Modules to Implement

Consider adding these modules next:
1. **Notifications** - Real-time notifications for likes, comments, follows
2. **Messages** - Direct messaging between users
3. **Search** - Advanced search with filters
4. **Analytics** - Track user engagement and metrics
5. **Admin** - Admin dashboard and moderation tools
6. **Report** - Report inappropriate content

---

## 📂 Full Structure

```
backend/controllers/
│   │   │   └── auth.controller.js
│   │   └── routes/
│   │       └── auth.routes.js
│   ├── user/
│   │   ├── controllers/
│   │   │   └── user.controller.js
│   │   └── routes/
│   │       └── user.routes.js
│   ├── reel/
│   │   ├── controllers/
│   │   │   └── reel.controller.js
│   │   └── routes/
│   │       └── reel.routes.js
│   ├── comment/
│   │   ├── controllers/
│   │   │   └── comment.controller.js
│   │   └── routes/
│   │       └── comment.routes.js
│   └── follow/
│       ├── controllers/
│       │   └── follow.controller.js
│       └── routes/
│       │   └── comment.routes.js
│   └── follow/
│       ├── follow.controller.js
│       └── follow.routes.js
├── models/          # Shared database models
├── middleware/      # Shared middleware
├── config/          # Configuration files
└── server.js        # Main entry point
```

---

Happy coding! 🎉

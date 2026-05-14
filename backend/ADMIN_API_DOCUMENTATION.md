# Jhumroo Admin Panel API Documentation

## Overview
The Admin Panel API provides comprehensive backend functionality for managing users, content, reports, analytics, and admin accounts for the Jhumroo platform.

## Base URL
```
http://localhost:5000/api/admin
```

## Authentication
All admin API endpoints (except login and refresh) require authentication using JWT Bearer tokens.

### Headers
```
Authorization: Bearer <admin_access_token>
```

---

## 1. Admin Authentication

### 1.1 Admin Login
**POST** `/api/admin/auth/login`

Login as an admin user.

**Request Body:**
```json
{
  "email": "admin@jhumroo.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "admin": {
    "_id": "...",
    "email": "admin@jhumroo.com",
    "fullName": "Admin User",
    "role": "super_admin",
    "permissions": [],
    "isActive": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.2 Refresh Token
**POST** `/api/admin/auth/refresh`

Refresh the access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.3 Admin Logout
**POST** `/api/admin/auth/logout`  
🔒 **Requires Auth**

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.4 Get Admin Profile
**GET** `/api/admin/auth/me`  
🔒 **Requires Auth**

### 1.5 Update Admin Profile
**PUT** `/api/admin/auth/profile`  
🔒 **Requires Auth**

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "phoneNumber": "+1234567890",
  "profilePicture": "https://..."
}
```

### 1.6 Change Password
**PUT** `/api/admin/auth/change-password`  
🔒 **Requires Auth**

**Request Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword123"
}
```

### 1.7 Get Activity Log
**GET** `/api/admin/auth/activity-log?limit=50`  
🔒 **Requires Auth**

---

## 2. User Management

### 2.1 Get All Users
**GET** `/api/admin/users`  
🔒 **Requires Auth**

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` - Search by username, phone, or full name
- `isVerified` - Filter by verified status (true/false)
- `isPrivate` - Filter by private accounts (true/false)
- `isBanned` - Filter by banned status (true/false)
- `isActive` - Filter by active status (true/false)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - asc/desc (default: desc)

**Example:**
```
GET /api/admin/users?page=1&limit=20&search=john&isVerified=true&sortBy=createdAt&sortOrder=desc
```

### 2.2 Get User by ID
**GET** `/api/admin/users/:id`  
🔒 **Requires Auth**

Returns detailed user information including stats (reels count, followers, engagement).

### 2.3 Update User
**PUT** `/api/admin/users/:id`  
🔒 **Requires Auth + `manage_users` permission**

**Request Body:**
```json
{
  "username": "newusername",
  "fullName": "Updated Name",
  "email": "newemail@example.com",
  "bio": "Updated bio",
  "isVerified": true,
  "isPrivate": false
}
```

### 2.4 Ban/Unban User
**PUT** `/api/admin/users/:id/ban`  
🔒 **Requires Auth + `ban_users` permission**

**Request Body:**
```json
{
  "reason": "Violation of community guidelines",
  "duration": 7  // Duration in days, 0 = permanent
}
```

### 2.5 Verify/Unverify User
**PUT** `/api/admin/users/:id/verify`  
🔒 **Requires Auth + `manage_users` permission**

Toggles user verification status.

### 2.6 Delete User
**DELETE** `/api/admin/users/:id`  
🔒 **Requires Auth + `manage_users` permission**

Permanently deletes user and all associated data (reels, comments, likes, follows).

### 2.7 Get User's Reels
**GET** `/api/admin/users/:id/reels?page=1&limit=20`  
🔒 **Requires Auth**

### 2.8 Get User Activity
**GET** `/api/admin/users/:id/activity?days=30`  
🔒 **Requires Auth**

Returns user activity statistics for the specified period.

### 2.9 Bulk User Actions
**POST** `/api/admin/users/bulk-action`  
🔒 **Requires Auth + `manage_users` permission**

**Request Body:**
```json
{
  "userIds": ["userId1", "userId2", "userId3"],
  "action": "ban",  // Options: ban, unban, verify, unverify, delete
  "data": {
    "reason": "Bulk ban reason"
  }
}
```

---

## 3. Content Moderation

### 3.1 Get All Reels
**GET** `/api/admin/content/reels`  
🔒 **Requires Auth**

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` - Search by caption or hashtags
- `reported` - Filter reported content (true/false)
- `sortBy` (default: createdAt)
- `sortOrder` (default: desc)

### 3.2 Get Reel by ID
**GET** `/api/admin/content/reels/:id`  
🔒 **Requires Auth**

Returns reel details with stats and associated reports.

### 3.3 Delete Reel
**DELETE** `/api/admin/content/reels/:id`  
🔒 **Requires Auth + `delete_content` permission**

**Request Body:**
```json
{
  "reason": "Inappropriate content"
}
```

### 3.4 Get All Comments
**GET** `/api/admin/content/comments`  
🔒 **Requires Auth**

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` - Search by comment text
- `reported` - Filter reported comments (true/false)
- `reelId` - Filter by specific reel

### 3.5 Delete Comment
**DELETE** `/api/admin/content/comments/:id`  
🔒 **Requires Auth + `delete_content` permission**

**Request Body:**
```json
{
  "reason": "Spam"
}
```

### 3.6 Get All Reports
**GET** `/api/admin/content/reports`  
🔒 **Requires Auth + `manage_reports` permission**

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` - pending, under_review, resolved, dismissed, all (default: pending)
- `reportType` - reel, user, comment
- `priority` - low, medium, high, critical
- `reason` - inappropriate_content, spam, harassment, etc.

**Response includes status counts:**
```json
{
  "success": true,
  "reports": [...],
  "statusCounts": {
    "pending": 45,
    "underReview": 12,
    "resolved": 234,
    "dismissed": 56
  }
}
```

### 3.7 Get Report by ID
**GET** `/api/admin/content/reports/:id`  
🔒 **Requires Auth + `manage_reports` permission**

### 3.8 Update Report
**PUT** `/api/admin/content/reports/:id`  
🔒 **Requires Auth + `manage_reports` permission**

**Request Body:**
```json
{
  "status": "resolved",
  "actionTaken": "content_removed",  // none, content_removed, user_warned, user_suspended, user_banned
  "adminNotes": "Removed the content as it violated guidelines",
  "priority": "high"
}
```

### 3.9 Bulk Resolve Reports
**POST** `/api/admin/content/reports/bulk-resolve`  
🔒 **Requires Auth + `manage_reports` permission**

**Request Body:**
```json
{
  "reportIds": ["reportId1", "reportId2"],
  "actionTaken": "none",
  "adminNotes": "False alarm"
}
```

### 3.10 Get Content Statistics
**GET** `/api/admin/content/stats?days=30`  
🔒 **Requires Auth**

---

## 4. Analytics & Dashboard

### 4.1 Get Dashboard Stats
**GET** `/api/admin/analytics/dashboard`  
🔒 **Requires Auth**

Returns comprehensive dashboard statistics:
```json
{
  "success": true,
  "stats": {
    "overview": {
      "totalUsers": 10245,
      "totalReels": 45678,
      "totalComments": 123456,
      "totalLikes": 567890,
      "totalReports": 234,
      "activeUsers": 9876,
      "bannedUsers": 45
    },
    "today": {
      "newUsers": 123,
      "newReels": 456,
      "newComments": 789,
      "newReports": 12
    },
    "pendingReports": {
      "critical": 2,
      "high": 8,
      "medium": 15,
      "low": 20,
      "total": 45
    }
  }
}
```

### 4.2 Get User Growth Analytics
**GET** `/api/admin/analytics/user-growth?days=30`  
🔒 **Requires Auth**

Returns daily user growth data.

### 4.3 Get Content Analytics
**GET** `/api/admin/analytics/content?days=30`  
🔒 **Requires Auth**

Returns daily content statistics (reels, comments, likes).

### 4.4 Get Top Users
**GET** `/api/admin/analytics/top-users?metric=followers&limit=10`  
🔒 **Requires Auth**

**Metrics:** followers, reels, likes

### 4.5 Get Top Reels
**GET** `/api/admin/analytics/top-reels?metric=likes&limit=10&days=30`  
🔒 **Requires Auth**

**Metrics:** likes, comments, views, shares

### 4.6 Get Reports Analytics
**GET** `/api/admin/analytics/reports?days=30`  
🔒 **Requires Auth + `manage_reports` permission**

Returns report statistics by reason, type, status, and daily trends.

### 4.7 Get Admin Activity
**GET** `/api/admin/analytics/admin-activity?days=30`  
🔒 **Requires Auth + `super_admin` role**

Shows activity logs for all admins.

### 4.8 Get Platform Health
**GET** `/api/admin/analytics/health`  
🔒 **Requires Auth**

Returns platform health metrics and status indicators.

### 4.9 Export Analytics Data
**GET** `/api/admin/analytics/export?type=users&format=json`  
🔒 **Requires Auth + `manage_analytics` permission**

**Types:** users, reels, reports  
**Formats:** json, csv

---

## 5. Admin Management

### 5.1 Get All Admins
**GET** `/api/admin/admins`  
🔒 **Requires Auth + `manage_admins` permission or `super_admin`**

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `role` - super_admin, admin, moderator, support
- `isActive` (true/false)

### 5.2 Get Admin by ID
**GET** `/api/admin/admins/:id`  
🔒 **Requires Auth + `manage_admins` permission**

### 5.3 Create Admin
**POST** `/api/admin/admins`  
🔒 **Requires Auth + `super_admin` role**

**Request Body:**
```json
{
  "email": "newadmin@jhumroo.com",
  "password": "securePassword123",
  "fullName": "New Admin",
  "role": "moderator",  // super_admin, admin, moderator, support
  "permissions": ["manage_users", "manage_content", "manage_reports"],
  "phoneNumber": "+1234567890"
}
```

### 5.4 Update Admin
**PUT** `/api/admin/admins/:id`  
🔒 **Requires Auth + `super_admin` role**

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "role": "admin",
  "permissions": ["manage_users", "delete_content"],
  "phoneNumber": "+1234567890"
}
```

### 5.5 Delete Admin
**DELETE** `/api/admin/admins/:id`  
🔒 **Requires Auth + `super_admin` role**

Cannot delete yourself or other super admins (unless you're super admin).

### 5.6 Toggle Admin Status
**PUT** `/api/admin/admins/:id/toggle-status`  
🔒 **Requires Auth + `super_admin` role**

Activate/deactivate an admin account.

### 5.7 Update Admin Permissions
**PUT** `/api/admin/admins/:id/permissions`  
🔒 **Requires Auth + `super_admin` role**

**Request Body:**
```json
{
  "permissions": ["manage_users", "manage_content", "ban_users"]
}
```

**Available Permissions:**
- `manage_users` - Create, update, delete users
- `manage_content` - View and moderate content
- `manage_reports` - Handle user reports
- `manage_analytics` - Access analytics and export data
- `manage_admins` - View admin list
- `manage_settings` - Change platform settings
- `delete_content` - Delete reels and comments
- `ban_users` - Ban/unban users

### 5.8 Get Admin Stats
**GET** `/api/admin/admins/stats`  
🔒 **Requires Auth + `manage_admins` permission**

---

## Admin Roles Hierarchy

1. **Super Admin** (`super_admin`)
   - Full access to all features
   - Can manage other admins
   - Has all permissions by default

2. **Admin** (`admin`)
   - Manages users and content
   - Custom permissions based on assignment

3. **Moderator** (`moderator`)
   - Handles content moderation and reports
   - Limited admin capabilities

4. **Support** (`support`)
   - Basic support functions
   - Limited access to user management

---

## Error Responses

All endpoints return error responses in this format:

```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Admin API endpoints have rate limiting enabled (inherited from main API rate limiter):
- 100 requests per 15 minutes per IP

---

## Notes

1. **Super Admin Creation**: The first super admin must be created using the setup script (see `scripts/createSuperAdmin.js`)

2. **Token Expiry**: 
   - Access tokens expire in 24 hours
   - Refresh tokens expire in 30 days

3. **Activity Logging**: All admin actions are automatically logged with timestamp and IP address

4. **Soft Delete**: Users are not immediately deleted from database; their data is removed but account can be recovered within grace period

5. **Report Priority**: Reports are automatically prioritized based on reason type (e.g., violence = critical, spam = low)

---

## Setup & Testing

### Create Super Admin
```bash
npm run create-super-admin
```

### Environment Variables
```env
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
MONGODB_URI=mongodb://localhost:27017/jhumroo
```

### Testing with Postman/Insomnia

1. Login as admin to get access token
2. Add token to Authorization header
3. Test all endpoints based on your role and permissions

---

**Version:** 1.0.0  
**Last Updated:** March 2026

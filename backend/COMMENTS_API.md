# Comments API - Usage Examples

## 📝 Overview

The Comments API provides Instagram-like commenting functionality with:
- ✅ User profile population with follow status
- ✅ Nested replies (reply to comments)
- ✅ Like/unlike comments
- ✅ Pin comments (reel owner)
- ✅ Edit/delete comments
- ✅ Sort by recent or popular

---

## 🔐 Authentication

All write operations (POST, PUT, DELETE) require JWT token in header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📌 API Endpoints

### 1. Add Comment to Reel

**POST** `/api/reels/:reelId/comments`

**Request Body:**
```json
{
  "text": "This is amazing! 🔥",
  "parentCommentId": null  // null for top-level comment, or comment ID for reply
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "comment": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "user": {
      "_id": "user123",
      "username": "john_doe",
      "fullName": "John Doe",
      "profilePicture": {
        "url": "https://res.cloudinary.com/..."
      },
      "isVerified": true
    },
    "reel": "reel123",
    "text": "This is amazing! 🔥",
    "likesCount": 0,
    "repliesCount": 0,
    "isFollowing": false,    // 🌟 Instagram-like feature
    "isOwnComment": true,    // 🌟 Indicates your own comment
    "isLiked": false,        // 🌟 Whether you liked this comment
    "isPinned": false,
    "isEdited": false,
    "createdAt": "2024-03-26T10:30:00.000Z",
    "updatedAt": "2024-03-26T10:30:00.000Z"
  }
}
```

---

### 2. Get Comments for a Reel

**GET** `/api/reels/:reelId/comments?page=1&limit=20&sortBy=recent`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Comments per page (default: 20)
- `sortBy` (optional): 'recent' or 'popular' (default: 'recent')

**Response (200):**
```json
{
  "success": true,
  "comments": [
    {
      "_id": "comment1",
      "user": {
        "_id": "user456",
        "username": "jane_smith",
        "fullName": "Jane Smith",
        "profilePicture": {
          "url": "https://res.cloudinary.com/..."
        },
        "isVerified": false
      },
      "text": "Love this! Where is this place?",
      "likesCount": 45,
      "repliesCount": 3,
      "isFollowing": true,     // 🌟 You follow this user
      "isOwnComment": false,
      "isLiked": true,         // 🌟 You liked this comment
      "isPinned": false,
      "createdAt": "2024-03-26T09:15:00.000Z",
      "replyPreview": [        // 🌟 First 2 replies preview
        {
          "_id": "reply1",
          "user": {
            "username": "john_doe",
            "fullName": "John Doe",
            "profilePicture": { "url": "..." },
            "isVerified": true
          },
          "text": "@jane_smith It's in Bali!",
          "likesCount": 12,
          "isFollowing": false,
          "isOwnComment": true,
          "isLiked": false,
          "createdAt": "2024-03-26T09:20:00.000Z"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalComments": 95,
    "hasMore": true
  }
}
```

---

### 3. Reply to a Comment

**POST** `/api/reels/:reelId/comments`

**Request Body:**
```json
{
  "text": "@jane_smith It's in Bali!",
  "parentCommentId": "comment1"  // Parent comment ID
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Reply added successfully",
  "comment": {
    "_id": "reply1",
    "user": { ... },
    "reel": "reel123",
    "parentComment": "comment1",
    "text": "@jane_smith It's in Bali!",
    "likesCount": 0,
    "repliesCount": 0,
    "isFollowing": false,
    "isOwnComment": true,
    "isLiked": false,
    "createdAt": "2024-03-26T09:20:00.000Z"
  }
}
```

---

### 4. Get Replies for a Comment

**GET** `/api/comments/:commentId/replies?page=1&limit=20`

**Response (200):**
```json
{
  "success": true,
  "replies": [
    {
      "_id": "reply1",
      "user": { ... },
      "text": "Thanks for asking!",
      "likesCount": 5,
      "isFollowing": true,
      "isOwnComment": false,
      "isLiked": false,
      "createdAt": "2024-03-26T09:25:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalReplies": 3,
    "hasMore": false
  }
}
```

---

### 5. Like/Unlike a Comment

**POST** `/api/comments/:commentId/like`

**Response (200) - When Liking:**
```json
{
  "success": true,
  "message": "Comment liked",
  "isLiked": true,
  "likesCount": 46
}
```

**Response (200) - When Unliking:**
```json
{
  "success": true,
  "message": "Comment unliked",
  "isLiked": false,
  "likesCount": 45
}
```

---

### 6. Edit a Comment

**PUT** `/api/comments/:commentId`

**Request Body:**
```json
{
  "text": "Updated comment text 🎉"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "comment": {
    "_id": "comment1",
    "user": { ... },
    "text": "Updated comment text 🎉",
    "isEdited": true,  // 🌟 Marked as edited
    "likesCount": 45,
    "isFollowing": false,
    "isOwnComment": true,
    "updatedAt": "2024-03-26T10:35:00.000Z"
  }
}
```

---

### 7. Delete a Comment

**DELETE** `/api/comments/:commentId`

**Response (200):**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**Note:** Only comment owner or reel owner can delete comments. Deleted comments show as "[Comment deleted]" but maintain structure for replies.

---

### 8. Pin/Unpin Comment (Reel Owner Only)

**PUT** `/api/comments/:commentId/pin`

**Response (200):**
```json
{
  "success": true,
  "message": "Comment pinned",
  "isPinned": true
}
```

**Note:** Only reel owner can pin comments. Pinned comments appear at the top.

---

## 🌟 Key Features Explained

### Instagram-like Follow Status

Each comment includes these fields:
- **`isFollowing`**: Boolean - Whether current user follows the commenter
- **`isOwnComment`**: Boolean - Whether this is the current user's comment
- **`isLiked`**: Boolean - Whether current user liked this comment

This allows you to:
1. Show "Follow" button on comments from non-followed users
2. Highlight your own comments differently
3. Show filled/unfilled heart icon based on like status

### Reply Preview

Top-level comments include `replyPreview` with first 2 replies:
```javascript
if (comment.repliesCount > 0 && comment.replyPreview) {
  console.log(`${comment.repliesCount} replies, showing first ${comment.replyPreview.length}`);
}
```

### Sorting

- **Recent** (default): Latest comments first
- **Popular**: Most liked comments first
- Pinned comments always appear first regardless of sort

---

## 📱 Frontend Integration Example

```javascript
// Fetch comments for a reel
async function loadComments(reelId, page = 1, sortBy = 'recent') {
  const response = await fetch(
    `/api/reels/${reelId}/comments?page=${page}&sortBy=${sortBy}`,
    {
      headers: {
        'Authorization': `Bearer ${token}` // Optional for public access
      }
    }
  );
  const data = await response.json();
  return data;
}

// Add a comment
async function addComment(reelId, text, parentCommentId = null) {
  const response = await fetch(`/api/reels/${reelId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, parentCommentId })
  });
  const data = await response.json();
  return data;
}

// Like a comment
async function likeComment(commentId) {
  const response = await fetch(`/api/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data;
}

// Display comment with follow button
function renderComment(comment) {
  return `
    <div class="comment">
      <img src="${comment.user.profilePicture.url}" />
      <div>
        <span>${comment.user.username}</span>
        ${comment.isFollowing ? '' : '<button>Follow</button>'}
        ${comment.isOwnComment ? '<span>You</span>' : ''}
        <p>${comment.text}</p>
        <button onclick="likeComment('${comment._id}')">
          ${comment.isLiked ? '❤️' : '🤍'} ${comment.likesCount}
        </button>
      </div>
    </div>
  `;
}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Comment text is required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Comments are not allowed on this reel"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Reel not found"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

---

## 🎯 Best Practices

1. **Pagination**: Always use pagination for better performance
2. **Real-time Updates**: Consider using WebSockets for live comment updates
3. **Optimistic UI**: Update UI immediately, rollback on error
4. **Follow Button**: Show follow button only when `!isFollowing && !isOwnComment`
5. **Mention Support**: Parse `@username` in text for mentions
6. **Character Limit**: 500 characters max per comment
7. **Rate Limiting**: Respect rate limits (100 requests per 15 min)

---

## 🔄 Auto-Updates

The API automatically:
- ✅ Updates `stats.commentsCount` on reel
- ✅ Updates `repliesCount` on parent comment
- ✅ Updates `likesCount` on comment
- ✅ Marks edited comments with `isEdited: true`
- ✅ Maintains reply structure even after deletion

---

## 🚀 Next Steps

After implementing comments, consider adding:
1. **Notifications** - Notify users when someone comments on their reel
2. **Mentions** - Parse and link @usernames in comments
3. **Report** - Report inappropriate comments
4. **Moderation** - Admin tools to moderate comments
5. **Reactions** - Emoji reactions beyond likes

---

## 📞 Support

For issues or questions:
- Check backend logs for errors
- Verify JWT token is valid
- Ensure reel exists before commenting
- Check if comments are allowed on the reel

Happy coding! 🎉

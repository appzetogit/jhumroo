import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    lastMessage: {
      text: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'reel'],
        default: 'text'
      },
      timestamp: Date
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    },
    isActive: {
      type: Boolean,
      default: true
    },
    pinnedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    mutedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    deletedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

// Compound index to ensure unique conversations between two users
conversationSchema.index({ participants: 1 });

// Helper method to get unread count for a user
conversationSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// Helper method to increment unread count
conversationSchema.methods.incrementUnreadCount = function(userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
};

// Helper method to reset unread count
conversationSchema.methods.resetUnreadCount = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreateConversation = async function(user1Id, user2Id) {
  // Sort participant IDs to ensure consistent ordering
  const participants = [user1Id.toString(), user2Id.toString()].sort();
  
  let conversation = await this.findOne({
    participants: { $all: participants, $size: 2 }
  }).populate('participants', 'username fullName profilePicture isVerified');

  if (!conversation) {
    conversation = await this.create({ participants });
    conversation = await conversation.populate('participants', 'username fullName profilePicture isVerified');
  }

  return conversation;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;

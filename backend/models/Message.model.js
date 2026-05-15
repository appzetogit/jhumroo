import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'reel'],
      default: 'text',
      required: true
    },
    content: {
      text: {
        type: String,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
      },
      mediaUrl: String,
      mediaPublicId: String,
      thumbnail: String,
      reelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reel'
      }
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    isUnsent: {
      type: Boolean,
      default: false
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    isPinned: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

// Update conversation's last message after saving
messageSchema.post('save', async function(doc) {
  const Conversation = mongoose.model('Conversation');
  
  await Conversation.findByIdAndUpdate(doc.conversation, {
    lastMessage: {
      text: doc.messageType === 'text' ? doc.content.text : `Sent a ${doc.messageType}`,
      sender: doc.sender,
      messageType: doc.messageType,
      timestamp: doc.createdAt
    }
  });

  // Increment unread count for receiver
  const conversation = await Conversation.findById(doc.conversation);
  if (conversation && !doc.isRead) {
    conversation.incrementUnreadCount(doc.receiver);
    await conversation.save();
  }
});

// Virtual to check if message is visible to user
messageSchema.methods.isVisibleTo = function(userId) {
  if (this.isUnsent) return false;
  if (!this.isDeleted) return true;
  return !this.deletedBy.some(id => id.toString() === userId.toString());
};

const Message = mongoose.model('Message', messageSchema);

export default Message;

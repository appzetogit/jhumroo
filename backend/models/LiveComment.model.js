import mongoose from 'mongoose';

const liveCommentSchema = new mongoose.Schema(
  {
    liveStream: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveStream',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [300, 'Comment cannot exceed 300 characters']
    }
  },
  { timestamps: true }
);

liveCommentSchema.index({ liveStream: 1, createdAt: 1 });

const LiveComment = mongoose.model('LiveComment', liveCommentSchema);

export default LiveComment;

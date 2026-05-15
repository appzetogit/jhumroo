import mongoose from 'mongoose';

const interestSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  icon: {
    type: String,
    default: '🎭'
  },
  items: [{
    type: String,
    trim: true
  }],
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Interest = mongoose.model('Interest', interestSchema);

export default Interest;

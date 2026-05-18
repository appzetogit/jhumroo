import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator', 'support'],
      default: 'moderator'
    },
    permissions: [{
      type: String,
      enum: [
        'manage_users',
        'manage_content',
        'manage_reports',
        'manage_analytics',
        'manage_admins',
        'manage_settings',
        'delete_content',
        'ban_users'
      ]
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    profilePicture: {
      type: String,
      default: ''
    },
    phoneNumber: {
      type: String,
      sparse: true
    },
    // Activity tracking
    activityLog: [{
      action: String,
      description: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      ipAddress: String
    }],
    // Sessions management
    refreshTokens: [{
      token: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: Date
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if admin has specific permission
adminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  return this.permissions.includes(permission);
};

// Add activity log entry
adminSchema.methods.addActivity = function(action, description, ipAddress) {
  this.activityLog.push({
    action,
    description,
    ipAddress,
    timestamp: new Date()
  });
  
  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;

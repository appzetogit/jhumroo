import Admin from '../../../models/Admin.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

/**
 * @desc    Get all admins
 * @route   GET /api/admin/admins
 * @access  Private/Admin (super_admin or manage_admins permission)
 */
export const getAllAdmins = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, isActive } = req.query;

  const query = {};

  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const admins = await Admin.find(query)
    .select('-refreshTokens -activityLog')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Admin.countDocuments(query);

  res.status(200).json({
    success: true,
    count: admins.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    admins
  });
});

/**
 * @desc    Get admin by ID
 * @route   GET /api/admin/admins/:id
 * @access  Private/Admin (super_admin or manage_admins permission)
 */
export const getAdminById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const admin = await Admin.findById(id)
    .select('-refreshTokens -activityLog');

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found'
    });
  }

  res.status(200).json({
    success: true,
    admin
  });
});

/**
 * @desc    Create new admin
 * @route   POST /api/admin/admins
 * @access  Private/Admin (super_admin only)
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const { email, password, fullName, role, permissions, phoneNumber } = req.body;

  // Validation
  if (!email || !password || !fullName || !role) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }

  // Check if admin already exists
  const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });

  if (existingAdmin) {
    return res.status(400).json({
      success: false,
      message: 'Admin with this email already exists'
    });
  }

  // Create admin
  const admin = await Admin.create({
    email: email.toLowerCase(),
    password,
    fullName,
    role,
    permissions: permissions || [],
    phoneNumber
  });

  // Remove password from response
  admin.password = undefined;

  // Log activity
  req.admin.addActivity(
    'admin_created',
    `Created new admin: ${fullName} (${email})`,
    req.ip
  );
  await req.admin.save();

  res.status(201).json({
    success: true,
    message: 'Admin created successfully',
    admin
  });
});

/**
 * @desc    Update admin
 * @route   PUT /api/admin/admins/:id
 * @access  Private/Admin (super_admin only)
 */
export const updateAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, role, permissions, phoneNumber, profilePicture } = req.body;

  const admin = await Admin.findById(id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found'
    });
  }

  // Prevent super_admins from being downgraded by other admins
  if (admin.role === 'super_admin' && req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Only super admins can modify other super admins'
    });
  }

  // Update fields
  if (fullName) admin.fullName = fullName;
  if (role) admin.role = role;
  if (permissions) admin.permissions = permissions;
  if (phoneNumber !== undefined) admin.phoneNumber = phoneNumber;
  if (profilePicture !== undefined) admin.profilePicture = profilePicture;

  await admin.save();

  // Log activity
  req.admin.addActivity(
    'admin_updated',
    `Updated admin: ${admin.fullName} (${admin.email})`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Admin updated successfully',
    admin
  });
});

/**
 * @desc    Delete admin
 * @route   DELETE /api/admin/admins/:id
 * @access  Private/Admin (super_admin only)
 */
export const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admins from deleting themselves
  if (id === req.admin._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }

  const admin = await Admin.findById(id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found'
    });
  }

  // Prevent deletion of super_admins by non-super_admins
  if (admin.role === 'super_admin' && req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Only super admins can delete other super admins'
    });
  }

  await admin.deleteOne();

  // Log activity
  req.admin.addActivity(
    'admin_deleted',
    `Deleted admin: ${admin.fullName} (${admin.email})`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Admin deleted successfully'
  });
});

/**
 * @desc    Toggle admin active status
 * @route   PUT /api/admin/admins/:id/toggle-status
 * @access  Private/Admin (super_admin only)
 */
export const toggleAdminStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admins from deactivating themselves
  if (id === req.admin._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot deactivate your own account'
    });
  }

  const admin = await Admin.findById(id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found'
    });
  }

  // Prevent deactivation of super_admins by non-super_admins
  if (admin.role === 'super_admin' && req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Only super admins can deactivate other super admins'
    });
  }

  admin.isActive = !admin.isActive;
  await admin.save();

  // Logout admin if deactivated (clear refresh tokens)
  if (!admin.isActive) {
    admin.refreshTokens = [];
    await admin.save();
  }

  // Log activity
  req.admin.addActivity(
    admin.isActive ? 'admin_activated' : 'admin_deactivated',
    `${admin.isActive ? 'Activated' : 'Deactivated'} admin: ${admin.fullName}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
    admin
  });
});

/**
 * @desc    Update admin permissions
 * @route   PUT /api/admin/admins/:id/permissions
 * @access  Private/Admin (super_admin only)
 */
export const updateAdminPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      message: 'Permissions must be an array'
    });
  }

  const admin = await Admin.findById(id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found'
    });
  }

  // Super admins have all permissions by default
  if (admin.role === 'super_admin') {
    return res.status(400).json({
      success: false,
      message: 'Super admins have all permissions by default'
    });
  }

  // Validate permissions
  const validPermissions = [
    'manage_users',
    'manage_content',
    'manage_reports',
    'manage_analytics',
    'manage_admins',
    'manage_settings',
    'delete_content',
    'ban_users'
  ];

  const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

  if (invalidPermissions.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid permissions: ${invalidPermissions.join(', ')}`
    });
  }

  admin.permissions = permissions;
  await admin.save();

  // Log activity
  req.admin.addActivity(
    'permissions_updated',
    `Updated permissions for admin: ${admin.fullName}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Permissions updated successfully',
    admin
  });
});

/**
 * @desc    Get admin statistics
 * @route   GET /api/admin/admins/stats
 * @access  Private/Admin (super_admin or manage_admins permission)
 */
export const getAdminStats = asyncHandler(async (req, res) => {
  const [
    totalAdmins,
    activeAdmins,
    inactiveAdmins,
    roleBreakdown
  ] = await Promise.all([
    Admin.countDocuments(),
    Admin.countDocuments({ isActive: true }),
    Admin.countDocuments({ isActive: false }),
    Admin.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalAdmins,
      activeAdmins,
      inactiveAdmins,
      roleBreakdown
    }
  });
});

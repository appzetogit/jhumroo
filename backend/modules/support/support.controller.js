import SupportRequest from '../../models/SupportRequest.model.js';
import { createAdminAlert } from '../../utils/adminAlertService.js';

/**
 * Submit a new support request
 */
export const createSupportRequest = async (req, res) => {
  try {
    const { name, email, phoneNumber, reason } = req.body;
    const userId = req.user._id;

    if (!name || !email || !phoneNumber || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Name check
    const nameRegex = /^[a-zA-Z]{2,}(?:\s+[a-zA-Z]+)*$/;
    if (!nameRegex.test(name.trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid name (letters and spaces only, min 2 characters)' });
    }

    // Email check
    const cleanEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|co|in|net|org|edu|gov|mil|info|biz)$/i;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address (e.g. name@domain.com)' });
    }
    const domain = cleanEmail.split('@')[1].toLowerCase();
    if (domain.includes('gamil') || domain.includes('gmaill') || domain.includes('yaho') || domain.includes('hotmal')) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email domain (e.g. @gmail.com)' });
    }

    // Phone check
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    const request = await SupportRequest.create({
      userId,
      name,
      email,
      phoneNumber,
      reason
    });

    createAdminAlert({
      type: 'new_support',
      title: 'New Support Request',
      message: `${name} submitted a support ticket: "${reason || 'no reason'}"`,
      link: '/admin/support-requests'
    }).catch(err => console.error('[createSupportRequest] admin alert failed:', err));

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully. Resolution will be provided within 24-48 hours.',
      request
    });
  } catch (error) {
    console.error('Error creating support request:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get all support requests (Admin only)
 */
export const getAllSupportRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const requests = await SupportRequest.find()
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SupportRequest.countDocuments();

    res.status(200).json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching support requests:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update support request status (Admin only)
 */
export const updateSupportRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const request = await SupportRequest.findByIdAndUpdate(
      id,
      { status, adminNotes },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Support request updated successfully',
      request
    });
  } catch (error) {
    console.error('Error updating support request:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get support requests for current user
 */
export const getMySupportRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const requests = await SupportRequest.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SupportRequest.countDocuments({ userId });

    res.status(200).json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching my support requests:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

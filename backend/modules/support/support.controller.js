import SupportRequest from '../../models/SupportRequest.model.js';

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

    const request = await SupportRequest.create({
      userId,
      name,
      email,
      phoneNumber,
      reason
    });

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
    const requests = await SupportRequest.find()
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests
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
    const requests = await SupportRequest.find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching my support requests:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

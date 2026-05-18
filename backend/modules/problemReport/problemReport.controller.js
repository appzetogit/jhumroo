import ProblemReport from '../../models/ProblemReport.model.js';

/**
 * Submit a new problem report
 */
export const createProblemReport = async (req, res) => {
  try {
    const { category, description, attachments } = req.body;
    const userId = req.user._id;

    if (!category || !description) {
      return res.status(400).json({ success: false, message: 'Category and description are required' });
    }

    const report = await ProblemReport.create({
      userId,
      category,
      description,
      attachments: attachments || []
    });

    res.status(201).json({
      success: true,
      message: 'Problem report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Error creating problem report:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get all problem reports (Admin only)
 */
export const getAllProblemReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const reports = await ProblemReport.find()
      .populate('userId', 'username fullName profilePicture phoneNumber email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProblemReport.countDocuments();

    res.status(200).json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching problem reports:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update problem report status (Admin only)
 */
export const updateProblemReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const report = await ProblemReport.findByIdAndUpdate(
      id,
      { status, adminNotes },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ success: false, message: 'Problem report not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Problem report updated successfully',
      report
    });
  } catch (error) {
    console.error('Error updating problem report:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get problem reports for the current user
 */
export const getMyProblemReports = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Fetching reports for user:', userId);
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const reports = await ProblemReport.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log('Found reports count in page:', reports.length);
    const total = await ProblemReport.countDocuments({ userId });

    res.status(200).json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching my problem reports:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

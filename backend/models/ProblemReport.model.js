import mongoose from 'mongoose';

const problemReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    attachments: [
      {
        url: String,
        publicId: String,
        fileType: String
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'closed'],
      default: 'pending'
    },
    adminNotes: {
      type: String,
      maxlength: 1000
    }
  },
  { timestamps: true }
);

const ProblemReport = mongoose.model('ProblemReport', problemReportSchema);

export default ProblemReport;

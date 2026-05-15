import Interest from '../../../models/Interest.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

/**
 * @desc    Get all interests
 * @route   GET /api/interests
 * @access  Public
 */
export const getInterests = asyncHandler(async (req, res) => {
  let interests = await Interest.find({ isActive: true }).sort({ order: 1 });

  // Seed default data if none exists
  if (interests.length === 0) {
    const defaults = [
      {
        category: 'Entertainment & Culture',
        icon: '🎭',
        items: ['Trends', 'TV shows', 'Marvel', 'Comedy', 'BTS', 'HBO', 'Naruto'],
        order: 1
      },
      {
        category: 'Home & Family',
        icon: '🏠',
        items: ['Motherhood', 'Parenting', 'Weddings', 'Fatherhood', 'Married life', 'Relationships'],
        order: 2
      },
      {
        category: 'Fashion & Beauty',
        icon: '👗',
        items: ['Makeup', 'Nails', 'Sneakers', 'Hydration'],
        order: 3
      }
    ];
    interests = await Interest.insertMany(defaults);
  }

  res.status(200).json({
    success: true,
    count: interests.length,
    data: interests
  });
});

/**
 * @desc    Create new interest category
 * @route   POST /api/admin/interests
 * @access  Private/Admin
 */
export const createInterest = asyncHandler(async (req, res) => {
  const interest = await Interest.create(req.body);

  res.status(201).json({
    success: true,
    data: interest
  });
});

/**
 * @desc    Update interest category
 * @route   PUT /api/admin/interests/:id
 * @access  Private/Admin
 */
export const updateInterest = asyncHandler(async (req, res) => {
  let interest = await Interest.findById(req.params.id);

  if (!interest) {
    return res.status(404).json({
      success: false,
      message: 'Interest category not found'
    });
  }

  interest = await Interest.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: interest
  });
});

/**
 * @desc    Delete interest category
 * @route   DELETE /api/admin/interests/:id
 * @access  Private/Admin
 */
export const deleteInterest = asyncHandler(async (req, res) => {
  const interest = await Interest.findById(req.params.id);

  if (!interest) {
    return res.status(404).json({
      success: false,
      message: 'Interest category not found'
    });
  }

  await interest.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Interest category removed'
  });
});

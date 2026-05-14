import { body, validationResult } from 'express-validator';

/**
 * Handle validation errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
export const registerValidation = [
  body('phoneNumber')
    .optional()
    .isMobilePhone().withMessage('Invalid phone number'),
  body('countryCode')
    .optional()
    .matches(/^\+\d{1,3}$/).withMessage('Invalid country code'),
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-z0-9_]+$/).withMessage('Username can only contain lowercase letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email address'),
  body('fullName')
    .optional()
    .isLength({ max: 50 }).withMessage('Full name cannot exceed 50 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Invalid date format')
];

/**
 * Validation rules for OTP request
 */
export const otpRequestValidation = [
  body('phoneNumber')
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone().withMessage('Invalid phone number'),
  body('countryCode')
    .optional()
    .matches(/^\+\d{1,3}$/).withMessage('Invalid country code')
];

/**
 * Validation rules for OTP verification
 */
export const otpVerifyValidation = [
  body('phoneNumber')
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone().withMessage('Invalid phone number'),
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric')
];

/**
 * Validation rules for profile update
 */
export const profileUpdateValidation = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-z0-9_]+$/).withMessage('Username can only contain lowercase letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email address'),
  body('fullName')
    .optional()
    .isLength({ max: 50 }).withMessage('Full name cannot exceed 50 characters'),
  body('bio')
    .optional()
    .isLength({ max: 150 }).withMessage('Bio cannot exceed 150 characters')
];

/**
 * Validation rules for reel creation
 */
export const reelCreateValidation = [
  body('caption')
    .optional()
    .isLength({ max: 2200 }).withMessage('Caption cannot exceed 2200 characters'),
  body('allowComments')
    .optional()
    .isBoolean().withMessage('allowComments must be boolean'),
  body('allowDuet')
    .optional()
    .isBoolean().withMessage('allowDuet must be boolean'),
  body('allowDownload')
    .optional()
    .isBoolean().withMessage('allowDownload must be boolean')
];

/**
 * Validation rules for comment
 */
export const commentValidation = [
  body('text')
    .notEmpty().withMessage('Comment text is required')
    .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
];

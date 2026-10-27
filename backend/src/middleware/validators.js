const { body, param, query, validationResult } = require('express-validator');

/**
 * Standardized validation result handler that strips stack traces and returns clean field errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data provided.',
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

// Strict Password Policy: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={}[\]|\\:;"'<>,.~/`])[A-Za-z\d@$!%*?&#^()_\-+={}[\]|\\:;"'<>,.~/`]{8,64}$/;

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters.')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .matches(PASSWORD_REGEX)
    .withMessage(
      'Password must be 8-64 characters and include uppercase, lowercase, number, and special character.'
    ),
  handleValidationErrors,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isString()
    .isLength({ min: 1, max: 128 }),
  handleValidationErrors,
];

const productQueryValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query cannot exceed 100 characters.')
    .escape(),
  query('category')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .escape(),
  handleValidationErrors,
];

const productCreateValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required.')
    .isLength({ min: 3, max: 140 }).withMessage('Product name must be between 3 and 140 characters.')
    .escape(),
  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required.')
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters.')
    .escape(),
  body('price')
    .notEmpty().withMessage('Price is required.')
    .isFloat({ min: 0.01, max: 10000000 }).withMessage('Price must be a positive number.')
    .toFloat(),
  body('stock')
    .notEmpty().withMessage('Stock quantity is required.')
    .isInt({ min: 0, max: 100000 }).withMessage('Stock must be a non-negative integer.')
    .toInt(),
  body('imageUrl')
    .trim()
    .notEmpty().withMessage('Image URL is required.')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Image URL must be a valid HTTP/HTTPS URL.'),
  body('categoryId')
    .trim()
    .notEmpty().withMessage('Category ID is required.')
    .isUUID().withMessage('Category ID must be a valid UUID.'),
  handleValidationErrors,
];

const productUpdateValidation = [
  param('id').isUUID().withMessage('Invalid product ID format.'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 140 }).withMessage('Product name must be between 3 and 140 characters.')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters.')
    .escape(),
  body('price')
    .optional()
    .isFloat({ min: 0.01, max: 10000000 }).withMessage('Price must be a positive number.')
    .toFloat(),
  body('stock')
    .optional()
    .isInt({ min: 0, max: 100000 }).withMessage('Stock must be a non-negative integer.')
    .toInt(),
  body('imageUrl')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Image URL must be a valid HTTP/HTTPS URL.'),
  body('categoryId')
    .optional()
    .trim()
    .isUUID().withMessage('Category ID must be a valid UUID.'),
  handleValidationErrors,
];

const orderCreateValidation = [
  body('recipientName')
    .trim()
    .notEmpty().withMessage('Recipient name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Recipient name must be 2-100 characters.')
    .escape(),
  body('recipientPhone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Please provide a valid phone number (8-20 digits).'),
  body('shippingAddress')
    .trim()
    .notEmpty().withMessage('Shipping address is required.')
    .isLength({ min: 10, max: 500 }).withMessage('Shipping address must be between 10 and 500 characters.')
    .escape(),
  body('items')
    .isArray({ min: 1, max: 50 }).withMessage('Order must contain at least 1 item.'),
  body('items.*.productId')
    .trim()
    .isUUID().withMessage('Each order item must have a valid product UUID.'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 99 }).withMessage('Item quantity must be between 1 and 99.')
    .toInt(),
  handleValidationErrors,
];

const orderStatusUpdateValidation = [
  param('id').isUUID().withMessage('Invalid order ID format.'),
  body('status')
    .optional()
    .trim()
    .isIn(['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'])
    .withMessage('Invalid order status value.'),
  body('paymentStatus')
    .optional()
    .trim()
    .isIn(['UNPAID', 'PAID', 'FAILED', 'REFUNDED'])
    .withMessage('Invalid payment status value.'),
  handleValidationErrors,
];

const uuidParamValidation = [
  param('id').isUUID().withMessage('Resource ID must be a valid UUID.'),
  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  productQueryValidation,
  productCreateValidation,
  productUpdateValidation,
  orderCreateValidation,
  orderStatusUpdateValidation,
  uuidParamValidation,
};


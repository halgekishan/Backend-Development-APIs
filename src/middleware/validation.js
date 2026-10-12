const { body, param, validationResult } = require('express-validator');

/** Runs after rule chains; returns 400 with all validation problems. */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};

const mongoId = (field, where = param) =>
  where(field).isMongoId().withMessage(`${field} must be a valid id`);

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain a number'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const profileUpdateRules = [
  body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().trim().isLength({ min: 5, max: 20 }).withMessage('Invalid phone'),
  body('newPassword')
    .optional()
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/\d/).withMessage('New password must contain a number'),
  body('currentPassword')
    .if(body('newPassword').exists())
    .notEmpty().withMessage('currentPassword is required to set a new password'),
];

const productCreateRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 2000 }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a number >= 0'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be an integer >= 0'),
  body('image').optional().trim(),
];

const productUpdateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 120 }),
  body('description').optional().trim().notEmpty().isLength({ max: 2000 }),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a number >= 0'),
  body('category').optional().trim().notEmpty(),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be an integer >= 0'),
];

const addToCartRules = [
  body('productId').isMongoId().withMessage('productId must be a valid id'),
  body('quantity').optional().isInt({ min: 1, max: 100 }).withMessage('quantity must be 1-100'),
];

const updateCartRules = [
  body('quantity').isInt({ min: 1, max: 100 }).withMessage('quantity must be 1-100'),
];

const orderRules = [
  body('shippingAddress.street').trim().notEmpty().withMessage('Street is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
  body('paymentMethod').isIn(['card', 'upi', 'cod']).withMessage('paymentMethod must be card, upi or cod'),
  body('cardNumber')
    .if(body('paymentMethod').equals('card'))
    .matches(/^\d{12,19}$/).withMessage('cardNumber must be 12-19 digits (simulation only)'),
];

const orderStatusRules = [
  body('status').isIn(['processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
];

module.exports = {
  validate,
  mongoId,
  registerRules,
  loginRules,
  profileUpdateRules,
  productCreateRules,
  productUpdateRules,
  addToCartRules,
  updateCartRules,
  orderRules,
  orderStatusRules,
};

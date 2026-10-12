/**
 * Custom error with an HTTP status code. Thrown from controllers and
 * handled centrally by middleware/errorHandler.js
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/** Wraps async route handlers so rejected promises reach the error handler. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Escape user input before using it inside a RegExp (prevents ReDoS / injection). */
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Strip HTML tags and angle brackets from a string (basic XSS protection). */
const stripTags = (value) =>
  value.replace(/<[^>]*>?/gm, '').replace(/[<>]/g, '').trim();

/** Recursively sanitize every string inside an object/array. */
const sanitizeValue = (value) => {
  if (typeof value === 'string') return stripTags(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const clean = {};
    for (const key of Object.keys(value)) {
      clean[key] = sanitizeValue(value[key]);
    }
    return clean;
  }
  return value;
};

/** Express middleware: sanitize req.body (passwords are left untouched). */
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const { password, currentPassword, newPassword, ...rest } = req.body;
    const cleaned = sanitizeValue(rest);
    if (password !== undefined) cleaned.password = password;
    if (currentPassword !== undefined) cleaned.currentPassword = currentPassword;
    if (newPassword !== undefined) cleaned.newPassword = newPassword;
    req.body = cleaned;
  }
  next();
};

/** Parse pagination params safely. */
const parsePagination = (query, defaultLimit = 10, maxLimit = 100) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

/** Round to 2 decimals to avoid floating point noise in money values. */
const roundMoney = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Payment simulation (NO real payments).
 * - COD / UPI always succeed
 * - card payments succeed unless the card number ends with "0000" (simulated decline)
 */
const simulatePayment = ({ amount, paymentMethod, cardNumber }) => {
  if (paymentMethod === 'card' && cardNumber && String(cardNumber).endsWith('0000')) {
    return { success: false, message: 'Payment declined (simulated)' };
  }
  const paymentId = `SIM-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return { success: true, paymentId, amount };
};

module.exports = {
  ApiError,
  asyncHandler,
  escapeRegex,
  sanitizeInput,
  parsePagination,
  roundMoney,
  simulatePayment,
};

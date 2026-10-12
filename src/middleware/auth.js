const User = require('../models/User');
const { verifyToken } = require('../config/jwt');
const { ApiError, asyncHandler } = require('../utils/helpers');

/** Protect routes: requires "Authorization: Bearer <token>" */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorized, token missing');
  }

  const token = header.split(' ')[1];
  const decoded = verifyToken(token); // throws JsonWebTokenError / TokenExpiredError

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'User belonging to this token no longer exists');
  }

  req.user = user;
  next();
});

/** Allow only admins (use after protect) */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
};

module.exports = { protect, adminOnly };

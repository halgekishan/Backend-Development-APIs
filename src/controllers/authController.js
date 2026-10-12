const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const { ApiError, asyncHandler } = require('../utils/helpers');

const sendAuth = (res, statusCode, user) => {
  const token = generateToken(user._id);
  res.status(statusCode).json({ success: true, token, user });
};

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'Email already registered');

  // role is NEVER taken from the request body (prevents privilege escalation)
  const user = await User.create({ name, email, password });
  sendAuth(res, 201, user);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  sendAuth(res, 200, user);
});

// GET /api/auth/profile
exports.getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { name, email, phone, address, newPassword, currentPassword } = req.body;

  if (email && email !== user.email) {
    const taken = await User.findOne({ email });
    if (taken) throw new ApiError(409, 'Email already in use');
    user.email = email;
  }
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address && typeof address === 'object') {
    for (const key of ['street', 'city', 'state', 'postalCode', 'country']) {
      if (typeof address[key] === 'string') user.set(`address.${key}`, address[key]);
    }
  }

  if (newPassword) {
    if (!(await user.comparePassword(currentPassword))) {
      throw new ApiError(401, 'Current password is incorrect');
    }
    user.password = newPassword;
  }

  await user.save();
  res.json({ success: true, message: 'Profile updated', user });
});

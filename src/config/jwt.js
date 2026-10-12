const jwt = require('jsonwebtoken');

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return secret;
};

const generateToken = (userId) =>
  jwt.sign({ id: userId }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const verifyToken = (token) => jwt.verify(token, getSecret());

module.exports = { generateToken, verifyToken };

const router = require('express').Router();
const { register, login, getProfile, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validate,
  registerRules,
  loginRules,
  profileUpdateRules,
} = require('../middleware/validation');

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, profileUpdateRules, validate, updateProfile);

module.exports = router;

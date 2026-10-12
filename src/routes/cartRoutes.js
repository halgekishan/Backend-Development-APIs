const router = require('express').Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const {
  validate,
  mongoId,
  addToCartRules,
  updateCartRules,
} = require('../middleware/validation');

router.use(protect);

router.get('/', getCart);
router.post('/', addToCartRules, validate, addToCart);
router.delete('/', clearCart);
router.put('/:itemId', mongoId('itemId'), updateCartRules, validate, updateCartItem);
router.delete('/:itemId', mongoId('itemId'), validate, removeFromCart);

module.exports = router;

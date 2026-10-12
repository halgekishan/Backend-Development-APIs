const router = require('express').Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');
const {
  validate,
  mongoId,
  orderRules,
  orderStatusRules,
} = require('../middleware/validation');

router.use(protect);

router.post('/', orderRules, validate, createOrder);
router.get('/', getMyOrders);
router.get('/:id', mongoId('id'), validate, getOrder);
router.put('/:id/status', adminOnly, mongoId('id'), orderStatusRules, validate, updateOrderStatus);

module.exports = router;

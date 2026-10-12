const router = require('express').Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const {
  validate,
  mongoId,
  productCreateRules,
  productUpdateRules,
} = require('../middleware/validation');

router.get('/', getProducts);
router.get('/:id', mongoId('id'), validate, getProduct);

// admin only
router.post('/', protect, adminOnly, productCreateRules, validate, createProduct);
router.put('/:id', protect, adminOnly, mongoId('id'), productUpdateRules, validate, updateProduct);
router.delete('/:id', protect, adminOnly, mongoId('id'), validate, deleteProduct);

module.exports = router;

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { ApiError, asyncHandler } = require('../utils/helpers');

const getOrCreateCart = async (userId) =>
  (await Cart.findOne({ user: userId })) || (await Cart.create({ user: userId, items: [] }));

const populated = (userId) =>
  Cart.findOne({ user: userId }).populate('items.product', 'name image stock price');

// GET /api/cart
exports.getCart = asyncHandler(async (req, res) => {
  await getOrCreateCart(req.user._id);
  const cart = await populated(req.user._id);
  res.json({ success: true, data: cart });
});

// POST /api/cart  { productId, quantity }
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const quantity = parseInt(req.body.quantity, 10) || 1;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((i) => i.product.toString() === productId);
  const newQty = (existing ? existing.quantity : 0) + quantity;

  if (newQty > product.stock) {
    throw new ApiError(400, `Only ${product.stock} unit(s) of "${product.name}" in stock`);
  }

  if (existing) {
    existing.quantity = newQty;
    existing.price = product.price;
  } else {
    cart.items.push({ product: product._id, quantity, price: product.price });
  }
  await cart.save();

  res.status(201).json({ success: true, data: await populated(req.user._id) });
});

// PUT /api/cart/:itemId  { quantity }
exports.updateCartItem = asyncHandler(async (req, res) => {
  const quantity = parseInt(req.body.quantity, 10);
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw new ApiError(404, 'Item not found in cart');

  const product = await Product.findById(item.product);
  if (!product) throw new ApiError(404, 'Product no longer exists');
  if (quantity > product.stock) {
    throw new ApiError(400, `Only ${product.stock} unit(s) of "${product.name}" in stock`);
  }

  item.quantity = quantity;
  item.price = product.price;
  await cart.save();
  res.json({ success: true, data: await populated(req.user._id) });
});

// DELETE /api/cart/:itemId
exports.removeFromCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw new ApiError(404, 'Item not found in cart');

  item.deleteOne();
  await cart.save();
  res.json({ success: true, data: await populated(req.user._id) });
});

// DELETE /api/cart  (clear everything)
exports.clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, message: 'Cart cleared', data: cart });
});

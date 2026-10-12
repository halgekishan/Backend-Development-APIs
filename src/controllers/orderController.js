const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const {
  ApiError,
  asyncHandler,
  parsePagination,
  roundMoney,
  simulatePayment,
} = require('../utils/helpers');

// POST /api/orders
// Converts the user's cart into an order, reserves stock atomically,
// simulates payment, and clears the cart.
exports.createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, cardNumber } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new ApiError(400, 'Your cart is empty');

  // Build order items from current product data
  const orderItems = [];
  for (const item of cart.items) {
    if (!item.product) throw new ApiError(400, 'A product in your cart no longer exists');
    orderItems.push({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    });
  }
  const totalPrice = roundMoney(orderItems.reduce((s, i) => s + i.price * i.quantity, 0));

  // Simulated payment first - nothing is reserved if it fails
  const payment = simulatePayment({ amount: totalPrice, paymentMethod, cardNumber });
  if (!payment.success) throw new ApiError(402, payment.message);

  // Reserve stock atomically (only decrements if enough stock is left)
  const reserved = [];
  try {
    for (const item of orderItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (!updated) throw new ApiError(400, `Insufficient stock for "${item.name}"`);
      reserved.push(item);
    }
  } catch (err) {
    // roll back anything already reserved
    await Promise.all(
      reserved.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } }))
    );
    throw err;
  }

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
    paymentId: payment.paymentId,
    totalPrice,
  });

  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
});

// GET /api/orders  (current user's order history)
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { user: req.user._id };

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalOrders: total },
  });
});

// GET /api/orders/:id  (owner or admin)
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');

  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only view your own orders');
  }
  res.json({ success: true, data: order });
});

// PUT /api/orders/:id/status  (admin)
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const { status } = req.body;
  // restock when an order is cancelled for the first time
  if (status === 'cancelled' && order.status !== 'cancelled') {
    await Promise.all(
      order.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } }))
    );
  }
  order.status = status;
  if (status === 'delivered' && order.paymentMethod === 'cod') order.paymentStatus = 'paid';
  await order.save();

  res.json({ success: true, data: order });
});

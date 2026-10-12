const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  price: { type: Number, required: true, min: 0 }, // price snapshot when added
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one cart per user (server-side session management)
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

cartSchema.virtual('totalPrice').get(function () {
  const total = this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
});

cartSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret.id; delete ret.__v; return ret; } });

module.exports = mongoose.model('Cart', cartSchema);

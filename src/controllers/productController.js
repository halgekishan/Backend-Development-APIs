const Product = require('../models/Product');
const { ApiError, asyncHandler, escapeRegex, parsePagination } = require('../utils/helpers');

const ALLOWED_FIELDS = ['name', 'description', 'price', 'category', 'stock', 'image'];
const pick = (obj) =>
  ALLOWED_FIELDS.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});

// GET /api/products?q=&category=&minPrice=&maxPrice=&sort=&page=&limit=
exports.getProducts = asyncHandler(async (req, res) => {
  const { q, category, minPrice, maxPrice, sort, inStock } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const query = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ name: rx }, { description: rx }];
  }
  if (category) query.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice && !Number.isNaN(Number(minPrice))) query.price.$gte = Number(minPrice);
    if (maxPrice && !Number.isNaN(Number(maxPrice))) query.price.$lte = Number(maxPrice);
    if (Object.keys(query.price).length === 0) delete query.price;
  }
  if (inStock === 'true') query.stock = { $gt: 0 };

  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    name_asc: { name: 1 },
    oldest: { createdAt: 1 },
  };
  const sortOptions = sortMap[sort] || { createdAt: -1 };

  const [products, total] = await Promise.all([
    Product.find(query).sort(sortOptions).skip(skip).limit(limit),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
    },
  });
});

// GET /api/products/:id
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, data: product });
});

// POST /api/products (admin)
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(pick(req.body));
  res.status(201).json({ success: true, data: product });
});

// PUT /api/products/:id (admin)
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, pick(req.body), {
    new: true,
    runValidators: true,
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, data: product });
});

// DELETE /api/products/:id (admin)
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, message: 'Product deleted' });
});

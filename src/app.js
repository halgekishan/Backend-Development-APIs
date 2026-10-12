require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/database');
const { sanitizeInput } = require('./utils/helpers');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const isTest = process.env.NODE_ENV === 'test';

// ---------- Security middleware ----------
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // body size limit
app.use(mongoSanitize()); // blocks NoSQL operator injection ($ and .)
app.use(sanitizeInput); // strips HTML tags from string inputs

// Rate limiting (disabled while running automated tests)
if (!isTest) {
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later' },
    })
  );
  // much stricter for login/register (brute-force protection)
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many auth attempts, please try again later' },
    })
  );
}

// ---------- Routes ----------
app.get('/', (req, res) =>
  res.json({ success: true, message: 'E-commerce API is running', docs: '/docs/api-documentation.md' })
);
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// ---------- Errors ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Start server (only when run directly) ----------
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((err) => {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    });
}

module.exports = app;

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');

const products = [
  { name: 'Wireless Headphones', description: 'Bluetooth over-ear headphones with noise cancellation', price: 79.99, category: 'electronics', stock: 50, image: 'https://example.com/img/headphones.jpg' },
  { name: 'Smart Watch', description: 'Fitness tracker with heart rate monitor and GPS', price: 129.5, category: 'electronics', stock: 30, image: 'https://example.com/img/watch.jpg' },
  { name: 'USB-C Charger 65W', description: 'Fast GaN charger for laptops and phones', price: 29.99, category: 'electronics', stock: 120, image: 'https://example.com/img/charger.jpg' },
  { name: 'Running Shoes', description: 'Lightweight breathable running shoes', price: 59.0, category: 'fashion', stock: 80, image: 'https://example.com/img/shoes.jpg' },
  { name: 'Denim Jacket', description: 'Classic blue denim jacket, unisex fit', price: 45.0, category: 'fashion', stock: 40, image: 'https://example.com/img/jacket.jpg' },
  { name: 'Stainless Steel Bottle', description: 'Insulated 750ml bottle keeps drinks cold for 24 hours', price: 18.25, category: 'home', stock: 200, image: 'https://example.com/img/bottle.jpg' },
  { name: 'Ceramic Coffee Mug Set', description: 'Set of 4 handcrafted ceramic mugs', price: 24.99, category: 'home', stock: 65, image: 'https://example.com/img/mugs.jpg' },
  { name: 'JavaScript: The Good Parts', description: 'Classic programming book for web developers', price: 22.0, category: 'books', stock: 90, image: 'https://example.com/img/book.jpg' },
  { name: 'Yoga Mat', description: 'Non-slip 6mm exercise mat', price: 19.99, category: 'sports', stock: 75, image: 'https://example.com/img/yoga.jpg' },
  { name: 'Mechanical Keyboard', description: 'RGB mechanical keyboard with blue switches', price: 69.0, category: 'electronics', stock: 35, image: 'https://example.com/img/keyboard.jpg' },
];

const run = async () => {
  await connectDB();

  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products`);

  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({
      name: process.env.ADMIN_NAME || 'Admin',
      email,
      password: process.env.ADMIN_PASSWORD || 'Admin@12345',
      role: 'admin',
    });
    console.log(`Admin user created: ${email}`);
  } else {
    console.log(`Admin user already exists: ${email}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

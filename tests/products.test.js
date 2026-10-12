process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const { generateToken } = require('../src/config/jwt');

let mongod;
let adminToken;
let userToken;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Cart.deleteMany({}), Order.deleteMany({})]);
  const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' });
  const user = await User.create({ name: 'User', email: 'user@test.com', password: 'user1234' });
  adminToken = generateToken(admin._id);
  userToken = generateToken(user._id);
});

const sample = { name: 'Laptop', description: 'Fast laptop', price: 999.99, category: 'electronics', stock: 5 };
const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('Products CRUD', () => {
  it('lets an admin create a product', async () => {
    const res = await request(app).post('/api/products').set(auth(adminToken)).send(sample);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Laptop');
  });

  it('forbids normal users from creating products (403)', async () => {
    const res = await request(app).post('/api/products').set(auth(userToken)).send(sample);
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated creation (401)', async () => {
    const res = await request(app).post('/api/products').send(sample);
    expect(res.status).toBe(401);
  });

  it('validates product input (400)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(adminToken))
      .send({ name: '', price: -5 });
    expect(res.status).toBe(400);
  });

  it('gets a single product, 404 for unknown and 400 for bad id', async () => {
    const p = await Product.create(sample);
    expect((await request(app).get(`/api/products/${p._id}`)).status).toBe(200);
    expect((await request(app).get(`/api/products/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
    expect((await request(app).get('/api/products/not-an-id')).status).toBe(400);
  });

  it('updates and deletes a product (admin)', async () => {
    const p = await Product.create(sample);
    const upd = await request(app).put(`/api/products/${p._id}`).set(auth(adminToken)).send({ price: 899 });
    expect(upd.status).toBe(200);
    expect(upd.body.data.price).toBe(899);

    const del = await request(app).delete(`/api/products/${p._id}`).set(auth(adminToken));
    expect(del.status).toBe(200);
    expect(await Product.countDocuments()).toBe(0);
  });
});

describe('Product listing: search, filter, sort, pagination', () => {
  beforeEach(async () => {
    await Product.insertMany([
      { ...sample, name: 'Phone', price: 300, category: 'electronics' },
      { ...sample, name: 'Cheap Phone Case', price: 10, category: 'accessories' },
      { ...sample, name: 'Sofa', price: 500, category: 'home' },
      { ...sample, name: 'Lamp', price: 40, category: 'home' },
    ]);
  });

  it('paginates', async () => {
    const res = await request(app).get('/api/products?limit=2&page=2');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.totalProducts).toBe(4);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('searches by keyword', async () => {
    const res = await request(app).get('/api/products?q=phone');
    expect(res.body.data).toHaveLength(2);
  });

  it('filters by category and price range', async () => {
    const res = await request(app).get('/api/products?category=home&maxPrice=100');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Lamp');
  });

  it('sorts by price descending', async () => {
    const res = await request(app).get('/api/products?sort=price_desc');
    expect(res.body.data[0].name).toBe('Sofa');
  });

  it('does not crash on regex special characters in search', async () => {
    const res = await request(app).get('/api/products?q=(((');
    expect(res.status).toBe(200);
  });
});

describe('Cart and order flow', () => {
  const address = { street: '1 Main St', city: 'Nanded', state: 'MH', postalCode: '431601', country: 'India' };

  it('adds to cart, checks out, reduces stock and clears the cart', async () => {
    const p = await Product.create(sample);

    const add = await request(app)
      .post('/api/cart')
      .set(auth(userToken))
      .send({ productId: p._id, quantity: 2 });
    expect(add.status).toBe(201);
    expect(add.body.data.totalPrice).toBe(1999.98);

    const order = await request(app)
      .post('/api/orders')
      .set(auth(userToken))
      .send({ shippingAddress: address, paymentMethod: 'card', cardNumber: '4242424242424242' });
    expect(order.status).toBe(201);
    expect(order.body.data.paymentStatus).toBe('paid');
    expect(order.body.data.totalPrice).toBe(1999.98);

    expect((await Product.findById(p._id)).stock).toBe(3);

    const cart = await request(app).get('/api/cart').set(auth(userToken));
    expect(cart.body.data.items).toHaveLength(0);

    const history = await request(app).get('/api/orders').set(auth(userToken));
    expect(history.body.data).toHaveLength(1);
  });

  it('refuses to add more than the available stock', async () => {
    const p = await Product.create(sample);
    const res = await request(app)
      .post('/api/cart')
      .set(auth(userToken))
      .send({ productId: p._id, quantity: 50 });
    expect(res.status).toBe(400);
  });

  it('removes an item from the cart', async () => {
    const p = await Product.create(sample);
    const add = await request(app).post('/api/cart').set(auth(userToken)).send({ productId: p._id });
    const itemId = add.body.data.items[0]._id;
    const del = await request(app).delete(`/api/cart/${itemId}`).set(auth(userToken));
    expect(del.status).toBe(200);
    expect(del.body.data.items).toHaveLength(0);
  });

  it('declines a simulated failed card payment and keeps stock intact', async () => {
    const p = await Product.create(sample);
    await request(app).post('/api/cart').set(auth(userToken)).send({ productId: p._id });
    const res = await request(app)
      .post('/api/orders')
      .set(auth(userToken))
      .send({ shippingAddress: address, paymentMethod: 'card', cardNumber: '4000000000000000' });
    expect(res.status).toBe(402);
    expect((await Product.findById(p._id)).stock).toBe(5);
  });

  it('rejects checkout with an empty cart', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(auth(userToken))
      .send({ shippingAddress: address, paymentMethod: 'cod' });
    expect(res.status).toBe(400);
  });

  it("prevents a user from reading someone else's order", async () => {
    const p = await Product.create(sample);
    await request(app).post('/api/cart').set(auth(userToken)).send({ productId: p._id });
    const order = await request(app)
      .post('/api/orders')
      .set(auth(userToken))
      .send({ shippingAddress: address, paymentMethod: 'cod' });

    const other = await User.create({ name: 'Other', email: 'other@test.com', password: 'other1234' });
    const res = await request(app)
      .get(`/api/orders/${order.body.data._id}`)
      .set(auth(generateToken(other._id)));
    expect(res.status).toBe(403);
  });

  it('restocks products when an admin cancels an order', async () => {
    const p = await Product.create(sample);
    await request(app).post('/api/cart').set(auth(userToken)).send({ productId: p._id, quantity: 2 });
    const order = await request(app)
      .post('/api/orders')
      .set(auth(userToken))
      .send({ shippingAddress: address, paymentMethod: 'cod' });
    expect((await Product.findById(p._id)).stock).toBe(3);

    const res = await request(app)
      .put(`/api/orders/${order.body.data._id}/status`)
      .set(auth(adminToken))
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect((await Product.findById(p._id)).stock).toBe(5);
  });
});

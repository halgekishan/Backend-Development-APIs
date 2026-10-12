process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

const validUser = { name: 'Kishan', email: 'kishan@example.com', password: 'secret123' };

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.role).toBe('user');
  });

  it('ignores a role sent in the body (no privilege escalation)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
  });

  it('rejects invalid input with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'K', email: 'not-an-email', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects duplicate emails with 409', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpass1' });
    expect(res.status).toBe(401);
  });

  it('blocks NoSQL injection attempts', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect([400, 401]).toContain(res.status);
  });
});

describe('GET/PUT /api/auth/profile', () => {
  let token;
  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    token = res.body.token;
  });

  it('requires a token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('returns the profile for a valid token', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('updates the profile', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kishan Halge', phone: '8668958029' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Kishan Halge');
  });

  it('changes password only when currentPassword is correct', async () => {
    const bad = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong123', newPassword: 'newpass123' });
    expect(bad.status).toBe(401);

    const ok = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: validUser.password, newPassword: 'newpass123' });
    expect(ok.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'newpass123' });
    expect(login.status).toBe(200);
  });
});

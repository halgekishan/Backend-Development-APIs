# E-commerce Backend API

A complete backend for an online store built with **Node.js, Express.js and MongoDB (Mongoose)**.
Month 3 project – Backend Development & APIs.

## Project Overview

This project is the server side of an e-commerce application. It exposes a RESTful API for:

- **User management** – registration, login (JWT), profile update, roles (user / admin)
- **Product catalog** – CRUD (admin), search, filtering, sorting, pagination
- **Shopping cart** – server-side cart per user with stock checks
- **Order processing** – checkout from cart, simulated payment, order history, admin status updates
- **Security** – validation, sanitization, rate limiting, NoSQL-injection protection

## Tech Stack

| Area | Tools |
|------|-------|
| Runtime / framework | Node.js, Express 4 |
| Database | MongoDB + Mongoose |
| Auth | JSON Web Tokens, bcryptjs |
| Security | helmet, cors, express-rate-limit, express-validator, express-mongo-sanitize |
| Testing | Jest, Supertest, mongodb-memory-server |

## Setup Instructions

**Requirements:** Node.js 18+ and a MongoDB instance (local install or a free MongoDB Atlas cluster).

```bash
# 1. install dependencies
npm install

# 2. create your environment file
cp .env.example .env        # Windows: copy .env.example .env
# then edit .env -> set MONGO_URI and a long random JWT_SECRET

# 3. (optional) seed 10 sample products + an admin account
npm run seed

# 4. start the server
npm run dev                 # auto-reload (nodemon)
# or
npm start
```

Server runs on `http://localhost:5000`. Check `http://localhost:5000/api/health`.

**Default admin (after `npm run seed`):** `admin@example.com` / `Admin@12345`
(change these in `.env` before seeding).

## Code Structure

```
ecommerce-backend/
├── src/
│   ├── app.js                  # Express app, security middleware, routes
│   ├── config/                 # database.js (Mongo connection), jwt.js (sign/verify)
│   ├── models/                 # User, Product, Cart, Order (Mongoose schemas)
│   ├── controllers/            # business logic for auth, products, cart, orders
│   ├── routes/                 # URL -> controller mapping + validation + auth guards
│   ├── middleware/             # auth.js (protect/adminOnly), validation.js, errorHandler.js
│   └── utils/                  # helpers.js (ApiError, sanitizer, payment simulation), seed.js
├── tests/                      # auth.test.js, products.test.js (cart + orders included)
├── docs/api-documentation.md   # full endpoint reference with examples
├── .env.example
└── package.json
```

Request flow: `route → (protect / adminOnly) → validation rules → validate → controller → errorHandler`.

## API Endpoints (summary)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | public | Register |
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/auth/profile` | user | Get profile |
| PUT | `/api/auth/profile` | user | Update profile / password |
| GET | `/api/products` | public | List with search, filter, sort, pagination |
| GET | `/api/products/:id` | public | Single product |
| POST | `/api/products` | admin | Create product |
| PUT | `/api/products/:id` | admin | Update product |
| DELETE | `/api/products/:id` | admin | Delete product |
| GET | `/api/cart` | user | View cart |
| POST | `/api/cart` | user | Add item |
| PUT | `/api/cart/:itemId` | user | Change quantity |
| DELETE | `/api/cart/:itemId` | user | Remove item |
| DELETE | `/api/cart` | user | Clear cart |
| POST | `/api/orders` | user | Checkout (simulated payment) |
| GET | `/api/orders` | user | Order history |
| GET | `/api/orders/:id` | owner/admin | Order details |
| PUT | `/api/orders/:id/status` | admin | Update status (cancel = restock) |

Full details with request/response examples: [`docs/api-documentation.md`](docs/api-documentation.md)

## Technical Details

- **Authentication:** passwords are hashed with bcrypt (10 rounds). Login returns a signed JWT; the `protect` middleware verifies it and loads the user. `role` can never be set through the API, so users cannot make themselves admin.
- **Cart / session management:** the cart is stored in MongoDB with a unique `user` field (one cart per user), so it survives restarts and works across devices. Item prices are snapshotted in the cart, and the order recalculates from the live product price at checkout.
- **Order processing:** payment is simulated first (card numbers ending in `0000` are declined), then stock is reserved with an atomic `findOneAndUpdate({stock: {$gte: qty}})` so concurrent buyers can't oversell. If any item fails, previously reserved stock is rolled back. Cancelling an order restocks items.
- **Security:** express-validator rules on every input, HTML tags stripped from strings, `express-mongo-sanitize` against `$` operators, regex-escaping on search, helmet headers, 10kb body limit, rate limiting (100 requests / 15 min on `/api`, 20 / 15 min on `/api/auth`).
- **Errors:** one central error handler converts Mongoose, JWT and validation errors into consistent JSON.

## Testing

```bash
npm test
```

Tests use an in-memory MongoDB (`mongodb-memory-server`), so no database setup is needed. The first run downloads a MongoDB binary (needs internet once).

Covered scenarios: registration/login validation, duplicate email, NoSQL injection, JWT protection, profile & password change, admin-only product CRUD, search / filter / sort / pagination, cart stock limits, full checkout flow, declined payment, order ownership, cancel + restock.

## Visual Documentation

Add your screenshots to a `docs/screenshots/` folder and link them here:

- Postman: register / login request
- Postman: product list with filters
- Postman: cart and checkout
- Terminal: `npm test` passing

## What I Learned

- **Node.js & Express:** building a layered server (routes → controllers → models)
- **REST API design:** consistent responses, correct status codes, resource-based URLs
- **Authentication:** JWT login flow and role-based authorization
- **Database operations:** CRUD, indexing, aggregation-free pagination and atomic updates with MongoDB
- **API security:** validation, sanitization, rate limiting, injection protection

## Deployment (Render / Railway)

1. Push the repo to GitHub.
2. Create a free MongoDB Atlas cluster and copy its connection string.
3. On Render/Railway create a **Web Service** from the repo:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`
4. Run `npm run seed` once (Render shell, or locally with the Atlas `MONGO_URI`).

## License

MIT

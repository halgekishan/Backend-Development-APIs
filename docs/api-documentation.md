# E-commerce Backend – API Documentation

**Base URL:** `http://localhost:5000`
**Format:** JSON · **Auth:** `Authorization: Bearer <JWT>` header (for protected routes)

## Response format

Success:
```json
{ "success": true, "data": { } }
```
Error:
```json
{ "success": false, "message": "What went wrong" }
```
Validation error (400):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Valid email is required" }]
}
```

## Status codes

| Code | Meaning |
|------|---------|
| 200 / 201 | OK / Created |
| 400 | Validation error, bad id, empty cart, insufficient stock |
| 401 | Missing/invalid/expired token or wrong credentials |
| 402 | Simulated payment declined |
| 403 | Not allowed (admin only / not your order) |
| 404 | Resource not found |
| 409 | Duplicate (email already registered) |
| 429 | Rate limit exceeded |

## Security features

- JWT authentication (7 day expiry by default)
- Passwords hashed with bcrypt
- Role-based access (`user`, `admin`) – role can never be set from the request body
- Input validation (express-validator) + HTML tag stripping
- NoSQL injection protection (express-mongo-sanitize)
- Rate limiting: 100 req / 15 min per IP on `/api`, 20 req / 15 min on `/api/auth`
- helmet security headers, 10kb JSON body limit, CORS

---

## Authentication

### POST `/api/auth/register`
Body:
```json
{ "name": "Kishan", "email": "kishan@example.com", "password": "secret123" }
```
Rules: name 2-60 chars, valid email, password ≥ 6 chars with at least one number.

`201`:
```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": { "_id": "665f...", "name": "Kishan", "email": "kishan@example.com", "role": "user" }
}
```

### POST `/api/auth/login`
Body: `{ "email": "kishan@example.com", "password": "secret123" }`
`200` returns the same shape as register. `401` for wrong credentials.

### GET `/api/auth/profile` 🔒
`200`: `{ "success": true, "user": { ... } }`

### PUT `/api/auth/profile` 🔒
Body (all optional): `name`, `email`, `phone`, `address{street,city,state,postalCode,country}`, `newPassword` (+ required `currentPassword`).

---

## Products

### GET `/api/products`
Query params:

| Param | Example | Description |
|-------|---------|-------------|
| `q` | `phone` | Search in name & description |
| `category` | `electronics` | Exact category (case-insensitive) |
| `minPrice` / `maxPrice` | `10` / `100` | Price range |
| `inStock` | `true` | Only products with stock > 0 |
| `sort` | `price_asc`, `price_desc`, `name_asc`, `oldest` | Default: newest first |
| `page` / `limit` | `1` / `10` | Pagination (limit max 100) |

`200`:
```json
{
  "success": true,
  "data": [ { "_id": "...", "name": "Wireless Headphones", "price": 79.99, "category": "electronics", "stock": 50 } ],
  "pagination": { "currentPage": 1, "totalPages": 1, "totalProducts": 10 }
}
```

### GET `/api/products/:id`
`200` product · `404` not found · `400` invalid id

### POST `/api/products` 🔒 admin
```json
{ "name": "Laptop", "description": "Fast laptop", "price": 999.99, "category": "electronics", "stock": 5, "image": "https://..." }
```
`201` created product.

### PUT `/api/products/:id` 🔒 admin
Any subset of the fields above. `200` updated product.

### DELETE `/api/products/:id` 🔒 admin
`200`: `{ "success": true, "message": "Product deleted" }`

---

## Cart 🔒
The cart is stored server-side per logged-in user (one cart per user), so it follows the user across devices and sessions.

### GET `/api/cart`
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "items": [ { "_id": "itemId", "product": { "name": "Laptop" }, "quantity": 2, "price": 999.99 } ],
    "totalPrice": 1999.98
  }
}
```

### POST `/api/cart`
Body: `{ "productId": "<id>", "quantity": 2 }` (`quantity` defaults to 1). Adds to existing quantity if the product is already in the cart. `400` if quantity exceeds stock.

### PUT `/api/cart/:itemId`
Body: `{ "quantity": 3 }` – sets the quantity of one cart item.

### DELETE `/api/cart/:itemId`
Removes one item (use the cart item `_id`).

### DELETE `/api/cart`
Clears the whole cart.

---

## Orders 🔒

### POST `/api/orders`
Creates an order from the current cart.
```json
{
  "shippingAddress": { "street": "1 Main St", "city": "Nanded", "state": "MH", "postalCode": "431601", "country": "India" },
  "paymentMethod": "card",
  "cardNumber": "4242424242424242"
}
```
- `paymentMethod`: `card`, `upi` or `cod`
- **Payment simulation (no real money):** every payment succeeds, except a `card` number ending in `0000`, which returns `402 Payment declined`.
- Stock is reserved atomically; if any item is out of stock nothing is changed.
- On success the cart is emptied. `cod` orders have `paymentStatus: "pending"`, others `"paid"`.

`201`:
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "_id": "...", "items": [ { "name": "Laptop", "price": 999.99, "quantity": 2 } ],
    "totalPrice": 1999.98, "paymentStatus": "paid", "status": "processing"
  }
}
```

### GET `/api/orders`
Order history of the logged-in user (`page`, `limit` supported).

### GET `/api/orders/:id`
Order details. Only the owner (or an admin) – otherwise `403`.

### PUT `/api/orders/:id/status` 🔒 admin
Body: `{ "status": "shipped" }` – one of `processing`, `shipped`, `delivered`, `cancelled`. Cancelling restocks the items.

---

## Quick curl walkthrough

```bash
# 1. register
curl -X POST localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Kishan","email":"k@example.com","password":"secret123"}'

# 2. list products
curl "localhost:5000/api/products?category=electronics&sort=price_asc"

# 3. add to cart (replace TOKEN and PRODUCT_ID)
curl -X POST localhost:5000/api/cart -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" -d '{"productId":"PRODUCT_ID","quantity":1}'

# 4. checkout
curl -X POST localhost:5000/api/orders -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shippingAddress":{"street":"1 Main St","city":"Nanded","state":"MH","postalCode":"431601","country":"India"},"paymentMethod":"cod"}'
```

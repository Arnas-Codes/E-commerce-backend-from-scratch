# API reference

The application is served over HTTPS by `server.js`. Unless stated otherwise, JSON request bodies use `Content-Type: application/json`. Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

Errors generally return `{ "message": "..." }`. Invalid Mongoose validation errors are converted to HTTP 400 by the error middleware.

## Authentication

| Method | Path | Auth | Body | Behavior |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | `{ name, email, password }` | Creates a user; password must be at least six characters. Returns `201` with `{ message: "User is created" }`. Duplicate email returns `409`. |
| `POST` | `/auth/login` | Public | `{ email, password }` | Returns `200` with `{ message: "Login successful", token }`. Invalid credentials return `401`. |

Registration is limited to five requests per IP per hour. Login is limited to five requests per IP per 15 minutes. The global API limiter is also applied in normal operation.

## Products

| Method | Path | Auth | Parameters/body |
| --- | --- | --- | --- |
| `GET` | `/products` | Public | Query: `category`, `minPrice`, `maxPrice`, `sort` (`price`, `-price`, `name`, `-name`), `page`, `limit`, `search`. |
| `GET` | `/products/:id` | Public | `id` must be a valid MongoDB ObjectId. |
| `POST` | `/products` | Admin | Multipart form with optional `image`, plus `name`, `price`, `category`, `description`, `stock`. Creation requires `name` and `price`. |
| `PUT` | `/products/:id` | Admin | Multipart form with optional `image` and product fields. |
| `DELETE` | `/products/:id` | Admin | Deletes the product and attempts to remove its Cloudinary image. |
| `PATCH` | `/products/:productId/stock` | Admin | JSON `{ stock }`; stock must be a non-negative integer. |
| `PATCH` | `/products/:productId/stock/adjust` | Admin | JSON `{ change }`; change must be a non-zero integer and cannot reduce stock below zero. |

Product listing returns `{ products, totalProducts, totalPages, currentPage, pageLimit }`. Product mutations return the created or updated product, or a message and product for stock operations.

## Users

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| `GET` | `/users/profile` | User | Returns `{ profile: { name, email, role } }` with the current implementation's HTTP `400` success status. |
| `PATCH` | `/users/profile` | User | JSON with at least one of `name` or `email`; updates the profile. |
| `PATCH` | `/users/change-password` | User | JSON `{ currentPassword, newPassword }`; verifies the current password and rejects reuse. |
| `DELETE` | `/users/account` | User | Soft-deactivates the account by setting `isDeleted`. |

## Cart

| Method | Path | Auth | Body/parameters |
| --- | --- | --- | --- |
| `POST` | `/cart` | User | `{ productId, quantity }`; adds to the user's cart or increases an existing item. |
| `GET` | `/cart` | User | Returns the cart with populated products. |
| `PATCH` | `/cart/:productId` | User | `{ quantity }`; replaces the item's quantity. |
| `DELETE` | `/cart/:productId` | User | Removes an item. |
| `DELETE` | `/cart` | User | Clears the cart. |

The validators intend `productId` and quantity to be valid values, but some type checks are implemented incorrectly in the current source. See the [roadmap](./roadmap.md).

## Orders

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| `POST` | `/orders` | User | Creates an order from the cart. Requires a non-empty `Idempotency-Key` header (maximum 200 characters). Reserves stock, records sale movements, deletes the cart, and returns `201`. |
| `GET` | `/orders` | User | Lists the authenticated user's orders. |
| `GET` | `/orders/:orderId` | User | Returns one of the authenticated user's orders. |
| `PATCH` | `/orders/:orderId/cancel` | User | Cancels an eligible order and restores stock transactionally. Optional `reason` query parameter. |
| `PATCH` | `/orders/:orderId/return` | User | Returns items from a delivered order. Body includes `{ items: [{ product, quantity }], reason? }`. |
| `GET` | `/orders/admin` | Admin | Paginated order list. Query: `page`, `limit` (maximum 100), `status`, `from`, `to`, `user`. |
| `PATCH` | `/orders/admin/:orderId/status` | Admin | `{ status }`; transitions follow the controller's allowed state machine. |
| `GET` | `/orders/admin/stats` | Admin | Counts orders by status. |
| `GET` | `/orders/admin/revenue` | Admin | Revenue from delivered orders, optionally filtered by `from` and `to`. |
| `GET` | `/orders/admin/orders-with-users` | Admin | Returns orders with joined user information. |
| `GET` | `/orders/admin/top-customers` | Admin | Returns the ten customers ranked by total order value. |

Order statuses are `pending`, `processing`, `shipped`, `delivered`, and `cancelled`. The `getBestSellingProducts` controller exists but is not mounted by the current router.

## Payments

| Method | Path | Auth | Body/parameters |
| --- | --- | --- | --- |
| `POST` | `/payment` | User | `{ orderId, paymentMethod }`; payment method is intended to be `cash`, `card`, or `mobile_banking`. |
| `PATCH` | `/payment/:paymentId/pay` | User | Confirms a pending payment and moves its order to `processing`. |
| `GET` | `/payment/:paymentId` | User | Returns the authenticated user's payment and populated order. |
| `GET` | `/payment` | User | Lists the authenticated user's payments. |
| `PATCH` | `/payment/:paymentId/fail` | Admin | Marks a pending payment as failed. The controller currently looks up a payment by authenticated user rather than using the route parameter. |

`refundPayment` exists in the controller but is not exposed by the router.

## Inventory

| Method | Path | Auth | Body/parameters |
| --- | --- | --- | --- |
| `PATCH` | `/inventory/:productId` | Admin | `{ stock, reason? }`; sets stock and records an adjustment movement. |
| `POST` | `/inventory/:productId/restock` | Admin | `{ quantity, reason? }`; adds a positive integer quantity. |
| `POST` | `/inventory/:productId/damage` | Admin | `{ quantity, reason? }`; removes stock when sufficient stock exists. |
| `GET` | `/inventory-movements` | Admin | Query: `page`, `limit`, `type`, `product`, `from`, `to`. Returns movement records and pagination metadata. |

Movement types include `sale`, `restock`, `return`, `damage`, `adjustment`, and `order_cancelled`; the query validator currently omits `order_cancelled`.

## Utility routes

- `GET /redis-test` writes and reads a short-lived Redis key. It is a diagnostic route, not a business API.
- `POST /test-upload` accepts one `image` upload using the Cloudinary uploader and returns the uploaded file metadata.
- `/uploads` serves the local `uploads` directory.

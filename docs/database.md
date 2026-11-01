# Database

MongoDB is accessed through Mongoose. `config/db.js` enables `mongoose.set("sanitizeFilter", true)` before connecting with `MONGO_URI`.

## Models

| Model | Responsibility | Important fields |
| --- | --- | --- |
| `User` | Accounts and roles | `name`, unique `email`, bcrypt `password`, `role` (`user`/`admin`), `isDeleted` |
| `Product` | Catalog and stock | `name`, non-negative `price`, `category`, `description`, non-negative `stock`, image URL |
| `Cart` | One cart per user | unique `user`, item product references and quantities |
| `Order` | Purchase snapshot and lifecycle | user, item product/quantity/price, total price, status, timestamps |
| `Payment` | Payment state for an order | user, order, amount, status, payment method |
| `InventoryMovement` | Stock audit trail | product, signed `change`, movement `type`, reason, timestamps |
| `IdempotencyKey` | Duplicate order protection | user, key, associated order, timestamps |

References use ObjectIds with Mongoose `ref` values such as `User`, `Product`, and `Order`. Orders copy the product price into each order item so the order retains the price used at creation time.

## Indexes and constraints

- `User.email` is marked `unique`.
- `Cart.user` is marked `unique`, enforcing one cart per user at the database index level.
- `Product` has indexes on `{ category: 1 }` and `{ category: 1, price: 1 }`.
- `IdempotencyKey` has a unique compound index on `{ user: 1, key: 1 }`.
- Schema enums constrain user roles, order statuses, payment statuses/methods, and movement types.
- Required, minimum, and trim rules are defined in the schemas, but request validation is also used and is not uniformly complete.

## Business workflows

### Cart and order

Order creation requires an authenticated user's cart and `Idempotency-Key`. A MongoDB transaction validates stock, creates the order, decrements stock with a stock predicate, records sale movements, deletes the cart, and stores the idempotency key. Reusing the same key returns the existing order when available.

Cancellation and returns use transactions to restore stock and create inventory movements. Returns are restricted to delivered orders and track `returnedQuantity` per order item.

### Payments

Payment creation is restricted to the order owner and pending orders. Payment confirmation uses a transaction to mark the payment paid and the order processing. Payment amounts are checked against the order total.

### Transactions and limitations

Transactions are used in order creation, payment confirmation, stock adjustment, cancellation, and returns. Product creation/update and several inventory operations update the product and movement records in separate writes, so a failure between writes can leave them inconsistent. No general repository or service layer abstracts these workflows.

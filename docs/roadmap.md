# Roadmap

Priorities reflect the current source and test coverage, not a product plan.

## Critical

- **Validate required runtime configuration at startup.** Fail clearly when `JWT_SECRET`, MongoDB, Cloudinary, or other required production configuration is missing instead of allowing partially configured behavior.
- **Review diagnostic and static routes before deployment.** Decide whether `/redis-test`, `/test-upload`, and `/uploads` should exist outside local development and protect or remove them if not.
- **Audit transaction and concurrency boundaries.** Product/movement writes and some order-status stock restoration paths are not consistently transactional.

## High

- **Fix validator correctness.** Repair cart type checks, import `mongoose` in order-query validation, validate payment IDs/ObjectIds, validate order status values at the middleware boundary, and align inventory movement query types with the schema.
- **Harden payment authorization.** The mounted fail-payment handler ignores `paymentId` and searches by authenticated user; make the route parameter authoritative and define the intended admin/user behavior.
- **Add route-level tests for every mounted endpoint.** Prioritize product mutations, cart operations, inventory, payment transitions, admin reports, and upload failures.
- **Define Redis outage semantics.** The fallback is process-local and does not merge memory counters after Redis recovery. Decide whether this is acceptable or implement an explicit synchronization policy.

## Medium

- **Improve API consistency.** Normalize status codes, response shapes, spelling, and error messages across controllers.
- **Add database indexes for common ownership and time-range queries.** Confirm query plans before adding indexes, especially for orders, payments, and inventory movements.
- **Add lifecycle cleanup.** Close MongoDB, Redis, and test resources during shutdown and test teardown.
- **Configure CORS and request limits deliberately.** Document allowed origins and body-size policies if the API will be called by browser clients.

## Low

- **Expose or remove unfinished controller features deliberately.** `refundPayment` and `getBestSellingProducts` exist but are not routed.
- **Add generated API schemas or OpenAPI documentation** once request and response contracts stabilize.

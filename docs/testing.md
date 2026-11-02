# Testing

## Framework and configuration

Tests use Vitest, Supertest, and Mongoose. `vitest.config.js` loads `tests/setup.js`, disables file parallelism, and sets a 20-second test timeout.

`tests/setup.js` loads dotenv, forces `NODE_ENV` to `test`, and connects to `MONGO_TEST_URI` before the suite. This means the test database must be reachable before integration tests can run.

## Commands

Run the full configured suite:

```bash
npm test
```

Run a focused file:

```bash
npx vitest run tests/security/authentication.test.js
```

The rate-limit tests can be run with:

```bash
npx vitest run tests/security/rateLimitStore.test.js tests/security/rateLimit.test.js
```

## Test organization

- `tests/security/` covers authentication, authorization, IDOR, injection, input validation, error handling, and rate limiting.
- `tests/order/` covers order creation, validation, cancellation, and returns.
- `tests/Payment/` covers payment creation.
- `tests/revenue/` covers revenue aggregation.
- `tests/utils/` covers calculation helpers.
- Files named `integration.test.js` exercise MongoDB-backed workflows; other controller tests commonly mock models.

The suite includes concurrency and transaction tests for order creation and return workflows, including idempotency-key reuse and overselling scenarios.

## Writing tests

Use the existing test setup and Supertest for route behavior. Use isolated model/controller tests when a database is unnecessary. Do not point tests at a shared development database; set `MONGO_TEST_URI` to a dedicated test database.

Rate limiting is disabled in test mode unless `TEST_RATE_LIMIT=true`. The application-level Redis connection is not automatically opened by the test setup, so rate-limit tests exercise the memory fallback unless a test explicitly controls Redis state.

Run `npm run test:redis` for Redis connection, fallback-store, and `/redis-test` route tests without MongoDB or an external Redis server. Most tests use fake clients and stores. `redisHeartbeat.test.js` uses the real Redis client against a local TCP peer that stops replying while keeping its socket open; it verifies outage logging without HTTP traffic and reconnection after replies resume. The suite also covers response deadlines, quiet startup, local counter continuity, shared initialization, a single recovery probe, and diagnostic responses during outages. It does not replace integration testing against a real Redis deployment.

## Current limitations

- No coverage command is configured.
- There is no global teardown that closes Mongoose or Redis connections.
- The test suite does not cover every mounted route or every validation branch.
- Upload, Cloudinary failure, Redis outage, and HTTPS startup behavior are only partially covered.
- Test setup logs connection information and requires an external MongoDB service.

# Getting started

## Prerequisites

- Node.js with support for ECMAScript modules and top-level `await`.
- A MongoDB instance.
- Redis for the distributed rate-limit store. The application can fall back to per-process memory counters when Redis is unavailable.
- Cloudinary credentials for product image uploads.
- A MongoDB deployment that supports the transactions used by order, payment, stock-adjustment, cancellation, and return workflows. A replica set or MongoDB-compatible equivalent is required.

## Install

```bash
npm install
```

The repository loads environment variables through `dotenv/config` in `server.js`. The source references these variables:

| Variable | Use |
| --- | --- |
| `MONGO_URI` | Application MongoDB connection |
| `MONGO_TEST_URI` | Test MongoDB connection |
| `REDIS_URL` | Redis connection; defaults to `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing and verification |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary configuration |
| `CLOUDINARY_API_KEY` | Cloudinary configuration |
| `CLOUDINARY_API_SECRET` | Cloudinary configuration |
| `PORT` | HTTPS server port; defaults to `3000` |
| `NODE_ENV` | Test and error-logging behavior |
| `LOAD_TEST_MODE` | Skips the global limiter when set to `true` |
| `TEST_RATE_LIMIT` | Enables rate-limit middleware in test mode |

Use strong, environment-specific secrets. Do not commit `.env` files or credentials.

## Run locally

Start the HTTPS server:

```bash
npm start
```

The server reads `cert/private-key.pem` and `cert/certificate.pem` and listens on `PORT`. Development mode uses Nodemon:

```bash
npm run dev
```

The application connects to MongoDB before starting the HTTPS server. Redis connection is started asynchronously; rate limiting falls back to memory while Redis is unavailable.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Run `server.js` |
| `npm run dev` | Run `server.js` with Nodemon |
| `npm test` | Run Vitest |

The repository also contains scripts under `scripts/` for Redis checks, performance testing, and performance-data seeding. They are not declared in `package.json`; run them directly with Node only after reviewing their required environment.

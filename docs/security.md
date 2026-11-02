# Security

This page describes implemented controls and known gaps. The application should not be treated as production-ready solely because these controls exist.

## Authentication and authorization

- Registration hashes passwords with bcrypt.
- Login signs a JWT containing `userId` and `role`, with a seven-day expiry.
- Protected routes require a `Bearer` token. `protect` verifies the token, loads the user, and rejects soft-deleted accounts.
- Admin routes use `adminOnly` or `authorizeAdmin` and require `role === "admin"`.
- User-scoped queries generally include both the resource ID and `req.user._id`, reducing cross-user access risk.

JWT signing depends on `JWT_SECRET`; startup does not explicitly validate that it is configured. Tokens are returned in JSON rather than set as cookies.

## Input and request controls

- `express.json()` parses JSON bodies.
- `express-mongo-sanitize` is installed globally.
- Mongoose filter sanitization is enabled.
- Resource-specific middleware validates common fields, IDs, pagination, dates, status values, and quantities.
- The error middleware returns generic messages for HTTP 500 responses outside test mode.

Validation is inconsistent. For example, cart type checks compare values to the literal strings `"string"` and `"number"`, and `validateGetAllOrders` references `mongoose` without importing it. These are documented gaps, not guarantees.

## Rate limiting

The global API limiter uses Redis prefix `rl:api:` and allows 100 requests per IP per 15 minutes. Registration uses `rl:register:` with five requests per IP per hour, and login uses `rl:login:` with five requests per IP per 15 minutes.

`FallbackRateLimitStore` updates a local `MemoryStore` for every request and also updates `rate-limit-redis` while Redis is available. It enforces the higher count and reports the later reset time. This preserves requests seen by the current process across outages and recovery instead of granting a fresh local allowance. Memory counters are not migrated into Redis; requests handled by other processes during an outage are not shared. Strict distributed limits during an outage are therefore not guaranteed, and local history is lost on a process restart.

Redis connects in the background without blocking server startup. Offline queuing is disabled and the pending command queue is capped at 1,000. Rate-limit commands and diagnostics use `sendRedisCommand`, which applies an explicit one-second response deadline in addition to the client's queue timeout. A timed-out command may still execute on Redis, so counts can be conservative. Store initialization is lazy. After a store failure, requests use memory for five seconds; one request then probes Redis while concurrent requests continue using memory. An older successful request cannot clear a newer failure's cooldown. Each limiter checks the client's `isReady` property directly.

One heartbeat runs every five seconds while connected, even with no HTTP traffic. If its reply fails or exceeds the one-second deadline, the client closes the stale connection and reconnects. Silent outages are normally detected within about six seconds, subject to event-loop delays. Reconnection uses capped exponential delays with random jitter; socket connection and idle timeouts also bound connection establishment and stalled handshakes.

Store setup is silent. `[Redis]` logs connection availability and one warning per outage, including the reason and local-memory fallback. A successful reconnection logs availability again. `[Rate limit <prefix>]` logs store-specific command/initialization failures once per failure period and recovery after a successful probe; these can occur while the connection itself remains ready. The configured API, login, and registration policies count every request.

The three prefixes are distinct, so the global and route-specific limiters can intentionally count the same request without triggering `ERR_ERL_DOUBLE_COUNT`.

## Headers, uploads, and network surface

- Helmet is installed globally for common security headers.
- Compression is enabled.
- Cloudinary uploads accept one JPEG, PNG, or WebP file up to 2 MB. Product image routes attempt cleanup after validation or persistence failures.
- CORS is not configured in the inspected source.
- The application serves HTTPS using certificate files, but certificate lifecycle and deployment configuration are outside the application.
- Diagnostic routes `/redis-test`, `/test-upload`, and static `/uploads` are mounted and should be reviewed before exposing the service publicly.

## Important gaps

- No explicit password policy beyond six characters is enforced.
- No request-body size policy beyond Express defaults is configured.
- No CORS policy, security audit logging, or refresh-token/revocation mechanism is implemented.
- Some route validators and controller paths are insufficiently defensive, as detailed in the [roadmap](./roadmap.md).

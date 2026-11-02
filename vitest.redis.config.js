import { defineConfig } from "vitest/config";

// Redis checks do not need MongoDB; the heartbeat test uses a local TCP peer.
export default defineConfig({
  test: {
    include: [
      "tests/security/rateLimitStore.test.js",
      "tests/security/redisConnection.test.js",
      "tests/security/redisDiagnostic.test.js",
      "tests/security/redisHeartbeat.test.js",
    ],
  },
});

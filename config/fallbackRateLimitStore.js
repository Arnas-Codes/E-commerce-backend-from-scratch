import { MemoryStore } from "express-rate-limit";

const RETRY_DELAY_MS = 5000;

class FallbackRateLimitStore {
  constructor(redisStore, isRedisReady) {
    this.redisStore = redisStore;
    this.isRedisReady = isRedisReady;
    this.memoryStore = new MemoryStore();
    this.redisInitPromise = null;
    this.retryAfter = 0;
    this.recovering = false;
    this.failureVersion = 0;
    this.options = null;
    this.localKeys = false;
    this.prefix = redisStore.prefix;
  }

  init(options) {
    this.options = options;
    this.memoryStore.init(options);
  }

  initializeRedis() {
    if (!this.redisInitPromise) {
      // Share initialization across concurrent requests, including sync failures.
      this.redisInitPromise = Promise.resolve().then(() =>
        this.redisStore.init(this.options),
      );
    }

    return this.redisInitPromise;
  }

  async execute(method, key) {
    // Keep local counters warm so an outage does not grant a fresh allowance.
    const local = await this.memoryStore[method](key);
    if (!this.isRedisReady() || Date.now() < this.retryAfter || this.recovering) {
      return local;
    }

    const recoveryAttempt = this.retryAfter > 0;
    if (recoveryAttempt) this.recovering = true;
    const version = this.failureVersion;

    try {
      await this.initializeRedis();
      const remote = await this.redisStore[method](key);

      // An older in-flight success must not clear a newer failure's cooldown.
      if (version === this.failureVersion && this.isRedisReady()) {
        if (recoveryAttempt) {
          console.info(`[Rate limit ${this.prefix}] Redis store recovered.`);
        }
        this.retryAfter = 0;
      }

      if (!local) return remote;
      if (!remote) return local;
      return {
        totalHits: Math.max(local.totalHits, remote.totalHits),
        resetTime: new Date(
          Math.max(local.resetTime.getTime(), remote.resetTime.getTime()),
        ),
      };
    } catch (error) {
      if (this.retryAfter === 0) {
        console.warn(
          `[Rate limit ${this.prefix}] Redis failed (${error.code || error.message}). ` +
            `Using local memory; retry in ${RETRY_DELAY_MS / 1000}s.`,
        );
      }
      this.failureVersion++;
      this.redisInitPromise = null;
      this.retryAfter = Date.now() + RETRY_DELAY_MS;
      return local;
    } finally {
      if (recoveryAttempt) this.recovering = false;
    }
  }

  increment(key) {
    return this.execute("increment", key);
  }

  decrement(key) {
    return this.execute("decrement", key);
  }

  resetKey(key) {
    return this.execute("resetKey", key);
  }

  get(key) {
    return this.execute("get", key);
  }

  shutdown() {
    this.memoryStore.shutdown();
    this.redisStore.shutdown?.();
  }
}

export default FallbackRateLimitStore;

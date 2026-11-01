import { MemoryStore } from "express-rate-limit";
import { isRedisAvailable, setRedisAvailable } from "./redisStatus.js";

class FallbackRateLimitStore {
  constructor(redisStore) {
    this.redisStore = redisStore;
    this.memoryStore = new MemoryStore();
    this.redisInitPromise = null;
    this.options = null;
    this.localKeys = false;
    this.prefix = redisStore.prefix;
  }

  async init(options) {
    this.options = options;
    this.memoryStore.init(options);

    if (isRedisAvailable()) {
      await this.initializeRedis();
    }
  }

  async initializeRedis() {
    if (!this.redisInitPromise) {
      this.redisInitPromise = this.redisStore.init(this.options);
    }

    try {
      await this.redisInitPromise;
    } catch (error) {
      this.redisInitPromise = null;
      setRedisAvailable(false);
      console.error(
        "Redis rate-limit store initialization failed:",
        error.message,
      );
      throw error;
    }
  }

  async execute(method, ...args) {
    if (!isRedisAvailable()) {
      return this.memoryStore[method](...args);
    }

    try {
      await this.initializeRedis();
      return await this.redisStore[method](...args);
    } catch (error) {
      this.redisInitPromise = null;
      setRedisAvailable(false);

      console.error("Redis rate-limit store failed:", error.message);

      return this.memoryStore[method](...args);
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
}

export default FallbackRateLimitStore;

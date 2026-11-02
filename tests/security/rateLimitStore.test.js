import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimit from "express-rate-limit";

import FallbackRateLimitStore from "../../config/fallbackRateLimitStore.js";

let redisReady = false;
const stores = new Set();
const createStore = (redisStore) => {
  const store = new FallbackRateLimitStore(redisStore, () => redisReady);
  stores.add(store);
  return store;
};

const createFakeRedisStore = () => {
  const counts = new Map();

  return {
    prefix: "rl:test:",
    init: async () => {},
    increment: async (key) => {
      const totalHits = (counts.get(key) ?? 0) + 1;
      counts.set(key, totalHits);
      return {
        totalHits,
        resetTime: new Date(Date.now() + 60_000),
      };
    },
    decrement: async (key) => {
      counts.set(key, Math.max((counts.get(key) ?? 0) - 1, 0));
    },
    resetKey: async (key) => {
      counts.delete(key);
    },
    get: async (key) => {
      const totalHits = counts.get(key);
      return totalHits === undefined
        ? undefined
        : {
            totalHits,
            resetTime: new Date(Date.now() + 60_000),
          };
    },
  };
};

beforeEach(() => {
  redisReady = false;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  for (const store of stores) store.shutdown();
  stores.clear();
  vi.restoreAllMocks();
});

describe("FallbackRateLimitStore", () => {
  it("enforces the memory limit when Redis is unavailable at startup", async () => {
    const store = createStore(createFakeRedisStore());
    await store.init({ windowMs: 60_000 });

    const first = (await store.increment("client")).totalHits;
    const second = (await store.increment("client")).totalHits;

    expect(first).toBe(1);
    expect(second).toBe(2);
  });

  it("falls back to memory when Redis fails during a request", async () => {
    const redisStore = createFakeRedisStore();
    redisStore.increment = async () => {
      throw new Error("Redis unavailable");
    };
    const store = createStore(redisStore);
    redisReady = true;
    await store.init({ windowMs: 60_000 });

    const result = await store.increment("client");

    expect(result.totalHits).toBe(1);
  });

  it("uses Redis again after the connection recovers", async () => {
    const redisStore = createFakeRedisStore();
    const store = createStore(redisStore);
    await store.init({ windowMs: 60_000 });

    await store.increment("client");
    redisReady = true;

    const result = await store.increment("client");

    expect(result.totalHits).toBe(2);
  });

  it.each([false, true])(
    "falls back when Redis initialization fails (synchronous: %s)",
    async (synchronous) => {
      const redisStore = createFakeRedisStore();
      redisStore.init = synchronous
        ? () => {
            throw new Error("Script loading failed");
          }
        : async () => {
            throw new Error("Script loading failed");
          };
      const store = createStore(redisStore);
      redisReady = true;
      store.init({ windowMs: 60_000 });

      expect((await store.increment("client")).totalHits).toBe(1);
      expect((await store.increment("client")).totalHits).toBe(2);
    },
  );

  it("retries store failures without needing a Redis reconnection event", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const redisStore = createFakeRedisStore();
    const increment = vi.spyOn(redisStore, "increment")
      .mockRejectedValueOnce(new Error("Command timed out"));
    const store = createStore(redisStore);
    redisReady = true;
    store.init({ windowMs: 60_000 });

    expect((await store.increment("client")).totalHits).toBe(1);
    expect(redisReady).toBe(true);
    expect((await store.increment("client")).totalHits).toBe(2);
    expect(increment).toHaveBeenCalledTimes(1);

    clock.mockReturnValue(now + 5000);
    expect((await store.increment("client")).totalHits).toBe(3);
    expect(increment).toHaveBeenCalledTimes(2);
  });

  it("shares Redis initialization between concurrent requests", async () => {
    const redisStore = createFakeRedisStore();
    let finishInit;
    let markStarted;
    const started = new Promise((resolve) => { markStarted = resolve; });
    redisStore.init = vi.fn(() => {
      markStarted();
      return new Promise((resolve) => { finishInit = resolve; });
    });
    const store = createStore(redisStore);
    redisReady = true;
    store.init({ windowMs: 60_000 });

    const first = store.increment("first-client");
    const second = store.increment("second-client");
    await started;
    expect(redisStore.init).toHaveBeenCalledTimes(1);
    finishInit();

    const results = await Promise.all([first, second]);
    expect(results.map(({ totalHits }) => totalHits)).toEqual([1, 1]);
  });

  it("stays quiet at setup and leaves connection logging to the Redis client", async () => {
    const store = createStore(createFakeRedisStore());
    store.init({ windowMs: 60_000 });
    await store.increment("client");
    await store.increment("client");
    expect(console.warn).not.toHaveBeenCalled();

    redisReady = true;
    await store.increment("client");
    await store.increment("client");
    expect(console.info).not.toHaveBeenCalled();

    redisReady = false;
    await store.increment("client");
    await store.increment("client");
    expect(console.warn).not.toHaveBeenCalled();

    redisReady = true;
    await store.increment("client");
    expect(console.info).not.toHaveBeenCalled();
  });

  it("logs a command failure and recovery even while the connection stays ready", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const redisStore = createFakeRedisStore();
    const increment = vi.spyOn(redisStore, "increment");
    const store = createStore(redisStore);
    redisReady = true;
    store.init({ windowMs: 60_000 });
    await store.increment("client");

    increment.mockRejectedValueOnce(new Error("Command timed out"));
    await store.increment("client");
    await store.increment("client");
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "[Rate limit rl:test:] Redis failed (Command timed out). Using local memory; retry in 5s.",
    );
    expect(console.info).not.toHaveBeenCalled();

    clock.mockReturnValue(now + 5000);
    await store.increment("client");
    expect(console.info).toHaveBeenCalledExactlyOnceWith("[Rate limit rl:test:] Redis store recovered.");
  });

  it("reports a failed recovery without announcing Redis or repeating identical errors", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const redisStore = createFakeRedisStore();
    const init = vi.spyOn(redisStore, "init")
      .mockRejectedValue(new Error("Script permission denied"));
    const store = createStore(redisStore);
    store.init({ windowMs: 60_000 });
    redisReady = true;

    await store.increment("client");
    expect(console.warn).toHaveBeenLastCalledWith(
      "[Rate limit rl:test:] Redis failed (Script permission denied). Using local memory; retry in 5s.",
    );
    clock.mockReturnValue(now + 5000);
    await store.increment("client");
    expect(init).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    init.mockResolvedValue(undefined);
    clock.mockReturnValue(now + 10000);
    await store.increment("client");
    expect(console.info).toHaveBeenCalledExactlyOnceWith("[Rate limit rl:test:] Redis store recovered.");
  });

  it("does not announce recovery for an older request that finishes after a failure", async () => {
    let finishOlderRequest;
    let markStarted;
    const started = new Promise((resolve) => { markStarted = resolve; });
    const redisStore = createFakeRedisStore();
    vi.spyOn(redisStore, "increment")
      .mockImplementationOnce(() => {
        markStarted();
        return new Promise((resolve) => { finishOlderRequest = resolve; });
      })
      .mockRejectedValueOnce(new Error("Connection lost"));
    const store = createStore(redisStore);
    redisReady = true;
    store.init({ windowMs: 60_000 });

    const olderRequest = store.increment("client");
    await started;
    await store.increment("client");
    finishOlderRequest({ totalHits: 1, resetTime: new Date(Date.now() + 60000) });
    await olderRequest;

    expect(console.info).not.toHaveBeenCalled();
    expect((await store.increment("client")).totalHits).toBe(3);
  });

  it("keeps the local allowance across Redis outage and recovery", async () => {
    const redisStore = createFakeRedisStore();
    const store = createStore(redisStore);
    store.init({ windowMs: 60_000 });
    redisReady = true;

    expect((await store.increment("client")).totalHits).toBe(1);
    expect((await store.increment("client")).totalHits).toBe(2);
    redisReady = false;
    expect((await store.increment("client")).totalHits).toBe(3);
    redisReady = true;
    expect((await store.increment("client")).totalHits).toBe(4);
  });

  it("enforces larger shared Redis counts from other processes", async () => {
    const redisStore = createFakeRedisStore();
    await redisStore.increment("client");
    await redisStore.increment("client");
    const store = createStore(redisStore);
    store.init({ windowMs: 60_000 });
    redisReady = true;

    expect((await store.increment("client")).totalHits).toBe(3);
  });

  it("allows only one recovery probe while other requests keep using memory", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const redisStore = createFakeRedisStore();
    const increment = vi.spyOn(redisStore, "increment")
      .mockRejectedValueOnce(new Error("Command timed out"));
    const store = createStore(redisStore);
    store.init({ windowMs: 60_000 });
    redisReady = true;
    await store.increment("client");

    let finishProbe;
    let markStarted;
    const started = new Promise((resolve) => { markStarted = resolve; });
    increment.mockImplementationOnce(() => {
      markStarted();
      return new Promise((resolve) => { finishProbe = resolve; });
    });
    clock.mockReturnValue(now + 5000);
    const probe = store.increment("client");
    await started;
    expect((await store.increment("client")).totalHits).toBe(3);
    expect(increment).toHaveBeenCalledTimes(2);

    finishProbe({ totalHits: 1, resetTime: new Date(now + 60000) });
    await probe;
    expect(console.info).toHaveBeenCalledExactlyOnceWith("[Rate limit rl:test:] Redis store recovered.");
  });
});

describe("layered rate limiters", () => {
  it("allows intentionally layered limiters with distinct prefixes", async () => {
    const app = express();
    app.post(
      "/register",
      rateLimit({
        windowMs: 60_000,
        limit: 1,
        store: createStore({
          ...createFakeRedisStore(),
          prefix: "rl:api:",
        }),
      }),
      rateLimit({
        windowMs: 60_000,
        limit: 1,
        store: createStore({
          ...createFakeRedisStore(),
          prefix: "rl:register:",
        }),
      }),
      (_req, res) => res.sendStatus(204),
    );

    const response = await request(app).post("/register");

    expect(response.status).toBe(204);
  });

  it("keeps API, login, and registration limits independent", async () => {
    const createLimiter = (prefix) =>
      rateLimit({
        windowMs: 60_000,
        limit: 1,
        store: createStore({
          ...createFakeRedisStore(),
          prefix,
        }),
      });
    const app = express();
    app.post("/api", createLimiter("rl:api:"), (_req, res) =>
      res.sendStatus(204),
    );
    app.post("/login", createLimiter("rl:login:"), (_req, res) =>
      res.sendStatus(204),
    );
    app.post("/register", createLimiter("rl:register:"), (_req, res) =>
      res.sendStatus(204),
    );

    const firstResponses = await Promise.all([
      request(app).post("/api"),
      request(app).post("/login"),
      request(app).post("/register"),
    ]);
    const secondResponses = await Promise.all([
      request(app).post("/api"),
      request(app).post("/login"),
      request(app).post("/register"),
    ]);

    expect(firstResponses.map(({ status }) => status)).toEqual([
      204, 204, 204,
    ]);
    expect(secondResponses.map(({ status }) => status)).toEqual([
      429, 429, 429,
    ]);
  });
});

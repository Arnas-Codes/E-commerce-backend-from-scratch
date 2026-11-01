import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import rateLimit from "express-rate-limit";

import FallbackRateLimitStore from "../../config/fallbackRateLimitStore.js";
import { setRedisAvailable } from "../../config/redisStatus.js";

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

afterEach(() => {
  setRedisAvailable(false);
});

describe("FallbackRateLimitStore", () => {
  it("enforces the memory limit when Redis is unavailable at startup", async () => {
    const store = new FallbackRateLimitStore(createFakeRedisStore());
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
    const store = new FallbackRateLimitStore(redisStore);
    setRedisAvailable(true);
    await store.init({ windowMs: 60_000 });

    const result = await store.increment("client");

    expect(result.totalHits).toBe(1);
  });

  it("uses Redis again after the connection recovers", async () => {
    const redisStore = createFakeRedisStore();
    const store = new FallbackRateLimitStore(redisStore);
    await store.init({ windowMs: 60_000 });

    await store.increment("client");
    setRedisAvailable(true);

    const result = await store.increment("client");

    expect(result.totalHits).toBe(1);
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
        store: new FallbackRateLimitStore({
          ...createFakeRedisStore(),
          prefix: "rl:api:",
        }),
      }),
      rateLimit({
        windowMs: 60_000,
        limit: 1,
        store: new FallbackRateLimitStore({
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
        store: new FallbackRateLimitStore({
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

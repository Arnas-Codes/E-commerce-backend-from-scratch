import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import redisClient, { sendRedisCommand } from "../../config/redis.js";
import FallbackRateLimitStore from "../../config/fallbackRateLimitStore.js";

const createRateLimitStore = (prefix) => {
  const redisStore = new RedisStore({
    sendCommand: (...args) => sendRedisCommand(args),
    prefix,
  });

  return new FallbackRateLimitStore(redisStore, () => redisClient.isReady);
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,

  store: createRateLimitStore("rl:api:"),

  message: "Too many requests from this IP, please try again after 15 minutes",
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,

  store: createRateLimitStore("rl:login:"),

  message:
    "Too many login attempts from this IP, please try again after 15 minutes",
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,

  store: createRateLimitStore("rl:register:"),

  message:
    "Too many accounts created from this IP, please try again after an hour",
});

import { createClient } from "redis";
import { setRedisAvailable } from "./redisStatus.js";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      return Math.min(retries * 500, 2000);
    },
  },
});

redisClient.on("ready", () => {
  setRedisAvailable(true);
  console.log("Redis is ready");
});

redisClient.on("end", () => {
  setRedisAvailable(false);
  console.log("Redis connection ended");
});

redisClient.on("reconnecting", () => {
  setRedisAvailable(false);
  console.log("Redis reconnecting...");
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err.code || err.message);
});

export default redisClient;

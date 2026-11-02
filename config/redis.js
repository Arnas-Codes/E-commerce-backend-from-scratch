import "dotenv/config";
import { createClient } from "redis";

const COMMAND_TIMEOUT_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 5000;

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  disableOfflineQueue: true,
  commandsQueueMaxLength: 1000,
  commandOptions: { timeout: COMMAND_TIMEOUT_MS },
  socket: {
    connectTimeout: 5000,
    socketTimeout: 10000,
    reconnectStrategy: (retries) => {
      const delay = Math.min(500 * 2 ** retries, 5000);
      return delay + Math.floor(Math.random() * 250);
    },
  },
});

let connectionState = "starting";
let connectionVersion = 0;
let heartbeatTimer;

export const sendRedisCommand = async (args) => {
  let timer;
  try {
    return await Promise.race([
      redisClient.sendCommand(args),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error("Redis command response timed out");
          error.code = "REDIS_TIMEOUT";
          reject(error);
        }, COMMAND_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const logConnection = (state, message) => {
  if (connectionState === state) return;
  connectionState = state;

  if (state === "unavailable") {
    console.warn(`[Redis] ${message}`);
  } else {
    console.info(`[Redis] ${message}`);
  }
};

const logUnavailable = (error) => {
  const reason = error?.code || error?.message || "connection unavailable";
  logConnection(
    "unavailable",
    `Unavailable (${reason}). Using local memory for rate limiting.`,
  );
};

const handleConnectionError = (error) => {
  clearInterval(heartbeatTimer);
  logUnavailable(error);

  if (redisClient.isReady) {
    redisClient.destroy();
    void connectRedis();
  }
};

redisClient.on("ready", () => {
  connectionVersion++;
  clearInterval(heartbeatTimer);
  logConnection("ready", "Connected. Redis is available for rate limiting.");
  let checking = false;
  heartbeatTimer = setInterval(async () => {
    if (checking || !redisClient.isReady) return;
    checking = true;
    const version = connectionVersion;
    try {
      await sendRedisCommand(["PING"]);
    } catch (error) {
      if (version === connectionVersion) handleConnectionError(error);
    } finally {
      checking = false;
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref();
});

redisClient.on("end", () => {
  clearInterval(heartbeatTimer);
  logConnection("unavailable", "Connection closed. Rate limiting uses local memory.");
});

redisClient.on("reconnecting", () => {
  clearInterval(heartbeatTimer);
  logUnavailable();
});
redisClient.on("error", handleConnectionError);

export const connectRedis = async () => {
  if (redisClient.isOpen) return;

  try {
    await redisClient.connect();
  } catch (error) {
    logUnavailable(error);
  }
};

export default redisClient;

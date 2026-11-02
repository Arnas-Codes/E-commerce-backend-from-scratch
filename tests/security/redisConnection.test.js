import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("redis", async () => {
  const { EventEmitter } = await import("node:events");
  return {
    createClient: () => Object.assign(new EventEmitter(), {
      isOpen: false,
      isReady: false,
      sendCommand: vi.fn(),
      connect: vi.fn(async function () { this.isOpen = true; }),
      destroy: vi.fn(function () {
        this.isReady = false;
        this.isOpen = false;
        this.emit("end");
      }),
    }),
  };
});

let redisClient;
let connectRedis;
let sendRedisCommand;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  ({ default: redisClient, connectRedis, sendRedisCommand } = await import("../../config/redis.js"));
});

afterEach(() => {
  redisClient.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Redis connection logging", () => {
  it("stays quiet until the connection is ready", async () => {
    let finishConnecting;
    redisClient.connect.mockImplementation(() => new Promise((resolve) => {
      finishConnecting = resolve;
    }));

    const connection = connectRedis();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();

    redisClient.emit("ready");
    finishConnecting();
    await connection;
    expect(console.info).toHaveBeenCalledExactlyOnceWith(
      "[Redis] Connected. Redis is available for rate limiting.",
    );
  });

  it("logs one outage and one recovery despite repeated reconnect events", () => {
    redisClient.emit("ready");
    const error = Object.assign(new Error("Connection lost"), { code: "ECONNRESET" });
    redisClient.emit("error", error);
    redisClient.emit("reconnecting");
    redisClient.emit("error", error);
    redisClient.emit("reconnecting");

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      "[Redis] Unavailable (ECONNRESET). Using local memory for rate limiting.",
    );
    redisClient.emit("ready");
    redisClient.emit("ready");
    expect(console.info).toHaveBeenCalledTimes(2);
  });

  it("catches a rejected startup connection", async () => {
    redisClient.connect.mockRejectedValue(new Error("Connection refused"));
    await expect(connectRedis()).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Connection refused"));
  });

  it("replaces an apparently ready socket after a heartbeat error", async () => {
    redisClient.isOpen = true;
    redisClient.isReady = true;
    redisClient.emit("ready");
    redisClient.emit("error", new Error("Command timed out"));

    expect(redisClient.destroy).toHaveBeenCalledOnce();
    expect(redisClient.connect).toHaveBeenCalledOnce();
    expect(redisClient.isReady).toBe(false);
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "[Redis] Unavailable (Command timed out). Using local memory for rate limiting.",
    );
  });

  it("bounds a missing command reply with a response deadline", async () => {
    redisClient.sendCommand.mockImplementation(() => new Promise(() => {}));
    const command = sendRedisCommand(["PING"]);
    const result = expect(command).rejects.toMatchObject({ code: "REDIS_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(1000);
    await result;
  });

  it("checks Redis while idle and stops checking a lost connection", async () => {
    redisClient.isOpen = true;
    redisClient.isReady = true;
    redisClient.sendCommand.mockImplementation(() => new Promise(() => {}));
    redisClient.emit("ready");

    await vi.advanceTimersByTimeAsync(6000);
    expect(redisClient.sendCommand).toHaveBeenCalledExactlyOnceWith(["PING"]);
    expect(redisClient.destroy).toHaveBeenCalledOnce();
    expect(redisClient.connect).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "[Redis] Unavailable (REDIS_TIMEOUT). Using local memory for rate limiting.",
    );

    await vi.advanceTimersByTimeAsync(10000);
    expect(redisClient.sendCommand).toHaveBeenCalledTimes(1);
  });

  it("does not start a second connection while the client is open", async () => {
    redisClient.isOpen = true;
    await connectRedis();
    expect(redisClient.connect).not.toHaveBeenCalled();
  });

  it("announces local memory when the connection ends", () => {
    redisClient.emit("ready");
    redisClient.emit("end");
    redisClient.emit("end");
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(
      "[Redis] Connection closed. Rate limiting uses local memory.",
    );
  });
});

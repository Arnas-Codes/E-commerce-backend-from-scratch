import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../config/redis.js", () => ({
  default: { isReady: false },
  sendRedisCommand: vi.fn(),
}));

// Import application configuration without opening any database connections.
import "dotenv/config";
import redisClient, { sendRedisCommand } from "../../config/redis.js";
import app from "../../app.js";

beforeEach(() => {
  redisClient.isReady = false;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("GET /redis-test", () => {
  it("returns 503 immediately when Redis is offline", async () => {
    const response = await request(app).get("/redis-test");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: "Redis is unavailable." });
    expect(sendRedisCommand).not.toHaveBeenCalled();
  });

  it("handles a Redis failure during the diagnostic request", async () => {
    redisClient.isReady = true;
    sendRedisCommand.mockRejectedValueOnce(new Error("Command timed out"));
    const response = await request(app).get("/redis-test");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: "Redis is unavailable." });
  });

  it("returns the stored value and expiry when Redis responds", async () => {
    redisClient.isReady = true;
    sendRedisCommand.mockResolvedValueOnce("OK")
      .mockResolvedValueOnce("Arnas")
      .mockResolvedValueOnce(10);
    const response = await request(app).get("/redis-test");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ value: "Arnas", ttl: 10 });
  });
});

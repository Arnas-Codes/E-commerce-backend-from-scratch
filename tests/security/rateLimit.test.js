import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app.js";

describe("authentication rate limiting", () => {
  // Use the real middleware. Each route has its own counter and allowance.
  it.each([
    [
      "/auth/login",
      "Too many login attempts from this IP, please try again after 15 minutes",
    ],
    [
      "/auth/register",
      "Too many accounts created from this IP, please try again after an hour",
    ],
  ])("%s blocks the sixth request", async (path, message) => {
    const maxAllowed = 5;

    for (let i = 0; i < maxAllowed; i++) {
      // Invalid input reaches validation without needing a database query.
      const response = await request(app).post(path).send({});

      expect(response.status).toBe(400);
    }

    const blockedResponse = await request(app).post(path).send({});

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.text).toBe(message);
    expect(Number(blockedResponse.headers["retry-after"])).toBeGreaterThan(0);
  });
});

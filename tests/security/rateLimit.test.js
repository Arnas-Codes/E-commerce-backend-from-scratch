import { describe, it, expect } from "vitest";
import request from "supertest";

process.env.TEST_RATE_LIMIT = "true";
const { default: app } = await import("../../app.js");

describe("POST /auth/login rate limiting", () => {
  it("blocks requests after exceeding the 5-attempt threshold", async () => {
    const loginPayload = {
      email: "anyuser@example.com",
      password: "any-password",
    };

    const maxAllowed = 5;

    for (let i = 0; i < maxAllowed; i++) {
      const response = await request(app)
        .post("/auth/login")
        .send(loginPayload);

      expect(response.status).not.toBe(429);
    }

    const blockedResponse = await request(app)
      .post("/auth/login")
      .send(loginPayload);

    expect(blockedResponse.status).toBe(429);
  });
});

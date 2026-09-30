import { afterEach, describe, it, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";
import User from "../../models/user.js";
import { expect } from "vitest";
const uniqueEmail = () => `testuser_${Date.now()}@example.com`;
describe("it tests error middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not expose internal error details", async () => {
    vi.spyOn(User, "findOne").mockRejectedValue(
      new Error("Sensetive information"),
    );

    const response = await request(app)
      .post("/auth/login")
      .send({ email: uniqueEmail(), password: "any-password" });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal Server Error");
    expect(response.body.stack).toBeUndefined();
  });

  it("does not expose stack trace in response", async () => {
    vi.spyOn(User, "findOne").mockRejectedValue(
      new Error("Sensetive information"),
    );

    const response = await request(app)
      .post("/auth/login")
      .send({ email: uniqueEmail(), password: "any-password" });

    expect(response.status).toBe(500);
    expect(response.body.stack).toBeUndefined();
  });
});

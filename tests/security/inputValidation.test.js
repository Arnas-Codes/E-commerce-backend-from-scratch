import { it } from "vitest";
import request from "supertest";
import app from "../../app.js";
import jwt from "jsonwebtoken";
import User from "../../models/user.js";
import { expect } from "vitest";

const uniqueEmail = () => `testuser_${Date.now()}@example.com`;
it("rejects invalid email addresses", async () => {
  const user = await User.create({
    name: "Test User",
    email: uniqueEmail(),
    password: "test-password",
  });
  const invalidEmails = ["plainaddress", "@example.com", "user@"];

  const validToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  for (const email of invalidEmails) {
    const response = await request(app)
      .patch("/users/profile")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ email });
    expect(response.status).toBe(400);
  }
});

it("rejects password that is too short", async () => {
  const payload = {
    name: "Test User",
    email: uniqueEmail(),
    password: "12345",
  };

  const response = await request(app).post("/auth/register").send(payload);
  expect(response.status).toBe(400);
});

it("rejects non-string email", async () => {
  const basePayload = {
    name: "Test User",
    password: "12345",
  };

  const nonStringEmail = [123, null, undefined, { $gte: "" }];

  for (const email of nonStringEmail) {
    const response = await request(app)
      .post("/auth/register")
      .send({ ...basePayload, email });

    expect(response.status).toBe(400);
  }
});

it("rejects non-string password", async () => {
  const basePayload = {
    email: uniqueEmail(),
  };

  const nonStringPasswords = [123456, null, true, ["123456"], { $gte: "" }];

  for (const password of nonStringPasswords) {
    const response = await request(app)
      .post("/auth/login")
      .send({ ...basePayload, password });

    expect(response.status).toBe(400);
  }
});

it("rejects invalid product quantity", async () => {
  const user = await User.create({
    name: "test",
    email: uniqueEmail(),
    password: "123456",
  });

  const basePayload = {
    productId: "123456",
  };
  const validToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const invalidQuantity = ["123456", null, true, ["123456"], { $gte: "" }, -1];

  for (const quantity of invalidQuantity) {
    const response = await request(app)
      .post("/cart/")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ ...basePayload, quantity: quantity });
    expect(response.status).toBe(400);
  }
});

import request from "supertest";
import app from "../../app.js";
import { expect, it } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../../models/user.js";

const uniqueEmail = () => `testuser_${Date.now()}@example.com`;

it("rejects unauthenticated requests", async () => {
  const response = await request(app).get("/orders");

  expect(response.status).toBe(401);
});

it("rejects requests with invalid token", async () => {
  const response = await request(app)
    .get("/orders")
    .set("Authorization", "Bearer invalidtoken");

  expect(response.status).toBe(401);
});

it("rejects requests with expired token", async () => {
  const expiredToken = jwt.sign({ userId: "12345" }, process.env.JWT_SECRET, {
    expiresIn: "-1s", // Token expired 1 second ago
  });

  const response = await request(app)
    .get("/orders")
    .set("Authorization", `Bearer ${expiredToken}`);

  expect(response.status).toBe(401);
});

it("accepts requests with valid token", async () => {
  const user = await User.create({
    name: "Test User",
    email: uniqueEmail(),
    password: "test-password",
  });

  const validToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .get("/orders")
    .set("Authorization", `Bearer ${validToken}`);

  expect(response.status).toBe(200);
});

it("rejects token signed with wrong secret", async () => {
  const wrongToken = jwt.sign({ userId: "123456" }, "wrongsecret", {
    expiresIn: "1h",
  }); // Token signed with a wrong secret

  const response = await request(app)
    .get("/orders")
    .set("Authorization", `Bearer ${wrongToken}`);

  expect(response.status).toBe(401);
});

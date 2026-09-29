import { it } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { expect } from "vitest";
import jwt from "jsonwebtoken";
import User from "../../models/user.js";
import mongoose from "mongoose";

const uniqueEmail = () => `testuser_${Date.now()}@example.com`;

it("rejects MongoDB operator in email", async () => {
  const nosqlInjectionPayloads = [
    { $gt: "" },
    { $ne: null },
    { $regex: ".*" },
    { $or: [{}, { name: "Test User" }] },
    { $exists: true },
  ];

  for (const payload of nosqlInjectionPayloads) {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: payload, password: "test-password" });

    expect(response.status).toBe(400);
  }
});

it("rejects MongoDB operator in password", async () => {
  const nosqlInjectionPayloads = [
    { $gt: "" },
    { $ne: null },
    { $regex: ".*" },
    { $or: [{}, { password: "Test password" }] },
    { $exists: true },
  ];

  for (const payload of nosqlInjectionPayloads) {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: uniqueEmail(), password: payload });

    expect(response.status).toBe(400);
  }
});

it("rejects MongoDB operator injection in productId", async () => {
  const user = await User.create({
    name: "Test User",
    email: uniqueEmail(),
    password: "test-password",
  });

  const validToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const nosqlInjectionPayloads = [
    { $gt: "" },
    { $ne: null },
    { $regex: ".*" },
    { $or: [{}, { productId: "00000" }] },
    { $exists: true },
  ];

  for (const payload of nosqlInjectionPayloads) {
    const response = await request(app)
      .post("/cart/")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        productId: payload,
        quantity: 1,
      });

    expect(response.status).toBe(400);
  }
});

import { it } from "vitest";
import User from "../../models/user";
import jwt from "jsonwebtoken";
import app from "../../app.js";
import request from "supertest";
import { expect } from "vitest";

const uniqueEmail = () => `testuser_${Date.now()}@example.com`;

it("rejects normal user from accessing admin route", async () => {
  const user = await User.create({
    name: "Test User",
    email: uniqueEmail(),
    password: "test-password",
  });

  const validToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .get("/orders/admin")
    .set("Authorization", `Bearer ${validToken}`);

  expect(response.status).toBe(403);
});

it("allows admin to access admin route", async () => {
  const adminUser = await User.create({
    name: "Admin User",
    email: uniqueEmail(),
    password: "test-password",
    role: "admin",
  });

  const validToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .get("/orders/admin")
    .set("Authorization", `Bearer ${validToken}`);

  expect(response.status).toBe(200);
});

it("rejects deleted user with valid token from accessing any route", async () => {
  const deletedUser = await User.create({
    name: "Deleted User",
    email: uniqueEmail(),
    password: "test-password",
    isDeleted: true,
  });

  const validToken = jwt.sign({ userId: deletedUser._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .get("/orders")
    .set("Authorization", `Bearer ${validToken}`);

  expect(response.status).toBe(401);
});

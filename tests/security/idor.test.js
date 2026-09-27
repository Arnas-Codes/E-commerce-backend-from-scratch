import { it } from "vitest";
import app from "../../app.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import User from "../../models/user.js";
import Order from "../../models/order.js";
import { expect } from "vitest";
import mongoose from "mongoose";
import Product from "../../models/product.js";

const uniqueEmail = () => `testuser_${Date.now()}@example.com`;

it("allows user to access their own order", async () => {
  const user = await User.create({
    name: "User",
    email: uniqueEmail(),
    password: "test-password",
  });

  const order = await Order.create({
    user: user._id,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: 10,
      },
    ],
    totalPrice: 10,
  });

  const validToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .get(`/orders/${order._id}`)
    .set("Authorization", `Bearer ${validToken}`);

  expect(response.status).toBe(200);
});

it("prevents user from accessing another user's order", async () => {
  const userA = await User.create({
    name: "User A",
    email: uniqueEmail(),
    password: "test-password",
  });

  const userB = await User.create({
    name: "User B",
    email: uniqueEmail(),
    password: "test-password",
  });

  const order = await Order.create({
    user: userB._id,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: 10,
      },
    ],
    totalPrice: 10,
  });
  const validToken = jwt.sign({ userId: userA._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .get(`/orders/${order._id}`)
    .set("Authorization", `Bearer ${validToken}`);

  expect(response.status).toBe(404);
});

it("prevents user from canceling another user's order", async () => {
  const userA = await User.create({
    name: "User A",
    email: uniqueEmail(),
    password: "test-password",
  });

  const userB = await User.create({
    name: "User B",
    email: uniqueEmail(),
    password: "test-password",
  });

  const order = await Order.create({
    user: userB._id,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: 10,
      },
    ],
    totalPrice: 10,
  });

  const validToken = jwt.sign({ userId: userA._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .patch(`/orders/${order._id}/cancel`)
    .set("Authorization", `Bearer ${validToken}`);

  expect(response.status).toBe(404);
});

it("prevents user from returning another user's order", async () => {
  const userA = await User.create({
    name: "User A",
    email: uniqueEmail(),
    password: "test-password",
  });

  const userB = await User.create({
    name: "User B",
    email: uniqueEmail(),
    password: "test-password",
  });

  const order = await Order.create({
    user: userB._id,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: 10,
      },
    ],
    totalPrice: 10,
  });

  const validToken = jwt.sign({ userId: userA._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .patch(`/orders/${order._id}/return`)
    .set("Authorization", `Bearer ${validToken}`);

  expect(response.status).toBe(404);
});

it("allows user to cancel their own order", async () => {
  const user = await User.create({
    name: "User",
    email: uniqueEmail(),
    password: "test-password",
  });

  const product = await Product.create({
    name: "Test Product",
    price: 10,
    stock: 100,
    category: "Test Category",
  });

  const order = await Order.create({
    user: user._id,
    items: [
      {
        product: product._id,
        quantity: 1,
        price: 10,
      },
    ],
    totalPrice: 10,
    status: "pending",
  });

  const validToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .patch(`/orders/${order._id}/cancel`)
    .set("Authorization", `Bearer ${validToken}`);
  expect(response.status).toBe(200);
});

it("allows user to return their own order", async () => {
  const user = await User.create({
    name: "User",
    email: uniqueEmail(),
    password: "test-password",
  });

  const product = await Product.create({
    name: "Test Product",
    price: 10,
    stock: 100,
    category: "Test Category",
  });

  const order = await Order.create({
    user: user._id,
    items: [
      {
        product: product._id,
        quantity: 1,
        price: 10,
        returnedQuantity: 0,
      },
    ],
    totalPrice: 10,
    status: "delivered",
  });
  const validToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .patch(`/orders/${order._id}/return`)
    .set("Authorization", `Bearer ${validToken}`)
    .send({
      items: [
        {
          product: product._id,
          quantity: 1,
        },
      ],
    });
  expect(response.status).toBe(200);
});

it("prevents user from modifying another user's order", async () => {
  const userA = await User.create({
    name: "User A",
    email: uniqueEmail(),
    password: "test-password",
  });

  const userB = await User.create({
    name: "User B",
    email: uniqueEmail(),
    password: "test-password",
  });

  const order = await Order.create({
    user: userB._id,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: 10,
      },
    ],
    totalPrice: 10,
    status: "delivered",
  });

  const validToken = jwt.sign({ userId: userA._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const response = await request(app)
    .patch(`/orders/${order._id}/return`)
    .set("Authorization", `Bearer ${validToken}`)
    .send({
      items: [{ product: new mongoose.Types.ObjectId(), quantity: 1 }],
    });

  expect(response.status).toBe(404);
});

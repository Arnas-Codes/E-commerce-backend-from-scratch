import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import User from "../../../models/user.js";
import Product from "../../../models/product.js";
import Order from "../../../models/order.js";
import { getRevenueStats } from "../../../controllers/orderController.js";

const uniqueEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

describe("getRevenueStats integration", () => {
  beforeEach(async () => {
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
  });
  it("returns revenue from delivered orders", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 500,
        },
      ],

      totalPrice: 1000,
      status: "delivered",
    });

    const req = {
      query: {},
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getRevenueStats(req, res);

    const responseData = res.json.mock.calls[0][0];

    expect(responseData.revenueStats[0].revenue).toBe(1000);
  });

  it("ignores pending orders when calculating revenue", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });
    const deliveredOrder = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 500,
        },
      ],
      totalPrice: 1000,
      status: "delivered",
    });
    const pendingOrder = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 500,
        },
      ],
      totalPrice: 1000,
      status: "pending",
    });

    const req = {
      query: {},
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getRevenueStats(req, res);

    const responseData = res.json.mock.calls[0][0];

    expect(responseData.revenueStats[0].revenue).toBe(1000);
  });

  it("returns revenue for a valid date range", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });
    const orderA = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 500,
        },
      ],
      totalPrice: 1000,
      status: "delivered",
      createdAt: new Date("2026-03-01"),
    });

    const orderB = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 500,
        },
      ],
      totalPrice: 500,
      status: "delivered",
      createdAt: new Date("2026-04-01"),
    });

    const req = {
      query: {
        from: "2026-02-16",
        to: "2026-05-16",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getRevenueStats(req, res);

    const responseData = res.json.mock.calls[0][0];

    expect(responseData.revenueStats[0].revenue).toBe(1500);
  });

  it("includes orders on the date boundaries", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });
    const orderA = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 500,
        },
      ],
      totalPrice: 1000,
      status: "delivered",
      createdAt: new Date("2026-02-16"),
    });

    const orderB = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 500,
        },
      ],
      totalPrice: 500,
      status: "delivered",
      createdAt: new Date("2026-05-16"),
    });

    const req = {
      query: {
        from: "2026-02-16",
        to: "2026-05-16",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getRevenueStats(req, res);

    const responseData = res.json.mock.calls[0][0];

    expect(responseData.revenueStats[0].revenue).toBe(1500);
  });

  it("calculates revenue from delivered orders", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });
    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 1000,
        },
      ],
      totalPrice: 1000,
      status: "delivered",
      createdAt: new Date("2026-03-01"),
    });

    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 2500,
        },
      ],
      totalPrice: 2500,
      status: "delivered",
      createdAt: new Date("2026-04-01"),
    });

    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 5000,
        },
      ],
      totalPrice: 5000,
      status: "pending",
      createdAt: new Date("2026-04-01"),
    });

    const req = {
      query: {
        from: "2026-02-16",
        to: "2026-05-16",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getRevenueStats(req, res);

    const responseData = res.json.mock.calls[0][0];

    expect(responseData.revenueStats[0].revenue).toBe(3500);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  it("calculates revenue only from delivered orders", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product",
      price: 500,
      category: "Test",
      stock: 10,
    });

    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 1000,
        },
      ],
      totalPrice: 2000,
      status: "delivered",
      createdAt: new Date("2026-03-01"),
    });

    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 5,
          price: 1000,
        },
      ],
      totalPrice: 5000,
      status: "pending",
      createdAt: new Date("2026-03-01"),
    });

    const req = {
      query: {
        from: "2026-02-16",
        to: "2026-05-16",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getRevenueStats(req, res);

    const responseData = res.json.mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(responseData.revenueStats[0].revenue).toBe(2000);
  });

  it("calculates revenue only from valid date range", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product",
      price: 500,
      category: "Test",
      stock: 10,
    });

    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 500,
        },
      ],
      totalPrice: 1000,
      status: "delivered",
      createdAt: new Date("2026-01-01"),
    });

    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 1000,
        },
      ],
      totalPrice: 2000,
      status: "delivered",
      createdAt: new Date("2026-03-01"),
    });

    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 3,
          price: 1000,
        },
      ],
      totalPrice: 3000,
      status: "delivered",
      createdAt: new Date("2026-06-01"),
    });

    const req = {
      query: {
        from: "2026-02-01",
        to: "2026-05-01",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getRevenueStats(req, res);

    const responseData = res.json.mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(responseData.revenueStats[0].revenue).toBe(2000);
  });

  it("returns empty array when orders are outside date range", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product",
      price: 500,
      category: "Test",
      stock: 10,
    });

    await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 500,
        },
      ],
      totalPrice: 1000,
      status: "delivered",
      createdAt: new Date("2026-01-01"),
    });

    const req = {
      query: {
        from: "2026-02-01",
        to: "2026-05-01",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getRevenueStats(req, res);

    const responseData = res.json.mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(responseData.revenueStats).toHaveLength(0);
  });
});

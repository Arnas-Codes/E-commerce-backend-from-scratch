import { afterEach, beforeEach, describe, it, vi, expect } from "vitest";
import Cart from "../../../models/cart";
import Order from "../../../models/order";
import Product from "../../../models/product";
import User from "../../../models/user";
import InventoryMovement from "../../../models/inventoryMovement";
import Payment from "../../../models/payment";
import mongoose from "mongoose";
import { createPayment } from "../../../controllers/paymentController";

const uniqueEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

describe("createPayment", () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await InventoryMovement.deleteMany({});
    await Payment.deleteMany({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when order does not exist", async () => {
    const fakeOrderId = new mongoose.Types.ObjectId().toString();
    const fakeUserId = new mongoose.Types.ObjectId().toString();

    const req = {
      user: {
        _id: fakeUserId,
      },
      body: {
        orderId: fakeOrderId,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Order not found",
    });
  });

  it("rejects when order belongs to another user", async () => {
    const orderOwner = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const requestUser = await User.create({
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

    const order = await Order.create({
      user: orderOwner._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 500,
        },
      ],
      totalPrice: 500,
    });

    const req = {
      user: {
        _id: requestUser._id,
      },
      body: {
        orderId: order._id,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Order not found",
    });
  });

  it.each(["processing", "shipped", "delivered", "cancelled"])(
    "rejects when order status is invalid",
    async (invalidStatus) => {
      const userId = new mongoose.Types.ObjectId().toString();
      const productId = new mongoose.Types.ObjectId().toString();

      const order = await Order.create({
        user: userId,
        items: [
          {
            product: productId,
            quantity: 1,
            price: 500,
          },
        ],
        totalPrice: 500,
        status: invalidStatus,
      });

      const req = {
        user: {
          _id: userId,
        },
        body: {
          orderId: order._id,
        },
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: `You cannot create payment. The order is already ${invalidStatus}`,
      });
    },
  );

  it("successfully create payment when no existingPayment", async () => {
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

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 500,
        },
      ],
      totalPrice: 500,
      status: "pending",
    });

    const req = {
      user: {
        _id: user._id,
      },
      body: {
        orderId: order._id,
        paymentMethod: "card",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Payment created successfully",
        payment: expect.objectContaining({
          user: user._id,
          order: order._id,
          amount: order.totalPrice,
          paymentMethod: "card",
        }),
      }),
    );

    const savedPayment = await Payment.findOne({ order: order._id });
    expect(savedPayment).not.toBeNull();
    expect(savedPayment?.amount).toBe(500);

    expect(savedPayment?.status).toBe("pending");
  });

  it.each([
    ["paid", "Payment has already been paid."],
    ["refunded", "This order's payment has already been refunded."],
    ["pending", "A pending payment already exists for this order."],
  ])("rejects when invalid payment status", async (status, expectedMessage) => {
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

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 500,
        },
      ],
      totalPrice: 500,
      status: "pending",
    });

    await Payment.create({
      user: user._id,
      order: order._id,
      amount: order.totalPrice,
      paymentMethod: "card",
      status: status,
    });

    const req = {
      user: {
        _id: user._id,
      },
      body: {
        orderId: order._id,
        paymentMethod: "card",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: expectedMessage });
  });

  it("allows creating a new payment if previous payment status was 'failed'", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "password123",
    });

    const order = await Order.create({
      user: user._id,
      totalPrice: 500,
      status: "pending",
    });

    await Payment.create({
      user: user._id,
      order: order._id,
      amount: order.totalPrice,
      paymentMethod: "card",
      status: "failed",
    });

    const req = {
      user: { _id: user._id },
      body: { orderId: order._id, paymentMethod: "card" },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Payment created successfully",
        payment: expect.objectContaining({
          user: user._id,
          order: order._id,
          amount: order.totalPrice,
          paymentMethod: "card",
        }),
      }),
    );

    const payments = await Payment.find({ order: order._id });

    expect(payments).toHaveLength(2);
    expect(payments.some((p) => p.status === "failed")).toBe(true);
    expect(payments.some((p) => p.status === "pending")).toBe(true);
  });
});

import { afterEach, beforeEach, describe, it, vi, expect } from "vitest";
import Cart from "../../../../models/cart";
import Order from "../../../../models/order";
import Product from "../../../../models/product";
import User from "../../../../models/user";
import InventoryMovement from "../../../../models/inventoryMovement";
import Payment from "../../../../models/payment";
import mongoose from "mongoose";
import { createPayment } from "../../../../controllers/paymentController";

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

  // it("rejecrts when")
});

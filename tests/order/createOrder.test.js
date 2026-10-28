import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";

import { createOrder } from "../../controllers/orderController";
import Cart from "../../models/cart";
import Product from "../../models/product";
import Order from "../../models/order";
import InventoryMovement from "../../models/inventoryMovement";

describe("createOrder", () => {
  let fakeSession;
  let req;
  let res;
  let next;

  beforeEach(() => {
    fakeSession = {
      withTransaction: vi.fn(),
      endSession: vi.fn(),
    };
    vi.spyOn(mongoose, "startSession").mockResolvedValue(fakeSession);

    fakeSession.withTransaction.mockImplementation(async (callback) => {
      await callback();
    });
  });

  req = {
    user: { _id: "user1" },
  };

  res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  next = vi.fn();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an order successfully", async () => {
    const fakeProductId = new mongoose.Types.ObjectId();
    const fakeUserId = new mongoose.Types.ObjectId();
    const fakeOrderId = new mongoose.Types.ObjectId();

    const fakeCart = {
      user: fakeUserId,
      items: [
        {
          product: fakeProductId,
          quantity: 2,
        },
      ],
    };

    vi.spyOn(Cart, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeCart),
    });

    const fakeProduct = {
      _id: fakeProductId,
      price: 100,
      stock: 10,
      save: vi.fn(),
    };

    vi.spyOn(Product, "findById").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeProduct),
    });

    const fakeOrder = {
      _id: fakeOrderId,
      user: fakeUserId,
      items: [
        {
          product: fakeProductId,
          quantity: 2,
          price: 100,
        },
      ],
      totalPrice: 200,
    };

    vi.spyOn(Order, "create").mockResolvedValue([fakeOrder]);

    vi.spyOn(Product, "findOneAndUpdate").mockImplementation(
      async (query, update) => {
        if (update.$inc && update.$inc.stock) {
          fakeProduct.stock += update.$inc.stock;
        }
        return fakeProduct;
      },
    );

    vi.spyOn(InventoryMovement, "create").mockResolvedValue([]);

    vi.spyOn(Cart, "findOneAndDelete").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeCart),
    });

    const req = {
      user: { _id: fakeUserId },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Order created successfully",
      order: fakeOrder,
    });

    expect(fakeProduct.stock).toBe(8);
    expect(Order.create).toHaveBeenCalled();
    expect(InventoryMovement.create).toHaveBeenCalled();
    expect(Cart.findOneAndDelete).toHaveBeenCalled();
  });

  it("throws an error when cart is empty", async () => {
    vi.spyOn(Cart, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(null),
    });

    await createOrder(req, res, next);

    const responseData = next.mock.calls[0][0];
    expect(responseData.statusCode).toBe(400);
    expect(responseData.message).toBe("Cart is empty");
  });

  it("throws an error when product not found", async () => {
    const fakeCart = {
      items: [
        {
          product: "product1",
          quantity: 2,
        },
      ],
    };

    vi.spyOn(Cart, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeCart),
    });

    vi.spyOn(Product, "findById").mockReturnValue({
      session: vi.fn().mockResolvedValue(null),
    });

    await createOrder(req, res, next);

    const responseData = next.mock.calls[0][0];
    expect(responseData.statusCode).toBe(404);
    expect(responseData.message).toBe("Product not found");
  });

  it("throws an error when not enough product stock", async () => {
    const fakeCart = {
      items: [
        {
          product: "product1",
          quantity: 2,
        },
      ],
    };

    vi.spyOn(Cart, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeCart),
    });

    const fakeProduct = {
      _id: "product1",
      price: 100,
      stock: 0,
      save: vi.fn(),
    };

    vi.spyOn(Product, "findById").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeProduct),
    });

    await createOrder(req, res, next);

    const responeData = next.mock.calls[0][0];
    expect(responeData.statusCode).toBe(400);
    expect(responeData.message).toBe("Not enough stock");
  });
});

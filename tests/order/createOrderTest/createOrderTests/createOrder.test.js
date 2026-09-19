import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";

import { createOrder } from "../../../../controllers/orderController";
import Cart from "../../../../models/cart";
import Product from "../../../../models/product";
import Order from "../../../../models/order";
import InventoryMovement from "../../../../models/inventoryMovement";

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
    vi.resetAllMocks();
  });

  it("creates an order successfully", async () => {
    vi.spyOn(mongoose, "startSession").mockResolvedValue(fakeSession);

    fakeSession.withTransaction.mockImplementation(async (callback) => {
      await callback();
    });

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
      stock: 10,
      save: vi.fn(),
    };

    vi.spyOn(Product, "findById").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeProduct),
    });

    const fakeOrder = {
      _id: "order1",
      user: "user1",
      items: [
        {
          product: "product1",
          quantity: 2,
          price: 100,
        },
      ],
      totalPrice: 200,
    };

    vi.spyOn(Order, "create").mockResolvedValue([fakeOrder]);

    vi.spyOn(InventoryMovement, "create").mockResolvedValue([]);

    vi.spyOn(Cart, "findOneAndDelete").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeCart),
    });

    await createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Order created successfully",
      order: fakeOrder,
    });

    expect(fakeProduct.stock).toBe(8);

    expect(fakeProduct.save).toHaveBeenCalled();

    expect(Order.create).toHaveBeenCalled();

    expect(InventoryMovement.create).toHaveBeenCalled();

    expect(Cart.findOneAndDelete).toHaveBeenCalled();

    expect(fakeSession.endSession).toHaveBeenCalled();
  });

  it("throws an error when cart is empty", async () => {
    vi.spyOn(mongoose, "startSession").mockResolvedValue(fakeSession);

    fakeSession.withTransaction.mockImplementation(async (callback) => {
      await callback();
    });

    vi.spyOn(Cart, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(null),
    });

    await createOrder(req, res, next);

    const responseData = next.mock.calls[0][0];
    expect(responseData.statusCode).toBe(400);
    expect(responseData.message).toBe("Cart is empty");
  });

  it("throws an error when product not found", async () => {
    vi.spyOn(mongoose, "startSession").mockResolvedValue(fakeSession);

    fakeSession.withTransaction.mockImplementation(async (callback) => {
      await callback;
    });

    const fakeCart = {
      items: [
        {
          product: "product1",
          quantity: 2, 
        },
      ],
    };

    
  });
});

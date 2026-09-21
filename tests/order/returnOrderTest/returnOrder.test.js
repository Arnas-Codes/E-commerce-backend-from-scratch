import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Order from "../../../models/order";
import Product from "../../../models/product";
import InventoryMovement from "../../../models/inventoryMovement";
import { returnOrder } from "../../../controllers/orderController";

describe("returnOrder", () => {
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

    req = {
      user: { _id: "user1" },
      params: { orderId: "order1" },
      body: {
        items: [
          {
            product: "product1",
            quantity: 1,
            returnedQuantity: 0,
            price: 500,
          },
        ],
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    next = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an order successfully", async () => {
    const fakeOrder = {
      items: [
        {
          product: "product1",
          quantity: 2,
          returnedQuantity: 1,
          price: 500,
        },
      ],
      totalPrice: 1000,
      status: "delivered",
      save: vi.fn(),
    };

    vi.spyOn(Order, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeOrder),
    });

    const existingProduct = {
      name: "product1",
      price: 500,
      stock: 10,
      save: vi.fn(),
    };

    vi.spyOn(Product, "findById").mockReturnValue({
      session: vi.fn().mockResolvedValue(existingProduct),
    });

    vi.spyOn(InventoryMovement, "create").mockResolvedValue([]);

    await returnOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Order items returned successfully",
      inventoryMovements: expect.anything(),
    });
  });
});

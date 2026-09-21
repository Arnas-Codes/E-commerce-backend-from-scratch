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

    expect(existingProduct.stock).toBe(11);
    expect(fakeOrder.items[0].returnedQuantity).toBe(2);
    expect(fakeOrder.save).toHaveBeenCalled();
    expect(existingProduct.save).toHaveBeenCalled();
  });

  it("throw a error when order not found", async () => {
    vi.spyOn(Order, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(null),
    });

    await returnOrder(req, res, next);

    const responseData = next.mock.calls[0][0];

    expect(responseData.statusCode).toBe(404);
    expect(responseData.message).toBe("Order not found");
  });
  it.each(["pending", "processing", "shipped", "cancelled"])(
    "throws error when order status is '%s'",
    async (invalidStatus) => {
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
        status: invalidStatus,
        save: vi.fn(),
      };

      vi.spyOn(Order, "findOne").mockReturnValue({
        session: vi.fn().mockResolvedValue(fakeOrder),
      });

      await returnOrder(req, res, next);

      const responseData = next.mock.calls[0][0];

      expect(responseData.statusCode).toBe(400);
      expect(responseData.message).toBe(
        "Only delivered orders can be returned",
      );
    },
  );

  it.each([[], {}, null, undefined])(
    "throws error when return items in body are %s",
    async (invalidItems) => {
      req.body.items = invalidItems;

      const fakeOrder = {
        _id: "order1",
        status: "delivered",
        items: [],
      };

      vi.spyOn(Order, "findOne").mockReturnValue({
        session: vi.fn().mockResolvedValue(fakeOrder),
      });

      await returnOrder(req, res, next);

      const responseData = next.mock.calls[0][0];

      expect(responseData.statusCode).toBe(400);
      expect(responseData.message).toBe("Return items are required");
    },
  );
  it("throws error when there are duplicate product entries in return request", async () => {
    req.body.items = [
      { product: "product1", quantity: 1 },
      { product: "product1", quantity: 1 },
    ];

    const fakeOrder = {
      _id: "order1",
      status: "delivered",
      items: [
        { product: "product1", quantity: 2, returnedQuantity: 0, price: 500 },
      ],
    };

    vi.spyOn(Order, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeOrder),
    });

    await returnOrder(req, res, next);

    const responseData = next.mock.calls[0][0];

    expect(responseData.statusCode).toBe(400);
    expect(responseData.message).toBe(
      "Duplicate product entries in return request",
    );
  });
});

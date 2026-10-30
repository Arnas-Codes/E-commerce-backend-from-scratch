import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import mongoose from "mongoose";

import { createOrder } from "../../controllers/orderController";
import Cart from "../../models/cart";
import Product from "../../models/product";
import Order from "../../models/order";
import InventoryMovement from "../../models/inventoryMovement";
import IdempotencyKey from "../../models/idempotencyKey";

describe("createOrder", () => {
  let fakeSession;
  let req;
  let res;
  let next;
  let fakeUserId;

  beforeEach(() => {
    vi.restoreAllMocks();

    fakeUserId = new mongoose.Types.ObjectId();

    fakeSession = {
      withTransaction: vi.fn(),
      endSession: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(mongoose, "startSession").mockResolvedValue(fakeSession);

    fakeSession.withTransaction.mockImplementation(async (callback) => {
      await callback();
    });

    req = {
      user: { _id: fakeUserId },
      get: vi.fn((header) => {
        if (header.toLowerCase() === "idempotency-key") {
          return "test-idempotency-key";
        }

        return undefined;
      }),
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    next = vi.fn();

    vi.spyOn(Cart, "findOne");
    vi.spyOn(Order, "create");
    vi.spyOn(Product, "findById");
    vi.spyOn(Product, "findOneAndUpdate");
    vi.spyOn(IdempotencyKey, "create");
    vi.spyOn(IdempotencyKey, "findOne").mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an order successfully", async () => {
    const fakeProductId = new mongoose.Types.ObjectId();
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

    vi.spyOn(IdempotencyKey, "create").mockResolvedValue([]);

    await createOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith({
      message: "Order created successfully",
      order: fakeOrder,
    });

    expect(fakeProduct.stock).toBe(8);

    expect(Order.create).toHaveBeenCalledWith(
      [
        {
          user: fakeUserId,
          items: [
            {
              product: fakeProductId,
              quantity: 2,
              price: 100,
            },
          ],
          totalPrice: 200,
        },
      ],
      { session: fakeSession },
    );

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: fakeProductId,
        stock: { $gte: 2 },
      },
      {
        $inc: { stock: -2 },
      },
      {
        new: true,
        session: fakeSession,
      },
    );

    expect(InventoryMovement.create).toHaveBeenCalledWith(
      [
        {
          product: fakeProductId,
          change: -2,
          type: "sale",
          reason: `Order ${fakeOrderId}`,
        },
      ],
      { session: fakeSession },
    );

    expect(Cart.findOneAndDelete).toHaveBeenCalledWith({
      user: fakeUserId,
    });

    expect(IdempotencyKey.create).toHaveBeenCalledWith(
      [
        {
          user: fakeUserId,
          key: "test-idempotency-key",
          order: fakeOrderId,
        },
      ],
      { session: fakeSession },
    );

    expect(fakeSession.withTransaction).toHaveBeenCalledOnce();
    expect(fakeSession.endSession).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it("throws an error when cart is empty", async () => {
    vi.spyOn(Cart, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue({
        user: fakeUserId,
        items: [],
      }),
    });

    await createOrder(req, res, next);

    const responseData = next.mock.calls[0][0];

    expect(responseData.message).toBe("Cart is empty");
    expect(responseData.statusCode).toBe(400);

    expect(Order.create).not.toHaveBeenCalled();
    expect(Product.findById).not.toHaveBeenCalled();
    expect(IdempotencyKey.create).not.toHaveBeenCalled();

    expect(fakeSession.endSession).toHaveBeenCalledOnce();
  });

  it("throws an error when cart does not exist", async () => {
    vi.spyOn(Cart, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(null),
    });

    await createOrder(req, res, next);

    const responseData = next.mock.calls[0][0];

    expect(responseData.message).toBe("Cart is empty");
    expect(responseData.statusCode).toBe(400);

    expect(Order.create).not.toHaveBeenCalled();
  });

  it("throws an error when product is not found", async () => {
    const fakeCart = {
      user: fakeUserId,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
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

    expect(Order.create).not.toHaveBeenCalled();
    expect(IdempotencyKey.create).not.toHaveBeenCalled();

    expect(fakeSession.endSession).toHaveBeenCalledOnce();
  });

  it("throws an error when there is not enough product stock", async () => {
    const fakeProductId = new mongoose.Types.ObjectId();

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
      stock: 0,
      save: vi.fn(),
    };

    vi.spyOn(Product, "findById").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeProduct),
    });

    await createOrder(req, res, next);

    const responseData = next.mock.calls[0][0];

    expect(responseData.statusCode).toBe(400);
    expect(responseData.message).toBe("Not enough stock");

    expect(Order.create).not.toHaveBeenCalled();
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
    expect(IdempotencyKey.create).not.toHaveBeenCalled();

    expect(fakeSession.endSession).toHaveBeenCalledOnce();
  });

  it("returns the existing order when the idempotency key already exists", async () => {
    const fakeOrderId = new mongoose.Types.ObjectId();

    const fakeExistingOrder = {
      _id: fakeOrderId,
      user: fakeUserId,
      items: [],
      totalPrice: 200,
    };

    const fakeExistingKey = {
      user: fakeUserId,
      key: "test-idempotency-key",
      order: fakeOrderId,
    };

    IdempotencyKey.findOne.mockResolvedValue(fakeExistingKey);

    vi.spyOn(Order, "findById").mockResolvedValue(fakeExistingOrder);

    await createOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      message: "Order already created",
      order: fakeExistingOrder,
    });

    expect(Order.create).not.toHaveBeenCalled();
    expect(Cart.findOne).not.toHaveBeenCalled();
    expect(IdempotencyKey.create).not.toHaveBeenCalled();

    expect(mongoose.startSession).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("continues creating an order when the key exists but its order is missing", async () => {
    const fakeProductId = new mongoose.Types.ObjectId();
    const fakeOrderId = new mongoose.Types.ObjectId();

    IdempotencyKey.findOne.mockResolvedValue({
      user: fakeUserId,
      key: "test-idempotency-key",
      order: null,
    });

    const fakeCart = {
      user: fakeUserId,
      items: [
        {
          product: fakeProductId,
          quantity: 1,
        },
      ],
    };

    vi.spyOn(Cart, "findOne").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeCart),
    });

    const fakeProduct = {
      _id: fakeProductId,
      price: 100,
      stock: 5,
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
          quantity: 1,
          price: 100,
        },
      ],
      totalPrice: 100,
    };

    vi.spyOn(Order, "create").mockResolvedValue([fakeOrder]);

    vi.spyOn(Product, "findOneAndUpdate").mockResolvedValue({
      ...fakeProduct,
      stock: 4,
    });

    vi.spyOn(InventoryMovement, "create").mockResolvedValue([]);

    vi.spyOn(Cart, "findOneAndDelete").mockReturnValue({
      session: vi.fn().mockResolvedValue(fakeCart),
    });

    vi.spyOn(IdempotencyKey, "create").mockResolvedValue([]);

    await createOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);

    expect(Order.create).toHaveBeenCalledOnce();
    expect(IdempotencyKey.create).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });
});

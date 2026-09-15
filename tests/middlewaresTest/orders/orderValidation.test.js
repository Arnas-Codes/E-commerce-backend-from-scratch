import { describe, it, expect, vi } from "vitest";
import { validateGetAllOrders } from "../../../middlewares/orderValidateMiddlewares/orderValidate.js";
import { validateReturnOrder } from "../../../middlewares/orderValidateMiddlewares/validateReturnOrder.js";
import mongoose from "mongoose";

describe("validateGetAllOrders", () => {
  it("allows a valid query", () => {
    const req = {
      query: {
        page: "1",
        limit: "1",
        status: "delivered",
      },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateGetAllOrders(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects an invalid status", () => {
    const req = { query: { status: "banana" } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateGetAllOrders(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid status type" });
  });

  it("rejects an invalid page", () => {
    const req = { query: { page: "0" } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateGetAllOrders(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Page must be a valid positive integer.",
    });
  });

  it("rejects a limit greater than 100", () => {
    const req = { query: { limit: "101" } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateGetAllOrders(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Limit must be an integer between 1 and 100.",
    });
  });
});

describe("validateReturnOrder", () => {
  it("succesfully return next()", () => {
    const req = {
      body: {
        items: [
          {
            product: new mongoose.Types.ObjectId().toString(),
            quantity: 1,
          },
        ],
      },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateReturnOrder(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  
  it("rejects invalid productId for validateReturnOrder middleware", () => {
    const req = {
      body: {
        items: [
          {
            product: "hello",
            quantity: 1,
          },
        ],
      },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateReturnOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid product Id" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a valid MongoDB ObjectId and calls next()", () => {
    const req = {
      body: {
        items: [
          {
            product: new mongoose.Types.ObjectId().toString(),
            quantity: 1,
          },
        ],
      },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateReturnOrder(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("rejects when product is missing", () => {
    const req = {
      body: {
        items: [
          {
            quantity: 1,
          },
        ],
      },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateReturnOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Each item must have a product ID and quantity",
    });
  });

  it("rejects when quantity is missing", () => {
    const req = {
      body: {
        items: [
          {
            product: new mongoose.Types.ObjectId().toString(),
          },
        ],
      },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    validateReturnOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Each item must have a product ID and quantity",
    });
  });

  it.each([0, -1, 1.5])(
    "it rejects when quantity has invalid values",
    (inValidvalues) => {
      const req = {
        body: {
          items: [
            {
              product: new mongoose.Types.ObjectId().toString(),
              quantity: inValidvalues,
            },
          ],
        },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      validateReturnOrder(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Quantity must be a positive integer",
      });
    },
  );

  it("rejects when duplicate req found", () => {
    const duplicateId = new mongoose.Types.ObjectId().toString();
    const req = {
      body: {
        items: [
          { product: duplicateId, quantity: 1 },
          { product: duplicateId, quantity: 2 },
        ],
      },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    validateReturnOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Duplicate products found in return request",
      }),
    );
  });
});

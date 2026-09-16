import { describe, it, vi, beforeEach, expect } from "vitest";
import User from "../../../../models/user.js";
import Product from "../../../../models/product.js";
import Cart from "../../../../models/cart.js";
import Order from "../../../../models/order.js";
import InventoryMovement from "../../../../models/inventoryMovement.js";
import { createOrder } from "../../../../controllers/orderController.js";

const uniqueEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

describe("createOrder", () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
  });

  it("creates an order successfully", async () => {
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

    await Cart.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
        },
      ],
    });

    const req = {
      user: {
        _id: user._id,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await createOrder(req, res);

    const order = await Order.findOne({
      user: user._id,
    });

    expect(order).not.toBeNull();
    expect(order.totalPrice).toBe(1000);

    expect(order.items).toHaveLength(1);
    expect(order.items[0].product.toString()).toBe(product._id.toString());
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].price).toBe(500);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].message).toBe(
      "Order created successfully",
    );

    const updatedProduct = await Product.findById(product._id);

    expect(updatedProduct.stock).toBe(8);

    const movement = await InventoryMovement.findOne({
      product: product._id,
    });

    expect(movement).not.toBeNull();
    expect(movement.change).toBe(-2);
    expect(movement.type).toBe("sale");

    const cart = await Cart.findOne({
      user: user._id,
    });

    expect(cart).toBeNull();
  });

  it("returns 400 when cart is empty", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const req = {
      user: {
        _id: user._id,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();
    await createOrder(req, res, next);

    expect(next).toHaveBeenCalled();

    expect(next.mock.calls[0][0].message).toBe("Cart is empty");
    expect(next.mock.calls[0][0].statusCode).toBe(400);

    const order = await Order.findOne({
      user: user._id,
    });
    expect(order).toBe(null);
  });

  it("returns 404 when product not found", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Temporary Product",
      price: 100,
      stock: 10,
      category: "phone",
    });

    const cart = await Cart.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
        },
      ],
    });

    await Product.findByIdAndDelete(product._id);

    const req = {
      user: {
        _id: user._id,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await createOrder(req, res, next);

    expect(next).toHaveBeenCalled();

    expect(next.mock.calls[0][0].message).toBe("Product not found");
    expect(next.mock.calls[0][0].statusCode).toBe(404);

    const order = await Order.findOne({ user: user._id });
    expect(order).toBeNull();
  });

  it("returns 400 if not enough stocks", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Temporary Product",
      price: 100,
      stock: 0,
      category: "category",
    });

    const cart = await Cart.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
        },
      ],
    });

    const req = {
      user: {
        _id: user._id,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await createOrder(req, res, next);

    expect(next).toHaveBeenCalled();

    expect(next.mock.calls[0][0].message).toBe("Not enough stock");
    expect(next.mock.calls[0][0].statusCode).toBe(400);

    const order = await Order.findOne({ user: user._id });
    expect(order).toBeNull();

    const newProduct = await Product.findById(product._id);

    expect(newProduct.stock).toBe(0);
  });

  it("check rollback if something fails", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Temporary Product",
      price: 100,
      stock: 10,
      category: "category",
    });

    const cart = await Cart.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
        },
      ],
    });

    const req = {
      user: {
        _id: user._id,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    const beforeInventoryMovementCount = await InventoryMovement.countDocuments(
      {
        product: product._id,
      },
    );

    const fakeError = new Error("Inventory failure");
    vi.spyOn(InventoryMovement, "create").mockRejectedValueOnce(fakeError);

    await createOrder(req, res, next);

    expect(next).toHaveBeenCalled();

    expect(next.mock.calls[0][0].message).toBe("Inventory failure");

    const order = await Order.findOne({ user: user._id });

    expect(order).toBeNull();

    const updatedProduct = await Product.findById(product._id);

    expect(updatedProduct.stock).toBe(10);

    const updatedCart = await Cart.findOne({ user: user._id });
    expect(updatedCart).not.toBe(null);

    const afterInventoryMovementCount = await InventoryMovement.countDocuments({
      product: product._id,
    });
    expect(afterInventoryMovementCount).toBe(beforeInventoryMovementCount);
  });
});

import { beforeEach, describe, expect, vi, it } from "vitest";
import InventoryMovement from "../../../../models/inventoryMovement";
import User from "../../../../models/user";
import Product from "../../../../models/product";
import Order from "../../../../models/order";
import Cart from "../../../../models/cart";
import { createOrder } from "../../../../controllers/orderController";

const uniqueEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

describe("createOrder integration", () => {
  beforeEach(async () => {
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await InventoryMovement.deleteMany({});
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
      user: { _id: user._id },
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

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].message).toBe(
      "Order created successfully",
    );

    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].price).toBe(500);
    expect(order.items[0].product.toString()).toBe(product._id.toString());

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(8);

    const inventoryMovement = await InventoryMovement.findOne({
      product: product._id,
    });
    expect(inventoryMovement).not.toBeNull();
    expect(inventoryMovement.change).toBe(-2);
    expect(inventoryMovement.type).toBe("sale");

    const cartAfterOrder = await Cart.findOne({ user: user._id });
    expect(cartAfterOrder).toBeNull();
  });

  it("returns 400 when cart is empty", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    await Cart.create({
      user: user._id,
      items: [],
    });

    const req = {
      user: { _id: user._id },
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
  });

  it("returns 404 when product not found", async () => {
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
    await Product.findByIdAndDelete(product._id);
    await Cart.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 20,
        },
      ],
    });

    const req = {
      user: { _id: user._id },
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
  });

  it("returns 400 when not enough stock", async () => {
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
          quantity: 20,
        },
      ],
    });

    const req = {
      user: { _id: user._id },
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
  });

  it("rolls back transaction when inventory movement fails", async () => {
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
      user: { _id: user._id },
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
    expect(updatedCart).not.toBeNull();

    const afterInventoryMovementCount = await InventoryMovement.countDocuments({
      product: product._id,
      type: "sale",
    });

    expect(afterInventoryMovementCount).toBe(beforeInventoryMovementCount);
  });

  it("prevents overselling when two users order the last item concurrently", async () => {
    const user1 = await User.create({
      name: "User 1",
      email: uniqueEmail(),
      password: "password1",
    });

    const user2 = await User.create({
      name: "User 2",
      email: uniqueEmail(),
      password: "password2",
    });

    const product = await Product.create({
      name: "Limited Product",
      price: 100,
      category: "Limited",
      stock: 1,
    });

    await Cart.create({
      user: user1._id,
      items: [
        {
          product: product._id,
          quantity: 1,
        },
      ],
    });

    await Cart.create({
      user: user2._id,
      items: [
        {
          product: product._id,
          quantity: 1,
        },
      ],
    });

    const attemptOrder = async (user) => {
      const req = {
        user: { _id: user._id },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();
      try {
        await createOrder(req, res, next);
      } catch (error) {
        next(error);
      }
      return { res, next };
    };

    const results = await Promise.all([
      attemptOrder(user1),
      attemptOrder(user2),
    ]);

    const successfulOrders = results.filter(
      (result) =>
        result.res.status.mock.calls.length > 0 &&
        result.res.status.mock.calls[0][0] === 201,
    );

    const failedOrders = results.filter(
      (result) =>
        result.next.mock.calls.length > 0 &&
        result.next.mock.calls[0][0].message === "Not enough stock",
    );

    expect(await Order.countDocuments()).toBe(1);
    expect(successfulOrders.length).toBe(1);
    expect(failedOrders.length).toBe(1);
    expect(failedOrders[0].next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Not enough stock",
        statusCode: 400,
      }),
    );

    expect(await InventoryMovement.countDocuments({
      product: product._id,
      type: "sale",
    })).toBe(1);
  });
});

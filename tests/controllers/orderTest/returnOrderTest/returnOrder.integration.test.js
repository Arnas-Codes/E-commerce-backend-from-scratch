import { afterEach, beforeEach, describe, vi, it, expect } from "vitest";
import User from "../../../../models/user";
import Product from "../../../../models/product";
import Cart from "../../../../models/cart";
import Order from "../../../../models/order";
import InventoryMovement from "../../../../models/inventoryMovement";
import { returnOrder } from "../../../../controllers/orderController";

const uniqueEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

describe("return order integration", () => {
  beforeEach(async () => {
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await InventoryMovement.deleteMany({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Successfully return one item", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: 500,
          returnedQuantity: 0,
        },
      ],

      totalPrice: 1000,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          {
            product: product._id,
            quantity: 1,
          },
        ],
        reason: "Product was damaged",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].message).toBe(
      "Order items returned successfully",
    );
    expect(order.status).toBe("delivered");

    const updatedProduct = await Product.findById(product._id);

    expect(updatedProduct.stock).toBe(11);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.items[0].returnedQuantity).toBe(1);
  });

  it("Successfully return multiple item", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product1 = await Product.create({
      name: "Test Product 1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const product2 = await Product.create({
      name: "Test Product 2",
      price: 300,
      category: "Test",
      stock: 15,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product1._id,
          quantity: 2,
          price: 500,
          returnedQuantity: 0,
        },
        {
          product: product2._id,
          quantity: 3,
          price: 300,
          returnedQuantity: 0,
        },
      ],
      totalPrice: 1900,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          {
            product: product1._id,
            quantity: 1,
          },
          {
            product: product2._id,
            quantity: 2,
          },
        ],
        reason: "Product was damaged",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();

    expect(order.status).toBe("delivered");

    const updatedProduct1 = await Product.findById(product1._id);
    expect(updatedProduct1.stock).toBe(11);

    const updatedProduct2 = await Product.findById(product2._id);
    expect(updatedProduct2.stock).toBe(17);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.items[0].returnedQuantity).toBe(1);
    expect(updatedOrder.items[1].returnedQuantity).toBe(2);

    const movements = await InventoryMovement.find({
      product: { $in: [product1._id, product2._id] },
    });
    expect(movements).toHaveLength(2);
  });

  it("it validates partial return quantity", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 3,
          price: 500,
          returnedQuantity: 0,
        },
      ],

      totalPrice: 1500,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          {
            product: product._id,
            quantity: 1,
          },
        ],
        reason: "Product was damaged",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();

    const updatedOrder = await Order.findOne({ user: user._id });

    expect(updatedOrder.items[0].returnedQuantity).toBe(1);
  });

  it("rejects if return quantity more than purchased quantity", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 3,
          price: 500,
          returnedQuantity: 1,
        },
      ],

      totalPrice: 1500,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          {
            product: product._id,
            quantity: 3,
          },
        ],
        reason: "Product was damaged",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).toHaveBeenCalled();

    expect(next.mock.calls[0][0].message).toBe(
      "Cannot return 3. Only 2 item(s) can be returned.",
    );
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it("rejects when return item does not belongs to order", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const productA = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const productB = await Product.create({
      name: "Product B",
      price: 300,
      category: "Test",
      stock: 15,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: productA._id,
          quantity: 3,
          price: 500,
          returnedQuantity: 0,
        },
      ],

      totalPrice: 1500,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          {
            product: productB._id,
            quantity: 1,
          },
        ],
        reason: "Product was damaged",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).toHaveBeenCalled();

    expect(next.mock.calls[0][0].message).toBe(
      "Product is not part of this order",
    );
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it("rolls back when product is missing", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product1 = await Product.create({
      name: "Test Product 1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const product2 = await Product.create({
      name: "Test Product 2",
      price: 300,
      category: "Test",
      stock: 15,
    });

    await Product.findByIdAndDelete(product2._id);

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product1._id,
          quantity: 2,
          price: 500,
          returnedQuantity: 0,
        },
        {
          product: product2._id,
          quantity: 3,
          price: 300,
          returnedQuantity: 0,
        },
      ],
      totalPrice: 1900,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          {
            product: product1._id,
            quantity: 1,
          },
          {
            product: product2._id,
            quantity: 2,
          },
        ],
        reason: "Product was damaged",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).toHaveBeenCalled();

    const updatedProduct1 = await Product.findById(product1._id);
    expect(updatedProduct1.stock).toBe(10);
  });

  it("validates if retunedQuantity is correct", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 3,
          price: 500,
          returnedQuantity: 1,
        },
      ],

      totalPrice: 1000,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          {
            product: product._id,
            quantity: 2,
          },
        ],
        reason: "Product was damaged",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.items[0].returnedQuantity).toBe(3);
  });

  it("rejects returning an order with status %s", async () => {
    const user = await User.create({
      name: "Test User1",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product = await Product.create({
      name: "Test Product1",
      price: 500,
      category: "Test",
      stock: 10,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 3,
          price: 500,
          returnedQuantity: 3,
        },
      ],

      totalPrice: 1000,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          {
            product: product._id,
            quantity: 1,
          },
        ],
        reason: "Product was damaged",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe(
      "Cannot return 1. Only 0 item(s) can be returned.",
    );
  });

  it.each(["pending", "processing", "shipped", "cancelled"])(
    "rejects when order status isnot delivered",
    async (invalidStatus) => {
      const user = await User.create({
        name: "Test User1",
        email: uniqueEmail(),
        password: "test-password",
      });

      const product = await Product.create({
        name: "Test Product1",
        price: 500,
        category: "Test",
        stock: 10,
      });

      const order = await Order.create({
        user: user._id,
        items: [
          {
            product: product._id,
            quantity: 2,
            price: 500,
            returnedQuantity: 0,
          },
        ],

        totalPrice: 1000,
        status: invalidStatus,
      });

      const req = {
        user: { _id: user._id },
        params: { orderId: order._id },
        body: {
          items: [
            {
              product: product._id,
              quantity: 1,
            },
          ],
          reason: "Product was damaged",
        },
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const next = vi.fn();

      await returnOrder(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].message).toBe(
        "Only delivered orders can be returned",
      );
      expect(next.mock.calls[0][0].statusCode).toBe(400);
    },
  );
});

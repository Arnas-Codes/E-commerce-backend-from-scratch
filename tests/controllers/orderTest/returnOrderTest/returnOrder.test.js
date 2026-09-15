import { beforeEach, describe, expect, it, vi } from "vitest";
import Cart from "../../../../models/cart";
import Order from "../../../../models/order";
import Product from "../../../../models/product";
import User from "../../../../models/user";
import { returnOrder } from "../../../../controllers/orderController";
import InventoryMovement from "../../../../models/inventoryMovement";

const uniqueEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

describe("returnOrders", () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
  });

  it("successfully return a order", async () => {
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
      user: {
        _id: user._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 1 }],
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

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.message).toBe("Order items returned successfully");
    expect(responseData.inventoryMovements).toBeDefined();
    expect(responseData.inventoryMovements.length).toBe(1);
    expect(responseData.inventoryMovements[0].product.toString()).toBe(
      product._id.toString(),
    );

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(11);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.items[0].returnedQuantity).toBe(1);

    const inventoryMovement = await InventoryMovement.findOne({
      product: product._id,
    });

    expect(inventoryMovement).not.toBeNull();

    expect(inventoryMovement).toMatchObject({
      product: product._id,
      change: 1,
      type: "return",
      reason: "Order item returned",
    });
  });

  it("rejects when order does not belong to user", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const randomUser = await User.create({
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
      user: {
        _id: randomUser._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 1 }],
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    const error = next.mock.calls[0][0];

    expect(next).toHaveBeenCalled();
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Order not found");

    const updatedOrder = await Order.findById(order._id);
    const updatedProduct = await Product.findById(product._id);

    expect(updatedOrder.status).toBe("delivered");
    expect(updatedOrder.items[0].returnedQuantity).toBe(0);
    expect(updatedProduct.stock).toBe(10);
  });

  it.each(["pending", "processing", "shipped", "cancelled"])(
    "rejects if order has invalid status",
    async (invalidStatus) => {
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
        user: {
          _id: user._id,
        },
        params: { orderId: order._id },
        body: {
          items: [{ product: product._id, quantity: 1 }],
        },
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const next = vi.fn();

      await returnOrder(req, res, next);

      const error = next.mock.calls[0][0];

      expect(next).toHaveBeenCalled();
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Only delivered orders can be returned");
    },
  );

  it("rejects when product is not part of the order", async () => {
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

    const order = await Order.create({
      user: user._id,
      items: [],

      totalPrice: 1000,
      status: "delivered",
    });

    const req = {
      user: {
        _id: user._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 1 }],
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    const error = next.mock.calls[0][0];

    expect(next).toHaveBeenCalled();
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Product is not part of this order");
  });

  it.each([null, undefined, 1.5, "abc", -1, 0, "1"])(
    "rejects when quantity is invalid (not a positive integer)",
    async (invalidQuantity) => {
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
        user: {
          _id: user._id,
        },
        params: { orderId: order._id },
        body: {
          items: [{ product: product._id, quantity: invalidQuantity }],
        },
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const next = vi.fn();

      await returnOrder(req, res, next);

      expect(next).toHaveBeenCalled();

      const error = next.mock.calls[0][0];

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Quantity must be a positive integer");
    },
  );

  it("rejects when quantity is more than returnable quantity", async () => {
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
      user: {
        _id: user._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 5 }],
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    const error = next.mock.calls[0][0];

    expect(next).toHaveBeenCalled();
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe(
      "Cannot return 5. Only 2 item(s) can be returned.",
    );
  });

  it("rejects when product does not exist", async () => {
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

    await Product.findByIdAndDelete(product._id);

    const req = {
      user: {
        _id: user._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 1 }],
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await returnOrder(req, res, next);

    const error = next.mock.calls[0][0];

    expect(next).toHaveBeenCalled();
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Product not found");
  });

  it("allows returning the exact returnable quantity", async () => {
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
      user: {
        _id: user._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 2 }],
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

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.message).toBe("Order items returned successfully");

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(12);

    const updatedOrder = await Order.findOne({ user: user._id });
    expect(updatedOrder.items[0].returnedQuantity).toBe(2);

    const inventoryMovement = await InventoryMovement.findOne({
      product: product._id,
    });
    expect(inventoryMovement.change).toBe(2);
  });

  it("allows sequential partial returns", async () => {
    // req 1
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

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 5,
          price: 500,
          returnedQuantity: 0,
        },
      ],
      totalPrice: 2500,
      status: "delivered",
    });

    const req1 = {
      user: {
        _id: user._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 2 }],
      },
    };

    const res1 = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next1 = vi.fn();

    await returnOrder(req1, res1, next1);
    expect(next1).not.toHaveBeenCalled();

    const updatedProduct1 = await Product.findById(product._id);
    expect(updatedProduct1.stock).toBe(12);

    const updatedOrder1 = await Order.findOne(order._id);
    expect(updatedOrder1.items[0].returnedQuantity).toBe(2);

    // req 2

    const req2 = {
      user: {
        _id: user._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 3 }],
      },
    };

    const res2 = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next2 = vi.fn();

    await returnOrder(req2, res2, next2);
    expect(next2).not.toHaveBeenCalled();

    const updatedProduct2 = await Product.findById(product._id);
    expect(updatedProduct2.stock).toBe(15);

    const updatedOrder2 = await Order.findOne(order._id);
    expect(updatedOrder2.items[0].returnedQuantity).toBe(5);

    // req 3

    const req3 = {
      user: {
        _id: user._id,
      },
      params: { orderId: order._id },
      body: {
        items: [{ product: product._id, quantity: 3 }],
      },
    };

    const res3 = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next3 = vi.fn();

    await returnOrder(req3, res3, next3);
    expect(next3).toHaveBeenCalled();

    const reponseData = next3.mock.calls[0][0];

    expect(reponseData.statusCode).toBe(400);

    const updatedProduct3 = await Product.findById(product._id);
    expect(updatedProduct3.stock).toBe(15);

    const updatedOrder3 = await Order.findOne(order._id);
    expect(updatedOrder3.items[0].returnedQuantity).toBe(5);
  });

  it("succesfully return when order contain multiple products", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product1 = await Product.create({
      name: "Product 1",
      price: 1000,
      category: "Test",
      stock: 10,
    });

    const product2 = await Product.create({
      name: "Product 2",
      price: 2000,
      category: "Test",
      stock: 20,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product1._id,
          quantity: 2,
          price: 1000,
          returnedQuantity: 0,
        },
        {
          product: product2._id,
          quantity: 3,
          price: 2000,
          returnedQuantity: 0,
        },
      ],
      totalPrice: 8000,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          { product: product1._id, quantity: 1 },
          { product: product2._id, quantity: 2 },
        ],
      },
    };

    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const updatedP1 = await Product.findById(product1._id);
    const updatedP2 = await Product.findById(product2._id);
    expect(updatedP1.stock).toBe(11);
    expect(updatedP2.stock).toBe(22);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.items[0].returnedQuantity).toBe(1);
    expect(updatedOrder.items[1].returnedQuantity).toBe(2);

    const movements = await InventoryMovement.find({
      product: { $in: [product1._id, product2._id] },
    });
    expect(movements.length).toBe(2);
  });

  it("rolls back all changes when one return item is invalid", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product1 = await Product.create({
      name: "Product 1",
      price: 1000,
      category: "Test",
      stock: 10,
    });

    const product2 = await Product.create({
      name: "Product 2",
      price: 2000,
      category: "Test",
      stock: 20,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product1._id,
          quantity: 2,
          price: 1000,
          returnedQuantity: 0,
        },
        {
          product: product2._id,
          quantity: 3,
          price: 2000,
          returnedQuantity: 0,
        },
      ],
      totalPrice: 8000,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          { product: product1._id, quantity: 1 },
          { product: product2._id, quantity: 99 },
        ],
      },
    };

    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await returnOrder(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toBe(
      "Cannot return 99. Only 3 item(s) can be returned.",
    );

    const updatedP1 = await Product.findById(product1._id);
    const updatedP2 = await Product.findById(product2._id);
    expect(updatedP1.stock).toBe(10);
    expect(updatedP2.stock).toBe(20);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.items[0].returnedQuantity).toBe(0);
    expect(updatedOrder.items[1].returnedQuantity).toBe(0);

    const movements = await InventoryMovement.find({
      product: { $in: [product1._id, product2._id] },
    });
    expect(movements.length).toBe(0);
  });

  it("rejects when order has duplicate products", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    const product1 = await Product.create({
      name: "Product 1",
      price: 1000,
      category: "Test",
      stock: 10,
    });

    const order = await Order.create({
      user: user._id,
      items: [
        {
          product: product1._id,
          quantity: 2,
          price: 1000,
          returnedQuantity: 0,
        },
      ],
      totalPrice: 8000,
      status: "delivered",
    });

    const req = {
      user: { _id: user._id },
      params: { orderId: order._id },
      body: {
        items: [
          { product: product1._id, quantity: 1 },
          { product: product1._id, quantity: 2 },
        ],
      },
    };

    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await returnOrder(req, res, next);
    expect(next).toHaveBeenCalled();

    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toBe(
      "Duplicate product entries in return request",
    );
  });

  it.each([{}, "something"])(
    "rejects when request body has invalid items",
    async (invalidItemTypes) => {
      const user = await User.create({
        name: "Test User",
        email: uniqueEmail(),
        password: "test-password",
      });

      const product1 = await Product.create({
        name: "Product 1",
        price: 1000,
        category: "Test",
        stock: 10,
      });

      const order = await Order.create({
        user: user._id,
        items: [
          {
            product: product1._id,
            quantity: 2,
            price: 1000,
            returnedQuantity: 0,
          },
        ],
        totalPrice: 8000,
        status: "delivered",
      });

      const req = {
        user: { _id: user._id },
        params: { orderId: order._id },
        body: {
          items: invalidItemTypes,
        },
      };

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      await returnOrder(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(next.mock.calls[0][0].message).toBe("Return items are required");
    },
  );
});

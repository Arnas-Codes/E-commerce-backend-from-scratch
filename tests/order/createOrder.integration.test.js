import { beforeEach, describe, expect, vi, it, afterEach } from "vitest";
import InventoryMovement from "../../models/inventoryMovement";
import User from "../../models/user";
import Product from "../../models/product";
import Order from "../../models/order";
import Cart from "../../models/cart";
import IdempotencyKey from "../../models/idempotencyKey";
import { createOrder } from "../../controllers/orderController";

const uniqueEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

const makeReq = (user, key) => ({
  user: { _id: user._id },
  get: (header) =>
    header.toLowerCase() === "idempotency-key" ? key : undefined,
});

const makeRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
});

describe("createOrder integration", () => {
  beforeEach(async () => {
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await IdempotencyKey.deleteMany({});
    await InventoryMovement.deleteMany({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      items: [{ product: product._id, quantity: 2 }],
    });

    const res = makeRes();
    const next = vi.fn();

    await createOrder(makeReq(user, "test-order-key"), res, next);

    const order = await Order.findOne({ user: user._id });

    expect(order).not.toBeNull();
    expect(order.totalPrice).toBe(1000);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].price).toBe(500);
    expect(order.items[0].product.toString()).toBe(product._id.toString());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].message).toBe(
      "Order created successfully",
    );

    expect((await Product.findById(product._id)).stock).toBe(8);

    const movement = await InventoryMovement.findOne({
      product: product._id,
      type: "sale",
    });

    expect(movement.change).toBe(-2);
    expect(await Cart.findOne({ user: user._id })).toBeNull();
  });

  it("returns 400 when cart is empty", async () => {
    const user = await User.create({
      name: "Test User",
      email: uniqueEmail(),
      password: "test-password",
    });

    await Cart.create({ user: user._id, items: [] });

    const next = vi.fn();

    await createOrder(makeReq(user, "test-order-key"), makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe("Cart is empty");
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it("returns 404 when product is not found", async () => {
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
      items: [{ product: product._id, quantity: 20 }],
    });

    const next = vi.fn();

    await createOrder(makeReq(user, "test-order-key"), makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe("Product not found");
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  it("returns 400 when there is not enough stock", async () => {
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
      items: [{ product: product._id, quantity: 20 }],
    });

    const next = vi.fn();

    await createOrder(makeReq(user, "test-order-key"), makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe("Not enough stock");
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it("rolls back the transaction when inventory movement fails", async () => {
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
      items: [{ product: product._id, quantity: 2 }],
    });

    vi.spyOn(InventoryMovement, "create").mockRejectedValueOnce(
      new Error("Inventory failure"),
    );

    const next = vi.fn();

    await createOrder(makeReq(user, "test-order-key"), makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe("Inventory failure");

    expect(await Order.findOne({ user: user._id })).toBeNull();
    expect((await Product.findById(product._id)).stock).toBe(10);
    expect(await Cart.findOne({ user: user._id })).not.toBeNull();

    expect(
      await InventoryMovement.countDocuments({
        product: product._id,
        type: "sale",
      }),
    ).toBe(0);
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
      items: [{ product: product._id, quantity: 1 }],
    });

    await Cart.create({
      user: user2._id,
      items: [{ product: product._id, quantity: 1 }],
    });

    const next1 = vi.fn();
    const next2 = vi.fn();
    const res1 = makeRes();
    const res2 = makeRes();

    await Promise.all([
      createOrder(makeReq(user1, "order-1"), res1, next1),
      createOrder(makeReq(user2, "order-2"), res2, next2),
    ]);

    const results = [
      { res: res1, next: next1 },
      { res: res2, next: next2 },
    ];

    const successfulOrders = results.filter(
      ({ res }) => res.status.mock.calls[0]?.[0] === 201,
    );

    const failedOrders = results.filter(
      ({ next }) => next.mock.calls[0]?.[0]?.message === "Not enough stock",
    );

    expect(await Order.countDocuments()).toBe(1);
    expect(successfulOrders).toHaveLength(1);
    expect(failedOrders).toHaveLength(1);

    expect(failedOrders[0].next.mock.calls[0][0].statusCode).toBe(400);

    expect(
      await InventoryMovement.countDocuments({
        product: product._id,
        type: "sale",
      }),
    ).toBe(1);
  });

  it("returns the existing order when the same idempotency key is reused", async () => {
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
      items: [{ product: product._id, quantity: 2 }],
    });

    const key = "test-order-key";
    const firstRes = makeRes();
    const secondRes = makeRes();
    const next = vi.fn();

    await createOrder(makeReq(user, key), firstRes, next);
    await createOrder(makeReq(user, key), secondRes, next);

    expect(firstRes.status).toHaveBeenCalledWith(201);
    expect(secondRes.status).toHaveBeenCalledWith(200);

    const firstOrder = firstRes.json.mock.calls[0][0].order;
    const secondOrder = secondRes.json.mock.calls[0][0].order;

    expect(secondOrder._id.toString()).toBe(firstOrder._id.toString());
    expect(await Order.countDocuments({ user: user._id })).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(8);

    expect(
      await InventoryMovement.countDocuments({
        product: product._id,
        type: "sale",
      }),
    ).toBe(1);

    expect(
      await IdempotencyKey.countDocuments({
        user: user._id,
        key,
      }),
    ).toBe(1);
  });

  it.each([
    ["empty string", ""],
    ["null", null],
    ["undefined", undefined],
    ["long string", "a".repeat(256)],
  ])(
    "rejects when the idempotency key is %s",
    async (idempotencyKey, idempotencyKeyValue) => {
      const user = await User.create({
        name: "Test User",
        email: uniqueEmail(),
        password: "test-password",
      });

      const res = makeRes();

      await createOrder(makeReq(user, idempotencyKeyValue), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid idempotency key",
      });
    },
  );

  it("returns same order for concurrent requests with same idempotency key", async () => {
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
      items: [{ product: product._id, quantity: 2 }],
    });

    const key = "concurrent-order-key";

    const next1 = vi.fn();
    const next2 = vi.fn();
    const res1 = makeRes();
    const res2 = makeRes();

    await Promise.allSettled([
      createOrder(makeReq(user, key), res1, next1),
      createOrder(makeReq(user, key), res2, next2),
    ]);

    const successfulResponses = [res1, res2].filter(
      (res) =>
        res.status.mock.calls[0]?.[0] === 201 ||
        res.status.mock.calls[0]?.[0] === 200,
    );

    const failedResponses = [res1, res2].filter(
      (res) => res.status.mock.calls[0]?.[0] === 400,
    );

    expect(successfulResponses).toHaveLength(2);
    expect(failedResponses).toHaveLength(0);

    const firstOrder = res1.json.mock.calls[0][0].order;
    const secondOrder = res2.json.mock.calls[0][0].order;

    expect(secondOrder._id.toString()).toBe(firstOrder._id.toString());
    expect(await Order.countDocuments({ user: user._id })).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(8);

    expect(
      await InventoryMovement.countDocuments({
        product: product._id,
        type: "sale",
      }),
    ).toBe(1);
  });

  it("rejects concurrent requests with different idempotency keys for the same user", async () => {
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
      items: [{ product: product._id, quantity: 2 }],
    });

    const next1 = vi.fn();
    const next2 = vi.fn();

    const res1 = makeRes();
    const res2 = makeRes();

    await Promise.all([
      createOrder(makeReq(user, "order-key-1"), res1, next1),
      createOrder(makeReq(user, "order-key-2"), res2, next2),
    ]);

    const successfulResponses = [res1, res2].filter(
      (res) => res.status.mock.calls[0]?.[0] === 201,
    );

    const failedResponses = [next1, next2].filter(
      (next) => next.mock.calls.length > 0,
    );

    expect(successfulResponses).toHaveLength(1);
    expect(failedResponses).toHaveLength(1);

    expect(await Order.countDocuments({ user: user._id })).toBe(1);

    expect(await IdempotencyKey.countDocuments({ user: user._id })).toBe(1);

    expect((await Product.findById(product._id)).stock).toBe(8);

    expect(
      await InventoryMovement.countDocuments({
        product: product._id,
        type: "sale",
      }),
    ).toBe(1);
  });

  it.only("rolls back when idempotency key fails to save", async () => {
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
      items: [{ product: product._id, quantity: 2 }],
    });

    const idempotencySpy = vi
      .spyOn(IdempotencyKey, "create")
      .mockRejectedValueOnce(new Error("Idempotency save failed"));

    const next = vi.fn();
    const res = makeRes();
    const req = makeReq(user, "test-order-key");

    await createOrder(req, res, next);

    expect(await Order.countDocuments({ user: user._id })).toBe(0);
    expect((await Product.findById(product._id)).stock).toBe(10);
    expect(await Cart.findOne({ user: user._id })).not.toBeNull();
    expect(
      await InventoryMovement.countDocuments({
        product: product._id,
        type: "sale",
      }),
    ).toBe(0);
  });
});

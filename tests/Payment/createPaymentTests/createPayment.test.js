import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Order from "../../../models/order";
import Payment from "../../../models/payment";
import { createPayment } from "../../../controllers/paymentController";

describe("createPayment", () => {
  let req;
  let res;
  let next;

  beforeEach(async () => {
    await Order.deleteMany({});
    await Payment.deleteMany({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  req = {
    user: { _id: "user1" },
    body: {
      orderId: "order1",
      paymentMethod: "card",
    },
  };

  res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  it("creates payment succesfully", async () => {
    const fakeOrder = {
      status: "pending",
    };

    vi.spyOn(Order, "findOne").mockResolvedValue(fakeOrder);

    vi.spyOn(Payment, "findOne").mockResolvedValue(null);

    vi.spyOn(Payment, "create").mockResolvedValue({});

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith({
      message: "Payment created successfully",
      payment: expect.anything(),
    });
  });

  it("throws error when order not found", async () => {
    vi.spyOn(Order, "findOne").mockResolvedValue(null);

    await createPayment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Order not found",
    });
  });

  it.each(["processing", "shipped", "delivered", "cancelled"])(
    "throws error when order status is invalid: %s",
    async (invalidOrder) => {
      const fakeOrder = {
        status: invalidOrder,
      };
      vi.spyOn(Order, "findOne").mockResolvedValue(fakeOrder);

      await createPayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: `You cannot create payment. The order is already ${invalidOrder}`,
      });
    },
  );

  it.each([
    ["paid", "Payment has already been paid."],
    ["refunded", "This order's payment has already been refunded."],
    ["pending", "A pending payment already exists for this order."],
  ])("rejects when invalid payment status: %s", async (status, expectedMessage) => {
    const fakeOrder = {
      status: "pending",
    };

    vi.spyOn(Order, "findOne").mockResolvedValue(fakeOrder);

    const existingPayment = {
      status,
    };

    vi.spyOn(Payment, "findOne").mockResolvedValue(existingPayment);

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: expectedMessage });
  });
});

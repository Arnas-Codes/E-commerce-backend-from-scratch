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

  next = vi.fn();

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
});

import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { getRevenueStats } from "../../../controllers/orderController";
import Order from "../../../models/order";

describe("getRevenueStats", () => {
  let req;
  let res;

  res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  beforeEach(async () => {
    await Order.deleteMany({});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns revenue stats for a valid date range", async () => {
    vi.spyOn(Order, "aggregate").mockResolvedValue([
      {
        _id: null,
        revenue: 16500,
      },
    ]);

    req = {
      query: {
        from: "2026-02-16",
        to: "2026-05-16",
      },
    };

    await getRevenueStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      revenueStats: [{ _id: null, revenue: 16500 }],
    });
    expect(Order.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          status: "delivered",
          createdAt: {
            $gte: new Date("2026-02-16"),
            $lte: new Date("2026-05-16"),
          },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalPrice" },
        },
      },
    ]);
  });

  it("returns empty revenue stats when no orders match", async () => {
    vi.spyOn(Order, "aggregate").mockResolvedValue([]);

    req = {
      query: {},
    };

    await getRevenueStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ revenueStats: [] });
    expect(Order.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          status: "delivered",
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalPrice" },
        },
      },
    ]);
  });

  it("returns revenue stats when only 'from' query match", async () => {
    vi.spyOn(Order, "aggregate").mockResolvedValue([]);

    req = {
      query: { from: "2026-02-16" },
    };

    await getRevenueStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ revenueStats: [] });
    expect(Order.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          status: "delivered",
          createdAt: {
            $gte: new Date("2026-02-16"),
          },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalPrice" },
        },
      },
    ]);
  });

  it("returns revenue stats when only 'to' query match", async () => {
    vi.spyOn(Order, "aggregate").mockResolvedValue([]);

    req = {
      query: {
        to: "2026-05-16",
      },
    };

    await getRevenueStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ revenueStats: [] });
    expect(Order.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          status: "delivered",
          createdAt: {
            $lte: new Date("2026-05-16"),
          },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalPrice" },
        },
      },
    ]);
  });
});

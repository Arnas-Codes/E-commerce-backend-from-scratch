import Order from "../models/order.js";
import asyncHandler from "../utils/asyncHandler.js";
import Payment from "../models/payment.js";
import Product from "../models/product.js";
import mongoose from "mongoose";

// create payment
export const createPayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { orderId, paymentMethod } = req.body;

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  });

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.status !== "pending") {
    return res.status(400).json({
      message: `You cannot create payment. The order is already ${order.status}`,
    });
  }

  const existingPayment = await Payment.findOne({ order: orderId });

  if (existingPayment) {
    switch (existingPayment.status) {
      case "paid":
        return res.status(400).json({
          message: "Payment has already been paid.",
        });
      case "refunded":
        return res.status(400).json({
          message: "This order's payment has already been refunded.",
        });
      case "pending":
      default:
        return res.status(400).json({
          message: "A pending payment already exists for this order.",
        });
    }
  }

  const payment = await Payment.create({
    user: userId,
    order: orderId,
    amount: order.totalPrice,
    paymentMethod,
  });

  return res.status(201).json({
    message: "Payment created successfully",
    payment,
  });
});

// confirm payment
export const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user._id;

  const session = await mongoose.startSession();

  let updatedPayment;

  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: paymentId,
        user: userId,
      }).session(session);

      if (!payment) {
        const error = new Error(`Payment not found`);
        error.statusCode = 404;
        throw error;
      }

      if (payment.status !== "pending") {
        const error = new Error(
          `Cannot confirm payment with status: ${payment.status}`,
        );
        error.statusCode = 400;
        throw error;
      }

      const order = await Order.findById(payment.order).session(session);

      if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      if (order.status !== "pending") {
        const error = new Error(
          `Cannot process payment. This order is already ${order.status}.`,
        );
        error.statusCode = 400;
        throw error;
      }

      if (payment.amount !== order.totalPrice) {
        const error = new Error(
          `Payment amount mismatch. Expected ${order.totalPrice}, received ${payment.amount}`,
        );
        error.statusCode = 400;
        throw error;
      }

      payment.status = "paid";
      order.status = "processing";

      await Promise.all([payment.save({ session }), order.save({ session })]);

      updatedPayment = payment;
    });

    return res.status(200).json({
      message: "Payment is confirmed",
      payment: updatedPayment,
    });
  } finally {
    await session.endSession();
  }
});

// get my payment
export const getMyPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user._id;

  const payment = await Payment.findOne({
    _id: paymentId,
    user: userId,
  }).populate("order");

  if (!payment) {
    return res.status(404).json({ message: "Payment not found" });
  }

  return res.status(200).json({
    message: "Payment retrieved successfully",
    payment,
  });
});

// get my payments
export const getMyPayments = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const payments = await Payment.find({ user: userId }).populate("order");

  if (payments.length === 0) {
    return res.status(404).json({ message: "Payment not found" });
  }

  return res.status(200).json({
    message: "Payment retrieved successfully",
    payments,
  });
});

// refund payment
export const refundPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user._id;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: paymentId,
        user: userId,
      }).session(session);
      if (!payment) {
        const error = new Error("Payment not found");
        error.statusCode = 404;
        throw error;
      }

      if (payment.status !== "paid") {
        const error = new Error("Only paid payment can be refunded");
        error.statusCode = 400;
        throw error;
      }

      const order = await Order.findById(payment.order).session(session);

      if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      if (order.status === "cancelled") {
        const error = new Error("Order is already cancelled");
        error.statusCode = 400;
        throw error;
      }

      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);

        if (product) {
          product.stock += item.quantity;
          await product.save({ session });
        }
      }

      payment.status = "refunded";
      await payment.save({ session });

      order.status = "cancelled";
      await order.save({ session });
    });
    return res.status(200).json({
      message: "Your payment is refunded",
    });
  } finally {
    session.endSession();
  }
});

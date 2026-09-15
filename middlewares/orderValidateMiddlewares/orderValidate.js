import { isValidObjectId } from "mongoose";

export const validateOrder = (req, res, next) => {
  const { orderId } = req.params;

  if (!orderId || !isValidObjectId(orderId)) {
    return res
      .status(400)
      .json({ message: "Invalid or missing Order ID format" });
  }
  next();
};

export const validateOrderStatus = (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }
  next();
};

export const validateGetAllOrders = (req, res, next) => {
  const { page, limit, status, from, to, user } = req.query;

  const allowedStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status type" });
  }

  if (user && !mongoose.Types.ObjectId.isValid(user)) {
    return res.status(400).json({ message: "Invalid user ID format." });
  }

  if (page) {
    const pageNumber = Number(page);
    if (isNaN(pageNumber) || !Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        message: "Page must be a valid positive integer.",
      });
    }
  }

  if (limit) {
    const limitNumber = Number(limit);
    if (
      isNaN(limitNumber) ||
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        message: "Limit must be an integer between 1 and 100.",
      });
    }
  }

  if (from) {
    const fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ message: "Invalid from date" });
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      return res.status(400).json({
        message: "Invalid to date",
      });
    }
  }

  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      return res.status(400).json({
        message: "From date cannot be after to date",
      });
    }
  }
  next();
};

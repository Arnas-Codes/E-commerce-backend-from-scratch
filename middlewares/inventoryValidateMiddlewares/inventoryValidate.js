import mongoose from "mongoose";

// validate inventory movenent
export const validateInventoryMovementQuery = (req, res, next) => {
  const { page, limit, type, product, from, to } = req.query;

  const allowedTypes = ["sale", "restock", "return", "damage", "adjustment"];

  if (type && !allowedTypes.includes(type)) {
    return res.status(400).json({
      message: "Invalid movement type.",
    });
  }

  if (product && !mongoose.Types.ObjectId.isValid(product)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
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
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (from && isNaN(fromDate.getTime())) {
    return res.status(400).json({ message: "Invalid from date" });
  }

  if (to && isNaN(toDate.getTime())) {
    return res.status(400).json({
      message: "Invalid to date",
    });
  }

  if (from && to && fromDate > toDate) {
    return res.status(400).json({
      message: "From date cannot be after to date",
    });
  }

  next();
};

export const validateSetInventory = (req, res, next) => {
  const { stock } = req.body;
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({
      message: "Product ID is required",
    });
  }

  if (stock === undefined || stock === "") {
    return res.status(400).json({
      message: "Stock is required",
    });
  }

  const numericStock = Number(stock);

  if (isNaN(numericStock) || !Number.isInteger(numericStock)) {
    return res.status(400).json({
      message: "Stock must be an integer",
    });
  }

  next();
};

export const validateInventoryMovement = (req, res, next) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({
      message: "Product ID is required",
    });
  }

  if (quantity === undefined || quantity === "") {
    return res.status(400).json({
      message: "Quantity is required",
    });
  }

  const numericQuantity = Number(quantity);

  if (isNaN(numericQuantity) || !Number.isInteger(numericQuantity)) {
    return res.status(400).json({
      message: "Quantity must be an integer",
    });
  }

  if (numericQuantity <= 0) {
    return res.status(400).json({
      message: "Quantity must be a positive integer",
    });
  }

  next();
};

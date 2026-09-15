import mongoose from "mongoose";

export const validateReturnOrder = (req, res, next) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Return items are required",
    });
  }

  const productIds = new Set();

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return res
        .status(400)
        .json({ message: "Each item must be a valid object" });
    }

    const { product, quantity } = item;

    if (!product || quantity === undefined) {
      return res.status(400).json({
        message: "Each item must have a product ID and quantity",
      });
    }

      if(!mongoose.Types.ObjectId.isValid(product)){
      return res.status(400).json({message:"Invalid product Id"})
    }

    if (quantity <= 0 || isNaN(quantity) || !Number.isInteger(quantity)) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    if (productIds.has(product)) {
      return res.status(400).json({
        message: "Duplicate products found in return request",
      });
    }

    productIds.add(product);
  }

  next();
};

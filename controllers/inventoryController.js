import asyncHandler from "../utils/asyncHandler.js";
import Product from "../models/product.js";
import InventoryMovement from "../models/inventoryMovement.js";

export const setInventory = asyncHandler(async (req, res) => {
  const { stock, reason } = req.body;
  const { productId } = req.params;

  const newStock = Number(stock);

  if (isNaN(newStock)) {
    return res.status(400).json({
      message: "Stock must be a valid number.",
    });
  }

  if (newStock < 0) {
    return res.status(400).json({
      message: "Stock cannot be negative.",
    });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const change = newStock - product.stock;

  if (change === 0) {
    return res.status(400).json({
      message: "Stock is already at this level.",
    });
  }

  product.stock = newStock;
  await product.save();

  const inventoryMovement = await InventoryMovement.create({
    product: product._id,
    change,
    type: "adjustment",
    reason: reason || "Inventory adjustment",
  });

  return res.status(200).json({
    message: "Inventory updated successfully",
    product,
    inventoryMovement,
  });
});
export const restockInventory = asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;
  const { productId } = req.params;

  const numericQuantity = Number(quantity);

  if (isNaN(numericQuantity)) {
    return res.status(400).json({
      message: "Quantity must be a valid number.",
    });
  }

  if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
    return res.status(400).json({
      message: "Quantity must be a positive integer.",
    });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  product.stock += numericQuantity;
  await product.save();

  const inventoryMovement = await InventoryMovement.create({
    product: product._id,
    change: numericQuantity,
    type: "restock",
    reason: reason || "Inventory restock",
  });

  return res.status(200).json({
    message: "Inventory restocked successfully",
    product,
    inventoryMovement,
  });
});

export const damageInventory = asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;
  const { productId } = req.params;

  const numericQuantity = Number(quantity);

  if (isNaN(numericQuantity)) {
    return res.status(400).json({
      message: "Quantity must be a valid number.",
    });
  }

  if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
    return res.status(400).json({
      message: "Quantity must be a positive integer.",
    });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  if (numericQuantity > product.stock) {
    return res.status(400).json({
      message: "Insufficient stock available.",
    });
  }

  product.stock -= numericQuantity;
  await product.save();

  const inventoryMovement = await InventoryMovement.create({
    product: product._id,
    change: -numericQuantity,
    type: "damage",
    reason: reason || "Inventory damage",
  });

  return res.status(200).json({
    message: "Inventory damage recorded successfully",
    product,
    inventoryMovement,
  });
});

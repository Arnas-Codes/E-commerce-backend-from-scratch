import asyncHandler from "../utils/asyncHandler.js";
import InventoryMovement from "../models/inventoryMovement.js";

export const getInventoryMovements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, product, from, to } = req.query;

  const filter = {};
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (type) {
    filter.type = type;
  }

  if (product) {
    filter.product = product;
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) {
      filter.createdAt.$gte = new Date(from)
    }
    if(to){
      filter.createdAt.$lte = new Date(to)
    }
  }

  const totalMovement = await InventoryMovement.countDocuments(filter);

  const totalPages = Math.ceil(totalMovement / limitNumber);

  const skip = (pageNumber - 1) * limitNumber;

  const inventoryMovement = await InventoryMovement.find(filter)
    .populate("product")
    .skip(skip)
    .limit(limitNumber);

  return res.status(200).json({
    inventoryMovement,
    totalMovement,
    totalPages,
    currentPage: pageNumber,
  });
});

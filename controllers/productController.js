import mongoose from "mongoose";
import Product from "../models/product.js";
import asyncHandler from "../utils/asyncHandler.js";
import InventoryMovement from "../models/inventoryMovement.js";

// Getting Product
export const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 10,
    search,
  } = req.query;
  const filter = {};
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (category) {
    filter.category = category;
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) {
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice) {
      filter.price.$lte = Number(maxPrice);
    }
  }
  if (search) {
    filter.name = {
      $regex: search,
      $options: "i",
    };
  }

  const totalProducts = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalProducts / limitNumber);

  const skip = (pageNumber - 1) * limitNumber;
  const products = await Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNumber);
  return res.status(200).json({
    products,
    totalProducts,
    totalPages,
    currentPage: pageNumber,
    pageLimit: limitNumber,
  });
});

// Getting product by id
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }
  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  res.status(200).json(product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, price, category, description, stock } = req.body;
  const newProduct = await Product.create({
    name,
    price,
    category,
    description,
    stock
  });

  res.status(201).json(newProduct);
});

// Updating product
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, price, category, description, stock } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { name, price, category, description, stock },
    { new: true },
  );

  if (!updatedProduct) {
    return res.status(404).json({
      message: "Product not found",
    });
  }
  res.status(200).json(updatedProduct);
});

// Deleting Product
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const deletedProduct = await Product.findByIdAndDelete(id);
  if (!deletedProduct) {
    return res.status(404).json({
      message: "Product not found",
    });
  }
  res.status(200).json({
    message: "Product deleted successfully",
  });
});

// update stock
export const updateStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { stock } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  product.stock = stock;

  await product.save();

  return res.status(200).json({
    message: "Stock updated successfully",
    product,
  });
});

// update stock adjustment
export const updateStockAdjustment = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { change } = req.body;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const product = await Product.findById(productId).session(session);

      if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
      }

      const newStock = product.stock + change;

      if (newStock < 0) {
        const error = new Error("Insufficient stock available");
        error.statusCode = 400;
        throw error;
      }

      product.stock = newStock;
      await product.save({ session });

      await InventoryMovement.create(
        [
          {
            product: product._id,
            change,
            type: "adjustment",
            reason: "Admin stock adjustment",
          },
        ],
        { session },
      );
    });

    return res.status(200).json({
      message: "Stock adjusted successfully",
    });
  } finally {
    session.endSession();
  }
});

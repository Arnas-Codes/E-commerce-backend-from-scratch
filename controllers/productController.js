import mongoose from "mongoose";
import Product from "../models/product.js";
import asyncHandler from "../utils/asyncHandler.js";

import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";

const extractPublicIdFromUrl = (url) => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
  return match ? match[1] : url;
};

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
    .select("name price category image")
    .sort(sort)
    .skip(skip)
    .limit(limitNumber)
    .lean();
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
  const product = await Product.findById(id).lean();
  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  res.status(200).json(product);
});

// creating Product
export const createProduct = asyncHandler(async (req, res) => {
  const { name, price, category, description, stock } = req.body;

  // for local storage,
  /* const image = req.file ? `/uploads/${req.file.filename}` : ""; */

  // for cloudinary storage
  const image = req.file ? req.file.path : "";

  try {
    const newProduct = await Product.create({
      name,
      price,
      category,
      description,
      stock,
      image,
    });

    res.status(201).json(newProduct);
  } catch (error) {
    if (req.file) {
      // for local storage
      /*  await fs.unlink(path.resolve(req.file.path)).catch((cleanupError) => {
        console.error("Failed to delete uploaded image:", cleanupError);
      }); */

      // for cloudinary storage
      const publicId = req.file.filename;
      await cloudinary.uploader.destroy(publicId).catch((cleanupError) => {
        console.error(
          "Failed to delete uploaded image from Cloudinary:",
          cleanupError,
        );
      });
    }

    throw error;
  }
});

// Updating product
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, price, category, description, stock } = req.body;

  // 1. Validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    if (req.file) {
      // for local storage
      /* await fs.unlink(path.resolve(req.file.path)).catch(() => {}); */

      // for cloudinary storage (multer-storage-cloudinary usually puts public_id in filename or uses path)
      const publicId = req.file.filename;
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  // 2. Find product
  const product = await Product.findById(id);

  if (!product) {
    if (req.file) {
      // for local storage
      /* await fs.unlink(path.resolve(req.file.path)).catch(() => {}); */

      // for cloudinary storage
      const publicId = req.file.filename;
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const oldImagePath = product.image;

  try {
    product.name = name ?? product.name;
    product.price = price ?? product.price;
    product.category = category ?? product.category;
    product.description = description ?? product.description;
    product.stock = stock ?? product.stock;

    if (req.file) {
      // for local storage
      /* product.image = `/uploads/${req.file.filename}`; */

      // for cloudinary storage (req.file.path contains the secure URL)
      product.image = req.file.path;
    }

    const updatedProduct = await product.save();

    if (req.file && oldImagePath) {
      // for local storage cleanup...
      /* const oldFilename = path.basename(oldImagePath);
      const oldFilePath = path.resolve("uploads", oldFilename);
      await fs.unlink(oldFilePath).catch((error) => {
        console.error("Failed to delete old image:", error);
      }); */

      // for cloudinary storage
      const oldPublicId = extractPublicIdFromUrl(oldImagePath);
      await cloudinary.uploader.destroy(oldPublicId).catch((error) => {
        console.error("Failed to delete old image from Cloudinary:", error);
      });
    }

    return res.status(200).json(updatedProduct);
  } catch (error) {
    if (req.file) {
      // for local storage cleanup...
      /* await fs.unlink(path.resolve(req.file.path)).catch(() => {}); */

      // for cloudinary storage
      const publicId = req.file.filename;
      await cloudinary.uploader.destroy(publicId).catch((cleanupError) => {
        console.error(
          "Failed to delete uploaded image from Cloudinary:",
          cleanupError,
        );
      });
    }

    throw error;
  }
});

export const deleteProduct = asyncHandler(async (req, res) => {
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

  await Product.findByIdAndDelete(id);

  if (product.image) {
    // for local storage
    /* const imagePath = path.resolve("uploads", path.basename(product.image));
    await fs.unlink(imagePath).catch((error) => {
      console.error("Failed to delete image:", error);
    }); */

    // for cloudinary storage

    const publicId = extractPublicIdFromUrl(product.image);

    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
      });

      console.log("Cloudinary deletion result:", result);
    }
  }

  return res.status(200).json({
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

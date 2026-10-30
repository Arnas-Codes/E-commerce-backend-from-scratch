import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

export const validateProduct = async (req, res, next) => {
  const reject = async (message) => {
    // for local storage
    /* if (req.file) {
      await fs.unlink(path.resolve(req.file.path)).catch((error) => {
        console.err;
        or("Failed to clean up uploaded image:", error);
      });
    } */

    // for cloudinary storage
    if (req.file?.filename) {
      await cloudinary.uploader.destroy(req.file.filename).catch((error) => {
        console.error(
          "Failed to clean up uploaded image from Cloudinary:",
          error,
        );
      });
    }

    return res.status(400).json({ message });
  };

  const { name, price } = req.body;
  const isCreate = req.method === "POST";

  if (isCreate && (name === undefined || price === undefined)) {
    return reject("Name and price are required");
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 1) {
      return reject("Name must be a non-empty string");
    }

    req.body.name = name.trim();
  }

  if (price !== undefined) {
    if (price === "" || !Number.isFinite(Number(price)) || Number(price) < 0) {
      return reject("Price must be a valid non-negative number");
    }

    req.body.price = Number(price);
  }

  next();
};

// validate stock
export const validateStock = (req, res, next) => {
  const { stock } = req.body;

  if (stock === undefined || stock === "") {
    return res.status(400).json({
      message: "Stock is required",
    });
  }

  if (typeof stock !== "number") {
    return res.status(400).json({ message: "Stock must be a number" });
  }

  if (stock < 0) {
    return res.status(400).json({
      message: "Stock cannot be negative",
    });
  }

  if (!Number.isInteger(stock)) {
    return res.status(400).json({
      message: "Stock must be a whole number",
    });
  }

  next();
};

// validate stock change
export const validateStockAdjustment = (req, res, next) => {
  const { change } = req.body;

  if (change === undefined || change === "") {
    return res.status(400).json({
      message: "change is required",
    });
  }

  if (typeof change !== "number") {
    return res.status(400).json({ message: "change must be number" });
  }

  if (change === 0) {
    return res.status(400).json("Change stock cant be 0");
  }

  if (!Number.isInteger(change)) {
    return res.status(400).json({
      message: "Change must be a whole number",
    });
  }
  next();
};

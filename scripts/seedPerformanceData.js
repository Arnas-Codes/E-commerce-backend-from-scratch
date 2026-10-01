import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/product.js";
import asyncHandler from "../utils/asyncHandler.js";

dotenv.config();

const seedPerformanceData = asyncHandler(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);

  console.log("Connected to test database");

  await Product.deleteMany({});

  const categories = ["electronics", "clothing", "books", "shoes", "home"];

  const products = [];

  for (let i = 1; i <= 10000; i++) {
    products.push({
      name: `Product ${i}`,
      price: Math.floor(Math.random() * 1000) + 1,
      category: categories[i % categories.length],
      description: `Description for product ${i}`,
      stock: Math.floor(Math.random() * 100),
    });
  }

  await Product.insertMany(products);

  console.log("10,000 performance products inserted");

  await mongoose.disconnect();
  console.log("Database disconnected");
});

seedPerformanceData();

import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/product.js";
import asyncHandler from "../utils/asyncHandler.js";

dotenv.config();

const testPerformance = asyncHandler(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);

  console.log("Connected to test database");

  const result = await Product.find({
    category: "electronics",
    price: { $gte: 100, $lte: 500 },
  }).lean().explain("executionStats");

  console.log(result);

  await mongoose.disconnect();
});

testPerformance();

const testPerformance1 = asyncHandler(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);
  console.log("Connected to test database");

  const start = Date.now();
  const products = await Product.find({
    category: "electronics",
  })

  const end = Date.now();
  console.log("Time taken:", end - start, "ms");
  console.log("Number of products found:", products.length);

  await mongoose.disconnect();
});

testPerformance1();

const testPerformance2 = asyncHandler(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);
  console.log("Connected to test database");

  const start = Date.now();
  const products = await Product.find({
    category: "electronics",
  }).lean();

  const end = Date.now();
  console.log("Time taken:", end - start, "ms");
  console.log("Number of products found:", products.length);

  await mongoose.disconnect();
});

testPerformance2();

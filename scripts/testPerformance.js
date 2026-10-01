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
  }).explain("executionStats");

  console.log(result);

  await mongoose.disconnect();
});

testPerformance();

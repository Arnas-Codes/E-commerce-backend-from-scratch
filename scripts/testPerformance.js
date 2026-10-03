import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/product.js";
import asyncHandler from "../utils/asyncHandler.js";

dotenv.config();

const testPerformance = asyncHandler(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);

  console.log("Connected to test database");

  // Test 1
  const start1 = Date.now();

  const products1 = await Product.find({
    category: "electronics",
  }).lean();

  const end1 = Date.now();

  console.log("Without select:", end1 - start1, "ms");
  console.log(products1[0]);
  // Test 2
  const start2 = Date.now();

  const products2 = await Product.find({
    category: "electronics",
  })
    .select("name price")
    .lean();

  const end2 = Date.now();

  console.log("With select:", end2 - start2, "ms");
  console.log(products2[0]);

  await mongoose.disconnect();
});

testPerformance();
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
  })
    .select("name price category")
    .sort({ price: 1 })
    .limit(10)
    .explain("executionStats");

  console.log(JSON.stringify(result.executionStats, null, 2));
  await mongoose.disconnect();
});

testPerformance();

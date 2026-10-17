import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/product.js";
import asyncHandler from "../utils/asyncHandler.js";

dotenv.config();

const testPerformance = asyncHandler(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);

  console.log("Connected to test database");

  const filter = { category: "electronics" };

// Warm-up: run each query once
await Product.find(filter).lean();
await Product.find(filter).select("name price").lean();

async function measure(label, queryFn) {
  const runs = 5;
  let total = 0;

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await queryFn();
    total += performance.now() - start;
  }

  console.log(`${label}: ${(total / runs).toFixed(2)} ms average`);
}

await measure("Without select", () =>
  Product.find(filter).lean()
);

await measure("With select", () =>
  Product.find(filter).select("name price").lean()
);

  await mongoose.disconnect();
});

testPerformance();
import dotenv from "dotenv";
console.log("NODE_ENV:", process.env.NODE_ENV);
dotenv.config();

process.env.NODE_ENV = "test";

import { beforeAll } from "vitest";
import connectTestDB from "../config/testDb.js";

beforeAll(async () => {
  await connectTestDB();
});
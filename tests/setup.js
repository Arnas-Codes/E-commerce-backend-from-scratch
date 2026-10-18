import dotenv from "dotenv";
dotenv.config();
console.log("NODE_ENV:", process.env.NODE_ENV);


process.env.NODE_ENV = "test";

import { beforeAll } from "vitest";
import connectTestDB from "../config/testDb.js";

beforeAll(async () => {
  await connectTestDB();
});
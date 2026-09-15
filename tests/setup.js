import dotenv from "dotenv";
dotenv.config();

import { beforeAll } from "vitest";
import connectTestDB from "../config/testDb.js";

beforeAll(async () => {
  await connectTestDB();
});
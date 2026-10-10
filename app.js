import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { apiLimiter } from "./middlewares/authValidateMiddlewares/rateLimit.js";
const isTest = process.env.NODE_ENV === "test";
const isLoadTest = process.env.LOAD_TEST_MODE === "true";

import helmet from "helmet";
import errorHandler from "./middlewares/authValidateMiddlewares/errorMiddleware.js";
import compression from "compression";
import redisClient from "./config/redis.js";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/ordersRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import InventoryMovementRoutes from "./routes/inventoryMovementRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
const app = express();

app.use(helmet());

app.use(compression());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
    );
  });
  next();
});

if (!isTest || process.env.TEST_RATE_LIMIT === "true") {
  if (!isLoadTest) {
    app.use(apiLimiter);
  }
}
console.log("APP NODE_ENV:", process.env.NODE_ENV);

app.use(express.json());
app.use(mongoSanitize());

app.use("/products", productRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/payment", paymentRoutes);
app.use("/inventory-movements", InventoryMovementRoutes);
app.use("/inventory", inventoryRoutes);


// test route for redis connection
app.get("/redis-test", async (req, res) => {
  await redisClient.set("test:name", "Arnas",{EX: 10});

  const value = await redisClient.get("test:name");
  const ttl = await redisClient.ttl("test:name");
  
  res.json({
    value,
    ttl
  });
});

app.use(errorHandler);

export default app;

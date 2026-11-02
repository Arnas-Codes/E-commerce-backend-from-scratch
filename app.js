import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { apiLimiter } from "./middlewares/authValidateMiddlewares/rateLimit.js";

import helmet from "helmet";
import errorHandler from "./middlewares/authValidateMiddlewares/errorMiddleware.js";
import compression from "compression";
import redisClient, { sendRedisCommand } from "./config/redis.js";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/ordersRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import InventoryMovementRoutes from "./routes/inventoryMovementRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";

import upload from "./middlewares/upload/cloudUpload/uploadMiddleware.js";
import uploadErrorMiddleware from "./middlewares/upload/uploadErrorMiddleware.js";

const app = express();

const isLoadTest = process.env.LOAD_TEST_MODE === "true";

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

if (process.env.NODE_ENV !== "test" && !isLoadTest) {
  app.use(apiLimiter);
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

if (process.env.NODE_ENV !== "production") {
  // test route for redis connection
  app.get("/redis-test", async (req, res) => {
    if (!redisClient.isReady) {
      return res.status(503).json({ message: "Redis is unavailable." });
    }

    try {
      await sendRedisCommand(["SET", "test:name", "Arnas", "EX", "10"]);

      const [value, ttl] = await Promise.all([
        sendRedisCommand(["GET", "test:name"]),
        sendRedisCommand(["TTL", "test:name"]),
      ]);

      res.json({ value, ttl });
    } catch {
      res.status(503).json({ message: "Redis is unavailable." });
    }
  });
}

if (process.env.NODE_ENV !== "production") {
  // test route for file upload
  app.use("/uploads", express.static("uploads"));

  app.post("/test-upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
        file: req.file,
      });
    }

    res.status(200).json({
      message: "Image uploaded successfully",
      file: req.file,
    });
  });
}

app.use(uploadErrorMiddleware);
app.use(errorHandler);

export default app;

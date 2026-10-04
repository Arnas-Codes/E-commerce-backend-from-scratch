import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { apiLimiter } from "./middlewares/authValidateMiddlewares/rateLimit.js";
import helmet from "helmet";
import errorHandler from "./middlewares/authValidateMiddlewares/errorMiddleware.js";
import compression from "compression";

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

if (process.env.NODE_ENV !== "test" || process.env.TEST_RATE_LIMIT === "true") {
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

app.use(errorHandler);

export default app;

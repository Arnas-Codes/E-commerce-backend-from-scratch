import express from "express";

import errorHandler from "./middlewares/errorMiddleware.js";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/ordersRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import InventoryMovementRoutes from "./routes/inventoryMovementRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js"

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/products", productRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/payment", paymentRoutes);
app.use("/inventory-movements", InventoryMovementRoutes);
app.use("/inventory",inventoryRoutes)

app.use(errorHandler);

export default app;

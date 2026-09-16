import express from "express";
import { adminOnly, protect } from "../middlewares/authMiddleware.js";
import {
  cancelOrder,
  createOrder,
  getAllOrders,
  getMyOrder,
  getMyOrders,
  getOrderStats,
  getOrdersWithUsers,
  getRevenueStats,
  getTopCustomers,
  returnOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";
import {
  validateOrder,
  validateOrderStatus,
  validateGetAllOrders,
} from "../middlewares/orderValidate.js";
import { validateRevenueQuery } from "../middlewares/RevenueQueryValidate.js";
import { refundPayment } from "../controllers/paymentController.js";

const router = express.Router();

// Admin routes
router.get("/admin", protect, adminOnly, validateGetAllOrders, getAllOrders);

router.patch(
  "/admin/:orderId/status",
  protect,
  adminOnly,
  validateOrderStatus,
  updateOrderStatus,
);

// Admin statistics routes

router.get("/admin/stats", protect, adminOnly, getOrderStats);

router.get(
  "/admin/revenue",
  protect,
  adminOnly,
  validateRevenueQuery,
  getRevenueStats,
);

router.get("/admin/orders-with-users", protect, adminOnly, getOrdersWithUsers);

router.get("/admin/top-customers", protect, adminOnly, getTopCustomers);

// User routes
router.post("/", protect, createOrder);
router.get("/", protect, getMyOrders);
router.get("/:orderId", protect, validateOrder, getMyOrder);
router.patch("/:orderId/cancel", protect, validateOrder, cancelOrder);
router.patch("/:orderId/return", protect, validateOrder, returnOrder);

export default router;

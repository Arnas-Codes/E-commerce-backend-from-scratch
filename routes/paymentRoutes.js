import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  confirmPayment,
  createPayment,
  getMyPayment,
  getMyPayments,
  refundPayment,
} from "../controllers/paymentController.js";
import { validatePayment } from "../middlewares/paymentValidate.js";

const router = express.Router();

router.post("/", protect, createPayment);

router.patch("/:paymentId/pay", protect, validatePayment, confirmPayment);

router.get("/:paymentId", protect, validatePayment, getMyPayment);

router.get("/", protect, getMyPayments);

router.patch("/:paymentId/refund", protect, validatePayment, refundPayment);

export default router;

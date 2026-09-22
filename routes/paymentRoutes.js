import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  confirmPayment,
  createPayment,
  failPayment,
  getMyPayment,
  getMyPayments,
} from "../controllers/paymentController.js";
import { validatePayment } from "../middlewares/paymentValidate.js";
import { adminOnly } from "../middlewares/authValidateMiddlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createPayment);

router.patch("/:paymentId/pay", protect, validatePayment, confirmPayment);

router.get("/:paymentId", protect, validatePayment, getMyPayment);

router.get("/", protect, getMyPayments);

router.patch("/:paymentId/fail", protect, adminOnly, failPayment);

export default router;

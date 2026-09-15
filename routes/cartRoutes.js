import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateQuantity,
} from "../controllers/cartController.js";
import { validateAddToCart } from "../middlewares/cartValidate.js";
import { validateQuantity } from "../middlewares/validateUpdateQuantity.js";
import { validateRemove } from "../middlewares/validateRemoveFromCart.js";

const router = express.Router();

router.post("/", protect, validateAddToCart, addToCart);

router.get("/", protect, getCart);

router.patch("/:productId", protect, validateQuantity, updateQuantity);

router.delete("/:productId",protect,validateRemove,removeFromCart)

router.delete("/", protect, clearCart)

export default router;

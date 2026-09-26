import express from "express";
import { protect } from "../middlewares/authValidateMiddlewares/authMiddleware.js";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateQuantity,
} from "../controllers/cartController.js";
import {
  validateAddToCart,
} from "../middlewares/cartValidateMiddlewares/cartValidate.js";
import { validateQuantity } from "../middlewares/orderValidateMiddlewares/validateUpdateQuantity.js";
import { validateRemove } from "../middlewares/cartValidateMiddlewares/validateRemoveFromCart.js";

const router = express.Router();

router.post("/", protect, validateAddToCart, addToCart);

router.get("/", protect, getCart);

router.patch("/:productId", protect, validateQuantity, updateQuantity);

router.delete("/:productId", protect, validateRemove, removeFromCart);

router.delete("/", protect, clearCart);

export default router;

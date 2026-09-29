import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  deleteProduct,
  updateProduct,
  updateStock,
  updateStockAdjustment,
} from "../controllers/productController.js";

import {
  validateProduct,
  validateStock,
  validateStockAdjustment,
} from "../middlewares/productValidateMiddlewares/validateProduct.js";
import { adminOnly, protect } from "../middlewares/authValidateMiddlewares/authMiddleware.js";
import { authorizeAdmin } from "../middlewares/authValidateMiddlewares/authorizeAdmin.js";
import { getProductValidation } from "../middlewares/productValidateMiddlewares/validateGetProduct.js";

const router = express.Router();

// user/public routes

router.get("/", getProductValidation, getProducts);

router.get("/:id", getProductById);

// admin routes

router.post("/",protect, authorizeAdmin,  validateProduct, createProduct);

router.put("/:id", protect, authorizeAdmin, validateProduct, updateProduct);

router.delete("/:id", protect, authorizeAdmin, deleteProduct);

router.patch(
  "/:productId/stock",
  protect,
  adminOnly,
  validateStock,
  updateStock,
);

router.patch(
  "/productId/stock/adjust",
  protect,
  adminOnly,
  validateStockAdjustment,
  updateStockAdjustment
);
export default router;

import express from "express";
import { adminOnly, protect } from "../middlewares/authMiddleware.js";
import { getInventoryMovements } from "../controllers/inventoryMovementController.js";
import { validateInventoryMovementQuery } from "../middlewares/inventoryValidate.js";

const router = express.Router();

router.get(
  "/",
  protect,
  adminOnly,
  validateInventoryMovementQuery,
  getInventoryMovements,
);

export default router;

import express from "express";
import { adminOnly, protect } from "../middlewares/authValidateMiddlewares/authMiddleware.js";
import { getInventoryMovements } from "../controllers/inventoryMovementController.js";
import { validateInventoryMovementQuery } from "../middlewares/inventoryValidateMiddlewares/inventoryValidate.js";

const router = express.Router();

router.get(
  "/",
  protect,
  adminOnly,
  validateInventoryMovementQuery,
  getInventoryMovements,
);

export default router;

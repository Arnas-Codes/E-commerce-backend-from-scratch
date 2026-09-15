import express from "express";
import { adminOnly, protect } from "../middlewares/authMiddleware";
import {
  damageInventory,
  restockInventory,
  setInventory,
} from "../controllers/inventoryController";
import {
  validateInventoryMovement,
  validateSetInventory,
} from "../middlewares/inventoryValidate";

const router = express.Router();

router.patch(
  "/:productId",
  protect,
  adminOnly,
  validateSetInventory,
  setInventory,
);

router.post(
  "/:productId/restock",
  protect,
  adminOnly,
  validateInventoryMovement,
  restockInventory,
);

router.post(
  "/:productId/damage",
  protect,
  adminOnly,
  validateInventoryMovement,
  damageInventory,
);

export default router;

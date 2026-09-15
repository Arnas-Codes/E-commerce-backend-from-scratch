import mongoose from "mongoose";

const inventoryMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    change: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "sale",
        "restock",
        "return",
        "damage",
        "adjustment",
        "order_cancelled",
      ],
      required: true,
    },

    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const InventoryMovement = mongoose.model(
  "InventoryMovement",
  inventoryMovementSchema,
);

export default InventoryMovement;

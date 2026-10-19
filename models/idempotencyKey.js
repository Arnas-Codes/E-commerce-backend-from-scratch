import mongoose from "mongoose";

const idempotencyKeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true },
);

idempotencyKeySchema.index({ user: 1, key: 1 }, { unique: true });

const IdempotencyKey = mongoose.model("IdempotencyKey", idempotencyKeySchema);

export default IdempotencyKey;

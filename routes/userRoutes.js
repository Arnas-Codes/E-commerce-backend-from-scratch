import express from "express";
import { changePassword, deleteAccount, getProfile } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { validateUpdateProfile } from "../middlewares/userValidate.js";
import { updateProfile } from "../controllers/userController.js";
import { validateChangePassword } from "../middlewares/validateChangePassword.js";

const router = express.Router();

router.get("/profile", protect, getProfile);

router.patch("/profile", protect, validateUpdateProfile, updateProfile);

router.patch(
  "/change-password",
  protect,
  validateChangePassword,
  changePassword,
);

router.delete("/account", protect, deleteAccount);


export default router;

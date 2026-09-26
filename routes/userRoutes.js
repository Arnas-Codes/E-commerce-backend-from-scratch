import express from "express";
import { changePassword, deleteAccount, getProfile } from "../controllers/userController.js";
import { protect } from "../middlewares/authValidateMiddlewares/authMiddleware.js";
import { validateUpdateProfile } from "../middlewares/userValidateMiddlewares/userValidate.js";
import { updateProfile } from "../controllers/userController.js";
import { validateChangedPassword } from "../middlewares/authValidateMiddlewares/validateChangePassword.js";

const router = express.Router();

router.get("/profile", protect, getProfile);

router.patch("/profile", protect, validateUpdateProfile, updateProfile);

router.patch(
  "/change-password",
  protect,
  validateChangedPassword,
  changePassword,
);

router.delete("/account", protect, deleteAccount);


export default router;

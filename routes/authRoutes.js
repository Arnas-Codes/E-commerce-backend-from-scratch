import express from "express";
import { register, login } from "../controllers/authController.js";
import {
  validateRegister,
  validateLogin,
} from "../middlewares/authValidateMiddlewares/authValidate.js";
import {
  registerLimiter,
  loginLimiter,
} from "../middlewares/authValidateMiddlewares/rateLimit.js";
const router = express.Router();

router.post("/register", registerLimiter, validateRegister, register);

router.post("/login", loginLimiter, validateLogin, login);

export default router;

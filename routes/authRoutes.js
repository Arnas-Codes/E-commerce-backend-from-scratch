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

if (process.env.NODE_ENV !== "test" || process.env.TEST_RATE_LIMIT === "true") {
  router.post("/login", loginLimiter, validateLogin, login);
} else {
  router.post("/login", validateLogin, login);
}

export default router;

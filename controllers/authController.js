import asyncHandler from "../utils/asyncHandler.js";

import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({
    email,
  });
  if (existingUser) {
    return res.status(409).json({
      message: "Email already exists",
    });
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
  });
  return res.status(201).json({ message: "User is created" });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({
    email,
  });
  if (!existingUser) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const isMatch = await bcrypt.compare(password, existingUser.password);
  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }
  const token = jwt.sign(
    {
      userId: existingUser._id,
      role: existingUser.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  return res.status(200).json({
    message: "Login successful",
    token,
  });
});

import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";

export const getProfile = (req, res) => {
  const { name, email, role } = req.user;

  return res.status(200).json({
    profile: {
      name,
      email,
      role,
    },
  });
};

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  if (email) {
    const existingUser = await User.findOne({
      email,
    });
    if (
      existingUser &&
      existingUser._id.toString() !== req.user._id.toString()
    ) {
      return res.status(409).json({
        message: "Email already taken",
      });
    }
  }

  const updatedData = {};

  if (name) updatedData.name = name;
  if (email) updatedData.email = email;

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updatedData, {
    new: true,
  });
  return res.status(200).json({
    profile: {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const isMatch = await bcrypt.compare(currentPassword, req.user.password);

  if (!isMatch) {
    return res.status(401).json({
      message: "Your current password is wrong",
    });
  }
  const isSamePassword = await bcrypt.compare(newPassword, req.user.password);

  if (isSamePassword) {
    return res.status(400).json({
      message: "New password cannot be the same as your current password",
    });
  }
  const newHashedPassword = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(
    req.user._id,
    { password: newHashedPassword },
    { new: true },
  );
  return res.status(200).json({ message: "Password changed successfully" });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { isDeleted: true },
    { new: true },
  );
  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "Account successfully deactivated",
    isDeleted: updatedUser.isDeleted,
  });
});

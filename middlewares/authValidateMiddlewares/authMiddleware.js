import jwt from "jsonwebtoken";
import User from "../../models/user.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }
  try {
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId, isDeleted: false });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Access denied. User not found." });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log("JWT Error Details:", error.message);
    return res.status(401).json({
      message: "Access denied. Invalid token",
    });
  }
};

// admin validate
export const adminOnly = (req, res, next) => {
  const role = req.user.role;
  if (role !== "admin") {
    return res.status(403).json({
      message: "Acces denied, Admin privileges required",
    });
  }
  next()
};

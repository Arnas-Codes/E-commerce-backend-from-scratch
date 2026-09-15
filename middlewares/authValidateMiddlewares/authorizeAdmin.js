export const authorizeAdmin = (req, res, next) => {
  const role = req.user.role;
  if (role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admins only.",
    });
  }
  next()
};

export const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: "Current password or New password feild is empty.",
    });
  }
  next()
};

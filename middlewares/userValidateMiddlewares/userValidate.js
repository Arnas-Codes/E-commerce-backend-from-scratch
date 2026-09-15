export const validateUpdateProfile = (req, res, next) => {
  const { name, email } = req.body;
  if (!name && !email) {
    return res.status(400).json({
      message: "Please provide at least one field to update (name or email)",
    });
  }
  next()
};

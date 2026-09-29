export const validateUpdateProfile = (req, res, next) => {
  const { name, email } = req.body;

  if (name !== undefined && typeof name !== "string") {
    return res.status(400).json({
      message: "Invalid name format. Expected a string.",
    });
  }

  if (email !== undefined && typeof email !== "string") {
    return res.status(400).json({
      message: "Invalid email format. Expected a string.",
    });
  }

  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();

  if (!trimmedName && !trimmedEmail) {
    return res.status(400).json({
      message: "Please provide at least one field to update (name or email)",
    });
  }

  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  req.body = {};
  if (trimmedName) req.body.name = trimmedName;
  if (trimmedEmail) req.body.email = trimmedEmail;

  next();
};

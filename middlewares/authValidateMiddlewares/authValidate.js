export const validateRegister = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({ message: "Request body is required" });
  }

  const { name, email, password } = req.body;

  // 2. Validate Name
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Name is required" });
  }

  // 3. Validate Email (using standard RFC email regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== "string" || !emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  // 4. Validate Password
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long",
    });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    !email.includes(".") ||
    email.trim().length < 5
  ) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long",
    });
  }

  next();
};

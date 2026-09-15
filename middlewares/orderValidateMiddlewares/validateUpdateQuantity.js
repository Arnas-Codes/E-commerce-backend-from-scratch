export const validateQuantity = (req, res, next) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) {
    return res.status(400).json({
      message: "Quantity must be at least 1",
    });
  }
  next();
};

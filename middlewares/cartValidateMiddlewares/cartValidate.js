export const validateAddToCart = (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({
      message: "Please provide a valid product and quantity",
    });
  }

  next();
};

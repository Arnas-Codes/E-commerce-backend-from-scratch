export const validateProduct = (req, res, next) => {
  const { name, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({
      message: "Name and price are required",
    });
  }
  next();
};

// validate stock
export const validateStock = (req, res, next) => {
  const { stock } = req.body;

  if (stock === undefined || stock === "") {
    return res.status(400).json({
      message: "Stock is required",
    });
  }

  if (typeof stock !== "number") {
    return res.status(400).json({ message: "Stock must be a number" });
  }

  if (stock < 0) {
    return res.status(400).json({
      message: "Stock cannot be negative",
    });
  }

  if (!Number.isInteger(stock)) {
    return res.status(400).json({
      message: "Stock must be a whole number",
    });
  }

  next();
};

// validate stock change
export const validateStockAdjustment = (req, res, next) => {
  const { change } = req.body;

  if (change === undefined || change === "") {
    return res.status(400).json({
      message: "change is required",
    });
  }

  if (typeof change !== "number") {
    return res.status(400).json({ message: "change must be number" });
  }

  if (change === 0) {
    return res.status(400).json("Change stock cant be 0");
  }

  if (!Number.isInteger(change)) {
    return res.status(400).json({
      message: "Change must be a whole number",
    });
  }
  next();
};

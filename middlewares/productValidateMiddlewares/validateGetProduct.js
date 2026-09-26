export const getProductValidation = (req, res, next) => {
  const {
    category,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 10,
    search,
  } = req.query;

  if (category && typeof category !== "string") {
    return res.status(400).json({
      message: "Category must be a string",
    });
  }
  if (minPrice !== undefined && isNaN(minPrice)) {
    return res.status(400).json({
      message: "Minimum price must be a number",
    });
  }
  if (maxPrice !== undefined && isNaN(maxPrice)) {
    return res.status(400).json({
      message: "Maximum price must be a number",
    });
  }
  if (page && (isNaN(page) || page < 1)) {
    return res.status(400).json({
      message: "Page must be a positive integer",
    });
  }
  if (
    (limit && (isNaN(limit) || limit < 1)) ||
    !Number.isInteger(Number(limit))
  ) {
    return res.status(400).json({
      message: "Limit must be a positive integer",
    });
  }

  if (sort && !["price", "-price", "name", "-name"].includes(sort)) {
    return res.status(400).json({
      message: "Sort must be one of 'price', '-price', 'name', '-name'",
    });
  }

  if (search && typeof search !== "string") {
    return res.status(400).json({
      message: "Search must be a string",
    });
  }
  next();
};

export const getProductValidation = (req, res, next) => {
  if (!req.query) {
    req.query = {};
  }

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
    return res.status(400).json({ message: "Category must be a string" });
  }

  const parsedMin = minPrice !== undefined ? Number(minPrice) : undefined;
  const parsedMax = maxPrice !== undefined ? Number(maxPrice) : undefined;

  if (minPrice !== undefined && (isNaN(parsedMin) || parsedMin < 0)) {
    return res.status(400).json({ message: "Minimum price must be a non-negative number" });
  }

  if (maxPrice !== undefined && (isNaN(parsedMax) || parsedMax < 0)) {
    return res.status(400).json({ message: "Maximum price must be a non-negative number" });
  }

  if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
    return res.status(400).json({ message: "Minimum price cannot be greater than maximum price" });
  }

  const parsedPage = Number(page);
  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return res.status(400).json({ message: "Page must be a positive integer" });
  }

  const parsedLimit = Number(limit);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    return res.status(400).json({ message: "Limit must be a positive integer" });
  }

  const validSorts = ["price", "-price", "name", "-name"];
  if (sort && !validSorts.includes(sort)) {
    return res.status(400).json({
      message: `Sort must be one of: ${validSorts.join(", ")}`,
    });
  }

  if (search && typeof search !== "string") {
    return res.status(400).json({ message: "Search must be a string" });
  }

  next();
};
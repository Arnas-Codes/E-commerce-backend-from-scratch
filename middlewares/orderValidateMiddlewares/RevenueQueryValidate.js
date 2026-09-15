export const validateRevenueQuery = (req, res, next) => {
  const { from, to } = req.query;

  if (from) {
    const fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ message: "Invalid from date" });
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      return res.status(400).json({
        message: "Invalid to date",
      });
    }
  }

  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      return res.status(400).json({
        message: "From date cannot be after to date",
      });
    }
  }
  next();
};

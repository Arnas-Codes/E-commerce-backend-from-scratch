const errorHandler = (err, req, res, next) => {
  console.log(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    message: statusCode === 500 ? "Internal Server Error" : err.message,
  });
};
export default errorHandler;

const uploadErrorMiddleware = (err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "File size exceeds the limit of 2MB",
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      message: "Only one file is allowed",
    });
  }

  if (err.message === "Only JPEG, PNG, and WebP images are allowed") {
    return res.status(400).json({
      message: err.message,
    });
  }

  next(err);
};

export default uploadErrorMiddleware;

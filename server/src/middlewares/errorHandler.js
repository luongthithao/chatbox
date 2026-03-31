const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error("Server error:", err);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Lỗi máy chủ nội bộ",
    details: err.details || null,
  });
};

export default errorHandler;

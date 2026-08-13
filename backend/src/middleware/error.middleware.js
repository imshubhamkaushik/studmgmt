export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  // Log unexpected server-side failures.
  // Expected 4xx responses do not need a stack trace.
  if (statusCode >= 500) {
    console.error(error);
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID.",
    });
  }

  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((item) => item.message);

    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? "Internal server error." : error.message,
  });
};

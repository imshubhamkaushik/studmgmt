export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  // Log unexpected server-side failures.
  // Expected 4xx responses do not need a stack trace.
  if (statusCode >= 500) {
    console.error(error);
  }

  // Handle invalid MongoDB resource ID errors
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID.",
    });
  }

  // Handle Mongoose validation errors
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((item) => item.message);

    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  // Handle duplicate key errors (MongoDB)
  if (error.code === 11000) {
    const keyPattern = error.keyPattern || {};
    const keyValue = error.keyValue || {};
    
    if (keyPattern.studentId) {
      return res.status(409).json({
        success: false,
        message: "Student ID already exists.",
      });
    }
    
    if (keyPattern.class && keyPattern.section && keyPattern.rollNo) {
      return res.status(409).json({ 
        success: false,
        message: `Roll number ${keyValue.rollNo} already exists for this class ${keyValue.class}, Section ${keyValue.section}.`
      });
    }
    return res
      .status(409)
      .json({
        success: false,
        message: "A record with this value already exists.",
      });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? "Internal server error." : error.message,
  });
};

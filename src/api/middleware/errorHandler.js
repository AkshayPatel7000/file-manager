require("dotenv").config({ quiet: true });
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Default error
  let error = {
    message: err.message || "Internal server error",
    status: err.status || 500,
  };

  // Telegram API errors
  if (err.errorMessage) {
    error.message = err.errorMessage;
    error.status = 400;
  }

  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    error.message = "File too large";
    error.status = 413;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token";
    error.status = 401;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    error.stack = err.stack;
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

module.exports = errorHandler;

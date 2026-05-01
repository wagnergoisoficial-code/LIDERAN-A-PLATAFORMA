const { AppError } = require('../errors/AppError');

// Global error handling middleware
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // Convert unknown errors to AppError
  if (!(err instanceof AppError)) {
    error = new AppError(
      err.message || 'Internal Server Error',
      err.statusCode || 500
    );
  }

  const response = {
    success: false,
    message: error.message,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;

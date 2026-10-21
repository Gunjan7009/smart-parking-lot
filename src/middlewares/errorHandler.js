function errorHandler(err, req, res, next) {
  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  res.status(statusCode).json({
    message: statusCode >= 500 ? "Internal server error" : err.message,
  });
}

module.exports = errorHandler;

const { AuthorizationError } = require('../errors/AppError');

// Role-based authorization middleware
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `This action requires one of these roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};

module.exports = roleMiddleware;

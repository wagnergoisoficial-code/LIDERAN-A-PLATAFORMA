const { AuthorizationError } = require('../errors/AppError');

// Role-based authorization middleware
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Usuário não autenticado'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          allowedRoles.includes('leader')
            ? 'Apenas líderes podem realizar esta ação'
            : 'Você não tem permissão para esta ação'
        )
      );
    }

    next();
  };
};

module.exports = roleMiddleware;

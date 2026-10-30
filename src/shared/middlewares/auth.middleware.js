const jwt = require('jsonwebtoken');
const config = require('../../config/environment');
const { getPrismaClient } = require('../../config/database');
const { AuthenticationError } = require('../errors/AppError');

// Authentication middleware
// O token só identifica o utilizador: comunidade e cargo são lidos da base de dados
// a cada pedido, para não ficarem desatualizados (ex.: líder que acabou de criar a comunidade).
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('Sessão não encontrada. Faça login novamente.');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await getPrismaClient().user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, churchId: true, profileImage: true },
    });

    if (!user) {
      throw new AuthenticationError('Sessão inválida. Faça login novamente.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Sessão expirada. Faça login novamente.'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Sessão inválida. Faça login novamente.'));
    } else {
      next(error);
    }
  }
};

module.exports = authMiddleware;

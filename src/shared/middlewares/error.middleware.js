const { Prisma } = require('@prisma/client');
const { AppError } = require('../errors/AppError');

// Converte erros conhecidos (Prisma, JSON inválido) em respostas claras
const normalizeError = (err) => {
  if (err instanceof AppError) return err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return new AppError('Registro não encontrado', 404);
    if (err.code === 'P2002') return new AppError('Este registro já existe', 409);
    if (err.code === 'P2003') return new AppError('Referência inválida', 400);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Dados inválidos', 400);
  }

  if (err.type === 'entity.parse.failed') {
    return new AppError('Corpo da requisição inválido', 400);
  }

  return new AppError(err.message || 'Erro interno do servidor', err.statusCode || 500);
};

// Global error handling middleware
const errorMiddleware = (err, req, res, next) => {
  const error = normalizeError(err);

  if (error.statusCode >= 500) {
    console.error(err);
  }

  const response = {
    success: false,
    message: error.message,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;

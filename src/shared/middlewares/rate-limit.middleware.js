const rateLimit = require('express-rate-limit');
const config = require('../../config/environment');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const tooMany = (message) => ({ success: false, message, statusCode: 429 });

// Limite geral por IP (proteção contra excesso de pedidos / abuso automatizado)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimit.apiPerMinute,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: tooMany('Muitos pedidos em pouco tempo. Aguarde um momento e tente novamente.'),
});

// Força bruta no login: conta só as tentativas falhadas, por IP...
const loginIpLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: config.rateLimit.loginAttempts * 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: tooMany('Muitas tentativas de login. Tente novamente em 15 minutos.'),
});

// ...e por conta, para travar ataques distribuídos contra o mesmo e-mail
const loginAccountLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: config.rateLimit.loginAttempts,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:${String(req.body?.email || '').trim().toLowerCase()}`,
  message: tooMany('Muitas tentativas de login para esta conta. Tente novamente em 15 minutos.'),
});

// Criação de contas por IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Muitas contas criadas a partir desta rede. Tente novamente mais tarde.'),
});

module.exports = { apiLimiter, loginIpLimiter, loginAccountLimiter, registerLimiter };

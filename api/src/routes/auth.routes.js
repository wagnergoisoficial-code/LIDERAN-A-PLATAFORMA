const express = require('express');
const registerRoute = require('./auth.register');
const registerMemberRoute = require('./auth.register-member');
const loginRoute = require('./auth.login');
const meRoute = require('./auth.me');
const { loginIpLimiter, loginAccountLimiter, registerLimiter } = require('../shared/middlewares/rate-limit.middleware');

// Auth Routes aggregator
const authRoutes = express.Router();

authRoutes.use('/register', registerLimiter, registerRoute);
authRoutes.use('/register-member', registerMemberRoute);
authRoutes.use('/login', loginIpLimiter, loginAccountLimiter, loginRoute);
authRoutes.use('/me', meRoute);

module.exports = authRoutes;

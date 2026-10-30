const express = require('express');
const registerRoute = require('./auth.register');
const registerMemberRoute = require('./auth.register-member');
const loginRoute = require('./auth.login');
const meRoute = require('./auth.me');

// Auth Routes aggregator
const authRoutes = express.Router();

authRoutes.use('/register', registerRoute);
authRoutes.use('/register-member', registerMemberRoute);
authRoutes.use('/login', loginRoute);
authRoutes.use('/me', meRoute);

module.exports = authRoutes;

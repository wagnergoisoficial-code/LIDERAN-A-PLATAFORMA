const express = require('express');
const registerRoute = require('./auth.register');
const registerMemberRoute = require('./auth.register-member');
const loginRoute = require('./auth.login');

// Auth Routes aggregator
const authRoutes = express.Router();

authRoutes.use('/register', registerRoute);
authRoutes.use('/register-member', registerMemberRoute);
authRoutes.use('/login', loginRoute);

module.exports = authRoutes;

const express = require('express');
const getAllUsersRoute = require('./user.get-all');
const createUserRoute = require('./user.create');
const getProfileRoute = require('./user.profile.get');
const updateProfileRoute = require('./user.profile.update');
const avatarRoute = require('./user.profile.avatar');
const socialLinksRoute = require('./user.social-links');
const achievementsRoute = require('./user.achievements');
const blockRoute = require('./user.block');

// User Routes aggregator
// Rotas fixas (/blocked, /profile, /social-links) vêm antes de /:id para não serem capturadas por ela.
const userRoutes = express.Router();

userRoutes.use('/', getAllUsersRoute);
userRoutes.use('/', createUserRoute);
userRoutes.use('/', blockRoute);
userRoutes.use('/', avatarRoute);
userRoutes.use('/', updateProfileRoute);
userRoutes.use('/', socialLinksRoute);
userRoutes.use('/', achievementsRoute);
userRoutes.use('/', getProfileRoute);

module.exports = userRoutes;

const express = require('express');
const getAllUsersRoute = require('./user.get-all');
const getUserByIdRoute = require('./user.get-by-id');
const createUserRoute = require('./user.create');
const getProfileRoute = require('./user.profile.get');
const updateProfileRoute = require('./user.profile.update');
const avatarRoute = require('./user.profile.avatar');
const socialLinksRoute = require('./user.social-links');
const achievementsRoute = require('./user.achievements');
const blockRoute = require('./user.block');

// User Routes aggregator
const userRoutes = express.Router();

userRoutes.use('/', getAllUsersRoute);
userRoutes.use('/', getUserByIdRoute);
userRoutes.use('/', createUserRoute);
userRoutes.use('/', getProfileRoute);
userRoutes.use('/', avatarRoute);
userRoutes.use('/', updateProfileRoute);
userRoutes.use('/', socialLinksRoute);
userRoutes.use('/', achievementsRoute);
userRoutes.use('/', blockRoute);

module.exports = userRoutes;

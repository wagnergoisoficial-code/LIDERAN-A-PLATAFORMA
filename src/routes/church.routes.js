const router = require('express').Router();
const ChurchController = require('../modules/church/controllers/ChurchController');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

// Create church (leaders only)
router.post('/', authMiddleware, roleMiddleware('leader', 'admin'), (req, res, next) => {
  ChurchController.createChurch(req, res, next);
});

// Get all churches of a leader
router.get('/leader/my-churches', authMiddleware, (req, res, next) => {
  ChurchController.getChurchesByLeader(req, res, next);
});

// Get specific church
router.get('/:churchId', authMiddleware, (req, res, next) => {
  ChurchController.getChurch(req, res, next);
});

// Update church
router.put('/:churchId', authMiddleware, (req, res, next) => {
  ChurchController.updateChurch(req, res, next);
});

// Delete church
router.delete('/:churchId', authMiddleware, (req, res, next) => {
  ChurchController.deleteChurch(req, res, next);
});

// Get church members
router.get('/:churchId/members', authMiddleware, (req, res, next) => {
  ChurchController.getChurchMembers(req, res, next);
});

// Add member to church
router.post('/:churchId/members', authMiddleware, (req, res, next) => {
  ChurchController.addMemberToChurch(req, res, next);
});

module.exports = router;

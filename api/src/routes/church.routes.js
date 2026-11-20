const router = require('express').Router();
const ChurchController = require('../modules/church/controllers/ChurchController');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');
const { uploadImageMiddleware } = require('../shared/middlewares/upload.middleware');

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

// Make a member a leader of the community, or remove the leadership (creator or admin only)
router.post('/:churchId/members/:memberId/role', authMiddleware, roleMiddleware('leader', 'admin'), (req, res, next) => {
  ChurchController.setMemberRole(req, res, next);
});

// Invite link: GET returns it, POST replaces it (the old link stops working)
router.get('/:churchId/invite', authMiddleware, roleMiddleware('leader', 'admin'), (req, res, next) => {
  ChurchController.getInvite(req, res, next);
});
router.post('/:churchId/invite', authMiddleware, roleMiddleware('leader', 'admin'), (req, res, next) => {
  ChurchController.getInvite(req, res, next);
});

// Set as the leader's active church
router.post('/:churchId/activate', authMiddleware, roleMiddleware('leader', 'admin'), (req, res, next) => {
  ChurchController.activateChurch(req, res, next);
});

// Get church members
router.get('/:churchId/members', authMiddleware, (req, res, next) => {
  ChurchController.getChurchMembers(req, res, next);
});

// Get member engagement stats
router.get('/:churchId/member-stats', authMiddleware, (req, res, next) => {
  ChurchController.getMemberStats(req, res, next);
});

// Add member to church
router.post('/:churchId/members', authMiddleware, (req, res, next) => {
  ChurchController.addMemberToChurch(req, res, next);
});

// Update member
router.put('/:churchId/members/:memberId', authMiddleware, (req, res, next) => {
  ChurchController.updateMember(req, res, next);
});

// Suspend, block or reactivate a member
router.post('/:churchId/members/:memberId/moderation', authMiddleware, roleMiddleware('leader', 'admin'), (req, res, next) => {
  ChurchController.moderateMember(req, res, next);
});

// Leader confirms the parents' authorization (optional photo of the signed form in "image")
router.post('/:churchId/members/:memberId/authorize', authMiddleware, roleMiddleware('leader', 'admin'), uploadImageMiddleware, (req, res, next) => {
  ChurchController.authorizeMinor(req, res, next);
});

// Link (or create) a guardian for a minor member
router.post('/:churchId/members/:memberId/guardians', authMiddleware, roleMiddleware('leader', 'admin'), (req, res, next) => {
  ChurchController.addGuardian(req, res, next);
});

// Remove member from church
router.delete('/:churchId/members/:memberId', authMiddleware, (req, res, next) => {
  ChurchController.removeMemberFromChurch(req, res, next);
});

module.exports = router;

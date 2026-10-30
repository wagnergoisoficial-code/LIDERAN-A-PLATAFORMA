const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/AppError');

const NO_CHURCH_MESSAGE =
  'Você ainda não faz parte de uma comunidade. Crie uma no Painel do Líder ou peça ao seu líder para adicioná-lo.';

const isAdmin = (user) => user?.role === 'admin';
const isLeaderOrAdmin = (user) => user?.role === 'leader' || user?.role === 'admin';

// Exige que o utilizador pertença a uma comunidade e devolve o seu churchId
const requireChurch = (user) => {
  if (!user?.churchId) throw new ValidationError(NO_CHURCH_MESSAGE);
  return user.churchId;
};

// Registos de outra comunidade comportam-se como inexistentes (admins têm acesso total)
const assertSameChurch = (user, entityChurchId, notFoundMessage = 'Registro não encontrado') => {
  if (isAdmin(user)) return;
  if (!entityChurchId || entityChurchId !== user?.churchId) {
    throw new NotFoundError(notFoundMessage);
  }
};

// Autor do registo, líder da comunidade ou admin
const assertOwnerOrLeader = (user, ownerId, message = 'Você não tem permissão para esta ação') => {
  if (ownerId === user?.id || isLeaderOrAdmin(user)) return;
  throw new ForbiddenError(message);
};

const assertLeader = (user, message = 'Apenas líderes podem realizar esta ação') => {
  if (!isLeaderOrAdmin(user)) throw new ForbiddenError(message);
};

// Gestão da comunidade: criador, líderes dessa comunidade ou admin
const canManageChurch = (user, church) =>
  isAdmin(user) ||
  church.leaderID === user?.id ||
  (user?.role === 'leader' && user?.churchId === church.id);

const canViewChurch = (user, church) => canManageChurch(user, church) || user?.churchId === church.id;

module.exports = {
  NO_CHURCH_MESSAGE,
  isAdmin,
  isLeaderOrAdmin,
  requireChurch,
  assertSameChurch,
  assertOwnerOrLeader,
  assertLeader,
  canManageChurch,
  canViewChurch,
};

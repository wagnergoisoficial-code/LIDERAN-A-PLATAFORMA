const { getPrismaClient } = require('../../config/database');
const { AccountRestrictedError } = require('../errors/AppError');

const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR');

// Garante que a conta pode ser usada. Suspensões vencidas são levantadas automaticamente.
const assertAccountActive = async (user) => {
  if (!user || user.status === 'active' || !user.status) return user;

  if (user.status === 'suspended') {
    if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
      await getPrismaClient().user.update({
        where: { id: user.id },
        data: { status: 'active', suspendedUntil: null, statusReason: null },
      });
      return { ...user, status: 'active', suspendedUntil: null, statusReason: null };
    }
    throw new AccountRestrictedError(
      user.suspendedUntil
        ? `Sua conta está suspensa até ${formatDate(user.suspendedUntil)}.`
        : 'Sua conta está suspensa.'
    );
  }

  if (user.status === 'blocked') {
    throw new AccountRestrictedError('Sua conta foi bloqueada pelo líder da comunidade.');
  }

  if (user.status === 'pending_authorization') {
    throw new AccountRestrictedError('Sua conta aguarda a autorização do seu responsável.');
  }

  return user;
};

module.exports = { assertAccountActive };

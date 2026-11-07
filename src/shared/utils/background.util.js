const { ValidationError } = require('../errors/AppError');

// Cores de fundo para textos curtos no feed (como os estados do WhatsApp).
// O frontend tem a mesma lista com os tons; "none" é o texto sem cor.
const BACKGROUNDS = ['azul', 'agua', 'verde', 'vinho', 'terracota', 'rosa', 'grafite', 'none'];

// Sem valor: null. Valor fora da lista: erro de validação.
const normalizeBackground = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (!BACKGROUNDS.includes(value)) throw new ValidationError('Cor de fundo inválida');
  return value;
};

module.exports = { BACKGROUNDS, normalizeBackground };

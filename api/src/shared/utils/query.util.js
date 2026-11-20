const config = require('../../config/environment');

// Pesquisa de texto: no PostgreSQL o "contains" distingue maiúsculas, por isso pede-se o modo insensível
const textContains = (term) => ({ contains: term, ...(config.database.isPostgres && { mode: 'insensitive' }) });

// Limite de itens por página a partir da query (?limit=)
const pageSize = (value, fallback = 20, max = 50) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

module.exports = { textContains, pageSize };

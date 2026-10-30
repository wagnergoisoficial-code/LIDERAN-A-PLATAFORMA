const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Aceita "https://site.com" ou só "site.com" (a Render fornece domínios sem protocolo)
const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .map((origin) => (/^https?:\/\//.test(origin) ? origin : `https://${origin}`));

const DEV_JWT_SECRET = 'dev-secret-key';

const config = {
  app: {
    port: process.env.PORT || 3000,
    nodeEnv,
    // Em desenvolvimento qualquer origem é aceite; em produção só as listadas em CORS_ORIGIN
    corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
    // URL pública da API (usada nos links das imagens). A Render define RENDER_EXTERNAL_URL.
    publicUrl: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, ''),
    // Atrás do proxy da Render/DigitalOcean o IP real chega em X-Forwarded-For
    trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : isProduction ? 1 : 0,
  },

  database: {
    url: process.env.DATABASE_URL,
    isPostgres: /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || ''),
  },

  jwt: {
    secret: process.env.JWT_SECRET || (isProduction ? '' : DEV_JWT_SECRET),
    expiration: process.env.JWT_EXPIRATION || '7d',
  },

  file: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },

  rateLimit: {
    // Pedidos por minuto e por IP em toda a API
    apiPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '600', 10),
    // Tentativas de login falhadas por 15 minutos (por IP e por e-mail)
    loginAttempts: parseInt(process.env.LOGIN_ATTEMPTS || '10', 10),
  },

  admin: {
    // Cria o primeiro administrador no arranque, se ainda não existir
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Administrador',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },

  isDevelopment: () => nodeEnv === 'development',
  isProduction: () => isProduction,
  isTest: () => nodeEnv === 'test',
};

// Falha cedo (antes de aceitar pedidos) se a produção estiver mal configurada
config.validateForProduction = () => {
  if (!isProduction) return [];

  const errors = [];
  const warnings = [];

  if (!config.database.url) errors.push('DATABASE_URL não está definida');

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET não está definida (sem ela, qualquer pessoa poderia forjar logins)');
  } else if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === DEV_JWT_SECRET) {
    errors.push('JWT_SECRET é fraca: use pelo menos 32 caracteres aleatórios');
  }

  if (!config.app.corsOrigins.length) {
    warnings.push('CORS_ORIGIN não está definida: nenhum site poderá usar a API pelo navegador');
  }

  if (!config.app.publicUrl) {
    warnings.push('PUBLIC_URL não está definida: os links das imagens usarão o endereço do pedido');
  }

  if (config.admin.email && (!config.admin.password || config.admin.password.length < 12)) {
    errors.push('ADMIN_PASSWORD deve ter pelo menos 12 caracteres');
  }

  if (errors.length) {
    const error = new Error(`Configuração de produção inválida:\n- ${errors.join('\n- ')}`);
    error.configErrors = errors;
    throw error;
  }

  return warnings;
};

module.exports = config;

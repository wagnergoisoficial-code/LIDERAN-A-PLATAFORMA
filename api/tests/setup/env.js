// Ambiente dos testes: base de dados temporária e chave própria (nunca a de desenvolvimento)
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-que-nao-e-a-chave-de-desenvolvimento-0123456789';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || `file:${path.join(os.tmpdir(), 'lidera-jest.db')}`;
process.env.CORS_ORIGIN = 'https://app.lidera.test';
process.env.PUBLIC_URL = 'https://api.lidera.test';

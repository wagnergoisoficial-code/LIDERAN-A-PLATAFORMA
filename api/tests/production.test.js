// Configuração de produção: a API não arranca sem segredos fortes e não revela detalhes internos.
const { execSync } = require('child_process');
const path = require('path');

const withEnv = (env, fn) => {
  const backup = { ...process.env };
  Object.entries(env).forEach(([key, value]) => {
    // Vazio (e não apagado) para o dotenv não voltar a preencher a partir do .env local
    process.env[key] = value === undefined ? '' : value;
  });
  try {
    let result;
    jest.isolateModules(() => { result = fn(); });
    return result;
  } finally {
    process.env = backup;
  }
};

const loadConfig = () => require('../src/config/environment');

const STRONG_SECRET = 'x'.repeat(48);
const PROD = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@db:5432/lidera' };

describe('validação da configuração de produção', () => {
  test('falha sem JWT_SECRET', () => {
    withEnv({ ...PROD, JWT_SECRET: undefined }, () => {
      expect(() => loadConfig().validateForProduction()).toThrow(/JWT_SECRET/);
    });
  });

  test('falha com a chave de desenvolvimento ou curta', () => {
    for (const secret of ['dev-secret-key', 'curta-demais']) {
      withEnv({ ...PROD, JWT_SECRET: secret }, () => {
        expect(() => loadConfig().validateForProduction()).toThrow(/JWT_SECRET é fraca/);
      });
    }
  });

  test('falha sem DATABASE_URL e com senha de admin fraca', () => {
    withEnv({ ...PROD, DATABASE_URL: undefined, JWT_SECRET: STRONG_SECRET, ADMIN_EMAIL: 'a@a.com', ADMIN_PASSWORD: '123' }, () => {
      expect(() => loadConfig().validateForProduction()).toThrow(/DATABASE_URL[\s\S]*ADMIN_PASSWORD/);
    });
  });

  test('arranca com configuração válida (avisando o que falta)', () => {
    withEnv({ ...PROD, JWT_SECRET: STRONG_SECRET, CORS_ORIGIN: undefined, PUBLIC_URL: undefined, RENDER_EXTERNAL_URL: undefined }, () => {
      const warnings = loadConfig().validateForProduction();
      expect(warnings.join(' ')).toMatch(/CORS_ORIGIN/);
    });
  });

  test('aceita domínios sem protocolo em CORS_ORIGIN e confia no proxy', () => {
    withEnv({ ...PROD, JWT_SECRET: STRONG_SECRET, CORS_ORIGIN: 'lidera.onrender.com, https://www.lidera.app/' }, () => {
      const config = loadConfig();
      expect(config.app.corsOrigins).toEqual(['https://lidera.onrender.com', 'https://www.lidera.app']);
      expect(config.app.trustProxy).toBe(1);
      expect(config.database.isPostgres).toBe(true);
    });
  });
});

describe('erros em produção', () => {
  const run = (error) =>
    withEnv({ NODE_ENV: 'production' }, () => {
      const errorMiddleware = require('../src/shared/middlewares/error.middleware');
      const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      const log = jest.spyOn(console, 'error').mockImplementation(() => {});
      errorMiddleware(error, {}, res, () => {});
      log.mockRestore();
      return res;
    });

  test('erros inesperados não revelam detalhes nem stack', () => {
    const res = run(new Error('detalhe interno: falha na tabela users em /srv/app'));
    expect(res.code).toBe(500);
    expect(res.body.message).toBe('Erro interno do servidor');
    expect(res.body.stack).toBeUndefined();
  });

  test('erros esperados mantêm a mensagem para o utilizador', () => {
    const { ValidationError } = require('../src/shared/errors/AppError');
    const res = run(new ValidationError('Informe o e-mail'));
    expect(res.code).toBe(400);
    expect(res.body.message).toBe('Informe o e-mail');
  });
});

test('schema do PostgreSQL está sincronizado com o schema principal', () => {
  expect(() =>
    execSync('node scripts/prisma-postgres.js --check', { cwd: path.join(__dirname, '..'), stdio: 'pipe' })
  ).not.toThrow();
});

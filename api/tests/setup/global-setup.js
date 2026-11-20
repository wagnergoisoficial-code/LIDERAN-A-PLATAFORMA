// Prepara uma base de dados limpa antes dos testes.
// SQLite (padrão): ficheiro temporário. PostgreSQL: TEST_DATABASE_URL=postgresql://... (aplica as migrações reais).
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async () => {
  const root = path.join(__dirname, '..', '..');
  const url = process.env.TEST_DATABASE_URL;
  const run = (cmd, databaseUrl) =>
    execSync(cmd, { cwd: root, stdio: 'pipe', env: { ...process.env, DATABASE_URL: databaseUrl } });

  if (url && /^postgres/.test(url)) {
    run('npx prisma migrate reset --force --skip-seed --skip-generate --schema prisma/postgres/schema.prisma', url);
    return;
  }

  const file = path.join(os.tmpdir(), 'lidera-jest.db');
  fs.rmSync(file, { force: true });
  run('npx prisma db push --skip-generate --accept-data-loss --schema prisma/schema.prisma', `file:${file}`);
};

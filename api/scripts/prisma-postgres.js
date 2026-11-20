// Gera prisma/postgres/schema.prisma a partir de prisma/schema.prisma.
// Localmente usa-se SQLite; em produção, PostgreSQL. Os modelos são sempre os mesmos.
//   node scripts/prisma-postgres.js          → (re)gera o ficheiro
//   node scripts/prisma-postgres.js --check  → falha se o ficheiro gerado estiver desatualizado
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourceFile = path.join(root, 'prisma', 'schema.prisma');
const targetFile = path.join(root, 'prisma', 'postgres', 'schema.prisma');

const source = fs.readFileSync(sourceFile, 'utf8');
const converted = source.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
if (converted === source) {
  throw new Error('provider "sqlite" não encontrado em prisma/schema.prisma');
}

const output = `// GERADO por scripts/prisma-postgres.js a partir de prisma/schema.prisma — não editar à mão.\n${converted}`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf8') : '';
  if (current !== output) {
    console.error('prisma/postgres/schema.prisma está desatualizado. Rode: npm run prisma:postgres');
    process.exit(1);
  }
  console.log('prisma/postgres/schema.prisma está atualizado');
} else {
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, output);
  console.log('Gerado prisma/postgres/schema.prisma');
}

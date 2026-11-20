// Uma vez, na passagem para o projeto único (site e API no mesmo endereço): os endereços das imagens
// enviadas perdem o domínio da API antiga (https://lidera-api.onrender.com/uploads/x → /uploads/x).
// Só mexe nos domínios indicados; pode correr-se mais do que uma vez.
// Uso: node api/scripts/uploads-relativos.js [domínio ...]   (por omissão: lidera-api.onrender.com)
const { getPrismaClient, disconnectPrisma } = require('../src/config/database');

const hosts = process.argv.slice(2).length ? process.argv.slice(2) : ['lidera-api.onrender.com'];
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Qualquer ficheiro em /uploads/ desses domínios (os antigos, guardados em disco, podem ter espaços no nome)
const ABSOLUTE = new RegExp(`^https?://(?:${hosts.map(escape).join('|')})(/uploads/[^?#]+)$`);

const FIELDS = [
  ['church', 'imageUrl'],
  ['user', 'profileImage'],
  ['post', 'imageUrl'],
  ['event', 'imageUrl'],
  ['guardianship', 'proofUrl'],
];

const relative = (value) => ABSOLUTE.exec(value || '')?.[1] || null;

const run = async () => {
  const prisma = getPrismaClient();
  let total = 0;

  for (const [model, field] of FIELDS) {
    const rows = await prisma[model].findMany({ where: { [field]: { contains: '/uploads/' } }, select: { id: true, [field]: true } });
    for (const row of rows) {
      const path = relative(row[field]);
      if (!path) continue;
      await prisma[model].update({ where: { id: row.id }, data: { [field]: path } });
      total += 1;
    }
  }

  // Doações (JSON): as imagens dos QR Codes. Uma configuração ilegível fica como está e é avisada.
  const churches = await prisma.church.findMany({ where: { donationConfig: { contains: '/uploads/' } }, select: { id: true, donationConfig: true } });
  for (const church of churches) {
    let config;
    try {
      config = JSON.parse(church.donationConfig);
    } catch {
      console.warn(`Doações da comunidade ${church.id}: configuração ilegível, ficou como estava`);
      continue;
    }
    const methods = (config.methods || []).map((m) => (relative(m.qrUrl) ? { ...m, qrUrl: relative(m.qrUrl) } : m));
    if (JSON.stringify(methods) === JSON.stringify(config.methods)) continue;
    await prisma.church.update({ where: { id: church.id }, data: { donationConfig: JSON.stringify({ ...config, methods }) } });
    total += 1;
  }

  console.log(`Endereços de imagens passados a relativos (${hosts.join(', ')}): ${total}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);

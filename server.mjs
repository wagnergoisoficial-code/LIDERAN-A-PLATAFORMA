// Um só servidor para a Fourux: a API de sempre (Express, em api/) responde em /api, /uploads,
// /health e /api-docs; tudo o resto são as páginas, servidas pelo Next.js.
import { createRequire } from 'node:module';
import next from 'next';

const require = createRequire(import.meta.url);
const Server = require('./api/src/server.js');

// npm start fixa NODE_ENV=production e npm run dev fixa development: o modo nunca depende de alguém se lembrar
const dev = process.env.NODE_ENV !== 'production';
const pages = next({ dev, dir: import.meta.dirname });
await pages.prepare();
await new Server().start({ pages: pages.getRequestHandler(), onShutdown: () => pages.close() });

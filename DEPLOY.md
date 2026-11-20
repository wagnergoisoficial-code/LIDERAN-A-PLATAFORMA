# Lidera: desenvolvimento e deploy (projeto único)

O site e a API são um só projeto Next.js. O `server.mjs` arranca um só servidor:

- `/api`, `/uploads`, `/health` e `/api-docs` → a API (Express, em `api/`);
- tudo o resto → as páginas (React, em `web/src`, entregues pelo Next.js).

## No computador

```bash
npm install
cp .env.example .env            # e preencha JWT_SECRET
npm run prisma:generate         # cliente do Prisma para SQLite
npm run prisma:migrate          # cria api/prisma/prisma/dev.db (ou copie um dev.db existente para lá)
npm run dev                     # http://localhost:3000 (páginas e API)
npm test                        # testes da API
```

## Render: passar dos dois serviços (lidera-api + lidera-web) para um (lidera)

Nada se perde: a base de dados é a mesma.

1. **Base de dados.** Em `lidera-db`, mude para um plano pago antes de 29/11/2026: a gratuita expira e é apagada 14 dias depois.
2. **Novo serviço.** Crie um *Web Service* (Node, região Frankfurt, plano Starter) a partir deste repositório:
   - Build: `npm ci && npm run build`
   - Start: `npm start`
   - Health check: `/health`
3. **Variáveis do novo serviço:**
   - `NODE_ENV=production` e `TRUST_PROXY=3`;
   - `DATABASE_URL`: a ligação interna da `lidera-db`, a mesma da `lidera-api`;
   - `JWT_SECRET`: **o mesmo valor da `lidera-api`**, para ninguém perder a sessão;
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD`, se forem usados.

   `CORS_ORIGIN`, `PUBLIC_URL` e `VITE_API_URL` deixam de ser precisos.
4. **Teste no endereço novo:** login, feed, Bíblia, mensagens, painel e doações. As fotos antigas continuam a vir da `lidera-api`, que ainda está ligada.
5. **Troca.** Suspenda a `lidera-web` e a `lidera-api`. Logo a seguir, corra uma vez no *Shell* do serviço novo:
   ```bash
   node api/scripts/uploads-relativos.js
   ```
   Os endereços das fotos já enviadas deixam de apontar para a `lidera-api` e passam a `/uploads/…`, servidos pelo serviço novo. Só mexe nesse domínio e pode correr mais do que uma vez. Confirme as fotos antigas no endereço novo.
6. **Limpeza.** Apague a `lidera-web` e a `lidera-api` uns dias depois, quando tudo estiver bem.

O `render.yaml` serve para uma instalação nova do zero (cria a base de dados e o serviço).

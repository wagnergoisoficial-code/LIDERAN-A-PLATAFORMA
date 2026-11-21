# Lidera: desenvolvimento e deploy

Um só projeto Next.js. O `server.mjs` arranca um só servidor:

- `/api`, `/uploads`, `/health` e `/api-docs` → a API (Express, em `api/`);
- tudo o resto → as páginas (React, em `web/src`, entregues pelo Next.js).

## No computador

```bash
npm install
cp .env.example .env            # e preencha JWT_SECRET
npm run prisma:generate         # cliente do Prisma para SQLite
npm run prisma:migrate          # cria api/prisma/prisma/dev.db
npm run dev                     # http://localhost:3000 (páginas e API)
npm test                        # testes da API
```

## DigitalOcean (App Platform)

1. **Base de dados.** Em *Databases*, crie um PostgreSQL gerido, na mesma região da app.
2. **App.** Em *Apps → Create App*, escolha o GitHub, este repositório e o ramo `main`. Configure:
   - Tipo: *Web Service* (Node.js)
   - Build command: `npm run build`
   - Run command: `npm start` (aplica as migrações e arranca em modo de produção)
   - HTTP port: `8080`. A DigitalOcean passa-a na variável `PORT`, e o servidor usa-a.
   - Health check: HTTP, caminho `/health`
   - Tamanho: 1 GB de memória ou mais (Next.js, API e tratamento de imagens)

   A app `lidera` (Nova Iorque, base `lidera-db`) foi criada a 21/11/2026 a partir do endereço público do repositório, sem ligar o GitHub. Por isso não há deploy automático: depois de um push, faça-o no painel (*Actions → Force Rebuild and Deploy*).
3. **Variáveis de ambiente da app:**
   - `DATABASE_URL`: ligue a base de dados à app, e a variável fica `${nome-da-base.DATABASE_URL}&connection_limit=10`. A base de 1 GB aceita poucas ligações, e durante um deploy há duas instâncias da app ligadas ao mesmo tempo.
   - `JWT_SECRET`: 48 ou mais caracteres aleatórios, cifrada. Se for o mesmo valor da Render, ninguém perde a sessão na mudança.
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD`: opcionais, cifradas. Criam o primeiro administrador.
   - `TRUST_PROXY`: `2`, o número de proxies à frente da app. Foi testado a 21/11/2026: com 1, a API lia o IP de um proxy, e todos partilhavam os limites de pedidos e de login; com 3, um `X-Forwarded-For` falso enganava o limite. Na Render eram 3.

   O `npm start` já fixa `NODE_ENV=production`. `CORS_ORIGIN`, `PUBLIC_URL` e `VITE_API_URL` deixam de ser precisos.
4. **Dados atuais (Render → DigitalOcean), antes de 29/11/2026:**
   - copie a base `lidera-db` da Render com `pg_dump`, ativando o acesso externo só durante a cópia;
   - restaure-a na base nova;
   - depois corra uma vez, na consola da app, `node api/scripts/uploads-relativos.js`. As fotos já enviadas deixam de apontar para a `lidera-api` antiga e passam a `/uploads/…`. Pode correr mais do que uma vez.
5. **Troca.** Teste o endereço da DigitalOcean: login, feed (fotos antigas incluídas), Bíblia, mensagens, painel e doações. Depois aponte o domínio para lá e desligue os serviços da Render.

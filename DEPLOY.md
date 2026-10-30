# Deploy em produção

A API usa **SQLite** no seu computador e **PostgreSQL** em produção. Os modelos são os mesmos: `prisma/postgres/schema.prisma` é gerado a partir de `prisma/schema.prisma` (`npm run prisma:postgres`).

## Render (Blueprint)

O ficheiro `render.yaml` cria três coisas, na região de Frankfurt:

| Recurso | O que é |
|---|---|
| `lidera-db` | Base de dados PostgreSQL, acessível só pela rede privada da Render |
| `lidera-api` | Esta API |
| `lidera-web` | O site, a partir do repositório `LIDERAN-A-PLATAFORMA` |

1. Faça `git push` deste repositório e do repositório do frontend.
2. No painel da Render, crie um Blueprint: **New → Blueprint**, e escolha o repositório `Plataforma-Helo`. Autorize a Render a ler os **dois** repositórios no GitHub.
3. A Render pede os valores marcados `sync: false`:
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD`: o primeiro administrador, criado no arranque. A senha precisa de 12 ou mais caracteres.
   - `CORS_ORIGIN` e `VITE_API_URL`: pode deixá-los vazios por agora (ver o passo 4).
4. Depois do primeiro deploy, copie os endereços reais dos serviços e:
   - em `lidera-api`, defina `CORS_ORIGIN` com o endereço do site, por exemplo `https://lidera-web.onrender.com`;
   - em `lidera-web`, defina `VITE_API_URL` com o endereço da API acabado em `/api`, por exemplo `https://lidera-api.onrender.com/api`. Depois faça **Manual Deploy → Clear build cache & deploy**.
5. Abra o site e entre com o `ADMIN_EMAIL`.

A `JWT_SECRET` é gerada pela Render. A API **recusa arrancar** sem ela, sem `DATABASE_URL`, ou com uma senha de administrador fraca.

**Planos:**
- **Free:** serve para testar. Tem dois limites:
  - a base de dados expira ao fim de 30 dias;
  - a API adormece após 15 minutos sem uso, e o primeiro pedido seguinte demora cerca de 1 minuto.
- **Pagos:** use-os para produção real. Troque o plano no painel.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NODE_ENV` | sim | `production` |
| `DATABASE_URL` | sim | Ligação PostgreSQL |
| `JWT_SECRET` | sim | 32 ou mais caracteres aleatórios. Gere com: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `CORS_ORIGIN` | recomendada | Sites autorizados, separados por vírgula. O `https://` é opcional |
| `PUBLIC_URL` | não | Endereço público da API, usado nos links das imagens. Na Render vem de `RENDER_EXTERNAL_URL` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | não | Cria o primeiro administrador, se ainda não existir |
| `RATE_LIMIT_PER_MINUTE` | não | Pedidos por minuto e por IP. Padrão: 600 |
| `LOGIN_ATTEMPTS` | não | Tentativas de login falhadas por conta, em 15 minutos. Padrão: 10 |

## DigitalOcean

- **App Platform:** use o `Dockerfile`, que faz o build e aplica as migrações no arranque. A base de dados deve ser um PostgreSQL gerido. Configure as mesmas variáveis de ambiente.
- **Droplet:**
  1. Compile a imagem com `docker build -t lidera-api .`.
  2. Corra-a com as variáveis de ambiente.
  3. Ponha à frente um proxy com HTTPS, como Caddy ou Nginx com Let's Encrypt.
  4. Defina `TRUST_PROXY=1`.

## O que já está protegido

- **Logins:**
  - tokens assinados com uma chave forte;
  - utilizador e cargo lidos da base de dados em cada pedido;
  - tokens forjados são rejeitados.
- **Tentativas e pedidos:**
  - login com limite de tentativas falhadas, por IP e por conta;
  - limite geral de pedidos por IP.
- **Pedidos:**
  - cabeçalhos de segurança (Helmet);
  - CORS só para os sites configurados;
  - corpos de pedido limitados a 100 KB.
- **Uploads:**
  - o tipo é validado pelos bytes reais do ficheiro;
  - as imagens são reprocessadas para WebP, sem metadados;
  - são guardadas na base de dados e servidas sem permitir que corram scripts.
- **SQL:** é sempre parametrizado (Prisma), e as tentativas de injeção são testadas.
- **Erros:** em produção não revelam detalhes internos.

## Testes

```bash
npm test                                                                  # SQLite temporário
TEST_DATABASE_URL=postgresql://user@localhost:5432/lidera_test npm test   # PostgreSQL (aplica as migrações reais)
```

Os testes usam sempre uma base de dados temporária. Nunca tocam em `prisma/prisma/dev.db`.

## Alterar o schema da base de dados

1. Edite `prisma/schema.prisma` e crie a migração local com `npx prisma migrate dev --name descricao`.
2. Atualize o schema de produção com `npm run prisma:postgres`.
3. Crie a migração de produção. É preciso um PostgreSQL local, usado como base sombra:
   ```bash
   mkdir prisma/postgres/migrations/AAAAMMDDHHMMSS_descricao
   npx prisma migrate diff \
     --from-migrations prisma/postgres/migrations \
     --to-schema-datamodel prisma/postgres/schema.prisma \
     --shadow-database-url postgresql://user@localhost:5432/lidera_shadow \
     --script > prisma/postgres/migrations/AAAAMMDDHHMMSS_descricao/migration.sql
   ```
   O deploy aplica-a sozinho (`npm run start:prod`).

## Ainda por fazer (próxima fase)

- **Testes de carga e de stress.**
- **Proteção contra DDoS de volume:** por exemplo, Cloudflare à frente do site e da API.
- **Partilhar os limites de pedidos entre instâncias, com Redis:** só é preciso se usar mais de uma instância.
- **Backups e monitorização.**
- **Política de segurança de conteúdo (CSP) no site.**

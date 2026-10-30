# Imagem de produção (DigitalOcean App Platform, Droplet ou qualquer servidor com Docker)
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dependências de produção (o Prisma faz parte delas)
COPY package*.json ./
RUN npm ci --omit=dev

# Código e schema; gera o cliente Prisma para PostgreSQL
COPY src ./src
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm run build

# Corre sem privilégios de root
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Aplica as migrações pendentes e arranca a API
CMD ["npm", "run", "start:prod"]

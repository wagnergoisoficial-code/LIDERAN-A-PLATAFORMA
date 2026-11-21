# Fourux

A rede social da juventude da igreja: feed, chat, mensagens, Bíblia com áudio, agenda, doações e os painéis da liderança, da secretaria, da tesouraria e da regência.

Um só projeto **Next.js 16**:

| Pasta | O que tem |
|---|---|
| `app/` | Entrada do Next.js (layout e a rota que carrega as páginas) |
| `web/src/` | As páginas e componentes React (React Router) |
| `api/` | A API (Express + Prisma), os testes e as migrações |
| `public/` | Ficheiros estáticos (o texto da Bíblia Livre) |
| `server.mjs` | O servidor único: `/api` → API, o resto → Next.js |

Comandos e deploy: ver [DEPLOY.md](DEPLOY.md).

// Cor de fundo dos textos curtos no feed (como os estados do WhatsApp): só cores da lista
const App = require('../../src/app');
const { getPrismaClient, disconnectPrisma } = require('../../src/config/database');

const stamp = Date.now();
let server;
let BASE;

const call = async (method, path, token, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, ...json };
};

const s = {};

beforeAll(async () => {
  server = new App().getApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  BASE = `http://127.0.0.1:${server.address().port}/api`;

  const leader = await call('POST', '/auth/register', null, {
    name: 'Líder das Cores', email: `cores${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
  });
  await getPrismaClient().user.update({ where: { id: leader.data.user.id }, data: { leaderVerifiedAt: new Date() } });
  const church = await call('POST', '/churches', leader.data.token, { name: 'Comunidade das Cores' });
  s.token = church.session.token;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectPrisma();
});

describe('cor de fundo', () => {
  test('a publicação de texto guarda a cor escolhida e o feed devolve-a', async () => {
    const post = await call('POST', '/posts', s.token, { content: 'Deus é fiel!', background: 'vinho' });
    expect(post.status).toBe(201);
    expect(post.data.background).toBe('vinho');
    const feed = (await call('GET', '/posts', s.token)).data;
    expect(feed.find((p) => p.id === post.data.id).background).toBe('vinho');
  });

  test('sem cor escolhida fica null; "none" fica guardado', async () => {
    expect((await call('POST', '/posts', s.token, { content: 'Texto sem cor' })).data.background).toBeNull();
    expect((await call('POST', '/posts', s.token, { content: 'Texto simples', background: 'none' })).data.background).toBe('none');
  });

  test('só aceita cores da lista', async () => {
    expect((await call('POST', '/posts', s.token, { content: 'Olá', background: 'amarelo' })).status).toBe(400);
    expect((await call('POST', '/posts', s.token, { content: 'Olá', background: '#ff0000' })).status).toBe(400);
  });

  test('a doação não leva cor', async () => {
    const donation = await call('POST', '/posts', s.token, { type: 'donation', content: 'Cadeiras', location: 'Matola', background: 'azul' });
    expect(donation.status).toBe(201);
    expect(donation.data.background).toBeNull();
  });

  test('o pedido de oração guarda a cor e recusa cores fora da lista', async () => {
    const prayer = await call('POST', '/prayers', s.token, { title: 'Exames', content: 'Orem pelos meus exames', background: 'agua' });
    expect(prayer.status).toBe(201);
    expect(prayer.data.background).toBe('agua');
    const list = (await call('GET', '/prayers', s.token)).data;
    expect(list.find((p) => p.id === prayer.data.id).background).toBe('agua');
    expect((await call('POST', '/prayers', s.token, { title: 'Exames', content: 'Orem por mim', background: 'dourado' })).status).toBe(400);
  });
});

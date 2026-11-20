// Vídeos: o membro envia, o líder da comunidade dele aprova, e o aprovado aparece para todas as comunidades
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

const login = async (email) => (await call('POST', '/auth/login', null, { email, password: 'Senha1234' })).data.token;
const s = {};

async function community(key, name) {
  const leader = await call('POST', '/auth/register', null, {
    name: `Líder ${key}`, email: `vl${key}${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
  });
  await getPrismaClient().user.update({ where: { id: leader.data.user.id }, data: { leaderVerifiedAt: new Date() } });
  const church = await call('POST', '/churches', leader.data.token, { name });
  await call('POST', '/auth/register-member', church.session.token, {
    name: `Membro ${key}`, email: `vm${key}${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
    birthDate: '1995-03-10', churchId: church.data.id,
  });
  return { leader: church.session.token, church: church.data.id, member: await login(`vm${key}${stamp}@t.com`) };
}

beforeAll(async () => {
  server = new App().getApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  BASE = `http://127.0.0.1:${server.address().port}/api`;
  s.a = await community('a', 'Comunidade dos Hinos');
  s.b = await community('b', 'Comunidade de Longe');
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectPrisma();
});

const approvedIn = async (token) => (await call('GET', '/videos', token)).data.videos.map((v) => v.id);

describe('vídeos', () => {
  test('só aceita links do YouTube, com título e tipo', async () => {
    expect((await call('POST', '/videos', s.a.member, { url: 'https://vimeo.com/1234', title: 'Hino', category: 'hino' })).status).toBe(400);
    expect((await call('POST', '/videos', s.a.member, { url: 'https://youtu.be/aaaaaaaaaaa', title: 'Hi', category: 'hino' })).status).toBe(400);
    expect((await call('POST', '/videos', s.a.member, { url: 'https://youtu.be/aaaaaaaaaaa', title: 'Hino da manhã', category: 'filme' })).status).toBe(400);
  });

  test('o vídeo do membro espera pelo líder e não aparece a ninguém antes disso', async () => {
    const sent = await call('POST', '/videos', s.a.member, {
      url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa&t=5s', title: 'Hino da manhã', category: 'hino', description: 'Coro de jovens',
    });
    expect(sent.status).toBe(201);
    expect(sent.data).toMatchObject({ status: 'pending', sourceId: 'aaaaaaaaaaa' });
    s.video = sent.data.id;

    expect((await call('POST', '/videos', s.a.member, { url: 'https://youtu.be/aaaaaaaaaaa', title: 'Outra vez', category: 'hino' })).status).toBe(409);
    expect(await approvedIn(s.b.member)).not.toContain(s.video);

    const leaderA = (await call('GET', '/videos', s.a.leader)).data;
    expect(leaderA.waiting.map((v) => v.id)).toContain(s.video);
    expect((await call('GET', '/videos', s.b.leader)).data.waiting.map((v) => v.id)).not.toContain(s.video);
    expect((await call('GET', '/videos', s.a.member)).data.waiting[0]).toMatchObject({ id: s.video, status: 'pending' });

    const notifications = await call('GET', '/notifications', s.a.leader);
    expect(notifications.data.notifications.some((n) => n.type === 'video_pending')).toBe(true);
  });

  test('só os líderes da comunidade de quem enviou decidem', async () => {
    expect((await call('PATCH', `/videos/${s.video}`, s.a.member, { status: 'approved' })).status).toBe(403);
    expect((await call('PATCH', `/videos/${s.video}`, s.b.leader, { status: 'approved' })).status).toBe(403);
  });

  test('aprovado, aparece para todas as comunidades e pode ser denunciado de qualquer uma', async () => {
    const approved = await call('PATCH', `/videos/${s.video}`, s.a.leader, { status: 'approved' });
    expect(approved.data.status).toBe('approved');
    const seen = (await call('GET', '/videos', s.b.member)).data.videos.find((v) => v.id === s.video);
    expect(seen).toMatchObject({ title: 'Hino da manhã', church: { name: 'Comunidade dos Hinos' } });

    const notifications = await call('GET', '/notifications', s.a.member);
    expect(notifications.data.notifications.some((n) => n.type === 'video_approved')).toBe(true);

    const report = await call('POST', '/reports', s.b.member, { targetType: 'video', targetId: s.video });
    expect(report.status).toBe(201);
    const detail = await call('GET', `/reports/${report.data.id}`, s.a.leader);
    expect(detail.data.snapshot.video).toMatchObject({ title: 'Hino da manhã', sourceId: 'aaaaaaaaaaa' });
  });

  test('o vídeo do líder entra logo; a recusa leva motivo ao autor', async () => {
    const own = await call('POST', '/videos', s.b.leader, { url: 'https://youtu.be/bbbbbbbbbbb', title: 'Pregação de domingo', category: 'pregacao' });
    expect(own.data.status).toBe('approved');
    expect(await approvedIn(s.a.member)).toContain(own.data.id);

    const second = await call('POST', '/videos', s.a.member, { url: 'https://youtu.be/ccccccccccc', title: 'Vídeo do ensaio', category: 'membro' });
    await call('PATCH', `/videos/${second.data.id}`, s.a.leader, { status: 'rejected', reason: 'Som muito baixo' });
    const mine = (await call('GET', '/videos', s.a.member)).data.waiting.find((v) => v.id === second.data.id);
    expect(mine).toMatchObject({ status: 'rejected', reason: 'Som muito baixo' });
  });

  test('apagar: o autor ou os líderes da comunidade dele', async () => {
    expect((await call('DELETE', `/videos/${s.video}`, s.b.member)).status).toBe(403);
    expect((await call('DELETE', `/videos/${s.video}`, s.a.member)).status).toBe(200);
    expect(await approvedIn(s.b.member)).not.toContain(s.video);
  });
});

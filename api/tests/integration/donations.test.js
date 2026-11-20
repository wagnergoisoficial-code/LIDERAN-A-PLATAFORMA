// Doações: aparecem no feed de todas as comunidades; fora da comunidade de quem doa só se vê e denuncia
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
const birthYears = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

const s = {};

// Líder verificado com a sua comunidade e um membro adulto
async function community(key, name) {
  const leader = await call('POST', '/auth/register', null, {
    name: `Líder ${key}`, email: `ld${key}${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
  });
  await getPrismaClient().user.update({ where: { id: leader.data.user.id }, data: { leaderVerifiedAt: new Date() } });
  const church = await call('POST', '/churches', leader.data.token, { name });
  const member = await call('POST', '/auth/register-member', church.session.token, {
    name: `Membro ${key}`, email: `mb${key}${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
    birthDate: birthYears(30), churchId: church.data.id,
  });
  return { leader: church.session.token, church: church.data.id, member: await login(`mb${key}${stamp}@t.com`), memberId: member.data.user.id };
}

beforeAll(async () => {
  server = new App().getApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  BASE = `http://127.0.0.1:${server.address().port}/api`;

  s.a = await community('a', 'Comunidade do Sofá');
  s.b = await community('b', 'Comunidade Vizinha');

  // Menor autorizado na comunidade A
  const minor = await call('POST', '/auth/register-member', s.a.leader, {
    name: 'Menor A', email: `mn${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
    birthDate: birthYears(15), churchId: s.a.church,
    guardian: { name: 'Mãe A', email: `mae${stamp}@t.com`, password: 'Senha1234', relationship: 'mae' },
  });
  await call('POST', `/churches/${s.a.church}/members/${minor.data.user.id}/authorize`, s.a.leader, {});
  s.minor = await login(`mn${stamp}@t.com`);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectPrisma();
});

describe('doações', () => {
  test('a doação precisa do local; as coordenadas, se vierem, têm de ser válidas', async () => {
    expect((await call('POST', '/posts', s.a.member, { type: 'donation', content: 'Sofá de 3 lugares' })).status).toBe(400);
    expect((await call('POST', '/posts', s.a.member, { type: 'donation', content: 'Sofá', location: 'Matola, bairro Fomento', latitude: 200, longitude: 10 })).status).toBe(400);
    expect((await call('POST', '/posts', s.a.member, { type: 'anuncio', content: 'x' })).status).toBe(400);
  });

  test('menores não publicam doações', async () => {
    const res = await call('POST', '/posts', s.minor, { type: 'donation', content: 'Livros', location: 'Matola' });
    expect(res.status).toBe(403);
    expect(res.message).toMatch(/Menores/);
  });

  test('a doação aparece no feed de outra comunidade, só para ver', async () => {
    const donation = await call('POST', '/posts', s.a.member, {
      type: 'donation', content: 'Estou a doar um sofá de 3 lugares em bom estado.', location: 'Matola, bairro Fomento', latitude: -25.9622, longitude: 32.4589,
    });
    expect(donation.status).toBe(201);
    s.donation = donation.data.id;
    const normal = await call('POST', '/posts', s.a.member, { content: 'Publicação só da comunidade A' });

    const feedB = (await call('GET', '/posts', s.b.member)).data;
    const seen = feedB.find((p) => p.id === s.donation);
    expect(seen).toMatchObject({ type: 'donation', churchName: 'Comunidade do Sofá', location: 'Matola, bairro Fomento', latitude: -25.9622 });
    expect(feedB.some((p) => p.id === normal.data.id)).toBe(false);

    // Pessoas de outra comunidade não conversam: nem comentários nem reações
    expect((await call('POST', `/posts/${s.donation}/comment`, s.b.member, { content: 'Ainda está disponível?' })).status).toBe(404);
    expect((await call('POST', `/posts/${s.donation}/react`, s.b.member, { type: 'heart' })).status).toBe(404);
    // Na própria comunidade, sim
    expect((await call('POST', `/posts/${s.donation}/comment`, s.a.leader, { content: 'Que bênção!' })).status).toBe(201);
  });

  test('a denúncia de fora chega ao líder de quem doou', async () => {
    const report = await call('POST', '/reports', s.b.member, { targetType: 'post', targetId: s.donation });
    expect(report.status).toBe(201);
    const listA = await call('GET', `/reports?churchId=${s.a.church}&status=open`, s.a.leader);
    const found = listA.data.find((r) => r.id === report.data.id);
    expect(found).toBeTruthy();
    const detail = await call('GET', `/reports/${report.data.id}`, s.a.leader);
    expect(detail.data.snapshot.post).toMatchObject({ type: 'donation', location: 'Matola, bairro Fomento' });
    expect((await call('GET', `/reports?churchId=${s.b.church}&status=open`, s.b.leader)).data).toHaveLength(0);
  });

  test('só quem doou (ou o líder dele) marca como doado', async () => {
    expect((await call('PATCH', `/posts/${s.donation}/donated`, s.b.member, { donated: true })).status).toBe(404);
    const done = await call('PATCH', `/posts/${s.donation}/donated`, s.a.member, { donated: true });
    expect(done.status).toBe(200);
    expect(done.data.donatedAt).toBeTruthy();
    const seen = (await call('GET', '/posts', s.b.member)).data.find((p) => p.id === s.donation);
    expect(seen.donatedAt).toBeTruthy();

    const normal = (await call('GET', '/posts', s.a.member)).data.find((p) => p.type === 'post');
    expect((await call('PATCH', `/posts/${normal.id}/donated`, s.a.member, { donated: true })).status).toBe(400);
  });
});

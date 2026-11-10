// Painéis por cargo (secretaria, tesouraria, regência), aniversários e o topo do feed da liderança
const App = require('../../src/app');
const { getPrismaClient, disconnectPrisma } = require('../../src/config/database');

const stamp = Date.now();
const DAY = 24 * 60 * 60 * 1000;
let server;
let BASE;

const call = async (method, path, token, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(!(body instanceof FormData) && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* sem corpo JSON */ }
  return { status: res.status, type: res.headers.get('content-type'), ...json };
};

const s = {};

const addMember = async (token, name) => {
  const email = `${name.toLowerCase()}${stamp}@t.com`;
  const res = await call('POST', '/auth/register-member', token, {
    name, email, password: 'Senha1234', confirmPassword: 'Senha1234', churchId: s.churchId, birthDate: '1995-05-05',
  });
  expect(res.status).toBe(201);
  const login = await call('POST', '/auth/login', null, { email, password: 'Senha1234' });
  return { id: login.data.user.id, token: login.data.token };
};

beforeAll(async () => {
  server = new App().getApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  BASE = `http://127.0.0.1:${server.address().port}/api`;

  const leader = await call('POST', '/auth/register', null, {
    name: 'Líder dos Painéis', email: `paineis${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
  });
  await getPrismaClient().user.update({ where: { id: leader.data.user.id }, data: { leaderVerifiedAt: new Date() } });
  const church = await call('POST', '/churches', leader.data.token, { name: 'Comunidade dos Painéis' });
  s.churchId = church.data.id;
  s.leader = { id: leader.data.user.id, token: church.session.token };
  s.ana = await addMember(s.leader.token, 'Ana');
  s.bia = await addMember(s.leader.token, 'Bia');
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectPrisma();
});

describe('cargos', () => {
  test('só a liderança atribui; o cargo chega à sessão', async () => {
    expect((await call('PUT', `/panel/cargos/${s.bia.id}`, s.ana.token, { cargo: 'tesoureiro' })).status).toBe(403);
    expect((await call('PUT', `/panel/cargos/${s.ana.id}`, s.leader.token, { cargo: 'pastor' })).status).toBe(400);
    const res = await call('PUT', `/panel/cargos/${s.ana.id}`, s.leader.token, { cargo: 'tesoureiro' });
    expect(res.status).toBe(200);
    expect((await call('GET', '/auth/me', s.ana.token)).data.user.cargo).toBe('tesoureiro');
  });
});

describe('tesouraria', () => {
  test('só o tesoureiro e a liderança lançam e veem; o saldo bate', async () => {
    expect((await call('GET', '/panel/finance', s.bia.token)).status).toBe(403);
    const entrada = await call('POST', '/panel/finance', s.ana.token, {
      kind: 'entrada', category: 'Dízimo', amount: '150.50', date: '2026-11-01', memberId: s.bia.id,
    });
    expect(entrada.status).toBe(201);
    expect(entrada.data.amountCents).toBe(15050);
    expect((await call('POST', '/panel/finance', s.ana.token, { kind: 'saida', category: 'Lanche', amount: 50, date: '2026-11-02' })).status).toBe(201);
    expect((await call('POST', '/panel/finance', s.ana.token, { kind: 'saida', category: 'X', amount: -1, date: '2026-11-02' })).status).toBe(400);
    expect((await call('POST', '/panel/finance', s.ana.token, { kind: 'troco', category: 'X', amount: 1, date: '2026-11-02' })).status).toBe(400);

    const list = await call('GET', '/panel/finance?month=2026-11', s.leader.token);
    expect(list.data.entries).toHaveLength(2);
    expect(list.data.balanceCents).toBe(10050);
    expect((await call('DELETE', `/panel/finance/${entrada.data.id}`, s.bia.token)).status).toBe(403);
    expect((await call('DELETE', `/panel/finance/${entrada.data.id}`, s.ana.token)).status).toBe(200);
  });
});

describe('secretaria', () => {
  test('cadastra e edita membros e guarda documentos com arquivo', async () => {
    expect((await call('PUT', `/panel/cargos/${s.bia.id}`, s.leader.token, { cargo: 'secretario' })).status).toBe(200);
    s.caio = await addMember(s.bia.token, 'Caio');
    expect((await call('PUT', `/churches/${s.churchId}/members/${s.caio.id}`, s.bia.token, { title: 'Músico' })).status).toBe(200);
    const members = (await call('GET', `/churches/${s.churchId}/members`, s.bia.token)).data;
    expect(members.find((m) => m.id === s.caio.id).email).toBe(`caio${stamp}@t.com`);
    // A secretaria não modera nem cadastra para a tesouraria
    expect((await call('POST', `/churches/${s.churchId}/members/${s.caio.id}/moderation`, s.bia.token, { action: 'block' })).status).toBe(403);
    expect((await call('PUT', `/churches/${s.churchId}/members/${s.caio.id}`, s.ana.token, { title: 'X' })).status).toBe(403);

    const form = new FormData();
    form.append('kind', 'ata');
    form.append('title', 'Ata da reunião de novembro');
    form.append('file', new Blob([Buffer.from('%PDF-1.4\n%fim')], { type: 'application/pdf' }), 'ata.pdf');
    const doc = await call('POST', '/panel/documents', s.bia.token, form);
    expect(doc.status).toBe(201);
    expect(doc.data.mimeType).toBe('application/pdf');
    expect(doc.data.data).toBeUndefined();

    const file = await call('GET', `/panel/documents/${doc.data.id}/file`, s.bia.token);
    expect(file.status).toBe(200);
    expect(file.type).toBe('application/pdf');
    expect((await call('GET', '/panel/documents', s.ana.token)).status).toBe(403);
    expect((await call('POST', '/panel/documents', s.ana.token, form)).status).toBe(403);
  });
});

describe('regência', () => {
  test('gere o repertório e marca ensaios', async () => {
    expect((await call('POST', '/events', s.caio.token, { title: 'Ensaio geral', startDate: new Date(Date.now() + DAY).toISOString() })).status).toBe(403);
    expect((await call('PUT', `/panel/cargos/${s.caio.id}`, s.leader.token, { cargo: 'regente' })).status).toBe(200);
    expect((await call('POST', '/events', s.caio.token, { title: 'Ensaio geral', startDate: new Date(Date.now() + DAY).toISOString() })).status).toBe(201);

    const song = await call('POST', '/panel/songs', s.caio.token, { title: 'Grande é o Senhor', musicKey: 'G', link: 'https://youtu.be/abc' });
    expect(song.status).toBe(201);
    expect((await call('POST', '/panel/songs', s.caio.token, { title: 'Hino', link: 'javascript:alert(1)' })).status).toBe(400);
    expect((await call('PUT', `/panel/songs/${song.data.id}`, s.caio.token, { title: 'Grande é o Senhor', musicKey: 'A' })).data.musicKey).toBe('A');
    expect((await call('GET', '/panel/songs', s.caio.token)).data).toHaveLength(1);
    expect((await call('GET', '/panel/songs', s.bia.token)).status).toBe(403);
  });

  test('quem sai da comunidade perde o cargo', async () => {
    expect((await call('DELETE', `/churches/${s.churchId}/members/${s.caio.id}`, s.leader.token)).status).toBe(200);
    const caio = await getPrismaClient().user.findUnique({ where: { id: s.caio.id }, select: { cargo: true, churchId: true } });
    expect(caio).toEqual({ cargo: null, churchId: null });
  });
});

describe('feed', () => {
  test('o que a liderança publica vem no topo', async () => {
    const mine = await call('POST', '/posts', s.ana.token, { content: 'Bom dia, família!' });
    const notice = await call('POST', '/posts', s.leader.token, { content: 'Ensaio no sábado às 15h' });
    await call('POST', '/posts', s.ana.token, { content: 'Publicação mais recente' });
    const feed = (await call('GET', '/posts', s.bia.token)).data;
    expect(feed[0].id).toBe(notice.data.id);
    expect(feed[0].top).toBe(true);
    expect(feed.find((p) => p.id === mine.data.id).top).toBe(false);
  });

  test('aviso de aniversário na véspera, uma vez por ano, mesmo apagado', async () => {
    const today = Date.parse(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo' }).format(new Date())}T00:00:00Z`);
    const tomorrow = new Date(today + DAY).toISOString().slice(5, 10);
    expect((await call('PUT', `/churches/${s.churchId}/members/${s.bia.id}`, s.leader.token, { birthDate: `1992-${tomorrow}` })).status).toBe(200);

    const birthdays = async () => (await call('GET', '/posts', s.ana.token)).data.filter((p) => p.type === 'birthday');
    const first = await birthdays();
    expect(first).toHaveLength(1);
    expect(first[0].content).toMatch(/^Amanhã é aniversário de Bia!/);
    expect(first[0].top).toBe(true);
    expect(await birthdays()).toHaveLength(1);

    expect((await call('DELETE', `/posts/${first[0].id}`, s.bia.token)).status).toBe(200);
    expect(await birthdays()).toHaveLength(0);
  });
});

describe('data de nascimento', () => {
  test('o próprio define uma vez, só se for maior', async () => {
    const minor = new Date(Date.now() - 10 * 365 * DAY).toISOString().slice(0, 10);
    expect((await call('PUT', '/users/profile', s.leader.token, { birthDate: minor })).status).toBe(400);
    expect((await call('PUT', '/users/profile', s.leader.token, { birthDate: '1990-03-04' })).status).toBe(200);
    expect((await call('PUT', '/users/profile', s.leader.token, { birthDate: '1990-03-04' })).status).toBe(200);
    expect((await call('PUT', '/users/profile', s.leader.token, { birthDate: '1991-03-04' })).status).toBe(400);
    expect((await call('GET', '/auth/me', s.leader.token)).data.user.birthDate).toMatch(/^1990-03-04/);
  });

  test('o cadastro de líder recusa menores', async () => {
    const res = await call('POST', '/auth/register', null, {
      name: 'Menor', email: `menor${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
      birthDate: new Date(Date.now() - 12 * 365 * DAY).toISOString().slice(0, 10),
    });
    expect(res.status).toBe(400);
  });
});
